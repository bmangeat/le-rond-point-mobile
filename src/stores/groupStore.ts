import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_GROUP_KEY = 'lrp.lastGroupId';

interface GroupState {
  /** Last visited group — used by `/` to redirect (spec 10-groupes.md). */
  lastGroupId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLastGroupId: (id: string) => void;
  clear: () => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  lastGroupId: null,
  hydrated: false,
  hydrate: async () => {
    const id = await AsyncStorage.getItem(LAST_GROUP_KEY);
    set({ lastGroupId: id, hydrated: true });
  },
  setLastGroupId: (id) => {
    void AsyncStorage.setItem(LAST_GROUP_KEY, id);
    set({ lastGroupId: id });
  },
  clear: () => {
    void AsyncStorage.removeItem(LAST_GROUP_KEY);
    set({ lastGroupId: null });
  },
}));
