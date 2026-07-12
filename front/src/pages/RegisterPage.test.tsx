import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import type { AuthResponseDto } from '../api/models';
import { renderWithProviders } from '../test-utils';
import { RegisterPage } from './RegisterPage';

const { mockNavigate, mockMutate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockMutate: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/auth', () => ({
  useAuthControllerRegister: () => ({ mutate: mockMutate, isPending: false }),
}));

const AUTH: AuthResponseDto = {
  accessToken: 'jwt-token',
  user: { id: '1', email: 'a@b.fr', createdAt: '2026-01-01T00:00:00.000Z' },
};

describe('RegisterPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('signale les mots de passe non concordants', async () => {
    renderWithProviders(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.type(screen.getByLabelText('Vérification du mot de passe'), 'different');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('inscrit et redirige quand le formulaire est valide (US03)', async () => {
    mockMutate.mockImplementation(
      (_vars: unknown, opts: { onSuccess: (res: AuthResponseDto) => void }) => opts.onSuccess(AUTH),
    );
    renderWithProviders(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.type(screen.getByLabelText('Vérification du mot de passe'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(mockMutate).toHaveBeenCalledWith(
      { data: { email: 'a@b.fr', password: 'motdepasse' } },
      expect.anything(),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/mon-espace');
  });

  it('affiche un message dédié en cas de rate-limit (429)', async () => {
    mockMutate.mockImplementation(
      (_vars: unknown, opts: { onError: (err: unknown) => void }) =>
        opts.onError({ response: { status: 429 } }),
    );
    renderWithProviders(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.type(screen.getByLabelText('Vérification du mot de passe'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(screen.getByText(/Trop de tentatives/)).toBeInTheDocument();
  });
});
