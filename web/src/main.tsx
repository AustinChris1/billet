import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Toaster } from "sonner";
import "./styles.css";
import { Landing } from "./pages/Landing.tsx";
import { BilletPage } from "./pages/BilletPage.tsx";
import { IssuePage } from "./pages/IssuePage.tsx";
import { Docs } from "./pages/Docs.tsx";
import { ErrorPage } from "./pages/ErrorPage.tsx";

const router = createBrowserRouter([
  {
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/b", element: <BilletPage /> },
      { path: "/new", element: <IssuePage /> },
      { path: "/docs", element: <Docs /> },
      { path: "/docs/:slug", element: <Docs /> },
      { path: "*", element: <ErrorPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
    {/* Styled from the theme tokens, so toasts follow light and dark mode on their own. */}
    <Toaster
      position="bottom-center"
      gap={8}
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--ink)",
          border: "1px solid var(--line-strong)",
          borderRadius: "14px",
          fontFamily: "var(--font-form)",
          boxShadow: "var(--shadow)",
        },
      }}
    />
  </StrictMode>,
);
