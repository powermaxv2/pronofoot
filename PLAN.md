# PronoFoot — Plan de réalisation

> Site de pronostics football entre amis. **Points virtuels uniquement** : pas d'argent, pas de cotes, pas de pari.
> Le motion design est une exigence produit au même titre que les fonctionnalités.

Statut : **validé et réalisé** (choix retenus pour le § 12 : recommandations 1 à 7). Documentation d'exploitation : README.md.

---

## 1. Vue d'ensemble

```
                    ┌──────────────────────────── docker-compose (ARM64 / x86_64) ───────────────────────────┐
                    │                                                                                        │
  Navigateur ──────►│  web  (Next.js 15, App Router, Node runtime)                                           │
  (PWA + SW)        │   ├─ Server Components  → lecture Prisma                                               │
                    │   ├─ Server Actions     → mutations (prono, ligue, profil) + Zod + rate limit          │
                    │   ├─ Route Handlers /api → polling client (live, classements, notifications)           │
                    │   └─ Auth.js v5 (magic link + Google) — adaptateur Prisma                              │
                    │                                                                                        │
                    │  worker (même image, autre commande) — planificateur node-cron                         │
                    │   ├─ sync:fixtures / sync:live / sync:standings / sync:details                         │
                    │   ├─ score (calcul des points + badges + notifications)                                │
                    │   └─ reminders / cleanup  → journal dans CronRun                                       │
                    │                                                                                        │
                    │  postgres:16          migrate (job ponctuel : prisma migrate deploy)                   │
                    │  mailpit (profil dev) — boîte mail locale pour les magic links                         │
                    └────────────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
               FootballProvider (interface) ── ApiFootballProvider (api-sports.io)   ← principal
                                            └─ FootballDataProvider (football-data.org) ← repli
               + cache Postgres (ApiCache) + compteur de quota (ApiUsage)
```

Principes :
- **Le client ne parle jamais à l'API foot.** Tout passe par le worker → Postgres. Le polling client (60 s) interroge nos propres routes, servies depuis la base : zéro coût de quota par visiteur.
- **Logique métier pure et testable** dans `src/server/domain/*` (barème, verrouillage, séries, badges, classements) — sans Prisma ni Next, testée unitairement.
- **Un seul fuseau de référence : `Europe/Paris`** pour l'affichage, les classements mensuels et les journées.

---

## 2. Stack et versions

