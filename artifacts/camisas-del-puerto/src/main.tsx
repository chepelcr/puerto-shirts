import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// When served from GitHub Pages (a different origin than the API), point the
// generated API client at the deployed API. In local dev VITE_API_URL is unset
// and requests fall back to the relative `/api` path proxied by Vite.
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
