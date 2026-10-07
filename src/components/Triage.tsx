import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Lock, Plus, Trash2 } from 'lucide-react';
import { upsertIncident, type SeverityGrade, type SnakeSpecies, type VenomClass } from '../db/db';
import { useAppStore, DEFAULT_GPS } from '../store/store';
import {
  ALWAYS_DO,
  HEMOTOXIC_SYMPTOMS,
  LOCAL_SYMPTOMS,
  NEVER_DO,
  NEUROTOXIC_SYMPTOMS,
  SEVERITY,
  VENOM,
  formatDateTime,
  gradeFromSymptoms,
  recheckInterval,
} from '../lib/clinical';
import { Badge, Card, SectionTitle } from './ui/Primitives';
import { newIncidentId } from '../lib/data';

interface TriageProps {
  species: SnakeSpecies | null;
  imageDataUrl: string | null;
  onOpenSpecies: (taxonId: number) => void;
  onFinished: () => void;
}

const STEPS = ['Bite details', 'Local signs', 'Whole-body signs', 'Result'] as const;

const SWELLING: Record<number, string> = {
  0: 'No swelling',
  1: 'Limited to the area around the bite',
  2: 'Spread to half the limb',
  3: 'Spread to the whole limb',
  4: 'Spread past the limb toward the trunk',
};

const BITE_LOCATIONS = [
  'Lower leg',
  'Thigh',
  'Foot or ankle',
  'Lower arm',
  'Hand or finger',
  'Neck or head',
];

