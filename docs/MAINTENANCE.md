# MAINTENANCE.md — Maintenance DataShare

## Gestion des dépendances

Front et back sont en **npm**. Mises à jour des dépendances **manuelles** — la CI (GitHub Actions) rejoue les
tests à chaque push mais n'automatise ni les mises à jour de dépendances ni les déploiements.

### Procédure
1. Sur une branche dédiée : `npm outdated` (dans `front/` et `back/`) pour lister les écarts.
2. **Patch / minor** : `npm update` (compatible semver).
3. **Major** (ex. React, NestJS) : lire le guide de migration officiel, appliquer une mise à jour à la fois.
4. Rejouer `npm audit`, le **build**, et **toute la suite de tests** — localement puis vérifié par la CI au push.
5. Revue de code puis merge (conventional commits).

### Fréquence
- Vérification **mensuelle** des dépendances.
- **Correctifs de sécurité** : appliqués dès publication (voir `SECURITY.md`).
- **Majors de framework** : de façon planifiée, à chaque LTS ou au besoin.

### Risques & garde-fous
| Risque | Mitigation |
|--------|------------|
| Breaking changes (majors React/NestJS) | Guides de migration, mise à jour isolée, tests de non-régression |
| Dérive du lockfile | `package-lock.json` versionné, `npm ci` (conteneurs de test) |
| Régression silencieuse | Couverture ≥ 70 % (Vitest + Jest), tests d'intégration API avant merge |
| Vulnérabilité transitive | `npm audit` régulier ; advisories NestJS connues (`multer` / `form-data` / `js-yaml`) atténuées (throttler, plafond 100 Mo, contrôle d'extension) et **suivies** pour le prochain major NestJS |

## Versions de référence
- **Node 20+ (LTS)**, npm 10+.
- **React 19** (Vite), **NestJS** (dernière stable), **PostgreSQL** (image Docker épinglée par tag).
- Images Docker épinglées ; toute mise à jour est testée avant promotion.

## Données & stockage
- Les fichiers expirés sont purgés automatiquement (US10) — aucune rétention au-delà de l'expiration.
- Base PostgreSQL sur volume Docker persistant.

## Sauvegarde et restauration PostgreSQL (production)

**Périmètre.** PostgreSQL ne contient que les **métadonnées** (utilisateurs, fichiers, tags) : les binaires vivent
sur le stockage objet **S3**, qui assure sa propre durabilité (réplication, versioning). Le plan de sauvegarde cible
donc uniquement la base de métadonnées. Cibles indicatives pour ce prototype : **RPO ≤ 24 h** (perte de données
maximale tolérée), **RTO ≤ 1 h** (délai de remise en service).

**Méthode — sauvegarde logique `pg_dump`.** Portable, compressible, restaurable de façon granulaire. Sauvegarde
quotidienne, horodatée et compressée :

```bash
docker compose exec -T db \
  pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" \
  > "datashare-$(date +%Y%m%d-%H%M).dump"
```

> Format `-Fc` (custom, compressé) → restauration sélective via `pg_restore`. Pour un très gros volume, envisager
> en complément un **snapshot du volume Docker** (ou du disque managé côté hébergeur), plus rapide à restaurer.

**Planification.** Tâche **quotidienne** via `cron` (ou un timer `systemd`), en cohérence avec le pattern déjà en
place pour la purge (`PURGE_CRON`). Exemple (2 h du matin) :

```cron
0 2 * * *  /opt/datashare/scripts/backup-db.sh   # dump + compression + envoi hors-site
```

**Rétention.** Rotation type **7 quotidiennes / 4 hebdomadaires / 6 mensuelles**. Les sauvegardes sont **chiffrées**
(au repos) et stockées **hors-site** (ex. bucket S3 dédié, distinct de celui des fichiers), selon le principe de
moindre rétention. Purge automatique des sauvegardes au-delà de la fenêtre de rétention.

**Restauration.** Sur une base neuve (le schéma est reconstruit par la sauvegarde ; sinon appliquer d'abord
`prisma migrate deploy`) :

```bash
# 1. base cible vide
docker compose exec -T db createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
# 2. restauration
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  < datashare-AAAAMMJJ-HHMM.dump
# 3. redémarrer l'API puis vérifier l'intégrité applicative
docker compose restart back
```

**Vérification.** Une sauvegarde non testée n'est pas une sauvegarde : **test de restauration périodique**
(mensuel) sur une base jetable, contrôle du nombre de lignes des tables clés et d'un parcours applicatif de bout en
bout. Journaliser le succès/échec de chaque sauvegarde et alerter en cas d'échec.
