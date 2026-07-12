# PERF.md — Suivi de performance DataShare

## 1. Performance back-end — test de charge k6

Cible : un endpoint critique — les **métadonnées de téléchargement** `GET /api/files/:token`
(sur le chemin de chaque téléchargement, public, non authentifié).

Scénario exécuté :

```js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/files/${__ENV.TOKEN}`);
  check(res, { 'status 200': (r) => r.status === 200 });
}
```

- **Seuils visés** : p95 < 300 ms, taux d'erreur < 1 %.

### Résultats (2026-07-12, stack Docker complète, 50 utilisateurs virtuels pendant 30 s)

| Métrique | Mesure | Seuil | Verdict |
|----------|--------|-------|---------|
| Requêtes traitées | **92 228** (≈ **3 073 req/s**) | — | — |
| Latence p95 | **26,2 ms** | < 300 ms | ✅ |
| Latence médiane / moyenne / max | 14,8 ms / 16,2 ms / 253 ms | — | — |
| Taux d'erreur | **0,00 %** (0 / 92 228) | < 1 % | ✅ |

**Interprétation** — L'endpoint encaisse ~3 000 req/s avec une latence p95 à moins d'un dixième du
seuil : la chaîne nginx → NestJS → PostgreSQL (index sur `downloadToken`) n'est pas un facteur limitant
pour l'usage visé (démo/prototype). Le maximum observé (253 ms) correspond au démarrage de la montée
en charge (remplissage du pool de connexions).

**Méthode** — Le rate-limiting global (100 req/min/IP, protection anti-abus vérifiée par un test 429)
plafonnerait volontairement tout test de charge ; pour mesurer la performance **intrinsèque** de
l'endpoint, la limite a été relevée **pour la durée du bench uniquement** via la variable d'environnement
`THROTTLE_LIMIT` (introduite à cet effet, défaut inchangé : 100/min). La configuration normale a été
restaurée et **revérifiée** après le bench (100 requêtes → 200, puis 429).

## 2. Budget de performance front

Mesuré sur le build de production (`npm run build -w front`, Vite, 2026-07-12) :

| Métrique | Mesure actuelle | Budget |
|----------|-----------------|--------|
| Bundle initial (brut) | ~335 kB | < 500 kB (seuil indicatif) |
| Bundle initial (transfert gzip) | ~109 kB | — |
| Feuille de styles initiale | ~10 kB (2,4 kB gzip) | < 20 kB |

- Budget suivi sur le **build Vite** ; le bundle (335 kB brut / 109 kB gzip) reste **sous le seuil** indicatif de 500 kB.
- Cibles navigateur : **LCP < 2,5 s**, **TTI < 3,5 s** — audit **Lighthouse** recommandé sur l'app lancée
  (non bloquant pour le périmètre prototype ; le bundle mesuré et le p95 API ci-dessus couvrent le budget).

## 3. Métriques suivies
- API : temps de réponse (p95), taux d'erreur, débit (RPS).
- Front : taille du bundle, métriques Web Vitals (LCP/TTI).
- Transfert : taille des fichiers.
