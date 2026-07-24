// Wraps custom DataTable cell content so it fills the cell height and centers
// vertically (matching the table's default text cells).

import React from "react";

export const CenterCell = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", height: "100%" }}>{children}</div>
);
