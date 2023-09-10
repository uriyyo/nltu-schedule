import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { teal } from "@mui/material/colors";

const theme = createTheme({
  palette: {
    primary: {
      main: teal[300],
      contrastText: teal[200],
    },
    secondary: {
      main: teal[100],
      contrastText: teal[50],
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
