import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/theme.css";

const root = document.getElementById("root");
if (root) {
  document.documentElement.style.height = "100%";
  document.body.style.height = "100%";
  document.body.style.margin = "0";
  createRoot(root).render(<App />);
}