| Domaine | Choix | Remarque |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript `strict` + `noUncheckedIndexedAccess` | |
| Gestionnaire | pnpm | lockfile commité, `corepack` dans Docker |
| UI | Tailwind CSS v4 + shadcn/ui (Radix) | tokens CSS via `@theme` |
| Animations UI | **Motion** (`motion/react`, nouveau nom de Framer Motion, même API) | `LazyMotion` + `domAnimation` pour alléger le bundle |
| Scroll | GSAP 3 + ScrollTrigger + `@gsap/react` (`useGSAP`) | chargé dynamiquement, landing + barres |
| Illustrations | `lottie-react` (import dynamique) | animations Lottie **créées pour le projet** (pas d'asset sous licence tierce) |
| Confettis | `canvas-confetti` | import dynamique, désactivé en reduced-motion |
| Données | Prisma 6 + PostgreSQL 16 | |
| Auth | Auth.js v5 (`next-auth@5`) — Nodemailer (magic link) + Google | sessions en base |
| Validation | Zod (formulaires, actions, **réponses des API externes**) | |
| Cache client | TanStack Query v5 | `refetchInterval` adaptatif |
| Dates | date-fns + `@date-fns/tz`, locale `fr` | |
| Push | `web-push` (VAPID) | |
| Images | `sharp` (redimensionnement des avatars) | fonctionne sur ARM64 |
| Tests | Vitest (unitaires + intégration Postgres), Playwright (e2e) | |
| Qualité | ESLint (config Next + TS strict), Prettier, `tsc --noEmit` | |

---

## 3. Arborescence cible

```
.
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed/                     # index.ts + données : clubs, calendrier, utilisateurs, ligues
├─ public/
│  ├─ manifest.webmanifest, icons/, lottie/ (ballon, trophée, vide)
│  └─ sw.js                     # généré au build (voir § 9)
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/page.tsx                 # landing (hero Lottie + parallax GSAP)
│  │  ├─ (auth)/connexion/…                   # connexion, vérification e-mail
│  │  ├─ (app)/layout.tsx                     # shell connecté : nav, transitions, toasts
│  │  ├─ (app)/accueil/…                      # tableau de bord
│  │  ├─ (app)/matchs/page.tsx                # liste + filtres
│  │  ├─ (app)/matchs/[id]/page.tsx           # détail (navigation directe)
│  │  ├─ (app)/@modal/(.)matchs/[id]/page.tsx # détail intercepté → morphing carte → détail
│  │  ├─ (app)/pronostics/…  classements/…  ligues/…  profil/…  notifications/…
│  │  ├─ (app)/championnats/[code]/…          # classement officiel d'un championnat
│  │  ├─ admin/…                              # dashboard admin (rôle ADMIN)
│  │  ├─ api/…                                # route handlers (polling, auth, push)
│  │  └─ hors-ligne/page.tsx                  # fallback PWA
│  ├─ components/
│  │  ├─ ui/                    # shadcn (générés puis thémés)
│  │  ├─ motion/                # PageTransition, Stagger, AnimatedNumber, Tilt, ScoreRoller,
│  │  │                         # LivePulse, ProgressBar, Confetti, Shake, Shimmer…
│  │  └─ features/              # match/, prediction/, leaderboard/, league/, profile/, admin/
│  ├─ lib/
│  │  ├─ motion.ts              # ★ presets motion (§ 7)
│  │  ├─ gsap.ts, utils.ts, dates.ts, env.ts (validation Zod des variables d'env)
│  ├─ server/
│  │  ├─ db.ts, auth.ts, rate-limit.ts
│  │  ├─ domain/                # scoring.ts, locking.ts, streaks.ts, badges.ts, leaderboard.ts
│  │  ├─ football/              # provider.ts, api-football.ts, football-data.ts, cache.ts, quota.ts, schemas.ts
│  │  ├─ jobs/                  # sync-*.ts, score.ts, reminders.ts, cleanup.ts, runner.ts
│  │  └─ notifications/         # in-app, web-push, e-mail
│  └─ worker/index.ts           # point d'entrée du worker (node-cron)
├─ tests/ unit/  integration/  e2e/
├─ Dockerfile, docker-compose.yml, docker-compose.dev.yml
├─ .env.example, README.md, PLAN.md
```

---

## 4. Modèle de données (Prisma)

Extrait structurant (les modèles Auth.js `Account`, `Session`, `VerificationToken` sont standards) :

```prisma
enum Role            { USER ADMIN }
enum MatchStatus     { SCHEDULED LIVE HALFTIME FINISHED POSTPONED CANCELLED }
enum Outcome         { HOME DRAW AWAY }                // 1 / N / 2
enum PredictionState { PENDING WON EXACT LOST VOID }
enum NotificationType{ REMINDER RESULT BADGE LEAGUE SYSTEM }
enum CronStatus      { RUNNING SUCCESS ERROR SKIPPED }

model User {
  id, email @unique, emailVerified, name, image, role Role @default(USER)
  username       String?  @unique        // pseudo (3–20, [a-z0-9_-])
  avatarUrl      String?
  favoriteTeamId String?  → Team
  onboardedAt, createdAt
  predictions, leagueMemberships, badges, notifications, pushSubscriptions
}

model Competition { id, code @unique (FL1|PL|PD|SA|BL1|CL), name, country, emblemUrl,
                    apiFootballId Int?, footballDataCode String?, currentSeasonId }
model Season      { id, competitionId, year Int (2026 = 2026-27), startDate, endDate, currentRound }
model Team        { id, name, shortName, tla, crestUrl?, primaryColor, secondaryColor,
                    apiFootballId Int? @unique, footballDataId Int? @unique }

model Match {
  id, seasonId, competitionId, round Int, roundLabel String   // "Journée 7", "Phase de ligue — J3"
  kickoffAt DateTime, status MatchStatus, minute Int?
  homeTeamId, awayTeamId, homeScore Int?, awayScore Int?, htHome?, htAway?
  venue?, referee?
  lineups Json?  events Json?  // compos + buts/cartons, validés par Zod à l'écriture
  apiFootballId Int? @unique, footballDataId Int? @unique
  scoredAt DateTime?           // points distribués (idempotence du job de calcul)
  lastSyncedAt DateTime?
  @@index([kickoffAt]) @@index([competitionId, round]) @@index([status])
}

model Standing { seasonId, teamId, position, played, won, drawn, lost, goalsFor, goalsAgainst,
                 points, form String? /* "WWDLW" */ ; @@unique([seasonId, teamId]) }

model Prediction {
  id, userId, matchId
  outcome   Outcome           // 1N2 obligatoire
  homeScore Int?  awayScore Int?   // score exact (optionnel, cohérent avec outcome — cf. § 5)
  isJoker   Boolean @default(false)
  jokerKey  String?           // "userId:competitionId:seasonId:round" si joker, sinon NULL
  state     PredictionState @default(PENDING)
  points    Int @default(0)
  breakdown Json?             // { result: 3, exact: 5, multiplier: 2 }
  createdAt, updatedAt, scoredAt?
  @@unique([userId, matchId])
  @@unique([jokerKey])        // ← unicité du joker garantie par Postgres (NULL multiples autorisés)
  @@index([matchId]) @@index([userId, scoredAt])
}

model League       { id, name, slug @unique, inviteCode @unique (8 car. sans ambiguïté),
                     ownerId, emoji/couleur, createdAt }
model LeagueMember { leagueId, userId, role (OWNER|MEMBER), joinedAt ; @@id([leagueId, userId]) }

model Badge        { code @id, name, description, icon, tier (BRONZE|ARGENT|OR) }
model UserBadge    { userId, badgeCode, earnedAt, matchId? ; @@id([userId, badgeCode]) }

model Notification { id, userId, type, title, body, href?, readAt?, createdAt
                     dedupeKey String? @unique }   // ex. "reminder:{userId}:{matchId}"
model PushSubscription { id, userId, endpoint @unique, p256dh, auth, createdAt }

model CronRun  { id, job, status CronStatus, startedAt, finishedAt?, durationMs?, message?,
                 stats Json?, trigger (SCHEDULE|MANUAL) ; @@index([job, startedAt]) }
model ApiCache { key @id, provider, payload Json, fetchedAt, expiresAt }
model ApiUsage { provider, day DateTime @db.Date, count Int ; @@id([provider, day]) }
```

Choix notables :
- **Joker** : la contrainte `@@unique([jokerKey])` rend impossible deux jokers sur la même journée, même en cas de requêtes concurrentes.
- **Classements** calculés en SQL (`GROUP BY` sur `Prediction.points` filtré par période / ligue / journée) avec index adaptés ; pas de table dénormalisée tant que les volumes restent « entre amis ».
- `lineups` / `events` en JSON typé Zod : données affichées telles quelles, jamais requêtées.

---

## 5. Règles métier

### 5.1 Pronostic
- Un prono = **1N2 obligatoire** + **score exact optionnel**. Si un score est saisi, il doit être cohérent avec le 1N2 (2-1 ⇒ `HOME`) ; l'interface déduit le 1N2 du score pour éviter toute incohérence, Zod le revérifie côté serveur.
- **Verrouillage serveur** : création / modification / suppression refusées si `now >= kickoffAt` **ou** `status ≠ SCHEDULED`. Vérifié dans la transaction qui écrit (lecture du match `FOR UPDATE`), jamais sur la seule foi du client. L'horloge est injectable pour les tests.
- Le bouton se verrouille aussi côté client (compte à rebours), mais c'est cosmétique.

### 5.2 Barème
| Cas | Points |
|---|---|
| Mauvais résultat | 0 |
| Bon résultat (1N2) | **3** |
| Score exact (implique le bon résultat) | 3 + **5 bonus** = **8** |
| Joker | total × **2** (max 16) |
| Match reporté / annulé | prono `VOID`, 0 pt, **joker rendu** (jokerKey libéré) |

- Le résultat retenu est celui du **temps réglementaire (90 min + arrêts)** ; prolongations et tirs au but ignorés (cas de la Ligue des Champions).
- **Joker : 1 par journée** = 1 par `(compétition, saison, journée)` (voir question § 12.2).

### 5.3 Calcul automatique
Job `score` (toutes les 2 min) : matchs `FINISHED` avec `scoredAt IS NULL` → pour chaque match, dans une transaction : calcul pur (`scorePrediction()`), mise à jour des pronos, `scoredAt = now`, évaluation des badges, création des notifications « résultat ». Idempotent : relancer ne double jamais les points. L'admin peut **recalculer** (remise à zéro puis recalcul de tout ou d'une compétition) — même code.

