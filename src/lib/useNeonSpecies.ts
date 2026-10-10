import { useEffect, useRef, useState } from 'react';
import {
  fetchSpeciesPage,
  invalidate,
  PAGE_SIZE,
  type Page,
  type SpeciesItem,
} from './neon';

export { PAGE_SIZE };

/**
 * Lazy paginated access to the Neon species catalogue.
 * ponytail: React-state pagination, IntersectionObserver sentinel, no library.
 * Skeletons are rendered by the calling view based on `loading`.
 */
export function useNeonSpeciesPage(): {
  page: number;
  pages: number;
  total: number;
  items: SpeciesItem[];
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  reset: () => void;
} {
  const [state, setState] = useState<{
    page: number;
    pages: number;
    total: number;
    items: SpeciesItem[];
    loading: boolean;
    error: string | null;
  }>({
    page: 1,
    pages: 1,
    total: 0,
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load(pageToLoad: number, append: boolean) {
      try {
        const p: Page = await fetchSpeciesPage(pageToLoad);
        if (cancelled) return;
        setState((s) => ({
          ...s,
          page: p.page,
          pages: p.pages,
          total: p.total,
          items: append ? [...s.items, ...p.items] : p.items,
          loading: false,
          error: null,
        }));
      } catch (e) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        }));
      }
    }

    void load(1, false);
    return () => {
      cancelled = true;
    };
  }, []);

  function loadMore() {
    if (state.loading || state.page >= state.pages) return;
    setState((s) => ({ ...s, loading: true }));
    void fetchSpeciesPage(state.page + 1)
      .then((p) => {
        setState((s) => ({
          ...s,
          page: p.page,
          pages: p.pages,
          total: p.total,
          items: [...s.items, ...p.items],
          loading: false,
        }));
      })
      .catch((e) => {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        }));
      });
  }

  function reset() {
    invalidate();
    setState({
      page: 1,
      pages: 1,
      total: 0,
      items: [],
      loading: true,
      error: null,
    });
  }

  return { ...state, loadMore, reset };
}

/**
 * Sentinel ref for lazy-load: attach to a trailing element and when it enters
 * the viewport the observer calls `onVisible`.
 */
export function useLazyLoadSentinel(
  onVisible: () => void,
  enabled: boolean,
): React.MutableRefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onVisible();
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, onVisible]);

  return ref;
}
