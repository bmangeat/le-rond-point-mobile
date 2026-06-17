import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { useGroupStore } from '@/stores/groupStore';
import { Loading } from '@/components/ui';

/**
 * Entry redirector (spec 10-groupes.md):
 * - not authenticated → /login
 * - authenticated with a remembered, still-accessible group → /{lastGroupId}
 * - otherwise → /groups (hub + création)
 */
export default function Index() {
  const { loading, isAuthenticated, memberships } = useAuth();
  const { hydrated, lastGroupId } = useGroupStore();

  if (loading || !hydrated) return <Loading />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  const stillMember = lastGroupId && memberships.some((g) => g.id === lastGroupId);
  if (stillMember) return <Redirect href={`/${lastGroupId}`} />;
  return <Redirect href="/groups" />;
}
