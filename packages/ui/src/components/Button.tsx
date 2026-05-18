import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  asChild?: boolean;
};

const baseClasses =
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]";

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "[background:linear-gradient(135deg,#7C3AED_0%,#4F46E5_50%,#1DB8C6_100%)] text-white shadow-orbit-sm hover:shadow-orbit-md hover:scale-[1.02] active:scale-[0.98]",
  secondary:
    "bg-orbit-surface border border-orbit-border text-orbit-violet-light hover:border-orbit-border-accent hover:bg-orbit-raised hover:shadow-orbit-sm",
  ghost:
    "bg-transparent text-[rgba(244,244,255,0.6)] hover:text-orbit-text hover:bg-[rgba(255,255,255,0.05)]",
};

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  asChild = false,
  ...props
}: ButtonProps) {
  const styles = variantClasses[variant];
  const classes = `${baseClasses} ${styles} ${className}`.trim();

  if (asChild) {
    return <Slot className={classes} {...props} />;
  }

  return <button type={type} className={classes} {...props} />;
}
