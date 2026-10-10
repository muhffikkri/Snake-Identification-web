import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { db, getIncidentLog, upsertIncident, type IncidentDetails, type VenomClass } from '../db/db';
import { useAppStore, DEFAULT_GPS } from '../store/store';
import { VENOM } from '../lib/clinical';
import { REGIONS, nearestRegion, regionAt } from '../lib/regions';
import { useNeonSpeciesPage, useLazyLoadSentinel } from '../lib/useNeonSpecies';
import { imageSrc, type SpeciesItem } from '../lib/neon';
import { Badge, Card, SectionTitle } from './ui/Primitives';

interface HomeProps {
  onNavigate: (page: 'identify' | 'triage' | 'discover' | 'activity') => void;
}

function HomeSpeciesSkeleton() {
  return (
    <ul className="mt-4 grid gap-2.5 sm:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="card h-20 animate-pulse overflow-hidden" />
      ))}
    </ul>
  );
}

export default function Home({ onNavigate }: HomeProps) {
  const { gps, networkStatus, account } = useAppStore();
  const { items, total, pages, page, loading, loadMore } = useNeonSpeciesPage();
  const [starting, setStarting] = useState(false);
  const [woundPhoto, setWoundPhoto] = useState<string | null>(null);

  const region = gps ? (regionAt(gps.lat, gps.lng) ?? nearestRegion(gps.lat, gps.lng)) : null;

  const sentinelRef = useLazyLoadSentinel(loadMore, !loading && page < pages);

  const localSpecies: SpeciesItem[] = loading
    ? []
    : items.filter((s) => s.observation_count > 0);

  /**
   * Emergency start. Records a worst-case assessment at the current coordinate so
   * the incident exists even if the user is never able to finish the form. It is
   * always owned by nobody until the user signs in, so it never lands in a
   * stranger's history.
   */
  async function startEmergency() {
    setStarting(true);
    const now = Date.now();
    const incidentId = `inc_emergency_${now.toString(36)}`;
    const details: IncidentDetails = {
      gps_coordinates: {
        lat: gps?.lat ?? DEFAULT_GPS.lat,
        lng: gps?.lng ?? DEFAULT_GPS.lng,
        accuracy: gps?.accuracy ?? DEFAULT_GPS.accuracy,
        timestamp: now,
      },
      species_prediction: { primary: 'Not identified', risk: 'NON-VENOMOUS' as VenomClass, confidence: 0, alternatives: [] },
      severity_assessment: {
        grade: 4,
        grade_history: [{ timestamp: now, grade: 4 }],
        who_protocol: [],
      },
      symptoms: {
        bite_location: 'Emergency start, not yet assessed',
        pain_scale: 10,
        swelling_grade: 4,
        local_effects: [],
        systemic_effects: ['Difficulty breathing'],
        vital_signs: { hr: 0, bp: '', spo2: 0 },
      },
    };
    await upsertIncident(incidentId, details, woundPhoto ? [woundPhoto] : [], account?.name ?? null);
    onNavigate('triage');
  }

  function captureWound(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setWoundPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function openEmergencyRecord() {
    const [latest] = await db.incidents.where('sync_status').equals('PENDING').toArray();
    if (latest) {
      const record = await getIncidentLog(latest.incident_id);
      if (record) onNavigate('triage');
      return;
    }
    onNavigate('activity');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <SectionTitle
        as="h1"
        overline="Home"
        title="Someone has been bitten"
        lede="Photograph the snake and run an identification, or go straight to the assessment. Both work with no connection and no account."
      />

      {/* The two actions are deliberately unequal. Triage is what saves a life,
          identification is the more common request. */}
      <div className="mt-7 grid gap-5 lg:grid-cols-5">
        <Card className="surface-soft p-5 lg:col-span-2">
          <div className="flex h-full flex-col">
            <p className="overline text-danger">Do this first</p>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-ink">Start the assessment</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Four short questions. It grades the bite and gives you the handling steps to follow on the way to
              the clinic.
            </p>

            <div className="mt-4">
              <label htmlFor="wound-photo" className="label">
                Photograph the wound (optional)
              </label>
              <input
                id="wound-photo"
                type="file"
                accept="image/*"
                onChange={captureWound}
                className="mt-1.5 field file:mr-3 file:rounded-sm file:border-0 file:bg-brand-50 file:px-2.5 file:py-1.5 file:text-[13px] file:font-semibold file:text-brand"
              />
              {woundPhoto && (
                <img src={woundPhoto} alt="The wound photograph you just selected" className="mt-2.5 h-28 w-full rounded-md object-cover" />
              )}
            </div>

            <div className="mt-auto flex flex-col gap-2.5 pt-5">
              <button type="button" onClick={() => onNavigate('triage')} className="btn btn-danger">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Start triage assessment
              </button>
              <button type="button" onClick={() => void startEmergency()} disabled={starting} className="btn btn-secondary">
                {starting ? 'Recording' : 'Record an emergency and start over'}
              </button>
              <button type="button" onClick={() => void openEmergencyRecord()} className="btn btn-tertiary px-0">
                Open my last assessment
              </button>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-5 lg:col-span-3">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="overline">Identify a snake</p>
                <h2 className="mt-2 text-xl font-semibold leading-tight text-ink">What was it?</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">
                  Runs on this device and reports a ranked list with a confidence figure, never a certainty.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button type="button" onClick={() => onNavigate('identify')} className="btn btn-primary">
                Identify a snake
              </button>
              <button type="button" onClick={() => onNavigate('discover')} className="btn btn-secondary">
                Browse snakes near me
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="overline">Likely species nearby</p>
                <h2 className="mt-2 text-lg font-semibold text-ink">
                  {region ? `Recorded in ${region.name}` : 'No location yet'}
                </h2>
              </div>
              <p className="num text-[13px] text-ink-secondary">
                {gps ? `${gps.lat.toFixed(3)}, ${gps.lng.toFixed(3)}` : 'Default coordinate'}
                {networkStatus === 'offline' && ' · offline'}
              </p>
            </div>

            {loading ? (
              <HomeSpeciesSkeleton />
            ) : localSpecies.length === 0 ? (
              <p className="mt-4 rounded-md bg-surface-secondary px-3 py-4 text-[13px] leading-relaxed text-ink-secondary">
                No species in the reference set match this region. Change your location or browse the full list.
              </p>
            ) : (
              <>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {localSpecies.map((s) => {
                    const img = s.image_path ? imageSrc(s.image_path) : undefined;
                    return (
                      <li key={s.slug}>
                        <button
                          type="button"
                          onClick={() => onNavigate('discover')}
                          className="flex h-full w-full items-stretch overflow-hidden rounded-lg border border-line bg-surface text-left transition-colors hover:border-line-control"
                        >
                          {img ? (
                            <img
                              src={img}
                              alt={s.scientific_name}
                              className="h-full w-16 flex-none bg-surface-secondary object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-full w-16 flex-none items-center justify-center bg-surface-secondary">
                              <span className="text-[10px] text-ink-muted">no image</span>
                            </div>
                          )}
                          <span className="min-w-0 flex-1 p-3">
                            <span className="block truncate text-sm font-semibold text-ink">{s.scientific_name}</span>
                            <span className="mt-0.5 block truncate text-[13px] text-ink-secondary">
                              {s.common_name_en ?? s.common_name_local}
                            </span>
                            <span className="mt-1.5 block">
                              <Badge tone={VENOM[s.venom_type].tone}>{VENOM[s.venom_type].label}</Badge>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div ref={sentinelRef} className="h-2" />
                <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
                  Presence here means a sighting has been recorded in this region, not that the snake is nearby.
                </p>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}