export default function Triage({ species, imageDataUrl, onOpenSpecies, onFinished }: TriageProps) {
  const { gps, accountName, setAccountName, refreshPendingSyncCount } = useAppStore();

  const [step, setStep] = useState(0);
  const [incidentId, setIncidentId] = useState<string>('');

  const [biteLocation, setBiteLocation] = useState('Lower leg');
  const [biteTime, setBiteTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [painScale, setPainScale] = useState(1);
  const [swellingGrade, setSwellingGrade] = useState(0);
  const [localEffects, setLocalEffects] = useState<string[]>([]);
  const [systemicEffects, setSystemicEffects] = useState<string[]>([]);
  const [hr, setHr] = useState(80);
  const [bp, setBp] = useState('120/80');
  const [spo2, setSpo2] = useState(98);
  const [photos, setPhotos] = useState<Array<{ dataUrl: string; at: number }>>([]);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [pendingSave, setPendingSave] = useState(false);
  const [saved, setSaved] = useState(false);

  const grade = useMemo<SeverityGrade>(
    () => gradeFromSymptoms({ swellingGrade, painScale, localEffects, systemicEffects, spo2 }),
    [painScale, swellingGrade, localEffects, systemicEffects, spo2],
  );
  const severity = SEVERITY[grade];

  useEffect(() => {
    setIncidentId(newIncidentId());
  }, []);

  useEffect(() => {
    if (imageDataUrl && photos.length === 0) {
      setPhotos([{ dataUrl: imageDataUrl, at: Date.now() }]);
    }
    // Only seeds the first photo; later captures are user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageDataUrl]);

  function toggle(list: string[], setList: (next: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotos((prev) => [...prev, { dataUrl: reader.result as string, at: Date.now() }]);
      }
    };
    reader.readAsDataURL(file);
  }

  async function save(signedIn: boolean) {
    const details = {
      gps_coordinates: {
        lat: gps?.lat ?? DEFAULT_GPS.lat,
        lng: gps?.lng ?? DEFAULT_GPS.lng,
        accuracy: gps?.accuracy ?? DEFAULT_GPS.accuracy,
        timestamp: Date.now(),
      },
      species_prediction: {
        primary: species?.scientific_name ?? 'Not identified',
        risk: (species?.venom_type ?? 'NON-VENOMOUS') as VenomClass,
        confidence: 0,
        alternatives: [],
      },
      severity_assessment: {
        grade,
        grade_history: [{ timestamp: Date.now(), grade }],
        who_protocol: [...ALWAYS_DO, ...NEVER_DO],
      },
      symptoms: {
        bite_location: biteLocation,
        pain_scale: painScale,
        swelling_grade: swellingGrade,
        local_effects: localEffects,
        systemic_effects: systemicEffects,
        vital_signs: { hr, bp, spo2 },
      },
    };
    await upsertIncident(incidentId, details, photos.map((p) => p.dataUrl), signedIn ? accountName : null);
    await refreshPendingSyncCount();
    setSaved(signedIn);
    setPendingSave(false);
  }

  const photoInputId = 'wound-photo-input';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onFinished} className="btn btn-tertiary -ml-2 px-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {step === 3 ? 'Finish' : 'Cancel'}
        </button>
        <p className="text-[13px] text-ink-muted">
          No account needed &middot; nothing uploaded
        </p>
      </div>

      <nav aria-label="Assessment steps" className="mt-4">
        <ol className="flex flex-wrap gap-x-1 gap-y-2">
          {STEPS.map((label, index) => {
            const active = step === index;
            const done = step > index;
            return (
              <li key={label} className="flex flex-1 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  aria-current={active ? 'step' : undefined}
                  className={`flex min-h-[44px] flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-semibold transition-colors ${
                    active ? 'bg-brand-50 text-brand' : done ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] ${
                      active ? 'bg-brand text-white' : done ? 'bg-ink text-white' : 'bg-surface-secondary text-ink-muted'
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="min-w-0 truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === 0 && (
        <div className="panel-in mt-6">
          <SectionTitle
            as="h1"
            overline={`Step 1 of 4`}
            title="When and where was the bite?"
            lede="This timestamp sets the clock for every observation that follows, and it is what the receiving clinic reads first."
          />
          <Card className="mt-6 p-5">
            <div className="space-y-5">
              <div>
                <label htmlFor="bite-location" className="label">
                  Bite location
                </label>
                <select
                  id="bite-location"
                  value={biteLocation}
                  onChange={(e) => setBiteLocation(e.target.value)}
                  className="field mt-1.5"
                >
                  {BITE_LOCATIONS.map((location) => (
                    <option key={location}>{location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bite-time" className="label">
                  Time of the bite
                </label>
                <input
                  id="bite-time"
                  type="datetime-local"
                  value={biteTime}
                  onChange={(e) => setBiteTime(e.target.value)}
                  className="field mt-1.5"
                />
              </div>

              <div className="border-t border-line pt-4">
                <p className="label">Recorded location</p>
                <p className="num mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
                  {gps
                    ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}, accuracy ${gps.accuracy} m`
                    : 'No satellite fix yet. The assessment can still be completed; the coordinate will be filled in when a fix arrives.'}
                </p>
              </div>
            </div>
          </Card>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => setStep(1)} className="btn btn-primary">
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="panel-in mt-6">
          <SectionTitle as="h1" overline="Step 2 of 4" title="What can you see at the bite site?" />
          <Card className="mt-6 p-5">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="pain" className="label">
                  Pain, 1 to 10
                </label>
                <span className="num text-sm font-semibold text-ink">{painScale}</span>
              </div>
              <input
                id="pain"
                type="range"
                min={1}
                max={10}
                value={painScale}
                onChange={(e) => setPainScale(Number(e.target.value))}
                className="mt-2 w-full accent-brand"
              />
              <div className="mt-1 flex justify-between text-[13px] text-ink-muted">
                <span>No pain</span>
                <span>Worst pain</span>
              </div>
            </div>

            <fieldset className="mt-6 border-t border-line pt-5">
              <legend className="label">Swelling</legend>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {[0, 1, 2, 3, 4].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSwellingGrade(value)}
                    aria-pressed={swellingGrade === value}
                    className={`min-h-[44px] rounded-md border text-sm font-semibold transition-colors ${
                      swellingGrade === value
                        ? 'border-brand bg-brand text-white'
                        : 'border-line-control bg-surface text-ink hover:bg-surface-secondary'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{SWELLING[swellingGrade]}</p>
            </fieldset>

            <fieldset className="mt-6 border-t border-line pt-5">
              <legend className="label">Other local signs</legend>
              <div className="mt-2 space-y-2">
                {LOCAL_SYMPTOMS.map((symptom) => (
                  <label
                    key={symptom}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border border-line-control px-3 py-2 text-sm hover:bg-surface-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={localEffects.includes(symptom)}
                      onChange={() => toggle(localEffects, setLocalEffects, symptom)}
                      className="h-4 w-4 flex-none accent-brand"
                    />
                    <span>{symptom}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
          <div className="mt-5 flex justify-between gap-3">
            <button type="button" onClick={() => setStep(0)} className="btn btn-secondary">
              Back
            </button>
            <button type="button" onClick={() => setStep(2)} className="btn btn-primary">
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="panel-in mt-6">
          <SectionTitle
            as="h1"
            overline="Step 3 of 4"
            title="Any signs away from the bite?"
            lede="Whole-body signs change the grade more than anything else you enter here."
          />
          <Card className="mt-6 space-y-5 p-5">
            <fieldset>
              <legend className="label">Breathing, movement, swallowing</legend>
              <div className="mt-2 space-y-2">
                {NEUROTOXIC_SYMPTOMS.map((symptom) => (
                  <label
                    key={symptom}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border border-line-control px-3 py-2 text-sm hover:bg-surface-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={systemicEffects.includes(symptom)}
                      onChange={() => toggle(systemicEffects, setSystemicEffects, symptom)}
                      className="h-4 w-4 flex-none accent-brand"
                    />
                    <span>{symptom}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="border-t border-line pt-5">
              <legend className="label">Bleeding and bruising</legend>
              <div className="mt-2 space-y-2">
                {HEMOTOXIC_SYMPTOMS.map((symptom) => (
                  <label
                    key={symptom}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border border-line-control px-3 py-2 text-sm hover:bg-surface-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={systemicEffects.includes(symptom)}
                      onChange={() => toggle(systemicEffects, setSystemicEffects, symptom)}
                      className="h-4 w-4 flex-none accent-brand"
                    />
                    <span>{symptom}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="border-t border-line pt-5">
              <legend className="label">Vital signs, if a reading is available</legend>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                Leave these at their defaults if you have no measurement. Guessing is worse than leaving them out.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="hr" className="label">
                    Pulse, bpm
                  </label>
                  <input id="hr" type="number" value={hr} onChange={(e) => setHr(Number(e.target.value))} className="field mt-1.5 text-center" />
                </div>
                <div>
                  <label htmlFor="bp" className="label">
                    Blood pressure
                  </label>
                  <input id="bp" type="text" value={bp} onChange={(e) => setBp(e.target.value)} className="field mt-1.5 text-center" />
                </div>
                <div>
                  <label htmlFor="spo2" className="label">
                    SpO2, %
                  </label>
                  <input
                    id="spo2"
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(Number(e.target.value))}
                    className="field mt-1.5 text-center"
                  />
                </div>
              </div>
              {spo2 < 90 && (
                <p role="alert" className="mt-3 text-[13px] font-semibold text-danger">
                  SpO2 below 90% is treated as life threatening regardless of anything else on this form.
                </p>
              )}
            </fieldset>
          </Card>
          <div className="mt-5 flex justify-between gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
              Back
            </button>
            <button type="button" onClick={() => setStep(3)} className="btn btn-primary">
              See the result
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="panel-in mt-6">
          <SectionTitle
            as="h1"
            overline="Assessment result"
            title={`Grade ${grade}: ${severity.label}`}
            lede={severity.summary}
          />

          <Card className="mt-6 border-l-4 border-l-brand p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={severity.tone}>Grade {grade}</Badge>
              <Badge tone="neutral">Recheck every {recheckInterval(grade)} minutes</Badge>
            </div>
            <p className="mt-3 text-[15px] font-semibold leading-relaxed text-ink">{severity.action}</p>
          </Card>

          <Card className="mt-5 p-5">
            <p className="text-[15px] font-semibold text-ink">How this grade was reached</p>
            <dl className="mt-3 space-y-2 text-[13px] leading-relaxed">
              {[
                ['Bite location', biteLocation],
                ['Time of bite', biteTime ? biteTime.replace('T', ' ') : 'not recorded'],
                ['Pain reported', `${painScale} out of 10`],
                ['Swelling', SWELLING[swellingGrade]],
                ['Local signs', localEffects.length ? localEffects.join(', ') : 'none recorded'],
                ['Whole-body signs', systemicEffects.length ? systemicEffects.join(', ') : 'none recorded'],
                ['SpO2', `${spo2}%`],
              ].map(([term, value]) => (
                <div key={term} className="grid gap-0.5 border-b border-line pb-2 sm:grid-cols-12 sm:gap-4">
                  <dt className="font-semibold text-ink sm:col-span-4">{term}</dt>
                  <dd className="text-ink-secondary sm:col-span-8">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="mt-5 p-5">
            <p className="text-[15px] font-semibold text-ink">Handling, in order</p>
            <ol className="mt-3 space-y-2">
              {ALWAYS_DO.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-secondary">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-success" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-md border border-danger/30 bg-danger-bg p-4">
              <p className="text-sm font-semibold text-danger">Do not do these</p>
              <ul className="mt-2 space-y-2">
                {NEVER_DO.map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink">
                    <Trash2 className="mt-0.5 h-4 w-4 flex-none text-danger" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {species && (
            <Card className="mt-5 p-5">
              <p className="text-[15px] font-semibold text-ink">Species carried into this assessment</p>
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={species.reference_images[0]}
                  alt={species.scientific_name}
                  className="h-14 w-20 flex-none rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{species.scientific_name}</p>
                  <div className="mt-1">
                    <Badge tone={VENOM[species.venom_type].tone}>{VENOM[species.venom_type].label}</Badge>
                  </div>
                </div>
                <button type="button" onClick={() => onOpenSpecies(species.taxon_id)} className="btn btn-secondary px-3">
                  Details
                </button>
              </div>
            </Card>
          )}

          <Card className="mt-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-ink">Wound record</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                  Optional. One photograph at each check-in shows the swelling spreading better than any number.
                </p>
              </div>
              <label htmlFor={photoInputId} className="btn btn-secondary cursor-pointer">
                <Camera className="h-4 w-4" aria-hidden="true" />
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add photograph
              </label>
              <input id={photoInputId} type="file" accept="image/*" onChange={addPhoto} className="sr-only" />
            </div>

            {photos.length === 0 ? (
              <p className="mt-4 rounded-md bg-surface-secondary px-3 py-4 text-center text-[13px] text-ink-secondary">
                No photographs yet.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {photos.map((photo, index) => (
                  <li key={photo.at} className="relative overflow-hidden rounded-md border border-line">
                    <img src={photo.dataUrl} alt={`Wound photograph ${index + 1}`} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-sm bg-danger text-white"
                      aria-label={`Remove wound photograph ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="num absolute inset-x-0 bottom-0 bg-ink/85 px-1.5 py-1 text-center text-[11px] font-semibold text-white">
                      {formatDateTime(photo.at).split(', ')[1]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* DESIGN.md 17/18: the result is already on screen. The account prompt
              sits below it and never blocks it. */}
          <Card className="mt-5 border-l-4 border-l-brand p-5">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Lock className="h-4 w-4 text-brand" aria-hidden="true" />
              Save this assessment
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              You have the full result either way. An account only keeps this record so you and the receiving
              clinic can read it again later.
            </p>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              {saved ? (
                <>
                  <p role="status" className="text-sm font-semibold text-success">
                    Saved to {accountName}. You will find it under History.
                  </p>
                  <button type="button" onClick={onFinished} className="btn btn-primary">
                    Done
                  </button>
                </>
              ) : (
                <>
                  {accountName ? (
                    <button type="button" onClick={() => void save(true)} className="btn btn-primary">
                      Save to {accountName}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setCreatingAccount((open) => !open)}
                        aria-expanded={creatingAccount}
                        className="btn btn-primary"
                      >
                        Create an account to save
                      </button>
                      <button type="button" onClick={() => void save(false)} className="btn btn-secondary">
                        Continue without saving
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {creatingAccount && !accountName && (
              <form
                className="panel-in mt-4 border-t border-line pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!draftName.trim()) return;
                  setAccountName(draftName.trim());
                  setCreatingAccount(false);
                  setPendingSave(true);
                }}
              >
                <label htmlFor="account-name" className="label">
                  Account name
                </label>
                <div className="mt-1.5 flex flex-col gap-2.5 sm:flex-row">
                  <input
                    id="account-name"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Your name"
                    className="field sm:max-w-[18rem]"
                  />
                  <button type="submit" className="btn btn-primary" disabled={!draftName.trim()}>
                    Create and save
                  </button>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
                  The name is stored on this device only. Nothing is sent anywhere.
                </p>
              </form>
            )}

            {pendingSave && accountName && !saved && (
              <div className="mt-4 border-t border-line pt-4">
                <button type="button" onClick={() => void save(true)} className="btn btn-primary">
                  Save this assessment to {accountName}
                </button>
              </div>
            )}

            </Card>

          <p className="mt-5 text-[13px] leading-relaxed text-ink-secondary">
            Assessment {incidentId}. Created {formatDateTime(Date.now())}. This tool supports clinical judgement; it
            does not replace it.
          </p>
        </div>
      )}
    </div>
  );
}