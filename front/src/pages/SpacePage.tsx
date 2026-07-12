import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFilesControllerHistory, useFilesControllerRemove } from '../api/files';
import { useTagsControllerList } from '../api/tags';
import type { FileSummaryDto } from '../api/models';
import { useAuth } from '../core/auth';
import { Avatar, Button, Callout, FileRow, Icon, Segmented, Select, type FileStatus, type Segment } from '../ui';

const SEGMENTS: Segment[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'actifs', label: 'Actifs' },
  { value: 'expire', label: 'Expiré' },
];

function daysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export function SpacePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState('tous');
  const [tag, setTag] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const displayName = user?.email ? user.email.split('@')[0] : '';
  const [actionError, setActionError] = useState('');
  const { data: tags = [] } = useTagsControllerList();
  const { data = [], refetch, isError, isLoading } = useFilesControllerHistory({ tag });
  const remove = useFilesControllerRemove();

  const filtered = data.filter((file) =>
    filter === 'actifs'
      ? file.status === 'active'
      : filter === 'expire'
        ? file.status === 'expired'
        : true,
  );

  const rowStatus = (file: FileSummaryDto): FileStatus =>
    file.status === 'expired' ? 'expired' : daysLeft(file.expiresAt) <= 1 ? 'soon' : 'active';

  const expiresLabel = (file: FileSummaryDto): string => {
    if (file.status === 'expired') {
      return 'Expiré';
    }
    const days = daysLeft(file.expiresAt);
    return days <= 1 ? 'Expire demain' : `Expire dans ${days} jours`;
  };

  const onRemove = (file: FileSummaryDto) => {
    setActionError('');
    remove.mutate(
      { id: file.id },
      {
        onSuccess: () => void refetch(),
        onError: () => setActionError(`Échec de la suppression de « ${file.originalName} ».`),
      },
    );
  };

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="ds-space">
      <header className="ds-space__mobile-topbar">
        <button
          type="button"
          className="ds-space__burger"
          aria-label="Ouvrir le menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Icon name="menu" size={22} />
        </button>
        <Avatar name={displayName} />
      </header>

      {drawerOpen && (
        <>
          <div className="ds-space__drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="ds-space__drawer">
            <div className="ds-space__drawer-head">
              <button
                type="button"
                className="ds-space__drawer-close"
                aria-label="Fermer le menu"
                onClick={() => setDrawerOpen(false)}
              >
                <Icon name="close" size={20} />
              </button>
              <span className="ds-space__drawer-title">DataShare</span>
            </div>
            <nav className="ds-space__drawer-nav">
              <Link
                className="ds-space__nav-item ds-space__nav-item--active"
                to="/mon-espace"
                onClick={() => setDrawerOpen(false)}
              >
                Mes fichiers
              </Link>
              <Link className="ds-space__nav-item" to="/">
                Ajouter des fichiers
              </Link>
              <button type="button" className="ds-space__nav-item ds-space__drawer-logout" onClick={onLogout}>
                Déconnexion
              </button>
            </nav>
            <p className="ds-space__copyright">Copyright DataShare® {new Date().getFullYear()}</p>
          </aside>
        </>
      )}

      <aside className="ds-space__sidebar">
        <Link className="ds-space__logo" to="/">
          DataShare
        </Link>
        <nav className="ds-space__nav">
          <Link className="ds-space__nav-item ds-space__nav-item--active" to="/mon-espace">
            Mes fichiers
          </Link>
        </nav>
        <p className="ds-space__copyright">Copyright DataShare® {new Date().getFullYear()}</p>
      </aside>

      <main className="ds-space__content">
        <header className="ds-space__topbar">
          <Button variant="dark" size="sm" onClick={() => navigate('/')}>
            Ajouter des fichiers
          </Button>
          <Button variant="ghost" size="sm" icon="logout" onClick={onLogout}>
            Déconnexion
          </Button>
        </header>

        <h1 className="ds-space__title">Mes fichiers</h1>

        <Segmented segments={SEGMENTS} value={filter} onChange={setFilter} />

        {tags.length > 0 && (
          <Select
            label="Filtrer par tag"
            options={[
              { value: '', label: 'Tous les tags' },
              ...tags.map((t) => ({ value: t.label, label: `${t.label} (${t.count})` })),
            ]}
            value={tag}
            onValueChange={setTag}
          />
        )}

        {actionError && <Callout variant="error">{actionError}</Callout>}

        <div>
          {isLoading ? (
            <p className="ds-space__empty">Chargement…</p>
          ) : isError ? (
            <Callout variant="error">Impossible de charger vos fichiers. Réessayez plus tard.</Callout>
          ) : filtered.length === 0 ? (
            <p className="ds-space__empty">Aucun fichier.</p>
          ) : (
            filtered.map((file) => (
              <FileRow
                key={file.id}
                name={file.originalName}
                status={rowStatus(file)}
                expiresLabel={expiresLabel(file)}
                locked={file.passwordProtected}
                onRemove={() => onRemove(file)}
                onAccess={() => window.open(`/d/${file.downloadToken}`, '_blank')}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
