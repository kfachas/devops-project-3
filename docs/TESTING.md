# TESTING.md — Plan de tests DataShare

> Périmètre testé : **US01 → US10**. Objectif de couverture : **≥ 70 %** — **atteint**.
> Dernière exécution complète : **2026-07-12** — **124 tests verts** (54 unitaires back + 21 e2e API + 49 front)
> + 1 parcours critique navigateur (Cypress, exécution manuelle — voir plus bas). Suite désormais rejouée
> automatiquement à chaque push (GitHub Actions, back+front, hors Cypress).

## Stratégie

Pyramide de tests : une majorité d'unitaires (logique isolée, rapides), une suite d'intégration API
qui rejoue les parcours réels contre une vraie base PostgreSQL, et des tests de composants/pages côté front.

| Niveau | Back (NestJS) | Front (React 19) |
|--------|---------------|--------------------|
| Unitaire | **Jest** (services, contrôleurs, guards, stratégie JWT, pilotes de stockage, filtre d'exception upload, nettoyage staging) | **Vitest + React Testing Library** (composants `src/ui`, contexte d'auth, route protégée, mutateur API) |
| Intégration | **Supertest** (`test/app.e2e-spec.ts`, base PostgreSQL réelle) | **React Testing Library** (pages avec hooks API mockés) |
| End-to-end navigateur | — | **Cypress** — 1 parcours critique (inscription → upload → lien → téléchargement → historique), exécution **manuelle** contre la stack Docker (jamais en CI) |

## Résultats (2026-07-01)

### Back — unitaires (Jest) : 54 tests, 13 suites ✅

```
Statements   : 93.42% ( 284/304 )
Branches     : 86.15% ( 56/65 )
Functions    : 84.28% ( 59/70 )
Lines        : 95.13% ( 254/267 )
```

Seuil **70 %** appliqué par `back/jest.config.js` (`coverageThreshold`) — le run **échoue** sous le seuil.

### Back — intégration API (Supertest) : 21 tests ✅

Parcours rejoués contre une **vraie base** (PostgreSQL jetable) : inscription (+409 doublon, +400 validation,
+400 whitelist), connexion (+401), upload connecté avec tags/mot de passe/expiration, upload **anonyme** (US07),
rejet `.exe` (403), rejet expiration > 7 j (400), **ownership** de l'historique (401 sans JWT, isolation entre
comptes), filtre par tag (US08), liste des tags, métadonnées, 404 lien inconnu, vérification du mot de passe,
téléchargement protégé (403 sans mot de passe → 200 avec, mot de passe transmis par **en-tête** `x-file-password`,
contenu vérifié), suppression (404 par un autre utilisateur → 200 par le propriétaire), lien expiré → **410 Gone**,
**purge** (US10), et **429** sur abus de login.

### Robustesse upload de fichiers volumineux

Un fichier dépassant **100 Mo** est rejeté proprement (`413 Payload Too Large`, message en français) par un
filtre d'exception dédié (`MulterExceptionFilter`), sans jamais atteindre le service métier. Les fichiers
temporaires orphelins (upload interrompu) sont balayés toutes les heures (`StagingCleanupService`). Le pilote
de stockage S3 annule l'upload multipart et nettoie le fichier temporaire en cas d'échec. Vérifié par unitaires
ciblés (pas de fixture de 100 Mo+ réelle, jugée inutilement lente pour la valeur apportée) : `multer-exception.filter.spec.ts`,
`staging-cleanup.service.spec.ts`, `s3-storage.service.spec.ts`.

### Front — Vitest + React Testing Library : 49 tests, 13 suites ✅

```
Statements   : 93.22% ( 936/1004 )
Branches     : 86.59% ( 168/194 )
Functions    : 77.94% ( 53/68 )
Lines        : 93.22% ( 936/1004 )
```

Seuil **70 %** appliqué par `front/vite.config.ts` (`coverage.thresholds`).

## Critères d'acceptation (mappés aux US — tous vérifiés par les tests ci-dessus)