### 5.4 Pourcentages communauté
Retournés par l'API **uniquement si le match est verrouillé** (sinon 403 / champ absent) : répartition 1/N/2 + top 3 des scores exacts les plus joués.

### 5.5 Classements
Général, par ligue, par journée, par mois (mois civil `Europe/Paris`).
Départage : points → nombre de scores exacts → nombre de bons résultats → ancienneté d'inscription.
Variation de rang affichée (▲ ▼) par rapport à la veille / journée précédente.

### 5.6 Statistiques personnelles
Taux de réussite (bons résultats / pronos notés), série en cours et meilleure série (bons résultats consécutifs dans l'ordre des coups d'envoi), meilleur championnat (moyenne de points par prono, minimum 5 pronos), nombre de scores exacts, jokers gagnants, courbe de points par journée, historique paginé.

### 5.7 Badges (calculés par le moteur `badges.ts`, jamais attribués à la main)
| Code | Nom | Condition |
|---|---|---|
| FIRST_PICK | Coup d'envoi | Premier prono noté |
| STREAK_5 | En feu | Série de 5 bons résultats |
| STREAK_10 | Inarrêtable | Série de 10 bons résultats |
| EXACT_1 | Dans le mille | Premier score exact |
| EXACT_10 | Sniper | 10 scores exacts |
| EXACT_25 | Tireur d'élite | 25 scores exacts |
| JOKER_EXACT | Coup de maître | Joker posé sur un score exact |
| UNDERDOG | Contre-pied | Bon résultat choisi par < 20 % de la communauté (≥ 5 pronos) |
| GLOBETROTTER | Globe-trotter | Au moins un prono noté dans chacune des 6 compétitions |
| CENTURION | Centurion | 100 pronos notés |
| MONTH_KING | Roi du mois | 1er du classement général d'un mois clos |
| FOUNDER | Président de club | A créé une ligue avec ≥ 3 membres |

