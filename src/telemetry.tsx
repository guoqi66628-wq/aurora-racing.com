import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TelemetryLogin from "./components/TelemetryLogin";
import "./index.css";
import "./telemetry.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><TelemetryLogin /></StrictMode>,
);
