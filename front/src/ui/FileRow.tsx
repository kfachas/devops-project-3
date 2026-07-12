import { useState } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export type FileStatus = 'active' | 'soon' | 'expired';

interface FileRowProps {
  name: string;
  status: FileStatus;
  expiresLabel: string;
  locked?: boolean;
  onRemove?: () => void;
  onAccess?: () => void;
}

export function FileRow({
  name,
  status,
  expiresLabel,
  locked = false,
  onRemove,
  onAccess,
}: FileRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusClass = [
    'ds-file-row__status',
    status === 'expired' ? 'ds-file-row__status--expired' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const pick = (action?: () => void) => {
    setMenuOpen(false);
    action?.();
  };

  return (
    <div className="ds-file-row">
      <span className="ds-file-row__icon">
        <Icon name="file" size={20} />
      </span>
      <div className="ds-file-row__info">
        <span className="ds-file-row__name">{name}</span>
        <span className={statusClass}>{expiresLabel}</span>
      </div>
      <div className="ds-file-row__actions ds-file-row__actions--desktop">
        {status === 'expired' ? (
          <span className="ds-file-row__gone">Ce fichier a expiré, il n'est plus stocké chez nous</span>
        ) : (
          <>
            {locked && (
              <span className="ds-file-row__lock">
                <Icon name="lock" size={16} />
              </span>
            )}
            <Button variant="ghost" size="sm" icon="trash" onClick={onRemove}>
              Supprimer
            </Button>
            <Button variant="outline" size="sm" icon="arrow-right" onClick={onAccess}>
              Accéder
            </Button>
          </>
        )}
      </div>
      <div className="ds-file-row__actions ds-file-row__actions--mobile">
        {locked && (
          <span className="ds-file-row__lock">
            <Icon name="lock" size={16} />
          </span>
        )}
        {status !== 'expired' && (
          <span className="ds-file-row__menu-wrap">
            <button
              type="button"
              className="ds-file-row__kebab"
              aria-label={`Actions pour ${name}`}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name="dots" size={18} />
            </button>
            {menuOpen && (
              <span className="ds-file-row__menu" role="menu">
                <button type="button" className="ds-file-row__menu-item" onClick={() => pick(onAccess)}>
                  Accéder
                </button>
                <button
                  type="button"
                  className="ds-file-row__menu-item ds-file-row__menu-item--danger"
                  onClick={() => pick(onRemove)}
                >
                  Supprimer
                </button>
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
