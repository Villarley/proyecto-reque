import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-orbit-border bg-orbit-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:border-[rgba(124,58,237,0.35)] hover:shadow-orbit-sm ${className}`}
      {...props}
    />
  );
}
