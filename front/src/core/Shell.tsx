import type { ReactNode } from 'react';
import { Footer } from '../ui';
import { SiteHeader } from './SiteHeader';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="ds-shell">
      <SiteHeader />
      <main className="ds-shell__content">{children}</main>
      <Footer />
    </div>
  );
}
