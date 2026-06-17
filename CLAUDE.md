# Le Rond Point — App mobile (React Native / Expo)

App mobile native pour **Le Rond Point** : un groupe d'amis d'un quartier d'enfance,
dispersés dans le monde, qui publient leurs **fenêtres de présence** au quartier,
organisent des **sorties**, et restent dans la boucle. Groupe fermé (sur invitation),
multi-tenant (plusieurs « Ronds Points » étanches), ~20–30 personnes par groupe.

Ce dépôt est **le client mobile uniquement**. Il consomme l'API NestJS du projet voisin.

---

## 1. Lancer le projet

```bash
npm install
npx expo install --fix     # aligne les versions natives sur le SDK Expo
npm start                  # Metro + QR code (Expo Go ou dev build)
npm run ios | npm run android
npm run typecheck          # tsc --noEmit (doit rester à 0 erreur)
```

> ⚠️ **Pin important** : `@tanstack/react-query` est **épinglé à `5.59.20`** (`--save-exact`).
> Les versions ≥ 5.6x exigent TypeScript ≥ 5.4, alors qu'Expo SDK 52 fige TS `5.3.3`.
> Au-delà, `useQuery().data` retombe en `any` (perte totale d'inférence). Ne pas bumper
> react-query sans bumper TS de façon coordonnée.

### Configuration (app.json → `expo.extra`)

| Clé | Rôle |
|-----|------|
| `apiBaseUrl` | URL de base de l'API **avec le préfixe `/api`** (déf. `http://localhost:3001/api`) |
| `googleWebClientId` / `googleIosClientId` / `googleAndroidClientId` | OAuth Google (Google Cloud Console) |

Sur device physique, `localhost` ne pointe pas vers ta machine : remplace `apiBaseUrl`
par l'IP LAN (`http://192.168.x.x:3001/api`).

---

## 2. Stack

- **Expo SDK 52** (managed) + **expo-router v4** (routing par fichiers, `app/`).
- **TypeScript strict**, alias `@/*` → `src/*`.
- **@tanstack/react-query** (cache serveur, clés centralisées dans `src/api/queryClient.ts`).
- **axios** (instance unique + refresh JWT auto) — `src/api/client.ts`.
- **zustand** pour le peu d'état global client (`lastGroupId`) — `src/stores/`.
- **expo-secure-store** (tokens JWT), **expo-auth-session** (Google), **expo-notifications** (push, à brancher).

---

## 3. Architecture

### Multi-tenant
Chaque **Group** (« Rond Point ») est étanche. Le pivot est `GroupMembership` :
rôle (`ADMIN`/`MEMBER`), couleur membre (1–12), statut résident, onboarding —
tout est **per-group**. Le profil (nom, ville, anniversaire, réseaux, prefs push) est
**global** sur `User`. Un user peut appartenir à plusieurs groupes.

### Le contrat API réel diffère des specs
Les specs (`../le-rond-point-api/doc/specs/`) décrivent l'app d'origine comme une **PWA
Next.js** avec NextAuth (cookies). **La réalité est une API NestJS** avec auth **Bearer JWT**.
Deux conséquences majeures pour ce client :

1. **Auth mobile native** : `POST /api/auth/google { idToken }` → `{ accessToken, refreshToken }`.
   Pas de cookies, pas de NextAuth côté mobile.
2. **Routes imbriquées par groupe**, pas plates : tout est sous
   `/api/groups/:groupId/...` (présences, events, admin…), **pas** `/api/presences`.
   → Toujours passer `groupId` aux helpers de `src/api/endpoints.ts`.

Routes vérifiées sur la source NestJS (`src/**/*.controller.ts`) — voir l'en-tête de
`src/api/endpoints.ts` pour la table complète.

### Flux d'authentification
```
Login Google (expo-auth-session) → idToken
   → POST /auth/google → { accessToken, refreshToken } stockés dans SecureStore
   → AuthProvider charge GET /profile (user + memberships)
Sur 401 : client.ts tente POST /auth/refresh (single-flight) et rejoue la requête ;
si le refresh échoue → tokens purgés → logout forcé (setUnauthorizedHandler).
```
`AuthProvider` (`src/auth/AuthContext.tsx`) est la source de vérité : `user`,
`memberships`, `signInWithGoogle`, `signOut`, `refreshProfile`.

### Navigation (expo-router)
```
app/
  _layout.tsx              Providers (QueryClient, Auth, SafeArea, Gesture) + Stack
  index.tsx                Redirecteur : /login | /{lastGroupId} | /groups
  login.tsx                Connexion Google
  groups.tsx               Hub : liste des groupes + création
  profile.tsx              Profil GLOBAL (hors contexte groupe)
  [groupId]/
    _layout.tsx            Bottom Tabs : Accueil · Présences · Sorties · Profil
    index.tsx              Accueil (toggle du jour, calendrier, carousel sorties, tes présences)
    presences.tsx          Liste + filtres + PresenceForm
    sorties/
      index.tsx            Liste des sorties
      nouveau.tsx          Création (type → nom → quand → où → logistique)
      [id]/index.tsx       Détail (onglets : Qui vient · Logistique · Le fil)
      [id]/edit.tsx        Édition / annulation / réactivation / suppression
    membres/
      index.tsx            Annuaire (recherche, filtres, tri)
      [id].tsx             Profil public membre
    admin.tsx              Administration (renommer, inviter, invitations, membres)
    onboarding.tsx         Onboarding per-group (3 étapes)
```
**Tab « Profil »** : ouvre `/profile` (global). Le `tabPress` est intercepté dans
`[groupId]/_layout.tsx` pour `router.push('/profile')` hors du stack du groupe.
`membres`/`admin`/`onboarding` sont dans le groupe mais masqués de la tab bar (`href: null`).

### Structure `src/`
```
src/
  api/        client (axios+refresh), endpoints (wrappers typés), tokenStore, queryClient (+ clés qk)
  auth/       AuthContext, useGoogleSignIn
  components/ ui.tsx (primitives), domain.tsx (EventGlyph, RsvpChip, AvailabilityBadge),
              PresenceForm, MonthCalendar
  hooks/      useGroup (groupId + rôle/couleur du membre courant)
  lib/        dates.ts (UTC-safe : présences à minuit UTC)
  stores/     groupStore (lastGroupId, AsyncStorage)
  theme/      design system (couleurs, couleurs membres 1–12, styles par type de sortie, radius…)
  types/      modèle de domaine (miroir du Prisma de l'API)
```

---

## 4. Design system (`src/theme/index.ts`)

Frais, moderne, friendly. Card-based, coins arrondis, feel natif. Fond `#F8FAFF`.
- `colors` : primary `#3B7BF8`, available `#10B981`, busy `#F59E0B`, destructive `#EF4444`…
- `memberColors` : 12 couleurs (assignées en base par l'API, on les affiche via `memberColor(n)`).
- `eventTypeStyle` : emoji + accent + tint par type — `BAR 🍻`, `RESTO 🍕`, `SOIREE 🏡`, `SORTIE 🏕️`.
- `radius`, `spacing`, `fontSize`, `fontWeight`.

Toujours consommer ces tokens (pas de hex en dur dans les écrans). Police cible : Inter
(non encore chargée — voir « Reste à faire »).

---

## 5. Conventions

- **Données serveur** : toujours via react-query + helpers `src/api/endpoints.ts`. Ne pas
  appeler `api` directement dans un écran. Invalider avec les clés `qk.*`.
- **Mutations** : `useMutation` + `qc.invalidateQueries({ queryKey: qk.xxx })` au succès.
- **Erreurs** : `apiErrorMessage(e)` pour un message FR lisible.
- **Dates de présence** : minuit UTC. Utiliser `src/lib/dates.ts` (comparaisons en UTC) —
  ne jamais comparer des présences avec l'heure locale.
- **UI** : réutiliser `components/ui.tsx` (`Txt`, `Card`, `Button`, `Avatar`, `AvatarPile`,
  `Chip`, `Badge`, `Fab`, `EmptyState`, `Loading`) avant d'en créer.
- **Langue** : UI 100 % en français.
- `npm run typecheck` doit rester **à 0 erreur** avant de committer.

---

## 6. Écarts API (gaps connus — à confirmer côté NestJS)

Le client est codé défensivement pour ces points ; l'UI les signale en clair.

- **Photos de sortie** : décrites dans `04-sorties.md` mais **aucune route** dans l'API
  actuelle (`/events/:id/photos`, `/photos/zip`). UI photos non branchée.
- **ICS / « Ajouter à mon agenda »** : pas de route `/events/:id/ics`.
- **Upload photo de profil** : pas de `/profile/photo` (l'avatar Google est utilisé).
- **Endpoints supposés mais non confirmés dans les contrôleurs** : `GET /groups/:gid/members`
  (annuaire) et le détail réseaux/présences d'un membre public. Vérifier/aligner.
- **Réponses hydratées** : les types (`Presence.user`, `Event.rsvps[].user`, `myRsvp`…)
  supposent que l'API renvoie les relations utiles. À valider contre les services NestJS ;
  ajuster `src/types/` et les `select` côté API si besoin.

Avant de coder un écran qui dépend d'un de ces points, **lire le contrôleur/service NestJS
correspondant** dans `../le-rond-point-api/src/` plutôt que de se fier aux specs seules.

---

## 7. Périmètre actuel vs reste à faire

**Fait (fondations + écrans clés, fonctionnels contre l'API) :**
- Auth Google → JWT, refresh auto, SecureStore, redirecteur d'entrée.
- Hub `/groups` + création de groupe.
- Accueil : toggle présence du jour, calendrier mensuel (compteurs + pastilles event),
  carousel sorties, tes présences.
- Présences : liste, filtres membres, groupage par mois, anciennes, `PresenceForm` (CRUD).
- Sorties : liste, création, détail (Qui vient + RSVP, Besoins claim/release, Tricount
  lecture, Le fil/commentaires), édition/annulation/suppression.
- Membres : annuaire (recherche/filtres/tri) + profil public (de base).
- Admin : renommer, inviter (email + lien), invitations en attente, liste membres.
- Onboarding per-group (3 étapes) + profil global (infos, réseaux, prefs notifs).

**Reste à faire (signalé dans l'UI par des notes « voir CLAUDE.md ») :**
- **Notifications push** : `expo-notifications` (permission, token, `POST /push/subscribe`),
  handler de tap → deep-link vers la bonne route. `pushApi` existe déjà côté client.
- **Tricount** : formulaire d'ajout de dépense (payeur, montant, participants) +
  affichage soldes avec **noms** (les transferts renvoient des `userId` bruts → mapper).
- **Admin** : fiche membre (bottom sheet) — changement de rôle + retrait, modération
  des commentaires signalés (`adminApi.reports` / `resolveReport`).
- **Sorties** : sélecteur de date/lieu natif (actuellement saisie texte ISO), playlist,
  copie de lien d'invitation (clipboard), `DayDetailSheet` sur l'accueil.
- **Timeline « Qui est là ce mois »** (barres par membre) sur l'accueil — non encore portée.
- **Quitter un groupe** (`groupsApi.leave`) + switcher détaillé.
- **Polish** : police Inter (`expo-font`), splash/icônes, redirection auto vers
  l'onboarding quand `membership.onboardedAt === null`, gestion fine du clavier.

---

## 8. Projet API voisin

`../le-rond-point-api` (NestJS + Prisma). Sources de vérité utiles :
- `doc/specs/` — specs fonctionnelles (attention : rédigées pour la PWA Next.js d'origine).
- `doc/specs/09-modele-de-donnees.md` — schéma Prisma (miroir de `src/types/`).
- `src/**/*.controller.ts` — **routes réelles** (le contrat qui fait foi).
- `src/**/dto/*.ts` — formes des payloads.
Démarrer l'API : `pnpm start:dev` dans ce dossier (écoute sur `:3001`, préfixe `/api`).
