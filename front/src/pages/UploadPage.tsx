import { useRef, useState, type ChangeEvent } from 'react';
import { FILE_PASSWORD_MIN_LENGTH, FORBIDDEN_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '@datashare/shared';
import { useFilesControllerUpload } from '../api/files';
import type { UploadResultDto } from '../api/models';
import { Shell } from '../core/Shell';
import { Button, Callout, Card, Icon, Input, Select } from '../ui';

const EXPIRATIONS = [
  { value: '1', label: 'Une journée' },
  { value: '3', label: '3 jours' },
  { value: '7', label: 'Une semaine' },
];

const UPLOAD_ACCEPT = [
  'image/*',
  'video/*',
  'audio/*',
  'text/*',
  'application/pdf',
  'application/zip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/x-tar',
  'application/gzip',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
  '.rtf',
  '.csv',
  '.json',
  '.xml',
  '.md',
  '.psd',
  '.ai',
  '.sketch',
  '.fig',
].join(',');

function sizeLabel(bytes: number): string {
  const mo = bytes / (1024 * 1024);
  return mo >= 1 ? `${mo.toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

function uploadErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(message)) {
    return message[0] ?? 'Échec du téléversement';
  }
  if (typeof message === 'string') {
    return message;
  }
  return 'Échec du téléversement';
}

export function UploadPage() {
  const upload = useFilesControllerUpload();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [expiration, setExpiration] = useState('7');
  const [tags, setTags] = useState('');
  const [result, setResult] = useState<UploadResultDto | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const tooBig = (file?.size ?? 0) > MAX_FILE_SIZE_BYTES;
  const passwordError =
    password.length > 0 && password.length < FILE_PASSWORD_MIN_LENGTH
      ? `Minimum ${FILE_PASSWORD_MIN_LENGTH} caractères`
      : '';
  const state = result ? 'success' : file ? 'form' : 'idle';

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) {
      return;
    }
    const ext = extensionOf(picked.name);
    if ((FORBIDDEN_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
      setError(`Type de fichier non autorisé : .${ext}`);
      return;
    }
    setFile(picked);
    setError('');
  };

  const doUpload = () => {
    setSubmitted(true);
    if (!file || tooBig || passwordError) {
      return;
    }
    setError('');
    upload.mutate(
      {
        data: {
          file,
          expiresInDays: Number(expiration),
          password: password || undefined,
          tags: tags || undefined,
        },
      },
      {
        onSuccess: (res) => setResult(res),
        onError: (err) => setError(uploadErrorMessage(err)),
      },
    );
  };

  const copy = () => {
    if (result) {
      void navigator.clipboard.writeText(result.downloadUrl);
      setCopied(true);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setCopied(false);
    setPassword('');
    setExpiration('7');
    setTags('');
    setSubmitted(false);
  };

  return (
    <Shell>
      {state === 'idle' && (
        <div className="ds-hero">
          <h1 className="ds-hero__title">Tu veux partager un fichier ?</h1>
          <button
            type="button"
            className="ds-cta"
            onClick={() => pickerRef.current?.click()}
            aria-label="Téléverser un fichier"
          >
            <Icon name="upload" size={30} />
          </button>
          {error && (
            <div className="ds-hero__error">
              <Callout variant="error">{error}</Callout>
            </div>
          )}
        </div>
      )}

      {state === 'form' && file && (
        <Card heading="Ajouter un fichier" className="ds-card-narrow">
          <div className="ds-stack">
            <div className="ds-file-pick">
              <Icon name="file" size={20} />
              <div className="ds-file-pick__meta">
                <span className="ds-file-pick__name">{file.name}</span>
                <span className="ds-file-pick__size">{sizeLabel(file.size)}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => pickerRef.current?.click()}>
                Changer
              </Button>
            </div>
            {tooBig && <Callout variant="error">La taille des fichiers est limitée à 100 Mo</Callout>}
            {error && <Callout variant="error">{error}</Callout>}
            <Input
              label="Mot de passe"
              type="password"
              placeholder="Optionnel"
              value={password}
              onValueChange={setPassword}
              error={submitted ? passwordError : undefined}
            />
            <Select
              label="Expiration"
              options={EXPIRATIONS}
              value={expiration}
              onValueChange={setExpiration}
            />
            <Input
              label="Tags"
              placeholder="Séparés par des virgules (optionnel)"
              value={tags}
              onValueChange={setTags}
            />
            <Button
              variant="light"
              block
              icon="upload"
              disabled={upload.isPending || tooBig}
              onClick={doUpload}
            >
              Téléverser
            </Button>
          </div>
        </Card>
      )}

      {state === 'success' && result && (
        <Card heading="Ajouter un fichier" className="ds-card-narrow">
          <div className="ds-stack">
            <Callout variant="info">Félicitations, ton fichier sera conservé chez nous !</Callout>
            <a className="ds-dl-link" href={result.downloadUrl} target="_blank" rel="noopener">
              {result.downloadUrl}
            </a>
            <Button variant="light" block icon="copy" onClick={copy}>
              {copied ? 'Lien copié !' : 'Copier le lien'}
            </Button>
            <Button variant="ghost" block onClick={reset}>
              Envoyer un autre fichier
            </Button>
          </div>
        </Card>
      )}

      <input ref={pickerRef} type="file" accept={UPLOAD_ACCEPT} hidden onChange={onPick} />
    </Shell>
  );
}