### 5.8 Notifications
- **Rappel** 1 h avant un match non pronostiqué (job `reminders` toutes les 5 min, fenêtre `kickoff ∈ ]now, now+60 min]`, dédoublonné par `dedupeKey`). Limité aux compétitions où l'utilisateur a déjà pronostiqué ou à son équipe favorite, pour éviter le spam (réglable dans le profil).
- **Résultat** de ses pronos après calcul (regroupé par match), **badge obtenu**, **nouveau membre** dans sa ligue.
- Canaux : centre de notifications in-app (toujours) + **Web Push** (opt-in) + **e-mail** (opt-in, réutilise le SMTP du magic link). Préférences par type dans le profil.

---

## 6. Données football

### 6.1 Abstraction
```ts
interface FootballProvider {
  name: 'api-football' | 'football-data';
  fixtures(comp, season, range): Promise<ProviderFixture[]>;
  live(comps): Promise<ProviderFixture[]>;
  standings(comp, season): Promise<ProviderStanding[]>;
  lineups?(fixtureId): Promise<ProviderLineups | null>;   // API-Football uniquement
  headToHead?(homeId, awayId): Promise<ProviderFixture[]>;
}
```
Chaque réponse brute est validée par Zod puis normalisée. Rapprochement des équipes par identifiant fournisseur, sinon par nom normalisé + table d'alias.

### 6.2 Quotas et cache
- Quota gratuit API-Football : **100 requêtes / jour** ; football-data.org : **10 requêtes / minute**.
- `ApiUsage` compte les appels par fournisseur et par jour ; budget configurable (`API_FOOTBALL_DAILY_BUDGET=90`, marge de sécurité). Budget épuisé → bascule automatique sur le repli, journalisée dans `CronRun`.
- `ApiCache` (Postgres) avec TTL par type : calendrier 6 h, classement 6 h (+ invalidation en fin de match), compos 10 min autour du coup d'envoi puis figées, face-à-face 7 j, équipes 30 j. Déduplication des requêtes concurrentes identiques.
- **Live** : un seul appel groupé par cycle (`fixtures?live=61-39-140-135-78-2` ou `/v4/matches?status=IN_PLAY,PAUSED`), **uniquement** quand au moins un match suivi est dans sa fenêtre `[coup d'envoi − 5 min ; coup d'envoi + 150 min]`. Aucun appel hors fenêtre.
- Même avec ça, 60 s × une soirée de Ligue des Champions dépasse 100 appels/jour : **proposition** (§ 12.4) → live servi par football-data.org, API-Football réservé aux enrichissements (compos, face-à-face, forme).

