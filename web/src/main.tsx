import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
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
  </StrictMode>,
);
