import type { ReactNode } from 'react';

export function Card({
  heading,
  className,
  children,
}: {
  heading?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={['ds-card', className ?? ''].filter(Boolean).join(' ')}>
      {heading && <h2 className="ds-card__title">{heading}</h2>}
      {children}
    </div>
  );
}
