import { Tabs, router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { colors, fontWeight } from '@/theme';

/**
 * Bottom tab bar within a group context (spec 00-overview.md → Navigation).
 * The "Profil" tab opens the GLOBAL /profile screen (shared across groups),
 * so its tabPress is intercepted to push outside the group stack.
 */
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{icon}</Text>;
}

export default function GroupLayout() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: fontWeight.medium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Accueil', tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="presences"
        options={{ title: 'Présences', tabBarIcon: ({ color }) => <TabIcon icon="📅" color={color} /> }}
      />
      <Tabs.Screen
        name="sorties"
        options={{ title: 'Sorties', tabBarIcon: ({ color }) => <TabIcon icon="✨" color={color} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/profile');
          },
        }}
      />
      {/* Routes reachable from within the group but hidden from the tab bar. */}
      <Tabs.Screen name="membres" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
    </Tabs>
  );
}
