import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import type { AuthResponseDto } from '../api/models';
import { renderWithProviders } from '../test-utils';
import { LoginPage } from './LoginPage';

const { mockNavigate, mockMutate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockMutate: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/auth', () => ({
  useAuthControllerLogin: () => ({ mutate: mockMutate, isPending: false }),
}));

const AUTH: AuthResponseDto = {
  accessToken: 'jwt-token',
  user: { id: '1', email: 'a@b.fr', createdAt: '2026-01-01T00:00:00.000Z' },
};

describe('LoginPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('affiche les erreurs de validation à la soumission à vide (US04)', async () => {
    renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Connexion' }));
    expect(screen.getAllByText('Ce champ est requis')).toHaveLength(2);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('refuse un email mal formé', async () => {
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'pasunemail');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: 'Connexion' }));
    expect(screen.getByText('Adresse email invalide')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('connecte et redirige avec des identifiants valides', async () => {
    mockMutate.mockImplementation(
      (_vars: unknown, opts: { onSuccess: (res: AuthResponseDto) => void }) => opts.onSuccess(AUTH),
    );
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: 'Connexion' }));
    expect(mockMutate).toHaveBeenCalledWith(
      { data: { email: 'a@b.fr', password: 'motdepasse' } },
      expect.anything(),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/mon-espace');
    expect(localStorage.getItem('datashare_token')).toBe('jwt-token');
  });

  it('affiche un message dédié en cas de rate-limit (429), pas « identifiants invalides »', async () => {
    mockMutate.mockImplementation(
      (_vars: unknown, opts: { onError: (err: unknown) => void }) =>
        opts.onError({ response: { status: 429 } }),
    );
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: 'Connexion' }));
    expect(screen.getByText(/Trop de tentatives/)).toBeInTheDocument();
  });

  it('affiche « Identifiants invalides » uniquement sur 401', async () => {
    mockMutate.mockImplementation(
      (_vars: unknown, opts: { onError: (err: unknown) => void }) =>
        opts.onError({ response: { status: 401 } }),
    );
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: 'Connexion' }));
    expect(screen.getByText('Identifiants invalides')).toBeInTheDocument();
  });
});
