import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScanLine, X } from "lucide-react";
import { getAddress } from "viem";
import { toast } from "sonner";

/**
 * Pulls an EVM address out of whatever a wallet QR holds: a bare 0x address,
 * an EIP-681 link (ethereum:0x...@4217) or a longer payment URI.
 */
export function addressFromQr(text: string): `0x${string}` | null {
  const m = text.match(/0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/);
  if (!m) return null;
  try {
    return getAddress(m[0]);
  } catch {
    return null;
  }
}

/** A "Scan" button that opens the camera and fills the address from a wallet's QR code. */
export function ScanAddress({ onAddress }: { onAddress: (address: `0x${string}`) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-1 pb-1.5 text-[0.85rem] font-[650] text-carbon underline">
        <ScanLine className="h-4 w-4" /> Scan
      </button>
      {open && (
        <Scanner
          onClose={() => setOpen(false)}
          onAddress={(a) => {
            setOpen(false);
            onAddress(a);
          }}
        />
      )}
    </>
  );
}

function Scanner({ onClose, onAddress }: { onClose: () => void; onAddress: (address: `0x${string}`) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "scanning" | "wrong">("starting");
  // Latest callbacks, so a parent re-render never restarts the camera.
  const cb = useRef({ onClose, onAddress });
  cb.current = { onClose, onAddress };

  useEffect(() => {
    let stopped = false;
    let scanner: { start(): Promise<void>; stop(): void; destroy(): void } | null = null;
    // Loaded only when someone scans, so the Write page stays light.
    import("qr-scanner")
      .then(async ({ default: QrScanner }) => {
        if (stopped || !video.current) return;
        scanner = new QrScanner(
          video.current,
          (result) => {
            const address = addressFromQr(result.data);
            if (address) cb.current.onAddress(address);
            else setState("wrong");
          },
          { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true },
        );
        await scanner.start();
        if (!stopped) setState("scanning");
      })
      .catch((err: unknown) => {
        if (stopped) return;
        const msg = String(err).includes("NotAllowed") || String(err).includes("Permission") ? "Camera access was blocked. Allow it in your browser settings, or paste the address." : "Could not open a camera on this device. Paste the address instead.";
        toast.error("Scanner unavailable", { description: msg });
        cb.current.onClose();
      });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cb.current.onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      stopped = true;
      document.removeEventListener("keydown", onKey);
      scanner?.stop();
      scanner?.destroy();
    };
  }, []);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Scan a wallet address" className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-sm overflow-hidden rounded-[18px] border border-line bg-card paper-shadow">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-[620]">Scan a wallet address</div>
          <button type="button" onClick={onClose} aria-label="Close scanner" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="relative aspect-square bg-black">
          <video ref={video} className="h-full w-full object-cover" muted playsInline />
        </div>
        <p className="px-4 py-3 text-[0.88rem] text-muted" aria-live="polite">
          {state === "starting" && "Opening the camera…"}
          {state === "scanning" && "Point it at the QR code of the Tempo address you want to be paid at."}
          {state === "wrong" && "That QR code has no wallet address in it. Try the address QR in your wallet's Receive screen."}
        </p>
      </div>
    </div>,
    document.body,
  );
}
