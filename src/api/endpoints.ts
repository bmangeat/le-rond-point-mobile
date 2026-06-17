/**
 * Typed wrappers around every API route consumed by the app.
 * Route map mirrors le-rond-point-api controllers (verified against source):
 *
 *   POST   /auth/google { idToken } → AuthTokens
 *   POST   /auth/refresh { refreshToken } → AuthTokens
 *   GET    /profile                         PATCH /profile
 *   GET    /groups                          POST  /groups
 *   GET    /groups/:gid                      PATCH /groups/:gid
 *   PATCH  /groups/:gid/members/me           DELETE /groups/:gid/members/me
 *   PATCH  /groups/:gid/members/:uid         DELETE /groups/:gid/members/:uid
 *   GET    /groups/:gid/presences            GET /groups/:gid/presences/today
 *   POST   /groups/:gid/presences            PATCH/DELETE /groups/:gid/presences/:id
 *   GET    /groups/:gid/events               POST /groups/:gid/events
 *   GET    /groups/:gid/events/:id           PATCH/DELETE
 *   PATCH  /groups/:gid/events/:id/rsvp       GET /groups/:gid/events/:id/balances
 *   POST   /groups/:gid/events/:id/needs ... expenses ... comments ...
 *   GET    /groups/:gid/admin/invitations    POST .../invite | .../invite/link
 *   GET    /groups/:gid/admin/reports        POST .../reports
 *   POST   /push/subscribe                    DELETE /push/subscribe
 *
 * NOTE (gap vs specs): photo + ICS endpoints described in 04-sorties.md are NOT
 * present in the current NestJS API. UI for photos is built defensively and will
 * activate once the API exposes /events/:id/photos. See CLAUDE.md "Écarts API".
 */
import { api } from './client';
import type {
  AuthTokens,
  BalanceTransfer,
  Event,
  EventComment,
  EventExpense,
  EventNeed,
  EventType,
  Group,
  GroupDetail,
  GroupMember,
  GroupRole,
  Invitation,
  Presence,
  ProfileMembership,
  RsvpStatus,
  User,
} from '@/types';

// --- Auth ---
export const authApi = {
  google: (idToken: string) =>
    api.post<AuthTokens>('/auth/google', { idToken }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }).then((r) => r.data),
};

// --- Profile (global) ---
// GET /api/profile returns the user object directly, with memberships embedded.
export type ProfileResponse = User & { memberships: ProfileMembership[] };
export const profileApi = {
  get: () => api.get<ProfileResponse>('/profile').then((r) => r.data),
  update: (patch: Partial<User>) =>
    api.patch<User>('/profile', patch).then((r) => r.data),
};