### 6.3 Jobs du worker
| Job | Fréquence | Rôle |
|---|---|---|
| `sync:fixtures` | 04:10 quotidien + manuel | Calendrier J-3 → J+14 des 6 compétitions |
| `sync:live` | 60 s (seulement si fenêtre live active) | Scores, minute, statut, buts |
| `sync:standings` | toutes les 6 h + après fin de match | Classements officiels |
| `sync:details` | 10 min | Compos (H-1 → fin), événements |
| `score` | 2 min | Points, badges, notifications résultat |
| `reminders` | 5 min | Rappels H-1 |
| `cleanup` | 03:30 quotidien | Cache expiré, CronRun > 30 j, notifications lues > 90 j |

Chaque exécution écrit un `CronRun` (durée, stats, erreur). Verrou applicatif (`pg_try_advisory_lock`) pour qu'un job ne tourne jamais deux fois en parallèle (worker + déclenchement manuel admin).

### 6.4 Seed réaliste (`pnpm db:seed`)
- 6 compétitions, clubs réels de la saison 2026-27 (noms, abréviations, couleurs), blasons générés en SVG (écusson aux couleurs + initiales) tant qu'aucune API n'a fourni les logos officiels.
- **Une saison complète** : championnats en aller-retour (Ligue 1 & Bundesliga 18 clubs / 34 journées, autres 20 clubs / 38 journées), Ligue des Champions phase de ligue 36 clubs / 8 journées. Dates réalistes (week-ends, créneaux horaires, trêves internationales, mardis/mercredis pour la C1).
- Matchs antérieurs à la date du seed : `FINISHED`, scores tirés d'un modèle de Poisson basé sur une note de force par club (reproductible via une graine fixe). Matchs futurs : `SCHEDULED`. **Aucun match « live » figé** : le direct vient uniquement des fournisseurs.
- 20 utilisateurs (pseudos, avatars générés, équipes favorites, profils de pronostiqueurs variés : prudent, audacieux, spécialiste Ligue 1…), un admin (e-mail de `ADMIN_EMAILS`).
- 3 ligues (« Les Ultras du Bureau », « Famille & Crampons », « Coloc FC ») avec membres qui se recoupent.
- Pronos historiques sur les matchs joués, **notés par le vrai moteur de calcul** (même code que le job `score`), badges attribués par le vrai moteur de badges, notifications cohérentes.

---

## 7. Motion design — `src/lib/motion.ts`

### 7.1 Presets
```ts
export const duration = { instant: 0.12, fast: 0.2, base: 0.32, slow: 0.5, slower: 0.8 } as const;
export const ease = {
  out:        [0.16, 1, 0.3, 1],     // expo out — entrées
  inOut:      [0.65, 0, 0.35, 1],    // déplacements
  emphasized: [0.2, 0, 0, 1],        // transitions de page
  exit:       [0.4, 0, 1, 1],
} as const;
export const spring = {
  snappy: { type: 'spring', stiffness: 500, damping: 32, mass: 0.8 },  // boutons, toggles
  bouncy: { type: 'spring', stiffness: 380, damping: 14 },             // but marqué, badge obtenu
  gentle: { type: 'spring', stiffness: 170, damping: 26 },             // cartes, modales
  layout: { type: 'spring', stiffness: 350, damping: 35 },             // réordonnancement, layoutId
  counter:{ type: 'spring', stiffness: 90,  damping: 20 },             // compteurs animés
  roller: { type: 'spring', stiffness: 260, damping: 24 },             // sélecteur de score
} as const;
export const stagger = { fast: 0.035, base: 0.06, slow: 0.1 } as const;

// Variants : page, fadeUp, fadeIn, scaleIn, listContainer(stagger), listItem,
//            goalBounce, livePulse, shake, badgeUnlock, toast, drawerFromBottom, rowReorder
// + reducedVariants : équivalents « opacité seule »
// + usePreset(name) : renvoie la variante complète ou réduite selon prefers-reduced-motion
```

