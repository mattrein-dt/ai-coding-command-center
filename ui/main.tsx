import React from "react";
import ReactDOM from "react-dom/client";
import { AppRoot } from "@dynatrace/strato-components/core";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { TimeframeProvider } from "./app/data/timeframe";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <AppRoot>
    <TimeframeProvider>
      <BrowserRouter basename="ui">
        <App />
      </BrowserRouter>
    </TimeframeProvider>
  </AppRoot>
);
