import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  lift?: boolean;
  flat?: boolean;
  as?: "div" | "section" | "article";
}

export function Card({ children, className, lift, flat, as = "section" }: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={[
        "wk-card",
        lift ? "wk-card--lift" : null,
        flat ? "wk-card--flat" : null,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}

interface CardHeadProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHead({ title, subtitle, actions, className }: CardHeadProps) {
  return (
    <header className={["wk-card__head", className].filter(Boolean).join(" ")}>
      <div className="wk-grow">
        <h2 className="wk-card__title">{title}</h2>
        {subtitle ? <p className="wk-card__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="wk-row">{actions}</div> : null}
    </header>
  );
}

export function CardBody({
  children,
  className,
  padding = "default",
}: {
  children: ReactNode;
  className?: string;
  padding?: "default" | "tight" | "flush";
}) {
  const modifier =
    padding === "tight"
      ? "wk-card__body--tight"
      : padding === "flush"
        ? "wk-card__body--flush"
        : null;
  return (
    <div className={["wk-card__body", modifier, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function CardFoot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer className={["wk-card__foot", className].filter(Boolean).join(" ")}>
      {children}
    </footer>
  );
}
