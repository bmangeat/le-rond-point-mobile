import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';

/**
 * Resolves the active group from the URL param and the current user's
 * membership (role, color) loaded in the auth context.
 */
export function useGroup() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { memberships } = useAuth();
  const membership = memberships.find((m) => m.groupId === groupId);
  const role = membership?.role ?? 'MEMBER';
  return {
    groupId: groupId!,
    /** `{ id, name }` of the active group (from the profile membership). */
    group: membership?.group,
    membership,
    role,
    isAdmin: role === 'ADMIN',
    memberColor: membership?.memberColor ?? 1,
  };
}
