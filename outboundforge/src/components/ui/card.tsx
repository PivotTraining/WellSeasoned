import * as React from "react";

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-forge-line bg-forge-panel p-6 ${className}`}
      {...props}
    />
  );
}
