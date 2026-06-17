import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** Centralized query keys to keep invalidation consistent across screens. */
export const qk = {
  profile: ['profile'] as const,
  groups: ['groups'] as const,
  group: (gid: string) => ['group', gid] as const,
  members: (gid: string) => ['members', gid] as const,
  presences: (gid: string) => ['presences', gid] as const,
  presenceToday: (gid: string) => ['presences', gid, 'today'] as const,
  events: (gid: string) => ['events', gid] as const,
  event: (gid: string, id: string) => ['event', gid, id] as const,
  balances: (gid: string, id: string) => ['balances', gid, id] as const,
  invitations: (gid: string) => ['invitations', gid] as const,
  reports: (gid: string) => ['reports', gid] as const,
};
