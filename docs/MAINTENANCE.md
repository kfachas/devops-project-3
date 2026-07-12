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
- Base PostgreSQL sur volume Docker persistant ; sauvegarde via `pg_dump` (procédure à formaliser pour la production).
