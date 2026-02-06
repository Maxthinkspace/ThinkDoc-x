import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { UserProvider } from "./contexts/UserContext";
import './styles/variables.css';
import './index.css';
import './styles/variables.css';
import './styles/glass-effect.css';
/* global document, Office, module, require, HTMLElement */

// ============================================================================
// GLOBAL ERROR HANDLERS - Prevent crashes
// ============================================================================
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Global Error]', { message, source, lineno, colno, error });
  return true; // Prevent error from propagating
};

window.onunhandledrejection = (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  event.preventDefault(); // Prevent crash
};

// ============================================================================
// APP INITIALIZATION
// ============================================================================
const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

const myTheme = {
  ...webLightTheme,
  colorBrandStroke1: "#0F62FE",
};

/* Render application after Office initializes */
Office.onReady(() => {
  console.log('[Office] Ready');
  root?.render(
    <FluentProvider theme={myTheme}>
      <UserProvider>
        <App />
      </UserProvider>
    </FluentProvider>
  );
}).catch((err) => {
  console.error('[Office.onReady Error]', err);
});

// ============================================================================
// HOT MODULE REPLACEMENT - Disabled to prevent reload on document save
// ============================================================================

// if ((module as any).hot) {
//   (module as any).hot.accept("./components/App", () => {
//     const NextApp = require("./components/App").default;
//     root?.render(NextApp);
//   });
// }