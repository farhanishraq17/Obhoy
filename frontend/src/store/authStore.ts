import { create } from 'zustand';
import { UserRole, UserProfile, ProviderEntity, InsurerEntity } from '../types/actor';
import { PRIMARY_USER } from '../data/users';
import { MOCK_PROVIDERS } from '../data/providers';
import { MOCK_INSURERS } from '../data/insurers';
import { setActiveMsp, ROLE_TO_MSP } from '../lib/api';

interface AuthState {
  isAuthenticated: boolean;
  currentRole: UserRole;
  currentUser: UserProfile;
  currentProvider: ProviderEntity;
  currentInsurer: InsurerEntity;
  login: (role: UserRole) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  setProvider: (providerId: string) => void;
  setInsurer: (insurerId: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true, // Default to true so demo is smooth, but login/logout works cleanly
  currentRole: 'POLICYHOLDER',
  currentUser: PRIMARY_USER,
  currentProvider: MOCK_PROVIDERS[0],
  currentInsurer: MOCK_INSURERS[0],

  login: (role) => {
    setActiveMsp(ROLE_TO_MSP[role] || 'AcademicMSP');
    set({ isAuthenticated: true, currentRole: role });
  },
  logout: () => {
    setActiveMsp('AcademicMSP');
    set({ isAuthenticated: false, currentRole: 'PUBLIC' });
  },

  setRole: (role) => {
    setActiveMsp(ROLE_TO_MSP[role] || 'AcademicMSP');
    set({ currentRole: role });
  },
  setProvider: (providerId) =>
    set({
      currentProvider: MOCK_PROVIDERS.find((p) => p.id === providerId) || MOCK_PROVIDERS[0],
    }),
  setInsurer: (insurerId) => {
    const found = MOCK_INSURERS.find((i) => i.id === insurerId) || MOCK_INSURERS[0];
    if (found.code === 'INS-B' || found.id === 'INS-02') {
      setActiveMsp('InsurerBMSP');
    } else {
      setActiveMsp('InsurerAMSP');
    }
    set({ currentInsurer: found });
  },
}));
