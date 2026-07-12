# REVUE-CODE-IA.md — Rapport de revue technique du code écrit par l'IA

> Revue exhaustive du projet DataShare menée avant livraison, portant sur le code produit avec
> assistance IA (voir posture décrite en §8 de la documentation technique). Ce rapport consigne la
> méthode, les constats confirmés et les corrections apportées.

## 1. Méthode

Revue en **trois passes** :

1. **Audit par dimensions** — huit relectures indépendantes et parallèles, chacune ciblant un axe :
   socle back (config, auth, guards), fichiers & stockage, front React, contrat OpenAPI/orval,
   infrastructure Docker, tests, cohérence documentation ↔ code, consistance transverse & sécurité.
2. **Vérification adversariale** — chaque constat matériel (sévérité moyenne ou plus) a été
   **contre-vérifié** par une relecture indépendante du fichier cité, chargée de le réfuter ;
   seuls les constats confirmés ont été retenus (**23 confirmés** sur l'ensemble remonté).
3. **Vérification d'exécution** — au-delà de la lecture : builds, suites de tests complètes,
   contrat OpenAPI régénéré et comparé, stack Docker relancée et parcours rejoués en réel
   (upload → bucket S3 → download, filtre par tag, rejets 403/410/413/429).

## 2. Constats confirmés et corrections

### Écarts documentation ↔ code (les plus nombreux)
| Constat | Correction |
|---|---|
| Contrôle « extension **+ MIME** » revendiqué à 5 endroits de la doc, alors que le code ne vérifie que l'extension | Doc corrigée : « contrôle par extension » (choix assumé, un MIME client étant falsifiable) |
| Comptes de tests faux et incohérents entre fichiers (41/93/98 annoncés vs réalité mesurée) | Chiffres régénérés depuis les sorties réelles de Jest/Vitest |
| « 0 vulnérabilité en production » alors que `npm audit` remonte 6 advisories transitives NestJS | SECURITY.md réécrit honnêtement : front livré à 0 vulnérabilité ; 6 advisories back transitives, **atténuées** (throttler, plafond d'upload, contrôle d'extension) et tracées pour le prochain major NestJS |
| Références mortes (`compose.dev.yaml`, collection Postman, « 3 fichiers compose ») | Supprimées ou remplacées par les commandes réelles |
| Deux arbres de documentation divergents (racine vs `docs/`) | Consolidés en une source unique dans `docs/` |

### Fonctionnel
| Constat | Correction |
|---|---|
| US08 (tags) implémentée et testée côté API mais **absente de l'interface** (aucun champ tags à l'upload, filtre codé en dur) | Champ tags ajouté à l'upload, filtre par tag alimenté par `GET /api/tags` dans « Mon espace », tests ajoutés |
| Limite de tag (30 caractères) définie dans les constantes partagées mais jamais appliquée | Validation ajoutée côté service (rejet 400), testée |

### Sécurité / robustesse
| Constat | Correction |
|---|---|
| Mot de passe de fichier transmis en **query string** au téléchargement (journalisé par nginx, historique navigateur) | Déplacé dans l'en-tête `x-file-password`, contrat OpenAPI régénéré, tests adaptés |
| Session front désynchronisée du token : à l'expiration du JWT, l'interface restait « connectée » | Intercepteur de réponse 401 : purge de session + redirection connexion |
| Fichiers orphelins possibles : écriture storage avant création en base (blob jamais purgé si la base échoue) ; suppression storage avant suppression base | Ordres inversés + nettoyage compensatoire en cas d'échec, testés |
| Upload > limite : message anglais brut du framework, fichiers partiels non nettoyés en staging, upload multipart S3 non annulé en cas d'échec | Filtre d'exception 413 dédié (message français), balayage horaire du staging, `abort()` S3 + nettoyage, le tout testé |
| Messages d'erreur génériques masquant la cause réelle (mot de passe trop court → « Échec du téléversement » ; 429 → « Identifiants invalides ») | Validation client explicite + remontée du message serveur + messages dédiés par statut (401/409/429), testés |

### Exemple antérieur, détecté par les tests (documenté en §8)
- **Rate-limiting inactif** : `ThrottlerModule` configuré sans brancher le `ThrottlerGuard` global — les
  décorateurs `@Throttle` étaient sans effet. Détecté à l'écriture des tests d'intégration, corrigé
  (`APP_GUARD`) et verrouillé par un test (429 sur abus de login).

## 3. Résultat après corrections

- **Toutes les suites vertes** après chaque lot de corrections (unitaires back, intégration API contre
  PostgreSQL réel, front, parcours Cypress) — chiffres à jour dans [`TESTING.md`](./TESTING.md).
- Contrat OpenAPI régénéré et client front re-généré (orval) après chaque changement d'API.
- Parcours critiques rejoués en réel sur la stack Docker (captures et vérifications consignées
  dans la documentation technique).

## 4. Enseignements

- La relecture seule ne suffit pas : plusieurs constats (throttler inactif, US08 absente de l'UI)
  n'étaient détectables que par **l'exécution** (tests d'intégration, parcours navigateur).
- Le risque principal du code assisté par IA observé ici n'est pas le bug franc mais **l'écart
  silencieux entre ce que la documentation affirme et ce que le code fait** — d'où la passe dédiée
  de réconciliation doc ↔ code, à rejouer avant chaque livraison.
