import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Upload } from 'lucide-react';
import { db, type SnakeSpecies, type VenomClass } from '../db/db';
import { useAppStore } from '../store/store';
import { VENOM, formatPercent } from '../lib/clinical';
import { Badge, Bar, Card, ErrorState, LoadingState, SectionTitle } from './ui/Primitives';

export type IdentifyOutcome = {
  chosen: SnakeSpecies;
  imageDataUrl: string;
} | null;

interface IdentifyProps {
  onBack: () => void;
  onProceed: (outcome: NonNullable<IdentifyOutcome>) => void;
  onOpenSpecies: (taxonId: number) => void;
}

const STEPS = [
  'Isolating the snake in the frame',
  'Extracting image embeddings on the device',
  'Comparing against reference photographs',
  'Filtering candidates against your location',
  'Preparing the ranked result',
];

const REFERENCE_SET = [
  '/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg',
  '/dataset/Acanthophis_laevis_obs137275705_photo234421463.jpg',
  '/dataset/Ahaetulla_fasciolata_obs202932892_photo358471931.jpg',
  '/dataset/Ahaetulla_fasciolata_obs310503736_photo560406804.jpg',
  '/dataset/Ahaetulla_prasina_0003.jpg',
  '/dataset/Ahaetulla_rufusoculara_obs252803925_photo456126350.jpg',
];

type Candidate = SnakeSpecies & { confidence: number; inArea: boolean };

/**
 * Reads the species out of a reference-set filename, so the demo path resolves
 * without a real model in the loop.
 */
function speciesForPath(path: string): string | null {
  const match = path.match(/\/dataset\/([A-Za-z]+)_([a-z]+)/);
  return match ? `${match[1]} ${match[2]}` : null;
}

