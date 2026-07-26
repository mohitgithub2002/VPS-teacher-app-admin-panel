import type { ReactNode } from "react";

export function PageHeader({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="wk-page__head">
      <div>
        <h1 className="wk-page__title">{title}</h1>
        {lede ? <p className="wk-page__lede">{lede}</p> : null}
      </div>
      {actions ? <div className="wk-page__actions">{actions}</div> : null}
    </header>
  );
}