// --- Groups ---
export const groupsApi = {
  list: () => api.get<Group[]>('/groups').then((r) => r.data),
  create: (name: string) => api.post<Group>('/groups', { name }).then((r) => r.data),
  get: (groupId: string) => api.get<GroupDetail>(`/groups/${groupId}`).then((r) => r.data),
  rename: (groupId: string, name: string) =>
    api.patch<GroupDetail>(`/groups/${groupId}`, { name }).then((r) => r.data),
  // Only `isResident` is accepted (UpdateMembershipDto). `onboardedAt` is server-managed.
  updateMyMembership: (groupId: string, patch: { isResident?: boolean }) =>
    api.patch(`/groups/${groupId}/members/me`, patch).then((r) => r.data),
  leave: (groupId: string) =>
    api.delete(`/groups/${groupId}/members/me`).then((r) => r.data),
  // No dedicated members route: the list is embedded in GET /groups/:id.
  members: async (groupId: string): Promise<GroupMember[]> => {
    const group = await api.get<GroupDetail>(`/groups/${groupId}`).then((r) => r.data);
    return group.memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image,
      city: m.user.city,
      role: m.role,
      memberColor: m.memberColor,
      isResident: m.isResident,
    }));
  },
  setMemberRole: (groupId: string, userId: string, role: GroupRole) =>
    api.patch(`/groups/${groupId}/members/${userId}`, { role }).then((r) => r.data),
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`).then((r) => r.data),
};

// --- Presences ---
export interface PresenceInput {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  availability?: 'OPEN' | 'BUSY';
  note?: string;
}
export const presencesApi = {
  list: (groupId: string) =>
    api.get<Presence[]>(`/groups/${groupId}/presences`).then((r) => r.data),
  // The API returns 200 with an EMPTY body when the user is not present today,
  // which axios surfaces as ''. Normalize to null so callers can truthiness-check.
  today: (groupId: string) =>
    api.get<Presence | ''>(`/groups/${groupId}/presences/today`).then((r) => r.data || null),
  create: (groupId: string, input: PresenceInput) =>
    api.post<Presence>(`/groups/${groupId}/presences`, input).then((r) => r.data),
  update: (groupId: string, id: string, input: Partial<PresenceInput>) =>
    api.patch<Presence>(`/groups/${groupId}/presences/${id}`, input).then((r) => r.data),
  remove: (groupId: string, id: string) =>
    api.delete(`/groups/${groupId}/presences/${id}`).then((r) => r.data),
};

// --- Events ---
export interface EventInput {
  type: EventType;
  name: string;
  description?: string;
  whenAt: string; // ISO datetime
  placeName: string;
  placeAddr?: string;
  needsEnabled?: boolean;
  tricountEnabled?: boolean;
  hasPlaylist?: boolean;
  playlistUrl?: string;
}
export const eventsApi = {
  list: (groupId: string) =>
    api.get<Event[]>(`/groups/${groupId}/events`).then((r) => r.data),
  get: (groupId: string, id: string) =>
    api.get<Event>(`/groups/${groupId}/events/${id}`).then((r) => r.data),
  create: (groupId: string, input: EventInput) =>
    api.post<Event>(`/groups/${groupId}/events`, input).then((r) => r.data),
  update: (groupId: string, id: string, patch: Partial<EventInput>) =>
    api.patch<Event>(`/groups/${groupId}/events/${id}`, patch).then((r) => r.data),
  cancel: (groupId: string, id: string, reason?: string) =>
    api.patch<Event>(`/groups/${groupId}/events/${id}`, { status: 'CANCELLED', reason }).then((r) => r.data),
  reactivate: (groupId: string, id: string) =>
    api.patch<Event>(`/groups/${groupId}/events/${id}`, { status: 'ACTIVE' }).then((r) => r.data),
  remove: (groupId: string, id: string) =>
    api.delete(`/groups/${groupId}/events/${id}`).then((r) => r.data),
  setRsvp: (groupId: string, id: string, status: RsvpStatus) =>
    api.patch(`/groups/${groupId}/events/${id}/rsvp`, { status }).then((r) => r.data),
  balances: (groupId: string, id: string) =>
    api.get<BalanceTransfer[]>(`/groups/${groupId}/events/${id}/balances`).then((r) => r.data),
  addNeed: (groupId: string, id: string, label: string) =>
    api.post<EventNeed>(`/groups/${groupId}/events/${id}/needs`, { label }).then((r) => r.data),
  claimNeed: (groupId: string, id: string, needId: string) =>
    api.patch(`/groups/${groupId}/events/${id}/needs/${needId}/claim`).then((r) => r.data),
  releaseNeed: (groupId: string, id: string, needId: string) =>
    api.delete(`/groups/${groupId}/events/${id}/needs/${needId}/claim`).then((r) => r.data),
  addExpense: (groupId: string, id: string, body: { label: string; amount: number; participantIds: string[] }) =>
    api.post<EventExpense>(`/groups/${groupId}/events/${id}/expenses`, body).then((r) => r.data),
  removeExpense: (groupId: string, id: string, expenseId: string) =>
    api.delete(`/groups/${groupId}/events/${id}/expenses/${expenseId}`).then((r) => r.data),
  addComment: (groupId: string, id: string, text: string) =>
    api.post<EventComment>(`/groups/${groupId}/events/${id}/comments`, { text }).then((r) => r.data),
  removeComment: (groupId: string, id: string, commentId: string) =>
    api.delete(`/groups/${groupId}/events/${id}/comments/${commentId}`).then((r) => r.data),
  reportComment: (groupId: string, id: string, commentId: string, reason?: string) =>
    api.post(`/groups/${groupId}/events/${id}/comments/${commentId}/report`, { reason }).then((r) => r.data),
};

// --- Admin ---
export const adminApi = {
  invitations: (groupId: string) =>
    api.get<Invitation[]>(`/groups/${groupId}/admin/invitations`).then((r) => r.data),
  invite: (groupId: string, email: string) =>
    api.post<Invitation>(`/groups/${groupId}/admin/invite`, { email }).then((r) => r.data),
  inviteLink: (groupId: string) =>
    api.post<Invitation>(`/groups/${groupId}/admin/invite/link`, {}).then((r) => r.data),
  deleteInvitation: (groupId: string, id: string) =>
    api.delete(`/groups/${groupId}/admin/invitations/${id}`).then((r) => r.data),
  reports: (groupId: string) =>
    api.get(`/groups/${groupId}/admin/reports`).then((r) => r.data),
  resolveReport: (groupId: string, commentId: string, op: 'delete' | 'dismiss') =>
    api.post(`/groups/${groupId}/admin/reports`, { commentId, op }).then((r) => r.data),
};

// --- Push ---
export const pushApi = {
  subscribe: (token: string) => api.post('/push/subscribe', { token }).then((r) => r.data),
  unsubscribe: (token: string) =>
    api.delete('/push/subscribe', { data: { token } }).then((r) => r.data),
};