### 7.2 Catalogue d'animations
| Animation | Technique | Détail |
|---|---|---|
| Transitions de page | `AnimatePresence mode="popLayout"` + *frozen router* (gel du `LayoutRouterContext` pendant la sortie) | fondu + glissement 16 px, `ease.emphasized`, 320 ms |
| Carte → détail | `layoutId` + route interceptée `@modal/(.)matchs/[id]` | la carte (blasons, score, fond) se transforme en en-tête du détail ; accès direct à l'URL = page complète |
| Listes en cascade | `listContainer` / `listItem`, `staggerChildren: 0.06` | limité aux 12 premiers éléments visibles, le reste apparaît au scroll (`whileInView`, `once`) |
| Classement qui se réordonne | `<motion.li layout transition={spring.layout}>` + clé stable | halo vert / rouge 600 ms sur la ligne qui monte / descend, flèches ▲▼ animées |
| Compteurs | `useSpring` + `useTransform` → écrit directement `textContent` (aucun re-render React) | points, scores, pourcentages, stats du profil |
| Barres communauté | `scaleX` 0 → valeur (`transform-origin: left`) déclenché à l'entrée dans le viewport | GSAP ScrollTrigger sur la landing, `useInView` dans l'app ; pourcentage compté en parallèle |
| Badge LIVE | point + halo en `scale`/`opacity` en boucle (keyframes CSS, coût JS nul) | minute du match qui défile |
| But marqué | changement de score détecté → `goalBounce` (scale 1 → 1.35 → 1, spring bouncy) + flash du fond de carte | `aria-live="polite"` annonce le score |
| Score exact validé | `canvas-confetti` aux couleurs vert / jaune + badge « +8 » qui s'envole | uniquement la première fois que l'utilisateur voit le résultat |
| Prono raté | `shake` léger (x : 0, -6, 6, -4, 4, 0 — 400 ms) + désaturation de la carte | |
| Hero landing | ballon Lottie (rebond + rotation) + couches parallax GSAP (`scrub`) : pelouse, lignes, silhouettes de tribune, titre | titres révélés mot par mot (`clip-path` → remplacé par `translateY` masqué pour rester sur transform) |
| Boutons | `whileTap={{ scale: 0.94 }}` + `spring.snappy`, `whileHover` léger | |
| Tilt 3D des cartes | `rotateX/Y` dérivés du pointeur via `useSpring`, reflet lumineux qui suit | désactivé au tactile et en reduced-motion |
| Sélecteur de score | chaque chiffre = bande 0–9 translatée en Y (`spring.roller`) ; boutons +/−, glisser vertical, molette, clavier ↑↓ | comme un compteur mécanique, avec légère inertie |
| Skeletons | dégradé `translateX` en boucle (shimmer) | forme exacte des cartes finales pour éviter le saut de mise en page |
| Toasts | Sonner (shadcn) restylé : entrée spring depuis le bas, empilement, swipe pour fermer | une icône Lottie courte par type (succès, erreur, badge) |
| Onglets / filtres | indicateur actif partagé `layoutId="tab-indicator"` | |
| Badges | déblocage : scale 0 → 1 bouncy + rotation + halo doré | |
| Joker | carte qui se retourne (`rotateY` 180°) quand on l'active | |
| Graphique de points | tracé SVG `pathLength` 0 → 1 | |
| Navigation mobile | barre inférieure avec pastille active qui glisse (`layoutId`) | |

