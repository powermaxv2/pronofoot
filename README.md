# PronoFoot

Pronostics football entre amis : **points virtuels uniquement**, aucun pari et aucun argent réel.
Ligue 1, Premier League, Liga, Serie A, Bundesliga et Ligue des Champions, ligues privées,
classements en direct, badges, notifications, et une interface très animée, pensée d'abord pour le mobile.

![PronoFoot](public/og.png)

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Stack et architecture](#stack-et-architecture)
3. [Démarrage rapide (développement)](#démarrage-rapide-développement)
4. [Variables d'environnement](#variables-denvironnement)
5. [Données football, quotas et tâches planifiées](#données-football-quotas-et-tâches-planifiées)
6. [Jeu de démonstration](#jeu-de-démonstration)
7. [Tests et qualité](#tests-et-qualité)
8. [Déploiement (Raspberry Pi 5 / Docker)](#déploiement-raspberry-pi-5--docker)
9. [Exploitation](#exploitation)
10. [Motion design](#motion-design)
11. [Structure du code](#structure-du-code)
12. [Limites connues et écarts avec le plan](#limites-connues-et-écarts-avec-le-plan)

---

## Fonctionnalités

**Joueurs** : connexion par lien magique (e-mail) ou Google, onboarding en 3 étapes (pseudo, avatar, club de cœur),
profil public avec statistiques (taux de réussite, série en cours et record, meilleur championnat, courbe de points),
badges, historique, paramètres (notifications, thème, suppression du compte).

**Matchs** : onglets À venir / En direct / Terminés, filtres par compétition et par jour, détail du match
(chronologie, compositions, forme sur les 5 derniers matchs, face-à-face, classement), scores en direct rafraîchis
toutes les 60 s pendant les matchs, pages de classement officiel des championnats.

**Pronostics** : 1N2 obligatoire, score exact facultatif et cohérent avec le 1N2, modifiables jusqu'au coup d'envoi.
Le verrouillage est vérifié **côté serveur**, dans la transaction qui écrit.

| Cas                                   | Points                             |
| ------------------------------------- | ---------------------------------- |
| Bon résultat (1N2)                    | 3                                  |
| Score exact                           | 3 + 5 = 8                          |
| Joker (un par journée de championnat) | × 2 (16 maximum)                   |
| Match reporté ou annulé               | prono annulé, 0 point, joker rendu |

Seul le résultat au temps réglementaire compte : les prolongations et tirs au but sont ignorés.
Les points sont calculés automatiquement après chaque match. La répartition 1/N/2 de la communauté et les scores
les plus joués ne sont dévoilés qu'après le verrouillage.

**Social** : ligues privées (code d'invitation à 8 caractères, lien de partage, gestion des membres, transfert de
présidence), classements général et par ligue sur la saison, le mois ou la journée, avec variation depuis la veille.
12 badges (séries, scores exacts, joker, contre-pied, globe-trotter, roi du mois…). Notifications in-app, Web Push et
e-mail (au choix) : rappel 1 h avant un match non pronostiqué, résultat des pronos, badges, nouvelles de la ligue.

**Administration** : vue d'ensemble (activité, quotas des API, services configurés), gestion des joueurs (rôle,
désactivation), lancement manuel de chaque tâche, recalcul complet des points, saisie manuelle d'un résultat,
journal des exécutions.

**Technique** : PWA installable (manifest, service worker, page hors ligne, push), mode sombre/clair, interface
100 % en français, rate limiting, cache des appels aux API foot, en-têtes de sécurité (CSP, etc.).

---

## Stack et architecture

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS v4 + composants shadcn/ui (Radix) · Motion (ex-Framer Motion) ·
GSAP + ScrollTrigger · Lottie · Prisma 6 + PostgreSQL 16 · Auth.js v5 · Zod · TanStack Query · croner · Vitest · Playwright.

```
Navigateur (PWA) ──► web : Next.js (Server Components, Server Actions, routes /api de polling)
                          │  lit/écrit PostgreSQL — ne contacte jamais l'API foot pour un visiteur
                          ▼
                    PostgreSQL ◄── worker : node dist/worker.mjs (tâches planifiées)
                                       │  sync live / calendrier / classements / compos,
                                       │  calcul des points, rappels, maintenance
                                       ▼
                    API-Football (principal) ⇄ football-data.org (repli / direct)
                    avec cache Postgres (ApiCache) et compteur de quota (ApiUsage)
```

La logique métier (barème, verrouillage, séries, badges, départages) est **pure** et testée unitairement dans
`src/server/domain/`.

---

## Démarrage rapide (développement)

Prérequis : Node.js 22+, pnpm 10 (`corepack enable`), Docker (pour Postgres et Mailpit) ou un Postgres 16 local.

```bash
git clone <dépôt> pronofoot && cd pronofoot
pnpm install
cp .env.example .env                     # puis renseigner AUTH_SECRET (openssl rand -base64 32)

# Postgres + Mailpit (boîte mail locale) ; crée aussi les bases de test
docker compose -f docker-compose.dev.yml up -d
# Dans .env : DATABASE_URL=postgresql://pronofoot:pronofoot@localhost:5432/pronofoot
#             EMAIL_SERVER=smtp://localhost:1025

pnpm db:migrate                          # applique les migrations
pnpm db:seed                             # saison complète, 20 joueurs, 3 ligues
pnpm dev                                 # http://localhost:3000
pnpm worker                              # (autre terminal) tâches planifiées
```

Pour se connecter : saisir une adresse sur `/connexion`, puis ouvrir le lien reçu dans Mailpit
(<http://localhost:8025>). Les comptes du jeu de démonstration sont listés [plus bas](#jeu-de-démonstration).

### Scripts

| Commande                                 | Rôle                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Développement, build de production (Next + worker), serveur de production   |
| `pnpm worker`                            | Worker en mode développement (tsx) ; en production : `node dist/worker.mjs` |
| `pnpm db:migrate` / `pnpm db:deploy`     | Nouvelle migration (dev) / application des migrations (prod)                |
| `pnpm db:seed`                           | Jeu de démonstration (refuse une base non vide sauf `SEED_RESET=true`)      |
| `pnpm lint` / `pnpm typecheck`           | ESLint + Prettier / TypeScript                                              |
| `pnpm test`                              | Tests unitaires + intégration (Postgres)                                    |
| `pnpm test:e2e`                          | Tests Playwright (après `pnpm build`)                                       |
| `pnpm check`                             | lint + types + tests unitaires et d'intégration                             |
| `pnpm vapid`                             | Génère les clés Web Push                                                    |
| `pnpm assets`                            | Régénère icônes, animations Lottie et avatars (`public/`)                   |

---

## Variables d'environnement

Toutes sont documentées dans [`.env.example`](.env.example) et validées au démarrage par Zod (`src/lib/env.ts`).

| Variable                                                             | Obligatoire          | Description                                                                                  |
| -------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                       | oui                  | URL PostgreSQL                                                                               |
| `APP_URL`                                                            | oui                  | URL publique, sans slash final (liens des e-mails et notifications)                          |
| `AUTH_SECRET`                                                        | oui                  | Secret des sessions : `openssl rand -base64 32`                                              |
| `AUTH_TRUST_HOST`                                                    | derrière un proxy    | `true`                                                                                       |
| `EMAIL_SERVER`, `EMAIL_FROM`                                         | pour le lien magique | URL SMTP (`smtp://…` ou `smtps://user:pass@hôte:465`) et expéditeur                          |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`                               | non                  | Connexion Google ; redirection autorisée : `{APP_URL}/api/auth/callback/google`              |
| `ADMIN_EMAILS`                                                       | conseillé            | E-mails promus administrateurs à la connexion (séparés par des virgules)                     |
| `API_FOOTBALL_KEY`                                                   | non*                 | Clé api-sports.io (offre gratuite : 100 requêtes/jour)                                       |
| `API_FOOTBALL_DAILY_BUDGET`                                          | non                  | Budget journalier utilisé par PronoFoot (défaut 90)                                          |
| `FOOTBALL_DATA_KEY`                                                  | non*                 | Clé football-data.org (offre gratuite : 10 requêtes/minute)                                  |
| `FOOTBALL_DATA_MINUTE_BUDGET`                                        | non                  | Budget par minute (défaut 9)                                                                 |
| `FOOTBALL_LIVE_PROVIDER`                                             | non                  | Fournisseur interrogé en premier pour le direct : `football-data` (défaut) ou `api-football` |
| `FOOTBALL_SEASON`                                                    | non                  | Année de début de saison suivie (sinon déduite de la date)                                   |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | non                  | Notifications push (`pnpm vapid`)                                                            |
| `UPLOAD_DIR`                                                         | non                  | Dossier des avatars envoyés (volume `/data` en Docker)                                       |
| `RATE_LIMIT_DISABLED`                                                | non                  | `true` uniquement pour les tests end-to-end                                                  |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`                  | Docker               | Identifiants du conteneur Postgres                                                           |
| `DOMAIN`, `ACME_EMAIL`                                               | profil HTTPS         | Domaine et e-mail Let's Encrypt pour Caddy                                                   |

\* Sans aucune clé, l'application fonctionne sur les données en base (seed, saisie manuelle des résultats par un
admin) : les synchronisations sont simplement ignorées et journalisées comme telles.

---

## Données football, quotas et tâches planifiées

- **Les visiteurs ne déclenchent jamais d'appel aux API.** Le polling du navigateur (60 s) interroge les routes de
  PronoFoot, alimentées par le worker.
- **Bascule automatique** : chaque tâche essaie les fournisseurs configurés dans l'ordre et passe au suivant en
  cas de quota épuisé, d'erreur réseau ou de réponse invalide (toutes les réponses sont validées par Zod).
- **Quota** : chaque appel est compté dans `ApiUsage` (par jour pour API-Football, par minute pour football-data).
  **Cache** : réponses stockées dans `ApiCache` avec une durée adaptée (calendrier 6 h, compos 10 min,
  face-à-face 7 j) ; une réponse expirée est resservie si le fournisseur est indisponible.
- **Pourquoi le direct passe par football-data.org** : 100 requêtes par jour ne permettent pas un rafraîchissement
  toutes les minutes pendant une soirée de matchs. football-data autorise 10 requêtes par minute. API-Football est
  réservée au calendrier, aux compositions et aux face-à-face.
- Le rapprochement des clubs entre fournisseurs se fait par identifiant, puis par nom normalisé avec une table
  d'alias (`src/server/football/teams-data.ts`).

| Tâche            | Planification (Europe/Paris)                                                | Rôle                                                         |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `sync:live`      | chaque minute, **seulement si un match est en cours** (H-5 min → H+150 min) | scores, minute, buts                                         |
| `score`          | toutes les 2 min                                                            | points, badges, notifications de résultat                    |
| `reminders`      | toutes les 5 min                                                            | rappel H-1 des matchs non pronostiqués                       |
| `sync:details`   | toutes les 10 min                                                           | compositions, face-à-face                                    |
| `sync:fixtures`  | 04:10                                                                       | calendrier J-3 → J+14                                        |
| `sync:standings` | toutes les 6 h                                                              | classements (recalculés depuis les résultats sans clé d'API) |
| `cleanup`        | 03:30                                                                       | purge (cache, journaux, jetons), roi du mois écoulé          |

Chaque exécution est journalisée (`CronRun`, visible dans l'admin). Un verrou consultatif Postgres empêche deux
exécutions simultanées d'une même tâche.

---

## Jeu de démonstration

`pnpm db:seed` génère, de façon reproductible (graine `SEED`, date de référence `SEED_NOW`) :

- les 6 compétitions et **110 clubs** (noms, abréviations, couleurs ; écussons générés, remplacés par les logos
  officiels dès la première synchronisation) ;
- **une saison 2026-27 complète** : 1 896 matchs, championnats en aller-retour (Ligue 1 et Bundesliga
  34 journées, autres 38), phase de ligue de C1 sur 8 journées ; week-ends réalistes, trêves internationales ;
- les résultats des matchs déjà joués à la date du seed (modèle de Poisson selon la force des clubs) ;
- **20 joueurs** aux profils variés, **3 ligues**, plus de 2 000 pronostics **notés par le vrai moteur de calcul**,
  badges et notifications cohérents.

Comptes (connexion par lien magique) : `admin@pronofoot.local` (administrateur, ou la première adresse de
`ADMIN_EMAILS`), `lea.ol@pronofoot.local`, `karim10@pronofoot.local`, `tom.kop@pronofoot.local`,
`juliefcn@pronofoot.local`… (pseudo avec `_` remplacé par `.`, domaine `@pronofoot.local`).

Aucun match « en direct » n'est inventé : sans clé d'API, le direct n'apparaît qu'avec de vraies données ou une
saisie manuelle par un administrateur.

---

## Tests et qualité

| Suite                                         | Contenu                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unitaires** (Vitest)                        | barème, verrouillage, cohérence 1N2/score, séries et statistiques, badges, départages, dates Europe/Paris, calendrier du seed, rapprochement des clubs, normalisation des deux API (réponses enregistrées), rate limiting, validations, presets de motion                                                |
| **Intégration** (Vitest + Postgres)           | calcul des points idempotent et sérialisé, joker unique par journée sous concurrence, joker rendu/déplacé, verrouillage serveur (avant, pile au coup d'envoi, après), écriture refusée pendant le calcul, import multi-fournisseurs, quota et cache, classements et variation, ligues, verrou des tâches |
| **End-to-end** (Playwright, mobile + desktop) | inscription par lien magique et onboarding, pronostic avec joker et modification, match verrouillé, création et adhésion à une ligue, classements, profil, administration, mouvement réduit                                                                                                              |

Les tests d'intégration utilisent `DATABASE_URL_TEST` (le nom de la base doit contenir « test ») et les tests e2e
`DATABASE_URL_E2E` (nom contenant « e2e ») : leurs tables sont vidées puis reseedées. La CI GitHub Actions
(`.github/workflows/ci.yml`) enchaîne lint, types, unitaires, intégration, build puis e2e.

---

## Déploiement (Raspberry Pi 5 / Docker)

L'image est multi-architecture (`node:22-bookworm-slim`, moteurs Prisma `linux-arm64` et `debian x64`).
Sur le Pi (Raspberry Pi OS 64 bits, Docker installé) :

```bash
git clone <dépôt> pronofoot && cd pronofoot
cp .env.example .env
# Renseigner au minimum : POSTGRES_PASSWORD, APP_URL, AUTH_SECRET, EMAIL_SERVER, ADMIN_EMAILS
# et idéalement API_FOOTBALL_KEY / FOOTBALL_DATA_KEY, clés VAPID (pnpm vapid, ou npx web-push generate-vapid-keys)

docker compose up -d --build          # db → migrate (migrations) → web + worker
docker compose run --rm migrate pnpm db:seed   # facultatif : jeu de démonstration sur base vide
```

L'application écoute sur le port `3000` (modifiable via `WEB_PORT`). Services :

| Service   | Rôle                                                                          |
| --------- | ----------------------------------------------------------------------------- |
| `db`      | PostgreSQL 16, volume `pgdata`                                                |
| `migrate` | applique les migrations puis s'arrête (image `tools`, qui sert aussi au seed) |
| `web`     | serveur Next.js autonome, avatars dans le volume `uploads`                    |
| `worker`  | tâches planifiées (même image, commande `node dist/worker.mjs`)               |
| `caddy`   | profil `https` : reverse proxy avec certificat Let's Encrypt automatique      |

### HTTPS

HTTPS est **nécessaire** pour la PWA, les notifications push et la connexion Google.

- **Caddy intégré** : faire pointer un domaine vers le Pi (ports 80/443 ouverts), définir `DOMAIN`, `ACME_EMAIL` et
  `APP_URL=https://<domaine>`, puis `docker compose --profile https up -d`.
- **Cloudflare Tunnel** (sans ouverture de ports) : `cloudflared tunnel --url http://localhost:3000`, et
  `APP_URL` = l'URL du tunnel.

### Mise à jour

```bash
git pull && docker compose up -d --build     # les migrations s'appliquent automatiquement
```

---

## Exploitation

- **Sauvegarde** : `docker compose exec db pg_dump -U pronofoot pronofoot | gzip > sauvegarde-$(date +%F).sql.gz`
- **Restauration** : `gunzip -c sauvegarde.sql.gz | docker compose exec -T db psql -U pronofoot pronofoot`
- **Journaux** : `docker compose logs -f worker` (tâches) et `docker compose logs -f web`
- **API indisponible** : l'admin peut saisir un résultat (Administration → Résultats) ; il est protégé des
  synchronisations, les points et le classement sont recalculés et les joueurs notifiés. « Rendre à l'API »
  réactive la synchronisation du match.
- **Recalcul** : Administration → Synchronisation → « Recalculer » (idempotent).
- **Ressources** : Postgres est limité à `shared_buffers=128MB`, 60 connexions ; l'ensemble tient confortablement
  sur un Pi 5 de 4 Go.

---

## Motion design

Tous les réglages sont centralisés dans [`src/lib/motion.ts`](src/lib/motion.ts) : durées, courbes, ressorts
(`snappy`, `bouncy`, `gentle`, `layout`, `counter`, `roller`), variants et leurs équivalents réduits.
Les composants se trouvent dans `src/components/motion/`.

| Effet                            | Où                                      | Technique                                                                        |
| -------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| Transitions de page              | toute l'application                     | `AnimatePresence` + routeur figé pendant la sortie                               |
| Carte → détail                   | liste des matchs, tableau de bord       | route interceptée + `layoutId` (carte, écussons, score)                          |
| Listes en cascade                | matchs, pronos, ligues, badges          | `staggerChildren` (12 éléments maximum)                                          |
| Classement qui se réordonne      | classements, ligues                     | `layout="position"` + ressort, flash vert/rouge                                  |
| Compteurs                        | points, stats, pourcentages             | ressort écrit directement dans le DOM (aucun re-render)                          |
| Barres de la communauté          | détail du match, landing                | `scaleX` à l'entrée dans le viewport (GSAP sur la landing)                       |
| LIVE qui pulse, but qui rebondit | cartes et détail                        | keyframes CSS ; `scale` 1 → 1,4 → 1                                              |
| Confettis / secousse             | résultat d'un prono                     | `canvas-confetti` (score exact), `x` en 400 ms (prono raté) — une seule fois     |
| Hero                             | landing                                 | ballon Lottie + parallax GSAP ScrollTrigger (tribunes, terrain, titre, badges)   |
| Micro-interactions               | boutons, cartes, interrupteurs, onglets | ressort au press, tilt 3D, pastilles `layoutId`                                  |
| Sélecteur de score               | pronostic                               | bande de chiffres translatée par un ressort (boutons, glisser, molette, clavier) |
| Skeletons, toasts                | chargements, actions                    | shimmer `translateX` ; Sonner + icônes dessinées (`pathLength`)                  |

**Accessibilité** : `prefers-reduced-motion` est respecté partout. `MotionConfig reducedMotion="user"`, des variants
réduits (fondu seul, transformations neutres et instantanées), le tilt, la parallax, les confettis et les boucles
CSS sont désactivés, et Lottie est figé sur sa première image. Un test end-to-end le vérifie.

**Performance** : seuls `transform` et `opacity` sont animés. `LazyMotion` charge les fonctionnalités à la demande,
et GSAP, Lottie et les confettis sont chargés dynamiquement. Aucune interaction n'attend la fin d'une animation.

---

## Structure du code

```
prisma/                 schéma, migrations, seed (calendrier, joueurs, ligues)
public/                 icônes PWA, Lottie, avatars, service worker (sw.js)
scripts/                génération des assets, build du worker, clés VAPID
src/app/                routes (marketing), (auth), (app) avec @modal, api/
src/components/motion/  composants d'animation réutilisables
src/components/features/ match, prediction, leaderboard, league, profile, admin…
src/lib/                motion.ts, dates (Europe/Paris), env (Zod), validation, gsap
src/server/domain/      logique métier pure (barème, verrouillage, stats, badges…)
src/server/football/    fournisseurs, quota, cache, import, référentiel des clubs
src/server/services/    points, badges, classements, ligues, pronostics, standings
src/server/jobs/        tâches planifiées et exécuteur journalisé
src/worker/             point d'entrée du worker
tests/                  unit/, integration/, e2e/ (+ serveur SMTP de test)
```

---

## Limites connues et écarts avec le plan

- **API foot réelles** : les deux fournisseurs sont implémentés et testés sur des réponses enregistrées au format
  documenté. Aucune clé n'était disponible pendant le développement : le premier appel réel est à vérifier (journal
  de l'admin). Les clubs du seed suivent les compositions 2025-26 ; les promus et relégués 2026-27 sont créés
  automatiquement à la première synchronisation.
- **Image Docker** : le Dockerfile et le compose sont prêts pour l'ARM64, et la disposition de l'image (serveur autonome +
  worker) a été reproduite et lancée localement. En revanche, `docker build` n'a pas pu être exécuté dans
  l'environnement de développement (pas de démon Docker) : lancez un premier build sur le Pi.
- **Rate limiting** en mémoire : adapté à une instance unique, comme sur un Raspberry Pi. Pour plusieurs instances, il
  faudrait un stockage partagé.
- **Performances** : pas de mesure Lighthouse automatisée ; les principes (transform/opacity, chargement différé)
  sont appliqués partout.
- **Icônes des toasts** : tracés SVG animés (`pathLength`) plutôt que des Lottie, pour la légèreté ; Lottie reste
  utilisé pour le hero, les états vides et la page hors ligne.
- **Rappels H-1** : envoyés aux joueurs qui ont déjà pronostiqué dans la compétition cette saison, ou dont le club de
  cœur joue, pour éviter de notifier chaque joueur pour chaque match.
