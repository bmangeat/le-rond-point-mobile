import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';

/**
 * Resolves the active group from the URL param and the current user's
 * membership (role, color) loaded in the auth context.
 */
export function useGroup() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { memberships } = useAuth();
  const group = memberships.find((g) => g.id === groupId);
  const role = group?.membership?.role ?? 'MEMBER';
  return {
    groupId: groupId!,
    group,
    role,
    isAdmin: role === 'ADMIN',
    memberColor: group?.membership?.memberColor ?? 1,
  };
}
