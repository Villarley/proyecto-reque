import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-orbit-border bg-orbit-surface shadow-orbit-sm ${className}`}
      {...props}
    />
  );
}