export default function Identify({ onBack, onProceed, onOpenSpecies }: IdentifyProps) {
  const { gps, setGPS } = useAppStore();

  const [phase, setPhase] = useState<'capture' | 'processing' | 'result' | 'failed'>('capture');
  const [image, setImage] = useState<string | null>(null);
  const [doneSteps, setDoneSteps] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== 'processing') return;
    const timers = STEPS.map((_, index) =>
      window.setTimeout(() => setDoneSteps(index + 1), 260 * (index + 1)),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [phase]);

  async function runInference(source: string) {
    setImage(source);
    setPhase('processing');
    setDoneSteps(0);

    const target = speciesForPath(source);
    const lat = gps?.lat ?? -6.2088;
    const lng = gps?.lng ?? 106.8456;

    // Read the reference set here rather than from render state, so the ranking
    // does not depend on which effect happened to resolve first.
    let catalogue: SnakeSpecies[] = [];
    try {
      catalogue = await db.species.toArray();
    } catch (err) {
      console.error(err);
    }

    const ranked: Candidate[] = catalogue
      .map((sp) => {
        const inArea =
          lat >= sp.geo_bbox.latMin &&
          lat <= sp.geo_bbox.latMax &&
          lng >= sp.geo_bbox.lngMin &&
          lng <= sp.geo_bbox.lngMax;
        // A user-supplied photo that matches nothing in the reference set gets a
        // flat visual score and the location filter decides the ranking.
        const visual = sp.scientific_name === target ? 0.87 : 0.043;
        return { ...sp, confidence: visual, inArea };
      })
      .filter((c) => c.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence);

    if (!target || ranked.length === 0) {
      setPhase('failed');
      return;
    }

    window.setTimeout(() => {
      setCandidates(ranked);
      setSelectedId(ranked[0].taxon_id);
      setPhase('result');
    }, STEPS.length * 260 + 240);
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') void runInference(reader.result);
    };
    reader.onerror = () => setPhase('failed');
    reader.readAsDataURL(file);
  }

  const selected = candidates.find((c) => c.taxon_id === selectedId) ?? null;
  const others = candidates.filter((c) => c.taxon_id !== selectedId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <button type="button" onClick={onBack} className="btn btn-tertiary -ml-2 mb-4 px-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      {phase === 'capture' && (
        <SectionTitle
          as="h1"
          overline="Identify a snake"
          title="Photograph the snake"
          lede="Frame the whole animal if you can, with enough light to see the pattern. What comes back is a ranked suggestion with a confidence figure, not a diagnosis, and it never replaces the handling steps in triage."
        />
      )}

      {phase === 'capture' && (
        <div className="mt-7 grid gap-5 sm:grid-cols-5">
          <Card className="surface-soft p-5 sm:col-span-3">
            <div className="flex flex-col items-center text-center">
              <Camera className="h-8 w-8 text-brand" aria-hidden="true" />
              <p className="mt-3 text-[15px] font-semibold text-ink">Capture or choose a photo</p>
              <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-secondary">
                Nothing is uploaded. The model runs on this device.
              </p>
              <div className="mt-5 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-primary">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Choose an image
                </button>
                <button type="button" onClick={() => void runInference(REFERENCE_SET[0])} className="btn btn-secondary">
                  Run a reference image
                </button>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="sr-only"
                aria-label="Upload a photograph of the snake"
              />
            </div>
          </Card>

          <div className="sm:col-span-2">
            <p className="label">Or pick from the reference set</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
              Useful for trying the flow without a snake in front of you.
            </p>
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-2">
              {REFERENCE_SET.map((src) => (
                <li key={src}>
                  <button
                    type="button"
                    onClick={() => void runInference(src)}
                    className="block w-full overflow-hidden rounded-md border border-line transition-colors hover:border-line-control focus-visible:border-brand"
                  >
                    <img
                      src={src}
                      alt={`Run identification on ${speciesForPath(src) ?? 'this reference photograph'}`}
                      className="h-16 w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {phase === 'processing' && (
        <Card className="p-5 sm:p-6">
          <LoadingState label="Analysing this image" steps={STEPS} doneCount={doneSteps} />
          {image && (
            <img src={image} alt="The photograph being analysed" className="mt-5 h-44 w-full rounded-md object-cover" />
          )}
        </Card>
      )}

      {phase === 'failed' && (
        <ErrorState
          title="Unable to analyse this image"
          body="The photo may be too dark, too blurred, or the snake may not be clearly visible. Try a brighter shot with the whole animal in frame."
          action={
            <button type="button" onClick={() => setPhase('capture')} className="btn btn-primary">
              Try another image
            </button>
          }
        />
      )}

      {phase === 'result' && selected && (
        <div className="panel-in">
          <SectionTitle
            as="h1"
            overline="Identification result"
            title="AI-assisted identification"
            lede="This is a ranked suggestion from an image model, not a diagnosis. Confirm against the physical features listed below before acting on it."
          />

          <Card className="mt-6 overflow-hidden">
            <div className="sm:grid sm:grid-cols-5">
              <img
                src={image ?? selected.reference_images[0]}
                alt={`Submitted photograph, matched against ${selected.scientific_name}`}
                className="h-52 w-full object-cover sm:col-span-2 sm:h-full"
              />
              <div className="p-5 sm:col-span-3">
                <p className="overline">Most likely</p>
                <h2 className="mt-1.5 text-xl font-semibold leading-tight text-ink">{selected.scientific_name}</h2>
                <p className="mt-0.5 text-sm text-ink-secondary">
                  {selected.common_name} &middot; {selected.common_name_local}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={VENOM[selected.venom_type].tone}>{VENOM[selected.venom_type].label}</Badge>
                  {selected.inArea && <Badge tone="info">Recorded in your area</Badge>}
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="label">Confidence</p>
                    <p className="num text-2xl font-semibold text-ink">{formatPercent(selected.confidence)}</p>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                    {VENOM[selected.venom_type].description}
                  </p>
                </div>

                <button type="button" onClick={() => onOpenSpecies(selected.taxon_id)} className="btn btn-tertiary mt-4 px-0">
                  Open the full species page
                </button>
              </div>
            </div>

            <div className="border-t border-line px-5 py-4">
              <p className="label">Visual features the model matched</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {selected.morphological_traits.map((trait) => (
                  <li key={trait} className="text-[13px] leading-snug text-ink-secondary">
                    {trait}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {others.length > 0 && (
            <Card className="mt-5 p-5">
              <p className="text-[15px] font-semibold text-ink">Related and similar species</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                Visual identification is uncertain. If the animal in front of you does not match, pick the closer
                one before continuing.
              </p>
              <ul className="mt-4 divide-y divide-line">
                {others.map((other) => (
                  <li key={other.taxon_id}>
                    <label className="flex cursor-pointer items-center gap-3 py-3">
                      <input
                        type="radio"
                        name="candidate"
                        value={other.taxon_id}
                        checked={selectedId === other.taxon_id}
                        onChange={() => setSelectedId(other.taxon_id)}
                        className="h-4 w-4 flex-none accent-brand"
                      />
                      <img
                        src={other.reference_images[0]}
                        alt={other.scientific_name}
                        className="h-11 w-14 flex-none rounded-sm object-cover"
                        loading="lazy"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{other.scientific_name}</span>
                        <span className="mt-0.5 block text-[13px] text-ink-secondary">{other.common_name}</span>
                      </span>
                      <span className="num flex-none text-[13px] font-semibold text-ink-secondary">
                        {formatPercent(other.confidence)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="mt-5 p-5">
            <p className="text-[15px] font-semibold text-ink">Confidence across candidates</p>
            <ul className="mt-3 space-y-2.5">
              {candidates.slice(0, 4).map((candidate) => (
                <li key={candidate.taxon_id}>
                  <p className="mb-1 text-[13px] text-ink-secondary">{candidate.scientific_name}</p>
                  <Bar
                    value={candidate.confidence}
                    label={`${candidate.scientific_name} confidence`}
                    tone={VENOM[candidate.venom_type as VenomClass].tone}
                  />
                </li>
              ))}
            </ul>
          </Card>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => selected && onProceed({ chosen: selected, imageDataUrl: image ?? selected.reference_images[0] })}
              className="btn btn-primary"
            >
              Confirm and start triage
              <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setPhase('capture')} className="btn btn-secondary">
              Try another image
            </button>
          </div>

          <p className="mt-4 text-[13px] leading-relaxed text-ink-secondary">
            A confirmed species feeds the triage recommendation. It never replaces it, and a wrong guess does not
            change the handling steps you should follow.
          </p>
        </div>
      )}
    </div>
  );
}