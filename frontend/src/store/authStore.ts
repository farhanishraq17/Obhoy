import { create } from 'zustand';
import { UserRole, UserProfile, ProviderEntity, InsurerEntity } from '../types/actor';
import { PRIMARY_USER, MOCK_USERS } from '../data/users';
import { MOCK_PROVIDERS } from '../data/providers';
import { MOCK_INSURERS } from '../data/insurers';
import { INSTITUTIONAL_VERIFIERS, InstitutionalVerifier } from '../data/verifiers';
import { setActiveMsp, ROLE_TO_MSP } from '../lib/api';

const REGISTERED_USERS_KEY = 'obhoy_registered_users';

function loadStoredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return MOCK_USERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with mock users to ensure default IDs are always available
      const existingIds = new Set(parsed.map((u: UserProfile) => u.id));
      const missingMocks = MOCK_USERS.filter((u) => !existingIds.has(u.id));
      return [...parsed, ...missingMocks];
    }
    return MOCK_USERS;
  } catch {
    return MOCK_USERS;
  }
}

function saveStoredUsers(users: UserProfile[]) {
  try {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

interface AuthState {
  isAuthenticated: boolean;
  currentRole: UserRole;
  currentUser: UserProfile;
  currentProvider: ProviderEntity;
  currentInsurer: InsurerEntity;
  currentVerifier: InstitutionalVerifier;
  registeredUsers: UserProfile[];
  login: (role: UserRole, user?: UserProfile) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  setUser: (user: UserProfile) => void;
  setProvider: (providerId: string) => void;
  setInsurer: (insurerId: string) => void;
  registerUser: (user: UserProfile) => void;
  loginByHolderNumber: (holderNumber: string) => { success: boolean; message?: string; user?: UserProfile };
  loginByProviderNumber: (providerNumber: string) => { success: boolean; message?: string; provider?: ProviderEntity };
  loginByVerifierNumber: (verifierNumber: string) => { success: boolean; message?: string; verifier?: InstitutionalVerifier };
  loginByInsurerNumber: (insurerNumber: string) => { success: boolean; message?: string; insurer?: InsurerEntity };
  loginByRegulatorNumber: (regulatorNumber: string) => { success: boolean; message?: string };
}

export const useAuthStore = create<AuthState>((set, get) => {
  const initialUsers = loadStoredUsers();

  return {
    isAuthenticated: true,
    currentRole: 'POLICYHOLDER',
    currentUser: initialUsers[0] || PRIMARY_USER,
    currentProvider: MOCK_PROVIDERS[0],
    currentInsurer: MOCK_INSURERS[0],
    currentVerifier: INSTITUTIONAL_VERIFIERS[0],
    registeredUsers: initialUsers,

    login: (role, user) => {
      setActiveMsp(ROLE_TO_MSP[role] || 'AcademicMSP');
      set({
        isAuthenticated: true,
        currentRole: role,
        ...(user ? { currentUser: user } : {}),
      });
    },

    logout: () => {
      setActiveMsp('AcademicMSP');
      set({ isAuthenticated: false, currentRole: 'PUBLIC' });
    },

    setRole: (role) => {
      setActiveMsp(ROLE_TO_MSP[role] || 'AcademicMSP');
      set({ currentRole: role });
    },

    setUser: (user) => set({ currentUser: user }),

    setProvider: (providerId) =>
      set({
        currentProvider: MOCK_PROVIDERS.find((p) => p.id === providerId) || MOCK_PROVIDERS[0],
      }),

    setInsurer: (insurerId) => {
      const found = MOCK_INSURERS.find((i) => i.id === insurerId) || MOCK_INSURERS[0];
      if (found.code === 'INS-B' || found.id === 'INS-02' || found.id === 'INS-002') {
        setActiveMsp('InsurerBMSP');
      } else {
        setActiveMsp('InsurerAMSP');
      }
      set({ currentInsurer: found });
    },

    registerUser: (newUser) => {
      const currentList = get().registeredUsers;
      const updated = [newUser, ...currentList.filter((u) => u.id !== newUser.id && u.nid !== newUser.nid)];
      saveStoredUsers(updated);
      set({
        registeredUsers: updated,
        currentUser: newUser,
        isAuthenticated: true,
        currentRole: 'POLICYHOLDER',
      });
      setActiveMsp('FieldMSP');
    },

    loginByHolderNumber: (holderNumber) => {
      const clean = holderNumber.trim().toUpperCase().replace('#', '');
      if (!clean) {
        return { success: false, message: 'Please enter a valid Holder Number.' };
      }

      const users = get().registeredUsers;
      const matched = users.find((u) => {
        const uHld = (u.holderNumber || '').toUpperCase();
        const uId = (u.id || '').toUpperCase();
        const uNid = (u.nid || '').toUpperCase();
        return (
          uHld === clean ||
          uHld.replace('HLD-', '') === clean ||
          `HLD-${clean}` === uHld ||
          uId === clean ||
          uNid === clean
        );
      });

      if (!matched) {
        return {
          success: false,
          message: `Holder Number "${holderNumber}" not found. Please verify your number or enroll as a new member.`,
        };
      }

      get().login('POLICYHOLDER', matched);
      return { success: true, user: matched };
    },

    loginByProviderNumber: (providerNumber) => {
      const clean = providerNumber.trim().toUpperCase().replace('#', '');
      if (!clean) {
        return { success: false, message: 'Please enter your institutional Provider Number.' };
      }

      const matched = MOCK_PROVIDERS.find((p) => {
        const pId = p.id.toUpperCase();
        return (
          pId === clean ||
          pId.replace('PRV-', '') === clean ||
          pId.includes(clean) ||
          clean.includes(pId.replace('PRV-UPAZILA-', '').replace('PRV-DISTRICT-', '').replace('PRV-FLAGGED-', '')) ||
          (clean === '101' && p.id.includes('101')) ||
          (clean === '202' && p.id.includes('202')) ||
          (clean === '303' && p.id.includes('303'))
        );
      });

      if (!matched) {
        return {
          success: false,
          message: `Provider Number "${providerNumber}" not recognized by the accreditation registry. Available demo IDs: PRV-101, PRV-202, PRV-303.`,
        };
      }

      set({ currentProvider: matched });
      get().login('PROVIDER');
      return { success: true, provider: matched };
    },

    loginByVerifierNumber: (verifierNumber) => {
      const clean = verifierNumber.trim().toUpperCase().replace('#', '');
      if (!clean) {
        return { success: false, message: 'Please enter your institutional Verifier Number.' };
      }

      const matched = INSTITUTIONAL_VERIFIERS.find((v) => {
        const vNum = v.verifierNumber.toUpperCase();
        return (
          vNum === clean ||
          vNum.replace('VRF-', '') === clean ||
          (clean.includes('CLIN') && v.role === 'CLINICAL_VERIFIER') ||
          (clean.includes('FIELD') && v.role === 'FIELD_VERIFIER') ||
          (clean === '01' && v.verifierNumber === 'VRF-CLIN-01') ||
          (clean === '02' && v.verifierNumber === 'VRF-FIELD-01')
        );
      });

      if (!matched) {
        return {
          success: false,
          message: `Verifier Number "${verifierNumber}" not recognized. Available demo IDs: VRF-CLIN-01 (Clinical), VRF-FIELD-01 (Field).`,
        };
      }

      set({ currentVerifier: matched });
      get().login(matched.role);
      return { success: true, verifier: matched };
    },

    loginByInsurerNumber: (insurerNumber) => {
      const clean = insurerNumber.trim().toUpperCase().replace('#', '');
      if (!clean) {
        return { success: false, message: 'Please enter your Insurer License Number.' };
      }

      const matched = MOCK_INSURERS.find((i) => {
        const iId = i.id.toUpperCase();
        return (
          iId === clean ||
          iId.replace('INS-', '') === clean ||
          clean === 'INS-01' ||
          clean === '01' ||
          clean === 'INS-001' ||
          (clean.includes('02') && i.id.includes('002')) ||
          (clean.includes('03') && i.id.includes('003'))
        );
      }) || MOCK_INSURERS[0];

      set({ currentInsurer: matched });
      get().login('INSURER');
      return { success: true, insurer: matched };
    },

    loginByRegulatorNumber: (regulatorNumber) => {
      const clean = regulatorNumber.trim().toUpperCase().replace('#', '');
      if (!clean) {
        return { success: false, message: 'Please enter IDRA Supervisory Node ID.' };
      }

      if (
        clean.includes('REG') ||
        clean.includes('IDRA') ||
        clean === '01' ||
        clean === 'SUPERVISOR' ||
        clean === 'AUDITOR'
      ) {
        get().login('REGULATOR');
        return { success: true };
      }

      return {
        success: false,
        message: 'Invalid Regulator Node ID. Try "REG-IDRA-01" or "IDRA".',
      };
    },
  };
});

