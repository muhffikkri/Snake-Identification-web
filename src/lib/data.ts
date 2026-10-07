import { useCallback, useEffect, useState } from 'react';
import { getAllDecryptedIncidents, db, type DecryptedIncident, type SnakeSpecies } from '../db/db';

interface Async<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

/** Shared loader for the views backed by IndexedDB, so each gets the same three states. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (err) {
      console.error(err);
      setError('The on-device database could not be read. Close other tabs and try again.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function useSpecies() {
  return useAsync<SnakeSpecies[]>(() => db.species.toArray());
}

export function useIncidents() {
  return useAsync<DecryptedIncident[]>(() => getAllDecryptedIncidents());
}

/** Incident count for the signed-in account. Anonymous records are excluded. */
export function ownedIncidents(incidents: DecryptedIncident[], owner: string | null) {
  return owner ? incidents.filter((i) => i.owner === owner) : [];
}

export function newIncidentId(): string {
  return `inc_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}