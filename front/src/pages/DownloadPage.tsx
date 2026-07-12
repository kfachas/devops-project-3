import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFilesControllerMetadata } from '../api/files';
import type { FileMetadataDto } from '../api/models';
import { apiInstance } from '../core/api-client';
import { Shell } from '../core/Shell';
import { Button, Callout, Card, Icon, Input } from '../ui';

function sizeLabel(bytes: number): string {
  const mo = bytes / (1024 * 1024);
  return mo >= 1 ? `${mo.toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function daysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DownloadPage() {
  const { token = '' } = useParams();
  const {
    data: meta,
    isError,
    error,
  } = useFilesControllerMetadata(token, {
    query: { retry: false, enabled: token.length > 0 },
  });
  const [password, setPassword] = useState('');
  const [downloadError, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const download = async (file: FileMetadataDto) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiInstance.get<Blob>(`/api/files/${token}/download`, {
        responseType: 'blob',
        headers: file.passwordProtected ? { 'x-file-password': password } : undefined,
      });
      saveBlob(response.data, file.originalName);
    } catch (err) {
      setError(statusOf(err) === 403 ? 'Mot de passe incorrect' : 'Téléchargement impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <Card heading="Télécharger un fichier" className="ds-card-narrow">
        <div className="ds-stack">
          {isError && (
            <Callout variant="error">
              {statusOf(error) === 410
                ? 'Ce fichier n’est plus disponible en téléchargement car il a expiré.'
                : 'Lien invalide : ce fichier est introuvable.'}
            </Callout>
          )}
          {meta && (
            <>
              <div className="ds-file-pick">
                <Icon name="file" size={20} />
                <div className="ds-file-pick__meta">
                  <span className="ds-file-pick__name">{meta.originalName}</span>
                  <span className="ds-file-pick__size">{sizeLabel(meta.sizeBytes)}</span>
                </div>
              </div>
              <Callout variant={daysLeft(meta.expiresAt) <= 1 ? 'warning' : 'info'}>
                {daysLeft(meta.expiresAt) <= 1
                  ? 'Ce fichier expirera demain.'
                  : `Ce fichier expirera dans ${daysLeft(meta.expiresAt)} jours.`}
              </Callout>
              {meta.passwordProtected && (
                <Input
                  label="Mot de passe"
                  type="password"
                  placeholder="Saisissez le mot de passe…"
                  value={password}
                  onValueChange={setPassword}
                />
              )}
              {downloadError && <Callout variant="error">{downloadError}</Callout>}
              <Button
                variant="light"
                block
                icon="download"
                disabled={loading || (meta.passwordProtected && !password)}
                onClick={() => download(meta)}
              >
                Télécharger
              </Button>
            </>
          )}
        </div>
      </Card>
    </Shell>
  );
}
