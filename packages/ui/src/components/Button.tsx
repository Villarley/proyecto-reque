import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  asChild?: boolean;
};

const baseClasses =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbit-text/20 focus-visible:ring-offset-2 focus-visible:ring-offset-orbit-surface";

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-orbit-text text-white shadow-orbit-sm hover:bg-black/85 active:scale-[0.98]",
  secondary:
    "bg-white border border-orbit-border text-orbit-text hover:border-orbit-text hover:bg-orbit-raised shadow-orbit-sm",
  ghost:
    "bg-transparent text-orbit-text-2 hover:text-orbit-text hover:bg-orbit-raised",
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
