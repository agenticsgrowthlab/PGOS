import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Global reset
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0A1628; color: #8EB8D6; }
  select option { background: #152542; color: #D2E8F5; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0F1E35; }
  ::-webkit-scrollbar-thumb { background: #254A6E; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #2E5C85; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
