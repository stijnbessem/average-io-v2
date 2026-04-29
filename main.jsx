import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.jsx";
import "./storage-shim.js"; // Provide window.storage for the deployed app

const LOADER_MIN_MS = 320;
const loaderStart = typeof performance !== "undefined" ? performance.now() : Date.now();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);

function dismissPageLoader() {
  const loader = document.getElementById("app-loader");
  if (!loader) {
    document.documentElement.classList.remove("js-loading");
    return;
  }
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const elapsed = now - loaderStart;
  const wait = Math.max(0, LOADER_MIN_MS - elapsed);
  setTimeout(() => {
    loader.classList.add("is-leaving");
    setTimeout(() => {
      loader.remove();
      document.documentElement.classList.remove("js-loading");
    }, 280);
  }, wait);
}

if (typeof requestAnimationFrame === "function") {
  requestAnimationFrame(() => requestAnimationFrame(dismissPageLoader));
} else {
  setTimeout(dismissPageLoader, 0);
}
