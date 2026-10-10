import { useMemo } from 'react';
import { useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';
import { useAppStore, DEFAULT_GPS } from '../store/store';
import { REGIONS, nearestRegion, regionAt, type Region } from '../lib/regions';
import { VENOM } from '../lib/clinical';
import { useNeonSpeciesPage } from '../lib/useNeonSpecies';
import { imageSrc, type SpeciesItem } from '../lib/neon';
import { Badge, Card, EmptyState, ErrorState, SectionTitle } from './ui/Primitives';

interface DiscoverProps {
  onOpenSpecies: (slug: string) => void;
}

interface MatchItem {
  item: SpeciesItem;
  here: boolean;
  image: string;
}

export function SpeciesCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <div className="card h-28 animate-pulse overflow-hidden" />
        </li>
      ))}
    </ul>
  );
}

export default function Discover({ onOpenSpecies }: DiscoverProps) {
  const { gps, setGPS, networkStatus } = useAppStore();
  const { items, total, pages, page, loading, error, goToPage } = useNeonSpeciesPage();

  const [pickedRegion, setPickedRegion] = useState<Region | null>(null);
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);

  const detected = useMemo(() => {
    if (pickedRegion) return pickedRegion;
    if (!gps) return null;
    return regionAt(gps.lat, gps.lng) ?? nearestRegion(gps.lat, gps.lng);
  }, [gps, pickedRegion]);

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setScanning(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGPS({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp,
        });
        setScanning(false);
      },
      () => {
        setGPS({ ...DEFAULT_GPS, timestamp: Date.now() });
        setScanning(false);
      },
      { timeout: 8000 },
    );
  }

  const matches: MatchItem[] = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter(
        (s) =>
          !needle ||
          s.scientific_name.toLowerCase().includes(needle) ||
          (s.common_name_en ?? '').toLowerCase().includes(needle) ||
          (s.common_name_local ?? '').toLowerCase().includes(needle),
      )
      .map((s) => ({
        item: s,
        here: s.observation_count > 0,
        image: s.image_path ? imageSrc(s.image_path) : '',
      }));
  }, [items, query]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <SectionTitle
        as="h1"
        overline="Snake map"
        title="Snakes recorded near you"
        lede="The live catalogue is held on the server and filtered by the region you are in or searching for. Anything listed here has been recorded somewhere in Indonesia."
      />

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="overline">Your location</p>
            <p className="mt-1.5 text-[15px] font-semibold text-ink">
              {detected ? detected.name : 'No location set'}
            </p>
            <p className="num mt-0.5 text-[13px] text-ink-secondary">
              {gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}, accuracy ${gps.accuracy} m` : 'Using the default coordinate'}
              {networkStatus === 'offline' && ' · working offline'}
            </p>
          </div>
          <button type="button" onClick={useCurrentLocation} disabled={scanning} className="btn btn-secondary">
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            {scanning ? 'Locating' : 'Use my location'}
          </button>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <label htmlFor="region-picker" className="label">
            Or choose a region
          </label>
          <select
            id="region-picker"
            value={pickedRegion?.id ?? ''}
            onChange={(e) => setPickedRegion(REGIONS.find((r) => r.id === e.target.value) ?? null)}
            className="field mt-1.5"
          >
            <option value="">Use the detected region</option>
            {REGIONS.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {error && (
        <div className="mt-5">
          <ErrorState title="The reference set could not be read" body={error} />
        </div>
      )}

      <div className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {detected ? `Species recorded in ${detected.name}` : 'Species in the reference set'}
            </h2>
            <p className="mt-1 text-[13px] text-ink-secondary">
              {loading ? 'Reading the reference set' : `${total} species`}
            </p>
          </div>
          <div className="w-full sm:w-64">
            <label htmlFor="species-search" className="sr-only">
              Search species by name
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="species-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search species"
                className="field pl-9"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <SpeciesCardSkeleton count={6} />
        ) : matches.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={query ? `Nothing matches "${query}"` : 'No species in the reference set yet'}
              body={
                query
                  ? 'Try the scientific name, or clear the search to see the whole set.'
                  : 'The reference set ships with the app. If it is empty, reinstall to restore it.'
              }
              action={
                query ? (
                  <button type="button" onClick={() => setQuery('')} className="btn btn-secondary">
                    Clear search
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {matches.map(({ item: sp, here, image }) => (
              <li key={sp.slug}>
                <Card className="h-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onOpenSpecies(sp.slug)}
                    className="flex h-full w-full items-stretch text-left"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={sp.scientific_name}
                        className="h-full w-24 flex-none bg-surface-secondary object-cover sm:w-28"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-24 flex-none items-center justify-center bg-surface-secondary sm:w-28">
                        <span className="text-[11px] text-ink-muted">no image</span>
                      </div>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col p-3.5">
                      <span className="truncate text-sm font-semibold text-ink">{sp.scientific_name}</span>
                      <span className="mt-0.5 truncate text-[13px] text-ink-secondary">
                        {sp.common_name_en ?? sp.common_name_local}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone={VENOM[sp.venom_type].tone}>{VENOM[sp.venom_type].label}</Badge>
                        {here && <Badge tone="info">Recorded</Badge>}
                      </span>
                    </span>
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {!loading && query === '' && (
          <PaginationNav page={page} pages={pages} total={total} onPage={goToPage} />
        )}
      </div>
    </div>
  );
}

/** Numbered page controls. Replaces the infinite-scroll "Load more" sentinel so
 * the discover list is navigable on a slow connection and screen readers can
 * announce the available pages. */
function PaginationNav({ page, pages, total, onPage }: {
  page: number;
  pages: number;
  total: number;
  onPage: (n: number) => void;
}) {
  // Only render a window of page numbers around the current one, plus first/last.
  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = Math.min(pages, page + windowSize);
  const numbers: (number | 'ellipsis')[] = [];
  if (start > 1) {
    numbers.push(1);
    if (start > 2) numbers.push('ellipsis');
  }
  for (let i = start; i <= end; i++) numbers.push(i);
  if (end < pages) {
    if (end < pages - 1) numbers.push('ellipsis');
    numbers.push(pages);
  }

  const label = (n: number) => `Go to page ${n}`;

  return (
    <nav
      aria-label="Species reference pages"
      className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
    >
      <button
        type="button"
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Previous page"
        className="btn btn-secondary min-w-[44px] justify-center text-[13px]"
      >
        Prev
      </button>
      {numbers.map((n, i) =>
        n === 'ellipsis' ? (
          <span key={`e-${i}`} aria-hidden="true" className="text-[13px] text-ink-muted">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={label(n)}
            className={`min-w-[44px] justify-center text-[13px] ${
              n === page
                ? 'btn btn-tertiary font-semibold text-brand'
                : 'btn btn-secondary'
            }`}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPage(Math.min(pages, page + 1))}
        disabled={page >= pages}
        aria-label="Next page"
        className="btn btn-secondary min-w-[44px] justify-center text-[13px]"
      >
        Next
      </button>
      <span aria-hidden="true" className="text-[13px] text-ink-secondary">
        {total} species
      </span>
    </nav>
  );
}
