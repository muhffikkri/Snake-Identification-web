import { useMemo, useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';
import { useAppStore, DEFAULT_GPS } from '../store/store';
import { REGIONS, nearestRegion, regionAt, type Region } from '../lib/regions';
import { VENOM } from '../lib/clinical';
import { useSpecies } from '../lib/data';
import { Badge, Card, EmptyState, ErrorState, SectionTitle } from './ui/Primitives';

interface DiscoverProps {
  onOpenSpecies: (taxonId: number) => void;
}

/** Regions the reference set actually covers, derived from each bounding box. */
function coversRegion(region: Region, bbox: { latMin: number; latMax: number; lngMin: number; lngMax: number }) {
  const [rLat, rLng] = region.center;
  return rLat >= bbox.latMin && rLat <= bbox.latMax && rLng >= bbox.lngMin && rLng <= bbox.lngMax;
}

export default function Discover({ onOpenSpecies }: DiscoverProps) {
  const { gps, setGPS, networkStatus } = useAppStore();
  const { data: species, error, loading } = useSpecies();

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
        // A denied or unavailable fix is a normal outcome, not a failure. The
        // manual region picker still works.
        setGPS({ ...DEFAULT_GPS, timestamp: Date.now() });
        setScanning(false);
      },
      { timeout: 8000 },
    );
  }

  const matches = useMemo(() => {
    if (!species) return [];
    const needle = query.trim().toLowerCase();
    return species
      .filter((s) => !needle || s.scientific_name.toLowerCase().includes(needle) || s.common_name.toLowerCase().includes(needle))
      .map((s) => ({
        species: s,
        here: detected ? coversRegion(detected, s.geo_bbox) : false,
      }))
      .sort((a, b) => Number(b.here) - Number(a.here));
  }, [species, query, detected]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <SectionTitle
        as="h1"
        overline="Snake map"
        title="Snakes recorded near you"
        lede="The device holds a reference set of species and the area each one has been recorded in. Anything listed here is plausible for this region, not proof that it is present."
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
              {loading ? 'Reading the on-device reference set' : `${matches.length} species`}
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
          <ul className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="card h-28 animate-pulse" />
            ))}
          </ul>
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
            {matches.map(({ species: sp, here }) => (
              <li key={sp.taxon_id}>
                <Card className="h-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onOpenSpecies(sp.taxon_id)}
                    className="flex h-full w-full items-stretch text-left"
                  >
                    <img
                      src={sp.reference_images[0]}
                      alt={sp.scientific_name}
                      className="h-full w-24 flex-none object-cover sm:w-28"
                      loading="lazy"
                    />
                    <span className="flex min-w-0 flex-1 flex-col p-3.5">
                      <span className="truncate text-sm font-semibold text-ink">{sp.scientific_name}</span>
                      <span className="mt-0.5 truncate text-[13px] text-ink-secondary">{sp.common_name}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone={VENOM[sp.venom_type].tone}>{VENOM[sp.venom_type].label}</Badge>
                        {here && <Badge tone="info">In this region</Badge>}
                      </span>
                    </span>
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}