# SECURITY.md — Garantie de sécurité DataShare

## 1. Scan de vulnérabilités des dépendances

Outil : **`npm audit`** — front et back en npm (monorepo workspaces), un seul outil couvre tout le projet.

### Résultats (2026-06-25)

| Périmètre | Commande | Résultat |
|-----------|----------|----------|
| **Front React — bundle navigateur** (react, react-dom, react-router, @tanstack/react-query, axios) | `npm audit --omit=dev -w front` | **0 vulnérabilité** sur le code livré |
| **Production** (front + back) | `npm audit --omit=dev` | **6** (1 modérée, 5 hautes) — toutes **transitives** via le framework NestJS (`multer`, `form-data`, `js-yaml`) |
| **Toutes dépendances** (dev incluses) | `npm audit` | surcroît **cantonné aux outils de build/test** (Vite, Vitest, orval), hors runtime |

### Analyse
- **Front (React) : 0 vulnérabilité** dans le bundle réellement servi au navigateur.
- **Back : 6 advisories transitives** (DoS multipart `multer`, injection CRLF `form-data`, DoS YAML `js-yaml`)
  héritées du framework NestJS ; leur correction exige une **montée majeure** de NestJS (cassante). En l'absence
  de correctif non-cassant, le risque est **atténué** : rate-limiting (`@nestjs/throttler`), plafond d'upload
  **100 Mo**, contrôle d'**extension** des fichiers, validation stricte des entrées. Bump majeur **tracé** dans `MAINTENANCE.md`.
- **Dev / outillage** : les vulnérabilités restantes vivent dans la chaîne de build/test (jamais déployée) →
  exposition runtime **nulle**.
- **Politique** : `npm audit` rejoué à chaque ajout de dépendance et avant livraison ; correctifs patch/minor
  appliqués sans délai ; advisory sans correctif non-cassant évaluée (exploitabilité réelle) puis atténuée et tracée.

## 2. Mesures de sécurité applicatives
*(détaillées dans la documentation technique §5 — rappel synthétique, toutes implémentées)*

- **Authentification JWT** (Passport) ; mots de passe utilisateur **et** fichier hashés en **argon2id** (`@node-rs/argon2`).
- **Validation** double : client (**formulaires contrôlés React**, règles partagées via `@datashare/shared`) + serveur (`ValidationPipe` `whitelist` + `forbidNonWhitelisted` + `class-validator`).
- **Tokens de téléchargement non-prédictibles** (`crypto.randomBytes(24)` en base64url) → non énumérables.
- **Mot de passe de fichier (US09) transmis par en-tête** `x-file-password` — **hors URL**, donc non journalisé dans les logs d'accès / l'historique navigateur.
- **Tags** bornés à **30 caractères** (rejet `400`) et dédupliqués (US08).
- **Expiration de session côté front** : une réponse `401` purge le token et redirige vers la connexion (pas d'état « connecté » fantôme).
- **Helmet** (en-têtes de sécurité), **CORS** restreint à l'origine du front, **HTTPS** en production.
- **Contrôle d'accès par propriété** : historique/suppression restreints au propriétaire (vérifié : un upload anonyme n'apparaît pas dans l'historique d'un compte ; appel sans token → 401).
- **Limites d'upload** : 100 Mo (Multer) ; extensions interdites (`.exe`, `.bat`, `.cmd`, …).
- **Rate-limiting** (`@nestjs/throttler`, `ThrottlerGuard` global + limites dédiées sur `login`/`upload`/`verify`) —
  endpoints exposés sans authentification (upload anonyme US07, vérification de mot de passe US09).
  **Vérifié par un test d'intégration** : l'abus de `login` finit en **429 Too Many Requests** (`back/test/app.e2e-spec.ts`).

## 3. Processus
- Scan de sécurité avant chaque merge ; toute découverte est triée (sévérité, exploitabilité) puis corrigée ou justifiée.
- Audit rejoué après chaque mise à jour de dépendances (voir `MAINTENANCE.md`).
