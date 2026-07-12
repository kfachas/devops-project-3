import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import { AuthProvider } from './auth';
import { ProtectedRoute } from './ProtectedRoute';

function setup(loggedIn: boolean) {
  if (loggedIn) {
    localStorage.setItem(
      'datashare_user',
      JSON.stringify({ id: '1', email: 'a@b.fr', createdAt: '2026-01-01T00:00:00.000Z' }),
    );
  }
  return render(
    <MemoryRouter initialEntries={['/mon-espace']}>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<div>Page connexion</div>} />
          <Route
            path="/mon-espace"
            element={
              <ProtectedRoute>
                <div>Contenu protégé</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => localStorage.clear());

  it('redirige vers /connexion si déconnecté (US05)', () => {
    setup(false);
    expect(screen.getByText('Page connexion')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).toBeNull();
  });

  it('rend le contenu protégé si connecté', () => {
    setup(true);
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });
});
