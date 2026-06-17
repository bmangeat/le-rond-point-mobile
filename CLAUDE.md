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

Toujours consommer ces tokens (pas de hex en dur dans les écrans).

**Police : Inter**, chargée au démarrage dans `app/_layout.tsx` (`@expo-google-fonts/inter`,
imports par sous-chemin pour ne bundler que 4 graisses) ; le splash reste affiché tant que les
polices ne sont pas prêtes. Les composants appliquent `fontFamily` (`theme.fontFamily.*`) plutôt
que `fontWeight` — la graisse est encodée dans le fichier de police. Préférer `Txt`/`Button`
(déjà en Inter) à un `Text` brut.

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

## 6. Écarts API (vérifiés contre l'API en marche)

Contrat validé end-to-end le 2026-06-17 (register → profile → groups → presences → events).
Points confirmés :

- **Routes 404 (non implémentées)** : `/events/:id/photos` + `/photos/zip` (photos de sortie),
  `/events/:id/ics` (« Ajouter à mon agenda »), `/profile/photo` (upload avatar — on utilise
  l'image Google). UI codée défensivement et signalée en clair.
- **Pas de route `GET /groups/:id/members`** : la liste des membres est **embarquée dans
  `GET /groups/:id`** (`group.memberships[].user`). `groupsApi.members()` la dérive de là.
- **Deux shapes de membership distincts** (piège majeur) :
  - `GET /profile` → l'objet **user directement**, avec `memberships:[{ groupId, role,
    memberColor, isResident, onboardedAt, group:{id,name} }]`. C'est ce que porte `AuthContext`
    (type `ProfileMembership`), consommé via `useGroup()`.
  - `GET /groups` → `[{ id, name, memberCount, myRole, myColor, isResident, onboarded,
    joinedAt }]` (type `Group`, **champs plats**), utilisé seulement par l'écran `/groups`.
- **Hydratation liste vs détail des sorties** : `GET /events` renvoie `host` + `_count`
  mais **pas** `rsvps` ni le RSVP de l'utilisateur ; `GET /events/:id` renvoie
  `rsvps/needs/expenses/comments/photos`. ⇒ Les chips RSVP des **cards de liste** (accueil +
  liste sorties) ne peuvent pas refléter le statut perso sans appel supplémentaire — à
  améliorer (exploiter `_count`, ou batcher les RSVP).
- **`GET /presences/today`** renvoie `200` + **corps vide** quand l'utilisateur n'est pas
  présent (pas `null`). `presencesApi.today()` normalise `'' → null`.
- **`PATCH /groups/:id/members/me`** n'accepte que `isResident` (`onboardedAt` est géré
  côté serveur, pas exposé au client).
- **Push = Web Push uniquement** : `POST /push/subscribe` attend `{ endpoint, p256dh, auth }`
  (souscription navigateur). L'API ne gère **pas** les tokens push natifs (Expo/FCM/APNs).
  ⇒ Les notifications push natives mobiles sont **bloquées côté API** : il faudra un nouveau
  type de souscription + un envoi via le service push Expo avant de brancher `expo-notifications`.
  `pushApi` est typé sur la forme Web Push réelle en attendant.
- **`POST /events/:id/expenses`** force `payerId = utilisateur courant` : pas de sélecteur de
  payeur (le formulaire indique « payée par toi »).
- **Quitter / dernier admin** : `DELETE /groups/:id/members/me` renvoie `409` si tu es le
  dernier admin (« Nomme un autre admin avant de quitter »). Le client affiche ce message.

Avant de coder un écran qui dépend d'un point sensible, **lire le contrôleur/service NestJS**
dans `../le-rond-point-api/src/` — les specs décrivent l'app Next.js d'origine, pas l'API réelle.

---

## 7. Périmètre actuel vs reste à faire

**Fait (fondations + écrans, fonctionnels & vérifiés contre l'API en marche) :**
- Auth Google → JWT, refresh auto, SecureStore, redirecteur d'entrée.
- Hub `/groups` + création de groupe + **quitter un groupe** (appui long, garde dernier-admin
  côté serveur affichée).
- Accueil : toggle présence du jour, calendrier mensuel (compteurs + pastilles event),
  **timeline « Qui est là ce mois-ci »** (barres par membre, résidents exclus, OPEN/BUSY),
  **DayDetailSheet** au tap d'un jour (présences + sorties + CTA ajout), carousel sorties,
  tes présences, **redirection auto vers l'onboarding** si non complété.
- Présences : liste, filtres membres, groupage par mois, anciennes, `PresenceForm`
  (CRUD, **sélecteurs de date natifs**).
- Sorties : liste, création (**date/heure native** + raccourcis ce soir/demain/week-end),
  détail (Qui vient + RSVP, Besoins claim/release, **Tricount complet** : ajout de dépense
  + soldes « qui rend quoi » avec noms, Le fil/commentaires + **playlist** add/edit),
  édition/annulation/suppression.
- Membres : annuaire (recherche/filtres/tri, badges **« ici / bientôt là » calculés
  client-side** depuis les présences) + **profil public complet** (réseaux cliquables +
  prochaines présences) via `GET /groups/:id/members/:userId`.
- Admin : renommer, inviter (email + **lien copiable**), invitations, **modération des
  commentaires signalés**, **fiche membre** (changement de rôle + retrait).
- Onboarding per-group (3 étapes) + profil global (infos, réseaux, prefs notifs).

**Reste à faire :**
- **Notifications push** : ⚠️ bloqué côté API (Web Push only — voir §6). Nécessite d'abord
  un endpoint de souscription pour tokens natifs + envoi via Expo Push, puis `expo-notifications`
  (permission, token, handler de tap → deep-link).
- **Sorties** : **sélecteur de lieu** (recherche/autocomplétion — actuellement champ texte
  libre ; la date/heure est un picker natif).
- **Photos de sortie** : bloqué côté API (routes absentes — voir §6).
- **Polish restant** : **icône/splash** = placeholder « rond-point » généré (anneau blanc sur
  bleu, dans `assets/`, créé par script PNG sans dépendance) — à remplacer par un visuel
  définitif de designer si souhaité ; `KeyboardAvoidingView` reste à ajouter sur profil/admin
  si recouvrements constatés ; upload photo de profil (bloqué API).

---

## 8. Projet API voisin

`../le-rond-point-api` (NestJS + Prisma). Sources de vérité utiles :
- `doc/specs/` — specs fonctionnelles (attention : rédigées pour la PWA Next.js d'origine).
- `doc/specs/09-modele-de-donnees.md` — schéma Prisma (miroir de `src/types/`).
- `src/**/*.controller.ts` — **routes réelles** (le contrat qui fait foi).
- `src/**/dto/*.ts` — formes des payloads.
Démarrer l'API : `pnpm start:dev` dans ce dossier (écoute sur `:3001`, préfixe `/api`).
