import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  role: 'USER' | 'MAINTAINER';
}

interface AuthState {
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User | null) => void;
  setUsers: (users: User[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      users: [],
      setCurrentUser: (user) => set({ currentUser: user }),
      setUsers: (users) => set({ users })
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
    }
  )
);
