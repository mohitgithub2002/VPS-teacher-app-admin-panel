import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "wk-btn--primary",
  accent: "wk-btn--accent",
  outline: "wk-btn--outline",
  ghost: "wk-btn--ghost",
  danger: "wk-btn--danger",
};

function classes({
  variant = "outline",
  size,
  block,
  iconOnly,
  className,
}: {
  variant?: Variant;
  size?: "sm";
  block?: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  return [
    "wk-btn",
    VARIANT_CLASS[variant],
    size === "sm" ? "wk-btn--sm" : null,
    block ? "wk-btn--block" : null,
    iconOnly ? "wk-btn--icon" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm";
  block?: boolean;
  icon?: IconName;
  iconOnly?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "outline",
  size,
  block,
  icon,
  iconOnly,
  loading,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={classes({ variant, size, block, iconOnly, className })}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="wk-btn__spinner" />
      ) : icon ? (
        <Icon name={icon} size={size === "sm" ? 15 : 17} />
      ) : null}
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  size?: "sm";
  block?: boolean;
  icon?: IconName;
  iconOnly?: boolean;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
  title?: string;
}

export function ButtonLink({
  href,
  variant = "outline",
  size,
  block,
  icon,
  iconOnly,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={classes({ variant, size, block, iconOnly, className })}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      {children}
    </Link>
  );
}
