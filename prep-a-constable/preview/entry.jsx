// Deploy wrapper — does NOT modify the app. Provides the window.storage API the
// prototype expects (backed by localStorage in this web preview) then mounts it.
if (!window.storage) {
  window.storage = {
    async get(key) {
      const v = localStorage.getItem(key);
      return v === null ? null : { key, value: v };
    },
    async set(key, value) {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      return { key, value };
    },
    async delete(key) { localStorage.removeItem(key); return { key, deleted: true }; },
    async list(prefix = "") {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      return { keys, prefix };
    },
  };
}

// Provides window.cloud (magic-link sign-in + cross-device state sync).
// Imported before the app so the sign-in screen sees it on first render.
import "./cloud.js";

import React from "react";
import { createRoot } from "react-dom/client";
import App from "../app/prep-a-constable.jsx";

createRoot(document.getElementById("root")).render(<App />);
