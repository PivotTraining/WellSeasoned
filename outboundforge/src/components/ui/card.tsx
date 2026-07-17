import * as React from "react";

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-forge-line bg-white p-6 shadow-card ${className}`}
      {...props}
    />
  );
}
