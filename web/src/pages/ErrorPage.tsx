import { Link, useRouteError } from "react-router";
import { Copy } from "../components/paper.tsx";
import { SiteHeader } from "../components/site.tsx";

/** A crash should read like a torn copy, not a stack trace. */
export function ErrorPage() {
  const err = useRouteError() as { status?: number; message?: string } | undefined;
  const missing = !err || err.status === 404;
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <div className="px-4 pt-6 pb-16 sm:px-8">
      <Copy tone="sheet" className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl">{missing ? "There is no page here." : "Something went wrong on this page."}</h1>
        <p className="mt-3 text-sheet-ink">
          {missing
            ? "Check the address, or start from the home page."
            : "Nothing about your invoices or payments changed. Reload the page; if it happens again, open it from the home page."}
        </p>
        <div className="mt-6 flex gap-5 font-[650]">
          <Link to="/" className="text-carbon underline">
            Home
          </Link>
          <Link to="/new" className="text-carbon underline">
            Write an invoice
          </Link>
        </div>
      </Copy>
      </div>
    </div>
  );
}
