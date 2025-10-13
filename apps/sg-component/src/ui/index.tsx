import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const el = document.getElementById("root");
if (!el) {
  const div = document.createElement("div");
  div.id = "root";
  document.body.appendChild(div);
  createRoot(div).render(<App />);
} else {
  createRoot(el).render(<App />);
}
