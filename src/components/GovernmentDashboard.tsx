import { useState } from 'react';
import { Check } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import { markAllSynced, type DecryptedIncident } from '../db/db';
import { useIncidents, useSpecies } from '../lib/data';
import { SEVERITY, VENOM, formatDateTime } from '../lib/clinical';
import { REGIONS, regionAt } from '../lib/regions';
import { useAppStore } from '../store/store';
import { Badge, Bar, Card, EmptyState, ErrorState, SectionTitle } from './ui/Primitives';

type Tab = 'overview' | 'map' | 'species' | 'reports';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'map', label: 'Distribution map' },
  { id: 'species', label: 'Species' },
  { id: 'reports', label: 'Data and reports' },
];

/**
 * Four ramp steps from the brand scale. Some pairs sit under the 3:1 non-text
 * bar against each other, which is exactly why the map never relies on the ramp
 * alone: every region also reports its count in the popup and in the ranked
 * list below it.
 */
const DENSITY_STEPS: Array<{ max: number; fill: string; label: string }> = [
  { max: 0, fill: '#F2C8CC', label: 'No reports' },
  { max: 2, fill: '#B83B49', label: 'Low, 1 to 2' },
  { max: 10, fill: '#70020F', label: 'Medium, 3 to 10' },
  { max: Infinity, fill: '#3A0007', label: 'High, over 10' },
];

function densityStep(count: number) {
  return DENSITY_STEPS.find((step) => count <= step.max) ?? DENSITY_STEPS[DENSITY_STEPS.length - 1];
}

function Overview() {
  const incidents = useIncidents();
  const species = useSpecies();
  const { pendingSyncCount } = useAppStore();

  if (incidents.loading || species.loading) {
    return (
      <div>
        <p role="status" className="text-sm text-ink-secondary">
          Compiling the national view
        </p>
        <div className="card mt-4 h-40 animate-pulse" />
      </div>
    );
  }

  if (incidents.error) {
    return <ErrorState title="The incident log could not be read" body={incidents.error} />;
  }

  const all = incidents.data ?? [];
  const venomous = all.filter((i) => i.details.species_prediction.risk !== 'NON-VENOMOUS');
  const critical = all.filter((i) => i.details.severity_assessment.grade >= 3);
  const regions = new Set(
    all.map((i) => regionAt(i.details.gps_coordinates.lat, i.details.gps_coordinates.lng)?.id).filter(Boolean),
  );

  return (
    <div className="space-y-5">
      {/* One metric carries the screen; the rest support it. */}
      <Card className="p-5">
        <p className="overline">Share of assessments needing antivenom or resuscitation</p>
        <p className="num mt-2 text-5xl font-bold leading-none text-brand">
          {all.length === 0 ? '0%' : `${Math.round((critical.length / all.length) * 100)}%`}
        </p>
        <p className="mt-2 text-[13px] text-ink-secondary">
          {critical.length} of {all.length} assessments were graded 3 or 4.
        </p>
      </Card>

      <Card className="p-5">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="overline">Total assessments</p>
            <p className="num mt-1.5 text-3xl font-semibold text-ink">{all.length}</p>
          </div>
          <div>
            <p className="overline">Venomous cases</p>
            <p className="num mt-1.5 text-3xl font-semibold text-ink">{venomous.length}</p>
          </div>
          <div>
            <p className="overline">Recorded locations</p>
            <p className="num mt-1.5 text-3xl font-semibold text-ink">{regions.size}</p>
          </div>
          <div>
            <p className="overline">Waiting to sync</p>
            <p className="num mt-1.5 text-3xl font-semibold text-ink">{pendingSyncCount}</p>
          </div>
        </div>
      </Card>

      {all.length === 0 && (
        <EmptyState
          title="No assessment data on this device yet"
          body="The national view is built from assessments recorded on devices that have synced. Nothing has arrived, so every figure above is a true zero rather than a gap."
        />
      )}

      <RegionBreakdown incidents={all} />
    </div>
  );
}

