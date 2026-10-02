import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ArrowUpRight, BookOpen, FolderGit2, Menu, Moon, PenLine, Sun, X } from "lucide-react";
import { Wordmark } from "./paper.tsx";

type Theme = "light" | "dark";
const KEY = "billet.theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function storedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

/** Follows the system until the visitor picks; the pick is remembered on this device only. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) ?? storedTheme() ?? systemTheme());
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#141012" : "#f4f2ee");
  }, [theme]);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      if (!storedTheme()) setTheme(systemTheme());
    };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* private mode: the choice lasts this visit */
      }
      return next;
    });
  return { theme, toggle };
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition-colors hover:border-line-strong hover:bg-surface"
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

/** Zcash's own mark (z.cash media), shown only to say which chain does what. */
export function ZcashLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 65 65" className={className} role="img" aria-label="Zcash">
      <circle cx="32.5" cy="32.5" r="32.5" fill="#f3b724" />
      <path
        d="M8.591,0V5.146H0v6.2H13.33L0,28.974v4.667H8.591v5.113H13.87V33.641H22.46v-6.2H9.131L22.46,9.813V5.146H13.87V0Z"
        transform="translate(21 13)"
        fill="#fff"
      />
    </svg>
  );
}

/** Tempo's mark (tempo.xyz), drawn in the current ink so it works in both themes. */
export function TempoLogo({ className = "h-6 w-6", fg = "var(--paper)" }: { className?: string; fg?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Tempo">
      <rect width="40" height="40" rx="9" fill="currentColor" />
      <path d="M17.6429 28.1631H13.1933L17.3173 15.4122H12.043L13.1933 11.6748H27.8878L26.7374 15.4122H21.7452L17.6429 28.1631Z" fill={fg} />
    </svg>
  );
}

const navCls = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-full px-3.5 py-2 transition-colors ${isActive ? "bg-surface text-ink" : "text-muted hover:text-ink"}`;

export type HeaderLink = { href: string; label: string };

/** Desktop: links in a row. Phones: the mark, the theme toggle and a menu button; everything else lives in the menu. */
export function SiteHeader({ links = [], sticky }: { links?: HeaderLink[]; sticky?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menuItem = "flex items-center justify-between rounded-[12px] px-3 py-3 text-[1.05rem] font-[560] transition-colors hover:bg-surface";

  return (
    <header ref={ref} className={`${sticky ? "sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md" : "relative z-30"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
        <Link to="/" aria-label="Billet home" className="shrink-0">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1 text-[0.92rem] font-[550] sm:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hidden rounded-full px-3.5 py-2 text-muted transition-colors hover:text-ink md:inline-flex">
              {l.label}
            </a>
          ))}
          <NavLink to="/docs" className={navCls}>
            <BookOpen className="h-4 w-4" /> Docs
          </NavLink>
          <NavLink to="/new" className={navCls}>
            <PenLine className="h-4 w-4" /> Write an invoice
          </NavLink>
          <span className="ml-1">
            <ThemeToggle />
          </span>
        </nav>
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition-colors hover:border-line-strong hover:bg-surface"
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="site-menu"
          aria-label="Site"
          className="absolute inset-x-0 top-full border-y border-line bg-paper px-3 pt-2 pb-4 shadow-[0_24px_40px_-24px_#00000059] sm:hidden"
        >
          <ul className="space-y-0.5">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className={`${menuItem} text-ink`}>
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/docs" className={`${menuItem} text-ink`}>
                Docs
              </Link>
            </li>
            <li>
              <a href="https://github.com/AustinChris1/billet" target="_blank" rel="noreferrer" className={`${menuItem} text-ink`}>
                Source on GitHub
                <ArrowUpRight className="h-4 w-4 text-muted" />
              </a>
            </li>
          </ul>
          <Link
            to="/new"
            className="mt-3 flex items-center justify-center gap-2 rounded-full bg-zec px-6 py-3 font-[600] text-on-zec transition-colors hover:bg-zec-deep"
          >
            <PenLine className="h-4 w-4" /> Write an invoice
          </Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-band text-band-ink">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-[34ch] text-[0.95rem] leading-relaxed text-band-muted">
            Private invoice. Public payment. One link. Built for the Crypto World's Fair.
          </p>
          <div className="mt-6 flex items-center gap-3 text-[0.85rem] text-band-muted">
            <ZcashLogo className="h-6 w-6" />
            <span>Sealed on Zcash</span>
            <span className="text-band-muted/50">+</span>
            <span style={{ color: "var(--band-ink)" }}>
              <TempoLogo className="h-6 w-6" fg="var(--band)" />
            </span>
            <span>Paid on Tempo</span>
          </div>
        </div>
        <div>
          <div className="form-label text-band-muted">Product</div>
          <ul className="mt-4 space-y-2.5 text-[0.95rem]">
            <li>
              <Link to="/new" className="hover:text-zec">Write an invoice</Link>
            </li>
            <li>
              <Link to="/docs" className="hover:text-zec">Docs</Link>
            </li>
            <li>
              <Link to="/docs/guide" className="hover:text-zec">Sending, paying, checking</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="form-label text-band-muted">Built with</div>
          <ul className="mt-4 space-y-2.5 text-[0.95rem]">
            <li>
              <a className="hover:text-zec" href="https://github.com/saplingcash/zcash-delivery-proof" target="_blank" rel="noreferrer">
                zcash-delivery-proof
              </a>
            </li>
            <li>
              <a className="hover:text-zec" href="https://github.com/ZcashCommunityGrants/WebZjs" target="_blank" rel="noreferrer">
                WebZjs
              </a>
            </li>
            <li>
              <a className="inline-flex items-center gap-2 hover:text-zec" href="https://github.com/AustinChris1/billet" target="_blank" rel="noreferrer">
                <FolderGit2 className="h-4 w-4" /> Source on GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
