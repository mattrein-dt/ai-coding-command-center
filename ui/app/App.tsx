import { Page } from "@dynatrace/strato-components/layouts";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Overview } from "./pages/Overview";
import { Users } from "./pages/Users";
import { Sessions } from "./pages/Sessions";

export const App = () => {
  return (
    <Page>
      <Page.Header>
        <Header />
      </Page.Header>
      <Page.Main>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/users" element={<Users />} />
          <Route path="/sessions" element={<Sessions />} />
        </Routes>
      </Page.Main>
    </Page>
  );
};
