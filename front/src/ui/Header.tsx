import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="ds-header">
      <Link className="ds-header__logo" to="/">
        DataShare
      </Link>
      <div className="ds-header__actions">{children}</div>
    </header>
  );
}
