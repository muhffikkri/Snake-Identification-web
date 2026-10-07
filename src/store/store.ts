import { create } from 'zustand';
import { db } from '../db/db';

export interface GPSData {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export type AccountRole = 'USER' | 'GOVERNMENT';

export interface Account {
  name: string;
  role: AccountRole;
}

interface AppState {
  gps: GPSData | null;
  networkStatus: 'online' | 'offline';
  /** Null means signed out. Triage never requires an account, so this is not a gate. */
  account: Account | null;
  pendingSyncCount: number;
  /**
   * An assessment held while the user is sent to register. Held here rather than
   * in the URL so a reload between the two pages does not lose it.
   */
  pendingAssessment: unknown | null;
  /** Carries a confirmed identification into the assessment. */
  identified: { species: unknown | null; imageDataUrl: string | null };

  setGPS: (gps: GPSData | null) => void;
  setNetworkStatus: (status: 'online' | 'offline') => void;
  login: (name: string, role: AccountRole) => void;
  logout: () => void;
  setPendingAssessment: (draft: unknown | null) => void;
  setIdentified: (identified: AppState['identified']) => void;
  refreshPendingSyncCount: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  gps: null,
  networkStatus: navigator.onLine ? 'online' : 'offline',
  account: null,
  pendingSyncCount: 0,
  pendingAssessment: null,
  identified: { species: null, imageDataUrl: null },

  setGPS: (gps) => set({ gps }),
  setNetworkStatus: (networkStatus) => set({ networkStatus }),
  login: (name, role) => set({ account: { name, role } }),
  logout: () => set({ account: null }),
  setPendingAssessment: (pendingAssessment) => set({ pendingAssessment }),
  setIdentified: (identified) => set({ identified }),

  // Never throws. A caller that only wants to refresh a badge must not be
  // derailed by a store read failing, or it will abandon its own work.
  refreshPendingSyncCount: async () => {
    try {
      const count = await db.incidents.where('sync_status').equals('PENDING').count();
      set({ pendingSyncCount: count });
    } catch (err) {
      console.error('Could not read the pending sync count:', err);
    }
  },
}));

/** Fallback coordinate used when the device has no satellite fix yet. */
export const DEFAULT_GPS: GPSData = { lat: -6.2088, lng: 106.8456, accuracy: 15, timestamp: 0 };