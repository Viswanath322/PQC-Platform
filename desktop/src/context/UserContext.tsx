import React, { createContext, useContext, useState } from 'react';
import { defaultUserProfile } from '@/types';
import type { UserProfile } from '@/types';

interface UserContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

const STORAGE_KEY = 'pqc_sentinel_user_profile';

const UserContext = createContext<UserContextType>({
  profile: defaultUserProfile,
  updateProfile: () => {},
  resetProfile: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultUserProfile, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load user profile from localStorage:', e);
    }
    return defaultUserProfile;
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      // Auto-compute initials if name or fullName changed and initials weren't explicitly provided
      let avatarInitials = updates.avatarInitials || prev.avatarInitials;
      if (!updates.avatarInitials && (updates.name || updates.fullName)) {
        const source = updates.fullName || updates.name || prev.name;
        const parts = source.trim().split(/\s+/);
        if (parts.length >= 2) {
          avatarInitials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        } else if (source.length >= 2) {
          avatarInitials = source.substring(0, 2).toUpperCase();
        }
      }

      const next: UserProfile = {
        ...prev,
        ...updates,
        avatarInitials,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist user profile to localStorage:', e);
      }
      return next;
    });
  };

  const resetProfile = () => {
    setProfile(defaultUserProfile);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear user profile in localStorage:', e);
    }
  };

  return (
    <UserContext.Provider value={{ profile, updateProfile, resetProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
