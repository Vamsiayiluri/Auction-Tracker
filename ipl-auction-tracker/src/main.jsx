import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import App from "./App.jsx";
import theme from "./theme.js";
import "./index.css";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import { installVitePreloadRecovery } from "./utils/chunkRecovery.js";

installVitePreloadRecovery();

createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AppErrorBoundary scope="root">
      <App />
    </AppErrorBoundary>
  </ThemeProvider>
);
