import { Redirect } from 'expo-router';

// The "Profil" tab opens the global /profile (the tabPress listener in _layout.tsx
// pushes it). This screen only renders as a fallback if reached directly.
export default function ProfilTab() {
  return <Redirect href="/profile" />;
}
