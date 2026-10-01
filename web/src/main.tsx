import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./styles.css";
import { Landing } from "./pages/Landing.tsx";
import { BilletPage } from "./pages/BilletPage.tsx";
import { IssuePage } from "./pages/IssuePage.tsx";
import { Docs } from "./pages/Docs.tsx";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/b", element: <BilletPage /> },
  { path: "/new", element: <IssuePage /> },
  { path: "/docs", element: <Docs /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
