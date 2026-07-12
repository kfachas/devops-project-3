import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type CalloutVariant = 'info' | 'warning' | 'error';

const ICON: Record<CalloutVariant, IconName> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
};

export function Callout({
  variant = 'info',
  children,
}: {
  variant?: CalloutVariant;
  children: ReactNode;
}) {
  return (
    <div className={`ds-callout ds-callout--${variant}`}>
      <span className="ds-callout__icon">
        <Icon name={ICON[variant]} size={18} />
      </span>
      <span>{children}</span>
    </div>
  );
}
