import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { FileRow } from './FileRow';

describe('FileRow', () => {
  it('actif : nom, statut, actions et cadenas (US05)', () => {
    render(
      <FileRow name="rapport.pdf" status="active" expiresLabel="Expire dans 3 jours" locked />,
    );
    expect(screen.getByText('rapport.pdf')).toBeInTheDocument();
    expect(screen.getByText('Expire dans 3 jours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Supprimer/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accéder/ })).toBeInTheDocument();
  });

  it('expiré : message et aucune action (US10)', () => {
    render(<FileRow name="vieux.mp4" status="expired" expiresLabel="Expiré" />);
    expect(screen.getByText(/plus stocké chez nous/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('émet remove et access (US06/US02)', () => {
    const onRemove = vi.fn();
    const onAccess = vi.fn();
    render(
      <FileRow
        name="a.txt"
        status="active"
        expiresLabel="Expire demain"
        onRemove={onRemove}
        onAccess={onAccess}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Supprimer/ }));
    fireEvent.click(screen.getByRole('button', { name: /Accéder/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onAccess).toHaveBeenCalledTimes(1);
  });

  it('mobile : le menu kebab expose Accéder/Supprimer puis se referme (US06/US02)', () => {
    const onRemove = vi.fn();
    const onAccess = vi.fn();
    render(
      <FileRow
        name="a.txt"
        status="active"
        expiresLabel="Expire demain"
        onRemove={onRemove}
        onAccess={onAccess}
      />,
    );
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Actions pour a.txt' }));
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Accéder/ })[1]);
    expect(onAccess).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it("expiré : pas de menu d'actions mobile", () => {
    render(<FileRow name="vieux.mp4" status="expired" expiresLabel="Expiré" locked />);
    expect(screen.queryByRole('button', { name: /Actions/ })).toBeNull();
  });
});