### 7.3 Accessibilité et performance
- `<MotionConfig reducedMotion="user">` à la racine + `usePreset()` : en `prefers-reduced-motion`, **tout devient un simple fondu** (pas de translation, pas de tilt, pas de parallax, pas de confettis, Lottie figée sur une image).
- **Uniquement `transform` et `opacity`** animés (pas de `width`, `top`, `box-shadow` animés ; les halos sont des pseudo-éléments dont on anime l'opacité).
- `will-change` posé seulement pendant l'animation ; `LazyMotion` + `m.` pour le bundle ; GSAP, Lottie et confetti en `next/dynamic`.
- Aucune animation ne bloque une interaction : les actions sont optimistes, l'animation suit.
- Budget : 60 fps sur mobile milieu de gamme (vérifié avec le profiler Chrome en CPU ×4), Lighthouse mobile ≥ 90 en performance et accessibilité.

---

## 8. Design

- **Couleurs (sombre par défaut)** : fond `#07110B` → `#0B1A12` (dégradé profond), surfaces en verre `rgba(255,255,255,0.04)` + `backdrop-blur(12px)` + bordure 1 px `rgba(255,255,255,0.08)` ; accent **vert pelouse** `#22C55E` / `#16A34A` ; accent **jaune électrique** `#E8FF3A` (live, joker, points) ; erreur `#FF4D5E`.
- **Mode clair** : fond `#F4F7F2`, mêmes accents assombris pour le contraste AA.
- **Typographies** (via `next/font`, auto-hébergées) : **Bebas Neue** (condensée, scores et titres), **Barlow Condensed** (libellés, chiffres de stats), **Barlow** (texte). Chiffres tabulaires pour les scores et classements.
- Texture : lignes de terrain en SVG très discrètes en fond, grain léger.
- Mobile-first : barre de navigation inférieure (Matchs, Pronos, Classements, Ligues, Profil), header compact ; desktop : barre latérale.
- 100 % français (textes, dates « sam. 3 oct. · 21:00 », nombres `fr-FR`), messages d'erreur Zod traduits.

---

## 9. Pages

| Route | Contenu |
|---|---|
| `/` | Landing publique : hero Lottie + parallax, fonctionnement en 3 étapes, barème, aperçu classement animé, CTA |
| `/connexion` | Magic link + Google ; `/connexion/verification` (« vérifiez votre boîte mail », animation enveloppe) |
| `/bienvenue` | Onboarding : pseudo, avatar, équipe favorite |
| `/accueil` | Tableau de bord : matchs à pronostiquer (48 h), mes points (compteur), rang général et dans mes ligues, derniers résultats, notifications |
| `/matchs` | Onglets À venir / En direct / Terminés, filtres championnat (puces) et date (bandeau de jours défilant), cartes en cascade |
| `/matchs/[id]` | En-tête score (live), formulaire de prono (sélecteur rouleau, 1N2, joker), communauté (après verrouillage), compos, forme 5 derniers, face-à-face, classement du championnat avec les deux équipes surlignées |
| `/pronostics` | Mes pronos : à venir (modifiables), en cours, historique (points, filtres) |
| `/classements` | Général / par journée / par mois, sélecteur de période, mon rang épinglé en bas |
| `/ligues` | Mes ligues, créer, rejoindre par code ; `/ligues/[slug]` classement + membres + partage du code ; `/rejoindre/[code]` lien d'invitation direct |
| `/championnats/[code]` | Classement officiel + journée en cours |
| `/profil/[username]` | Stats, badges, courbe, historique ; `/profil/parametres` (pseudo, avatar, équipe, notifications, thème) |
| `/notifications` | Centre de notifications |
| `/admin` | Vue d'ensemble (utilisateurs, pronos, quota API du jour, derniers jobs) ; `/admin/utilisateurs` (recherche, rôle, désactivation) ; `/admin/synchronisation` (sync manuelle par job / compétition, recalcul des points) ; `/admin/cron` (journal filtrable des `CronRun`) |
| `/hors-ligne` | Page affichée par le service worker sans réseau |

**PWA** : `manifest.webmanifest` (icônes 192/512/maskable, couleurs du thème, raccourcis « Matchs » / « Classement »), service worker maison (généré au build) : précache du shell, *stale-while-revalidate* pour les images, *network-first* pour les API, fallback `/hors-ligne`, réception des Web Push. Invitation à installer animée (Android) et guide iOS.

**Sécurité / rate limiting** : limiteur à fenêtre glissante (mémoire, instance unique) appliqué aux Server Actions et routes `/api` — ex. 30 écritures de pronos / min / utilisateur, 5 demandes de magic link / 15 min / IP+e-mail, 120 lectures / min / IP. Réponses 429 avec toast explicite. En-têtes de sécurité (CSP, etc.), routes admin protégées par rôle côté serveur, e-mails admin via `ADMIN_EMAILS`.

---

## 10. Tests

- **Unitaires (Vitest)** — `domain/` :
  - `scoring` : tous les cas du barème, joker, match annulé, score non saisi, cohérence 1N2/score, prolongations ignorées.
  - `locking` : avant / pile au / après le coup d'envoi, statuts non `SCHEDULED`, horloge injectée.
  - `streaks`, `badges`, `leaderboard` (départages), adaptateurs fournisseurs (fixtures JSON réelles anonymisées → normalisation), quota & cache.
- **Intégration (Vitest + Postgres réel, base éphémère)** : Server Action de prono (refus après coup d'envoi, course sur deux jokers → un seul accepté), job `score` idempotent (deux exécutions = mêmes points), recalcul admin.
- **E2E (Playwright, mobile + desktop)** : connexion par magic link (lien récupéré via l'API Mailpit), onboarding, pronostiquer un match, verrouillage visible, créer / rejoindre une ligue, classement, admin sync, mode reduced-motion (aucune transformation appliquée).
- **CI GitHub Actions** : lint → typecheck → tests unitaires/intégration (service Postgres) → build → e2e. Remplace le workflow GitHub Pages actuel (incompatible avec une application serveur).

---

## 11. Phases de livraison

Chaque phase se termine par **lint + typecheck + tests verts + commit** clair (et push sur la branche de travail).

| # | Phase | Contenu | Critère de fin |
|---|---|---|---|
| 1 | **Fondations & système de motion** | Suppression du site statique, scaffold Next 15 + TS strict + Tailwind v4 + shadcn, ESLint/Prettier/Vitest, `env.ts`, thème (tokens, sombre/clair, polices), **`lib/motion.ts`** + composants motion de base (PageTransition, Stagger, AnimatedNumber, Tilt, Shimmer, bouton spring, Toaster), shell responsive (nav mobile/desktop), `docker-compose.dev.yml` (Postgres + Mailpit), CI | App qui démarre, transitions de page et démo des composants, tests des presets |
| 2 | **Données & fournisseurs** | Schéma Prisma + migrations, adaptateurs API-Football / football-data (Zod), cache + quota, jobs de sync, worker + CronRun + verrous, **seed complet** | `pnpm db:reset` produit une saison entière cohérente ; tests adaptateurs/quota |
| 3 | **Auth & profil** | Auth.js (magic link + Google), onboarding, paramètres, upload avatar (sharp, volume Docker), rôles, middleware de protection | Connexion bout en bout via Mailpit |
| 4 | **Matchs** | Liste + filtres + stagger, détail (compos, forme, H2H, classement), shared layout carte → détail, live (polling 60 s adaptatif, LIVE qui pulse, but qui rebondit), pages championnat | Navigation fluide, live testé avec données injectées |
| 5 | **Pronostics** | Sélecteur rouleau, 1N2, joker, verrouillage serveur, moteur de points + job `score`, % communauté + barres, confettis / shake, page Mes pronos | Tests barème + verrouillage + idempotence verts |
| 6 | **Social** | Ligues (création, code, lien, gestion), classements général/ligue/journée/mois avec réordonnancement animé, stats perso, badges, notifications (in-app, Web Push, e-mail, rappels H-1) | Scénarios e2e ligue + classement |
| 7 | **Admin, PWA, sécurité** | Dashboard admin, sync manuelle, recalcul, journal cron, manifest + service worker + hors-ligne + push, rate limiting, en-têtes de sécurité, landing finale (Lottie + GSAP) | Lighthouse PWA installable, tests rate limit |
| 8 | **Finition & livraison** | Passe reduced-motion et perf (60 fps, Lighthouse), accessibilité, Dockerfile multi-arch + `docker-compose.yml` prod (build `linux/arm64` vérifié via buildx), e2e complets, **README** (installation, variables d'env, déploiement Raspberry Pi 5, HTTPS) | Livrables complets, zéro TODO |

---

## 12. Points à valider

1. **Ancien site statique** (`index.html`, `script.js`, `style.css`) et workflow **GitHub Pages** : je propose de les supprimer et de remplacer le workflow par une CI (l'app Next.js avec base de données ne peut pas être servie par GitHub Pages).
2. **« Joker une fois par journée »** : je propose *une journée de championnat* (J7 de Ligue 1, J7 de Premier League… = un joker chacune ; phase de ligue C1 J3 = un joker). Alternative : un joker par jour calendaire, toutes compétitions confondues.
3. **Score exact** : 1N2 obligatoire + score exact **optionnel** (barème 3 / +5). Alternative : score exact obligatoire (le 1N2 en découle).
4. **Quota live** : API-Football gratuit (100 req/jour) ne tient pas un polling à 60 s sur une soirée de matchs. Proposition : **live via football-data.org** (quota à la minute), API-Football pour calendrier, compos, face-à-face et forme — avec bascule automatique dans les deux sens si l'un tombe ou s'épuise. Paramétrable par `FOOTBALL_LIVE_PROVIDER`.
5. **Notifications** : in-app + Web Push + e-mail (opt-in), comme décrit § 5.8 — ou in-app + push seulement ?
6. **Avatars** : upload stocké sur un volume Docker (`/data/uploads`, redimensionné en WebP 256 px) + galerie d'avatars générés. Pas de stockage cloud (S3) — OK pour un Raspberry Pi ?
7. **HTTPS en prod** (requis pour la PWA, le push et Google OAuth) : j'ajoute un service **Caddy** optionnel (profil `https`, certificats Let's Encrypt automatiques) dans le `docker-compose.yml`, ou vous avez déjà un reverse proxy / Cloudflare Tunnel ?
