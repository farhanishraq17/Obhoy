const STORAGE_KEY = 'obhoy_simulation_state_v1';

export function loadStoredState<T>(defaultState: T): T {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return defaultState;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
    return defaultState;
  }
}

export function saveStoredState<T>(state: T): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

export function clearStoredState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear state from localStorage:', error);
  }
}
