import { create } from 'zustand';
import { ScenarioId } from '../types/simulation';

interface UIState {
  currentScenarioId: ScenarioId;
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  setScenario: (scenarioId: ScenarioId) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentScenarioId: 'HAPPY_PATH',
  toastMessage: null,

  setScenario: (scenarioId) => set({ currentScenarioId: scenarioId }),
  showToast: () => {},
  clearToast: () => set({ toastMessage: null }),
}));
