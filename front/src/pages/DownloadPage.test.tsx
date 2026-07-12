import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, vi } from 'vitest';
import type { FileMetadataDto } from '../api/models';
import { renderWithProviders } from '../test-utils';
import { DownloadPage } from './DownloadPage';

const { mockMetadata, mockGet } = vi.hoisted(() => ({
  mockMetadata: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: () => ({ token: 'abc' }),
}));

vi.mock('../api/files', () => ({
  useFilesControllerMetadata: (...args: unknown[]) => mockMetadata(...args),
}));

vi.mock('../core/api-client', () => ({
  apiInstance: { get: (...args: unknown[]) => mockGet(...args) },
}));

const META = (overrides: Partial<FileMetadataDto> = {}): FileMetadataDto => ({
  originalName: 'rapport.pdf',
  sizeBytes: 2048,
  mimeType: 'application/pdf',
  expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  passwordProtected: false,
  ...overrides,
});

describe('DownloadPage', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('distingue un lien expiré (410) d’un lien invalide (404) (US10/US02)', () => {
    mockMetadata.mockReturnValue({
      data: undefined,
      isError: true,
      error: { response: { status: 410 } },
    });
    const { rerender } = renderWithProviders(<DownloadPage />);
    expect(screen.getByText(/a expiré/)).toBeInTheDocument();

    mockMetadata.mockReturnValue({
      data: undefined,
      isError: true,
      error: { response: { status: 404 } },
    });
    rerender(<DownloadPage />);
    expect(screen.getByText(/introuvable/)).toBeInTheDocument();
  });

  it('télécharge un fichier public via le client axios partagé (US02)', async () => {
    mockMetadata.mockReturnValue({ data: META(), isError: false });
    mockGet.mockResolvedValue({ data: new Blob(['data']) });
    renderWithProviders(<DownloadPage />);
    expect(screen.getByText('rapport.pdf')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Télécharger/ }));
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        '/api/files/abc/download',
        expect.objectContaining({ responseType: 'blob', headers: undefined }),
      ),
    );
  });

  it('transmet le mot de passe via l’en-tête x-file-password, hors URL (US09)', async () => {
    mockMetadata.mockReturnValue({ data: META({ passwordProtected: true }), isError: false });
    mockGet.mockResolvedValue({ data: new Blob(['data']) });
    renderWithProviders(<DownloadPage />);
    const button = screen.getByRole('button', { name: /Télécharger/ });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret123');
    expect(button).toBeEnabled();
    await userEvent.click(button);
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        '/api/files/abc/download',
        expect.objectContaining({ headers: { 'x-file-password': 'secret123' } }),
      ),
    );
  });
});
