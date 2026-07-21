import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { bootDesign } from "@/lib/design";
import { initTracking } from "@/lib/tracking";
import "./index.css";

// Re-apply the last-published design tokens before first paint (no house-look flash).
bootDesign();
// Inject enabled tracking tags (admin → Tracking) + SPA page-view reporting.
initTracking();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
