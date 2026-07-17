import * as React from "react";

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-forge-line bg-forge-panel p-3 text-sm text-white outline-none focus:border-forge-accent ${className}`}
      {...props}
    />
  );
}
