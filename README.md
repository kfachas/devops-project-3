# DataShare

Plateforme de transfert de fichiers (type WeTransfer). Monorepo **npm workspaces** :

- `back/` — API NestJS (auth JWT, upload/download, tags, purge planifiée, Prisma/PostgreSQL, Swagger)
- `front/` — SPA React 19 (Vite, design system maison, client d'API généré par orval)
- `shared/` — constantes de validation partagées (`@datashare/shared`)

## Prérequis

- **Docker Engine 24+** et **Docker Compose v2**
- (développement hors conteneur) **Node 20+**

## Démarrage avec Docker (recommandé)

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| Front (app) | http://localhost:4200 |
| API + Swagger | http://localhost:3000/api/docs |
| PostgreSQL | interne (service `db`) |

La **migration Prisma est appliquée automatiquement** au démarrage du back (`prisma migrate deploy`).
Le front (nginx) sert l'app et **proxifie `/api` vers le back**. Les **fichiers sont stockés sur un S3** émulé
par **LocalStack** (service `localstack`, bucket `datashare` créé au démarrage par `localstack/init-s3.sh`) ;
la base PostgreSQL persiste dans un volume Docker. Le stockage est **interchangeable** via `StorageService` :
mettre `STORAGE_DRIVER=local` sur le service `back` pour repasser au disque local.

### Utilisation

1. Ouvrir http://localhost:4200 → déposer un fichier via le bouton central (**avec ou sans compte**),
   choisir une expiration (≤ 7 jours), un mot de passe et des tags optionnels.
2. Copier le **lien de téléchargement** généré et le transmettre au destinataire — le lien ouvre une
   page publique de téléchargement (mot de passe demandé si le fichier est protégé).
3. Avec un compte (**Créer un compte** / **Se connecter**) : « **Mon espace** » liste vos fichiers,
   filtrables par statut et par tag, avec suppression définitive.
4. Les fichiers expirés sont **purgés automatiquement** ; leur lien renvoie une erreur explicite.

### Arrêt

```bash
docker compose down        # arrête les conteneurs
docker compose down -v     # + efface la base et les fichiers stockés
```

## Variables d'environnement (`.env`)

| Variable | Rôle |
|----------|------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Base PostgreSQL |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Signature et durée de vie des JWT |
| `FRONT_URL` | Origine du front (CORS + URL des liens de téléchargement) |
| `FRONT_PORT` | Port hôte du front (défaut 4200) |
| `PURGE_CRON` | Planification de la purge des fichiers expirés |

## Développement (hot reload) — back & front en natif

Le `docker compose up` ci-dessus sert la **démo / parité prod** : le front est un bundle Vite **déjà compilé**
(servi par nginx) et le back tourne sur son `dist` **compilé** → **pas de rechargement à chaud**. Pour
développer, on lance back et front **en natif** (HMR / `--watch`) et on ne garde de Docker que la **base** :

```bash
npm install                                   # installe les workspaces
cp .env.example .env                          # variables Docker (POSTGRES_*, DB_PORT=5433)
docker compose up -d db                       # juste Postgres, publié sur l'hôte en 5433
cp back/.env.example back/.env                # DATABASE_URL pointe déjà sur localhost:5433
npm run prisma:migrate -w @datashare/back     # applique la migration
npm run start:dev -w @datashare/back          # API sur :3000 (hot reload)
npm start -w front                            # front sur :4200 (HMR, proxy /api → :3000)
```

> **À savoir**
> - Ne pas lancer le Compose `back`/`front` **et** les versions natives en même temps (conflit `:3000` / `:4200`) :
>   `docker compose stop back front` au besoin (on garde `db`).
> - En natif, le **stockage est sur disque local** (`STORAGE_PATH`, pilote `local` par défaut). Le pilote
>   **S3/LocalStack** ne s'exerce que dans le **Compose complet** (le service `localstack` n'est pas exposé sur l'hôte).

## Contrat d'API (zéro duplication de types)

Le back génère l'OpenAPI, orval génère le client React (hooks TanStack Query) typé :

```bash
npm run api:spec -w @datashare/back   # → docs/openapi.json
npm run api:gen  -w front             # → front/src/api/ (hooks React Query + types)
```

## Tests

```bash
npm test -w @datashare/back           # Jest + Supertest
npm test -w front                     # Vitest + React Testing Library
```

Voir le dossier `docs/` : `DOCUMENTATION-TECHNIQUE.md`, `TESTING.md`, `SECURITY.md`, `PERF.md`, `MAINTENANCE.md`.
