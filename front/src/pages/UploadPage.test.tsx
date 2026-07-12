import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import type { UploadResultDto } from '../api/models';
import { renderWithProviders } from '../test-utils';
import { UploadPage } from './UploadPage';

const { mockMutate } = vi.hoisted(() => ({ mockMutate: vi.fn() }));

vi.mock('../api/files', () => ({
  useFilesControllerUpload: () => ({ mutate: mockMutate, isPending: false }),
}));

const RESULT: UploadResultDto = {
  downloadToken: 'xyz',
  downloadUrl: 'http://localhost:4200/d/xyz',
  originalName: 'photo.png',
  sizeBytes: 5,
  mimeType: 'image/png',
  expiresAt: '2026-06-27T00:00:00.000Z',
  passwordProtected: false,
  tags: [],
};

function pickFile(name = 'photo.png') {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['hello'], name, { type: 'image/png' });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe('UploadPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('affiche l’écran d’accueil avec l’appel à l’action (US01)', () => {
    renderWithProviders(<UploadPage />);
    expect(screen.getByText('Tu veux partager un fichier ?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Téléverser un fichier' })).toBeInTheDocument();
  });

  it('passe au formulaire après sélection d’un fichier', () => {
    renderWithProviders(<UploadPage />);
    pickFile();
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Téléverser/ })).toBeInTheDocument();
  });

  it('téléverse puis affiche le lien de partage (US01/US09)', async () => {
    mockMutate.mockImplementation(
      (_vars: unknown, opts: { onSuccess: (res: UploadResultDto) => void }) => opts.onSuccess(RESULT),
    );
    renderWithProviders(<UploadPage />);
    pickFile();
    await userEvent.click(screen.getByRole('button', { name: /Téléverser/ }));
    expect(mockMutate).toHaveBeenCalledWith(
      { data: expect.objectContaining({ expiresInDays: 7, file: expect.any(File) }) },
      expect.anything(),
    );
    expect(screen.getByText('Félicitations, ton fichier sera conservé chez nous !')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:4200/d/xyz')).toBeInTheDocument();
  });

  it('envoie les tags saisis (US08)', async () => {
    mockMutate.mockImplementation(
      (_vars: unknown, opts: { onSuccess: (res: UploadResultDto) => void }) => opts.onSuccess(RESULT),
    );
    renderWithProviders(<UploadPage />);
    pickFile();
    await userEvent.type(screen.getByLabelText('Tags'), 'facture,2026');
    await userEvent.click(screen.getByRole('button', { name: /Téléverser/ }));
    expect(mockMutate).toHaveBeenCalledWith(
      { data: expect.objectContaining({ tags: 'facture,2026' }) },
      expect.anything(),
    );
  });

  it('refuse un mot de passe trop court avec un message explicite (US09)', async () => {
    renderWithProviders(<UploadPage />);
    pickFile();
    await userEvent.type(screen.getByLabelText('Mot de passe'), '123');
    await userEvent.click(screen.getByRole('button', { name: /Téléverser/ }));
    expect(screen.getByText('Minimum 6 caractères')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('refuse un fichier de type application avant tout envoi (ex. .app macOS)', () => {
    renderWithProviders(<UploadPage />);
    pickFile('Installateur.app');
    expect(screen.getByText('Type de fichier non autorisé : .app')).toBeInTheDocument();
    expect(screen.queryByText('Installateur.app')).not.toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('refuse un exécutable .exe avant tout envoi', () => {
    renderWithProviders(<UploadPage />);
    pickFile('installer.exe');
    expect(screen.getByText('Type de fichier non autorisé : .exe')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('remonte le message d’erreur renvoyé par le serveur', async () => {
    mockMutate.mockImplementation(
      (_vars: unknown, opts: { onError: (err: unknown) => void }) =>
        opts.onError({ response: { data: { message: 'Extension interdite : .exe' } } }),
    );
    renderWithProviders(<UploadPage />);
    pickFile();
    await userEvent.click(screen.getByRole('button', { name: /Téléverser/ }));
    expect(screen.getByText('Extension interdite : .exe')).toBeInTheDocument();
  });
});
