import { create } from 'zustand';
import { db } from '../db/db';

export interface GPSData {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface AppState {
  gps: GPSData | null;
  networkStatus: 'online' | 'offline';
  /** Which product surface the user is looking at. */
  audience: 'GENERAL' | 'GOVERNMENT';
  /** DESIGN.md 40: an account saves history. It never gates triage. */
  accountName: string | null;
  pendingSyncCount: number;

  setGPS: (gps: GPSData | null) => void;
  setNetworkStatus: (status: 'online' | 'offline') => void;
  setAudience: (audience: AppState['audience']) => void;
  setAccountName: (name: string | null) => void;
  refreshPendingSyncCount: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  gps: null,
  networkStatus: navigator.onLine ? 'online' : 'offline',
  audience: 'GENERAL',
  accountName: null,
  pendingSyncCount: 0,

  setGPS: (gps) => set({ gps }),
  setNetworkStatus: (networkStatus) => set({ networkStatus }),
  setAudience: (audience) => set({ audience }),
  setAccountName: (accountName) => set({ accountName }),

  refreshPendingSyncCount: async () => {
    const count = await db.incidents.where('sync_status').equals('PENDING').count();
    set({ pendingSyncCount: count });
  },
}));

/** Fallback coordinate used when the device has no satellite fix yet. */
export const DEFAULT_GPS: GPSData = { lat: -6.2088, lng: 106.8456, accuracy: 15, timestamp: 0 };