| US | Critère d'acceptation | Vérifié par |
|----|------------------------|-------------|
| US01 | Fichier ≤ 100 Mo → token unique ; expiration ≤ 7 j ; mot de passe optionnel | e2e upload + unit `FilesService` |
| US02 | Lien valide → métadonnées ; expiré/invalide → erreur explicite (404/410) | e2e métadonnées/download + `DownloadPage` |
| US03 | Email unique (409) ; mot de passe ≥ 8 (400) ; hash argon2 jamais en clair | e2e + unit `AuthService` + `RegisterPage` |
| US04 | Identifiants valides → JWT ; invalides → 401 | e2e + unit + `LoginPage` |
| US05 | L'utilisateur ne voit **que** ses fichiers | e2e ownership + `SpacePage` |
| US06 | Suppression irréversible, restreinte au propriétaire | e2e + unit `remove` |
| US07 | Upload sans compte → lien ; non rattaché à un utilisateur | e2e anonyme + `OptionalJwtAuthGuard` |
| US08 | 0..N tags, ≤ 30 car. (rejet 400), dédupliqués ; filtrage historique | e2e tags + unit `parseTags` + `UploadPage`/`SpacePage` |
| US09 | Mot de passe requis au téléchargement (en-tête, hors URL) ; ≥ 6 car. ; hashé | e2e verify/download + `DownloadPage` |
| US10 | Purge automatique des fichiers expirés (binaire + métadonnées) | e2e purge + unit `TasksService` |

Côté front, la **validation des formulaires** est aussi testée (erreurs visibles à la soumission : requis,
email invalide, longueur minimale, correspondance des mots de passe).

## Instructions d'exécution

```bash
# Back — unitaires + couverture (aucune dépendance externe)
npm run test:cov -w @datashare/back

# Back — intégration API (nécessite une base PostgreSQL de test)
docker run -d --name datashare-pg-test -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=datashare_test -p 5434:5432 postgres:16-alpine
export DATABASE_URL="postgresql://test:test@localhost:5434/datashare_test?schema=public"
npm run prisma:deploy -w @datashare/back
npm run test:e2e -w @datashare/back
docker rm -f datashare-pg-test

# Front — Vitest + couverture
npm test -w front -- --coverage

# Tout-en-un, en conteneurs isolés (aucun outillage local requis à part Docker)
docker compose -f compose.test.yaml run --rm back-test
docker compose -f compose.test.yaml run --rm front-test
docker compose -f compose.test.yaml down -v

# E2E navigateur (Cypress) — nécessite la stack complète lancée, exécution manuelle uniquement
docker compose up -d --build
npm run cy:run -w front      # ou npm run cy:open -w front pour le mode interactif
```

## Intégration continue

Un workflow **GitHub Actions** (`.github/workflows/ci.yml`) rejoue automatiquement les suites Jest (back,
avec un service PostgreSQL éphémère) et Vitest (front) à **chaque push**. Le test Cypress n'y tourne **pas**
(nécessiterait de monter toute la stack Docker en CI ; reste une vérification manuelle avant livraison).

## Accessibilité (PSH)

Navigation clavier (composants natifs `button`/`input`/`select`), focus visible (`:focus-visible` + anneau),
labels explicites et `aria-selected` sur le filtre segmenté. Audit **Lighthouse Accessibility** recommandé
sur l'app lancée.

## Couverture — synthèse

- Back : seuil 70 % **imposé** (`back/jest.config.js`, build de test échoue en dessous) ; mesuré **95 % lignes**.
- Front : seuil 70 % **imposé** (`front/vite.config.ts`) ; mesuré **93 % lignes** (rapport `front/coverage/`).
- Captures des rapports HTML incluses : [`reports/coverage-back.png`](./reports/coverage-back.png) et
  [`reports/coverage-front.png`](./reports/coverage-front.png) (rapports complets régénérables via
  `npm run test:cov -w @datashare/back` et `npm test -w front -- --coverage` → `back/coverage/`, `front/coverage/`).
