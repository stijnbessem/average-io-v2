import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./storage-shim.js"; // Provide window.storage for the deployed app

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
