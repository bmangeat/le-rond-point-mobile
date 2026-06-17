/**
 * Domain types — mirror of the API's Prisma model (doc/specs/09-modele-de-donnees.md)
 * and DTOs in le-rond-point-api/src/<module>/dto.
 * Keep field names aligned with the API JSON responses.
 */

export type GlobalRole = 'SUPER_ADMIN' | 'USER';
export type GroupRole = 'ADMIN' | 'MEMBER';
export type EventType = 'BAR' | 'RESTO' | 'SOIREE' | 'SORTIE';
export type EventStatus = 'ACTIVE' | 'CANCELLED';
export type RsvpStatus = 'YES' | 'NO' | 'PENDING';
export type Availability = 'OPEN' | 'BUSY';

/** Tokens returned by POST /api/auth/google | /login | /register | /refresh. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
  city: string | null;
  birthday: string | null; // ISO
  phone: string | null;
  instagram: string | null;
  snapchat: string | null;
  tiktok: string | null;
  linkedin: string | null;
  // push prefs (global)
  notifPush: boolean;
  notifPushOverlap: boolean;
  notifPushBirthday: boolean;
  notifPushPresence: boolean;
  notifPushPhotos: boolean;
  notifPushEvents: boolean;
  notifPushAsResident: boolean;
  globalRole: GlobalRole;
}

/** Per-group membership data — the multi-tenant pivot. */
export interface GroupMembership {
  id: string;
  userId: string;
  groupId: string;
  role: GroupRole;
  memberColor: number; // 1–12
  isResident: boolean;
  isActive: boolean;
  onboardedAt: string | null;
  joinedAt: string;
}

/**
 * Item returned by GET /api/groups (groups.service.findMyGroups).
 * The current user's membership fields are FLAT (myRole/myColor/...), not nested.
 */
export interface Group {
  id: string; // group id
  name: string;
  memberCount: number;
  myRole: GroupRole;
  myColor: number;
  isResident: boolean;
  onboarded: boolean;
  joinedAt: string;
}

/** A membership embedded in GET /api/groups/:id (with its user select). */
export interface GroupMembershipWithUser {
  id: string;
  role: GroupRole;
  memberColor: number;
  isResident: boolean;
  onboardedAt: string | null;
  joinedAt: string;
  userId: string;
  user: { id: string; name: string; image: string | null; city: string | null };
}

/**
 * Membership as embedded in GET /api/profile (profile.service.getProfile).
 * NOTE: a different, flatter shape than `Group` (GET /api/groups). This is the
 * one carried in AuthContext and used app-wide via useGroup().
 */
export interface ProfileMembership {
  groupId: string;
  role: GroupRole;
  memberColor: number;
  isResident: boolean;
  onboardedAt: string | null;
  group: { id: string; name: string };
}

/** Detail returned by GET /api/groups/:id (groups.service.findOne). */
export interface GroupDetail {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
  memberships: GroupMembershipWithUser[];
}

/** A member as seen inside a group (User joined with their GroupMembership). */
export interface GroupMember {
  id: string; // userId
  name: string;
  image: string | null;
  city: string | null;
  role: GroupRole;
  memberColor: number;
  isResident: boolean;
  hereNow?: boolean;
  aroundSoon?: boolean;
}

export interface Presence {
  id: string;
  userId: string;
  groupId: string;
  startDate: string; // ISO, minuit UTC
  endDate: string;
  note: string | null;
  availability: Availability;
  createdAt: string;
  updatedAt: string;
  // Hydrated for display
  user?: Pick<GroupMember, 'id' | 'name' | 'image' | 'city' | 'memberColor'>;
  /** Members overlapping this presence (used on home "tes présences"). */
  overlaps?: Pick<GroupMember, 'id' | 'name' | 'image' | 'memberColor'>[];
}

export interface EventRsvp {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  user?: Pick<GroupMember, 'id' | 'name' | 'image' | 'city' | 'memberColor'>;
}

export interface EventNeed {
  id: string;
  eventId: string;
  label: string;
  claimedById: string | null;
  claimedBy?: Pick<GroupMember, 'id' | 'name' | 'image'> | null;
}

export interface EventExpense {
  id: string;
  eventId: string;
  payerId: string; // always the user who created it (API sets payerId = caller)
  label: string;
  amount: number;
  createdAt?: string;
  // Returned by the API as join rows including the user.
  participants?: { userId: string; user?: { id: string; name: string } }[];
}

export interface EventComment {
  id: string;
  eventId: string;
  authorId: string;
  author?: Pick<GroupMember, 'id' | 'name' | 'image'>;
  text: string;
  createdAt: string;
}

export interface EventPhoto {
  id: string;
  eventId: string;
  uploaderId: string;
  uploader?: Pick<GroupMember, 'id' | 'name'>;
  url: string;
  createdAt: string;
}

export interface Event {
  id: string;
  type: EventType;
  name: string;
  hostId: string | null;
  host?: Pick<GroupMember, 'id' | 'name' | 'image'> | null;
  description: string | null;
  whenAt: string; // ISO datetime
  placeName: string;
  placeAddr: string | null;
  status: EventStatus;
  cancelReason: string | null;
  cancelledAt: string | null;
  needsEnabled: boolean;
  tricountEnabled: boolean;
  hasPlaylist: boolean;
  playlistUrl: string | null;
  groupId: string;
  createdAt: string;
  // Hydrated on DETAIL (GET /events/:id) only.
  rsvps?: EventRsvp[];
  needs?: EventNeed[];
  expenses?: EventExpense[];
  comments?: EventComment[];
  photos?: EventPhoto[];
  // Present on the LIST (GET /events) only: relation counts (e.g. rsvps by status).
  _count?: Record<string, number>;
  /**
   * NOT returned by the API. The list payload has `_count`/`host` but no per-user
   * RSVP, so list-card chips can't show the user's own status without an extra
   * lookup. See CLAUDE.md "Écarts API → hydratation".
   */
  myRsvp?: RsvpStatus;
}

/** One settlement transfer (minimized) — API field names are `from`/`to`. */
export interface BalanceDebt {
  from: string; // userId who owes
  to: string; // userId who is owed
  amount: number;
}

/** Shape of GET /events/:id/balances → { expenses, debts }. */
export interface BalancesResponse {
  expenses: EventExpense[];
  debts: BalanceDebt[];
}

export interface Invitation {
  id: string;
  email: string | null; // null = lien générique
  token: string;
  expiresAt: string;
  usedAt: string | null;
  groupId: string;
  createdAt: string;
}

/** Public member profile — GET /groups/:groupId/members/:userId. */
export interface MemberProfile {
  id: string;
  name: string;
  image: string | null;
  city: string | null;
  birthday: string | null;
  phone: string | null;
  instagram: string | null;
  snapchat: string | null;
  tiktok: string | null;
  linkedin: string | null;
  role: GroupRole;
  memberColor: number;
  isResident: boolean;
  upcomingPresences: Presence[];
}

/** A reported comment as returned by GET /admin/reports. */
export interface ReportedComment {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string };
  event: { id: string; name: string };
  reports: { id: string; reason: string | null; reporter: { id: string; name: string } }[];
}

/** Web Push subscription (the API stores browser subscriptions, not native tokens). */
export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}
