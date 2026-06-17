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

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  createdAt: string;
  memberCount?: number;
  /** Current user's role/color in this group, when returned by GET /api/groups. */
  membership?: Pick<GroupMembership, 'role' | 'memberColor' | 'isResident' | 'onboardedAt'>;
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
  payerId: string;
  payer?: Pick<GroupMember, 'id' | 'name'>;
  label: string;
  amount: number;
  participantIds: string[];
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
  // Hydrated on detail / list
  rsvps?: EventRsvp[];
  needs?: EventNeed[];
  expenses?: EventExpense[];
  comments?: EventComment[];
  photos?: EventPhoto[];
  /** Current user's RSVP status, convenience field for list cards. */
  myRsvp?: RsvpStatus;
}

/** Simplified transfer list returned by GET .../events/:id/balances. */
export interface BalanceTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
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
