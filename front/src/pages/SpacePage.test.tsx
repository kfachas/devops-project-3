import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import { renderWithProviders } from '../test-utils';
import { SpacePage } from './SpacePage';

const { mockNavigate, mockRemove, mockHistory } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockRemove: vi.fn(),
  mockHistory: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/files', () => ({
  useFilesControllerHistory: (...args: unknown[]) => mockHistory(...args),
  useFilesControllerRemove: () => ({ mutate: mockRemove }),
}));

vi.mock('../api/tags', () => ({
  useTagsControllerList: () => ({ data: [{ label: 'travail', count: 2 }] }),
}));

const files = () => [
  {
    id: '1',
    originalName: 'actif.pdf',
    sizeBytes: 10,
    mimeType: 'application/pdf',
    downloadToken: 'tok1',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    passwordProtected: true,
    status: 'active',
    tags: [],
  },
  {
    id: '2',
    originalName: 'vieux.zip',
    sizeBytes: 20,
    mimeType: 'application/zip',
    downloadToken: 'tok2',
    expiresAt: '2020-01-01T00:00:00.000Z',
    createdAt: '2020-01-01T00:00:00.000Z',
    passwordProtected: false,
    status: 'expired',
    tags: [],
  },
];

describe('SpacePage', () => {
  beforeEach(() => {
    mockHistory.mockReturnValue({ data: files(), refetch: vi.fn(), isError: false, isLoading: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('affiche tout l’historique des fichiers (US05)', () => {
    renderWithProviders(<SpacePage />);
    expect(screen.getByText('actif.pdf')).toBeInTheDocument();
    expect(screen.getByText('vieux.zip')).toBeInTheDocument();
  });

  it('filtre sur les fichiers expirés (US10)', async () => {
    renderWithProviders(<SpacePage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Expiré' }));
    expect(screen.queryByText('actif.pdf')).toBeNull();
    expect(screen.getByText('vieux.zip')).toBeInTheDocument();
  });

  it('filtre sur les fichiers actifs', async () => {
    renderWithProviders(<SpacePage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Actifs' }));
    expect(screen.getByText('actif.pdf')).toBeInTheDocument();
    expect(screen.queryByText('vieux.zip')).toBeNull();
  });

  it('déclenche la suppression d’un fichier (US06)', async () => {
    renderWithProviders(<SpacePage />);
    const removeButtons = screen.getAllByRole('button', { name: /Supprimer/ });
    await userEvent.click(removeButtons[0]);
    expect(mockRemove).toHaveBeenCalledWith({ id: '1' }, expect.anything());
  });

  it('affiche un message explicite si la suppression échoue (plus d’échec silencieux)', async () => {
    mockRemove.mockImplementation((_vars: unknown, opts: { onError: () => void }) => opts.onError());
    renderWithProviders(<SpacePage />);
    await userEvent.click(screen.getAllByRole('button', { name: /Supprimer/ })[0]);
    expect(screen.getByText(/Échec de la suppression/)).toBeInTheDocument();
  });

  it('affiche une erreur de chargement au lieu de « Aucun fichier » quand l’historique échoue', () => {
    mockHistory.mockReturnValue({ data: [], refetch: vi.fn(), isError: true, isLoading: false });
    renderWithProviders(<SpacePage />);
    expect(screen.getByText(/Impossible de charger vos fichiers/)).toBeInTheDocument();
    expect(screen.queryByText('Aucun fichier.')).toBeNull();
  });

  it('affiche le filtre par tag alimenté par l’API (US08)', () => {
    renderWithProviders(<SpacePage />);
    expect(screen.getByText('Filtrer par tag')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /travail \(2\)/ })).toBeInTheDocument();
  });
});