function RegionBreakdown({ incidents }: { incidents: DecryptedIncident[] }) {
  const rows = REGIONS.map((region) => {
    const inRegion = incidents.filter(
      (i) => regionAt(i.details.gps_coordinates.lat, i.details.gps_coordinates.lng)?.id === region.id,
    );
    return {
      region,
      count: inRegion.length,
      critical: inRegion.filter((i) => i.details.severity_assessment.grade >= 3).length,
    };
  });
  const busiest = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card className="p-5">
      <p className="text-[15px] font-semibold text-ink">Assessments by region</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
        How many assessments each region has contributed, and how many of those were graded 3 or 4.
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map(({ region, count, critical }) => (
          <li key={region.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink">{region.name}</span>
              <span className="num text-[13px] text-ink-secondary">
                {count} recorded
                {count > 0 && `, ${critical} critical`}
              </span>
            </div>
            <div className="mt-1.5">
              <Bar
                value={count}
                max={busiest}
                label={`${region.name} assessment count`}
                tone={critical > 0 ? 'danger' : 'brand'}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface DistributionPanelProps {
  counts: Array<{ id: string; count: number }>;
  incidents: DecryptedIncident[];
  speciesImageFor: (scientificName: string) => string;
}

function DistributionMap({ counts, incidents, speciesImageFor }: DistributionPanelProps) {
  const countFor = (id: string) => counts.find((c) => c.id === id)?.count ?? 0;
  const activeId = [...counts].filter((c) => c.count > 0).sort((a, b) => b.count - a.count)[0]?.id;

  const marker = (grade: number): L.DivIcon =>
    L.divIcon({
      className: 'sba-marker',
      html: `<span class="sba-marker__dot" style="background:${grade >= 3 ? '#70020F' : grade === 2 ? '#B7791F' : '#15803D'};width:12px;height:12px"></span>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

  return (
    <div className="relative z-0 h-[420px] w-full">
      <MapContainer
        center={[-2.5489, 118.0149]}
        zoom={4}
        minZoom={3}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {REGIONS.map((region) => {
          const count = countFor(region.id);
          return (
            <Polygon
              key={region.id}
              positions={region.outline}
              pathOptions={{
                fillColor: densityStep(count).fill,
                fillOpacity: 0.55,
                color: activeId === region.id ? '#101828' : '#D0D5DD',
                weight: activeId === region.id ? 2 : 1,
              }}
            >
              <Popup>
                <div className="space-y-1 p-0.5 text-left">
                  <p className="text-sm font-semibold">{region.name}</p>
                  <p className="text-xs">
                    Reported assessments: <strong>{count}</strong>
                  </p>
                  <p className="text-xs">Density: {densityStep(count).label}</p>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {incidents.map((incident) => (
          <Marker
            key={incident.incident_id}
            position={[incident.details.gps_coordinates.lat, incident.details.gps_coordinates.lng]}
            icon={marker(incident.details.severity_assessment.grade)}
          >
            <Popup>
              <div className="w-44 space-y-2 p-0.5 text-left">
                <img
                  src={speciesImageFor(incident.details.species_prediction.primary)}
                  alt=""
                  className="h-16 w-full rounded-sm object-cover"
                />
                <p className="truncate text-xs font-semibold">{incident.details.species_prediction.primary}</p>
                <p className="text-xs">Grade {incident.details.severity_assessment.grade}</p>
                <p className="text-xs">{formatDateTime(incident.timestamp)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="sr-only">
        Indonesia divided into {REGIONS.length} regions. Use the ranked list below the map for the counts, which
        every region also reports here.
      </p>
    </div>
  );
}

function DistributionPanel() {
  const incidents = useIncidents();
  const species = useSpecies();
  const [regionFilter, setRegionFilter] = useState('');
  const [venomFilter, setVenomFilter] = useState('');
  const [query, setQuery] = useState('');

  if (incidents.loading || species.loading) {
    return (
      <div>
        <p role="status" className="text-sm text-ink-secondary">
          Loading distribution data
        </p>
        <div className="card mt-4 h-96 animate-pulse" />
      </div>
    );
  }

  const all = incidents.data ?? [];
  const filtered = all.filter((i) => {
    if (venomFilter === 'venomous' && i.details.species_prediction.risk === 'NON-VENOMOUS') return false;
    if (venomFilter === 'harmless' && i.details.species_prediction.risk !== 'NON-VENOMOUS') return false;
    if (regionFilter) {
      if (regionAt(i.details.gps_coordinates.lat, i.details.gps_coordinates.lng)?.id !== regionFilter) return false;
    }
    if (query && !i.details.species_prediction.primary.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const counts = REGIONS.map((region) => ({
    id: region.id,
    count: filtered.filter(
      (i) => regionAt(i.details.gps_coordinates.lat, i.details.gps_coordinates.lng)?.id === region.id,
    ).length,
  }));

  const speciesImageFor = (scientificName: string): string =>
    species.data?.find((s) => s.scientific_name === scientificName)?.reference_images[0] ?? '/Logo_1.webp';

  const busiest = Math.max(1, ...counts.map((c) => c.count));
  const clearFilters = () => {
    setRegionFilter('');
    setVenomFilter('');
    setQuery('');
  };

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="region-filter" className="label">
              Region
            </label>
            <select
              id="region-filter"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="field mt-1.5"
            >
              <option value="">All of Indonesia</option>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="venom-filter" className="label">
              Venom status
            </label>
            <select
              id="venom-filter"
              value={venomFilter}
              onChange={(e) => setVenomFilter(e.target.value)}
              className="field mt-1.5"
            >
              <option value="">All</option>
              <option value="venomous">Venomous only</option>
              <option value="harmless">Non-venomous only</option>
            </select>
          </div>
          <div>
            <label htmlFor="species-filter" className="label">
              Species
            </label>
            <input
              id="species-filter"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search species"
              className="field mt-1.5"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
          <p className="text-[15px] font-semibold text-ink">Indonesia snake distribution</p>
          <p className="text-[13px] text-ink-secondary">
            {filtered.length} assessments match the filters
          </p>
        </div>

        <DistributionMap counts={counts} incidents={filtered} speciesImageFor={speciesImageFor} />

        <div className="border-t border-line px-5 py-4">
          <p className="overline">Report density</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {DENSITY_STEPS.map((step) => (
              <li key={step.label} className="flex items-center gap-2 text-[13px] text-ink-secondary">
                <span
                  aria-hidden="true"
                  className="h-3 w-5 rounded-sm border border-line"
                  style={{ backgroundColor: step.fill }}
                />
                {step.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
            Darker means more reports recorded from this device. Outlines are schematic island-group shapes, not
            administrative province boundaries; a deployed version would need a real GeoJSON source to replace them.
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-[15px] font-semibold text-ink">Where the reports are concentrated</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
          Ranked by share of the matching assessments. Bar length carries the value; the count is printed.
        </p>

        {filtered.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No assessments match these filters"
              body="Widen the region or venom filter to see more, or wait until assessments arrive from the field."
              action={
                <button type="button" onClick={clearFilters} className="btn btn-secondary">
                  Clear filters
                </button>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {counts.map(({ id, count }) => (
              <li key={id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink">{REGIONS.find((r) => r.id === id)?.name}</span>
                  <span className="num text-[13px] text-ink-secondary">
                    {count} reported &middot; {densityStep(count).label}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar value={count} max={busiest} label={`${id} share of assessments`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {filtered.length > 0 && (
        <Card className="p-5">
          <p className="text-[15px] font-semibold text-ink">Reported locations</p>
          <ul className="mt-3 divide-y divide-line">
            {filtered.slice(0, 12).map((i) => {
              const grade = i.details.severity_assessment.grade;
              return (
                <li key={i.incident_id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{i.details.species_prediction.primary}</p>
                    <p className="num text-[13px] text-ink-secondary">
                      {formatDateTime(i.timestamp)} &middot;{' '}
                      {regionAt(i.details.gps_coordinates.lat, i.details.gps_coordinates.lng)?.name ?? 'unassigned'}
                    </p>
                  </div>
                  <Badge tone={SEVERITY[grade].tone}>Grade {grade}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function SpeciesTable() {
  const incidents = useIncidents();
  const species = useSpecies();
  const [query, setQuery] = useState('');

  if (incidents.loading || species.loading) {
    return (
      <div>
        <p role="status" className="text-sm text-ink-secondary">
          Loading species records
        </p>
        <div className="card mt-4 h-64 animate-pulse" />
      </div>
    );
  }

  const all = incidents.data ?? [];
  const rows = (species.data ?? [])
    .map((sp) => {
      const reports = all.filter((i) => i.details.species_prediction.primary === sp.scientific_name);
      return { sp, reports: reports.length, critical: reports.filter((i) => i.details.severity_assessment.grade >= 3).length };
    })
    .filter(({ sp }) => !query || sp.scientific_name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <label htmlFor="gov-species-search" className="label">
          Search species
        </label>
        <input
          id="gov-species-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Scientific or common name"
          className="field mt-1.5 sm:max-w-sm"
        />
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="No species match that search"
          body="Clear the search to see the whole reference set held on this device."
          action={
            <button type="button" onClick={() => setQuery('')} className="btn btn-secondary">
              Clear search
            </button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Species in the on-device reference set with report counts</caption>
              <thead className="border-b border-line bg-surface-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3 text-[13px] font-semibold text-ink-secondary">
                    Species
                  </th>
                  <th scope="col" className="px-4 py-3 text-[13px] font-semibold text-ink-secondary">
                    Venom
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-[13px] font-semibold text-ink-secondary">
                    Reports
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-[13px] font-semibold text-ink-secondary">
                    Grade 3 or 4
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ sp, reports, critical }) => (
                  <tr key={sp.taxon_id}>
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">
                      <span className="block">{sp.scientific_name}</span>
                      <span className="block text-[13px] font-normal text-ink-secondary">{sp.common_name}</span>
                    </th>
                    <td className="px-4 py-3">
                      <Badge tone={VENOM[sp.venom_type].tone}>{VENOM[sp.venom_type].label}</Badge>
                    </td>
                    <td className="num px-4 py-3 text-right text-ink">{reports}</td>
                    <td className="num px-4 py-3 text-right text-ink">{critical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Reports() {
  const incidents = useIncidents();
  const { networkStatus, setNetworkStatus, refreshPendingSyncCount } = useAppStore();
  const [syncing, setSyncing] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  if (incidents.loading) {
    return (
      <div>
        <p role="status" className="text-sm text-ink-secondary">
          Reading the sync queue
        </p>
        <div className="card mt-4 h-64 animate-pulse" />
      </div>
    );
  }

  const all = incidents.data ?? [];
  const pending = all.filter((i) => i.sync_status === 'PENDING');
  const synced = all.filter((i) => i.sync_status === 'SYNCED');

  async function runSync() {
    if (pending.length === 0) return;
    setSyncing(true);
    setLog([]);
    const steps = [
      `Batch ${pending.length} assessment${pending.length === 1 ? '' : 's'} into one request`,
      'Encrypt the clinical payload',
      `POST ${pending.length} record${pending.length === 1 ? '' : 's'} to the ministry endpoint`,
    ];
    for (const [index, line] of steps.entries()) {
      await new Promise((resolve) => window.setTimeout(resolve, 320 * (index + 1)));
      setLog((prev) => [...prev, line]);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 320 * steps.length));
    await markAllSynced();
    await refreshPendingSyncCount();
    await incidents.reload();
    setSyncing(false);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="overline">Sync queue</p>
            <p className="num mt-1.5 text-3xl font-semibold text-ink">{pending.length}</p>
            <p className="mt-1 text-[13px] text-ink-secondary">
              {synced.length} already delivered. Device is {networkStatus}.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={runSync} disabled={pending.length === 0 || syncing} className="btn btn-primary">
              {syncing ? 'Syncing' : 'Sync pending records'}
            </button>
            <button
              type="button"
              onClick={() => setNetworkStatus(networkStatus === 'online' ? 'offline' : 'online')}
              className="btn btn-secondary"
            >
              Simulate {networkStatus === 'online' ? 'offline' : 'online'}
            </button>
          </div>
        </div>

        {log.length > 0 && (
          <ol className="mt-4 space-y-1.5 border-t border-line pt-4">
            {log.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-secondary">
                <Check className="mt-0.5 h-4 w-4 flex-none text-success" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {all.length === 0 ? (
        <EmptyState
          title="Nothing queued for delivery"
          body="Assessment records appear here as soon as a device creates them, whether or not it has a network connection at the time."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <caption className="sr-only">Assessment records and their delivery status</caption>
              <thead className="border-b border-line bg-surface-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3 text-[13px] font-semibold text-ink-secondary">
                    Case
                  </th>
                  <th scope="col" className="px-4 py-3 text-[13px] font-semibold text-ink-secondary">
                    Species
                  </th>
                  <th scope="col" className="px-4 py-3 text-[13px] font-semibold text-ink-secondary">
                    Recorded
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-[13px] font-semibold text-ink-secondary">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {all.map((i) => (
                  <tr key={i.incident_id}>
                    <th scope="row" className="num px-4 py-3 font-semibold text-ink">
                      {i.incident_id}
                    </th>
                    <td className="px-4 py-3 text-ink-secondary">{i.details.species_prediction.primary}</td>
                    <td className="num px-4 py-3 text-ink-secondary">{formatDateTime(i.timestamp)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone={i.sync_status === 'SYNCED' ? 'success' : 'warning'}>
                        {i.sync_status === 'SYNCED' ? 'Delivered' : 'Queued'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function GovernmentDashboard() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <SectionTitle
        as="h1"
        overline="Government surveillance"
        title="Snakebite records across Indonesia"
        lede="Everything on this screen is computed from assessment records held on this device. Figures cover what has been collected so far, not the whole country."
      />

      <div className="mt-6 border-b border-line">
        <nav aria-label="Government sections">
          <ul className="flex flex-wrap gap-x-1">
            {TABS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? 'page' : undefined}
                  className={`min-h-[44px] border-b-2 px-3.5 text-sm font-semibold transition-colors ${
                    tab === item.id
                      ? 'border-brand text-brand'
                      : 'border-transparent text-ink-secondary hover:text-ink'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="panel-in mt-6">
        {tab === 'overview' && <Overview />}
        {tab === 'map' && <DistributionPanel />}
        {tab === 'species' && <SpeciesTable />}
        {tab === 'reports' && <Reports />}
      </div>

      <p className="mt-8 text-[13px] leading-relaxed text-ink-secondary">
        This prototype keeps all data on the device. A deployed version would receive these records from provincial
        facilities over a secure connection.
      </p>
    </div>
  );
}