import { useState } from 'react';
import { useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { VENOM } from '../lib/clinical';
import { fetchSpeciesPage, imageSrc, type SpeciesItem } from '../lib/neon';
import { Badge, Card, EmptyState, ErrorState, SectionTitle } from './ui/Primitives';

interface SpeciesProps {
  slug: string;
  onBack: () => void;
}

const DETAIL_SECTIONS = [
  'Identification',
  'Distribution',
  'Habitat',
  'Venom and clinical risk',
  'Physical characteristics',
] as const;

export default function SpeciesDetail({ slug, onBack }: SpeciesProps) {
  const [entry, setEntry] = useState<SpeciesItem | null>(null);
  const [similar, setSimilar] = useState<SpeciesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string[]>(['Identification']);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // ponytail: load all pages up to the match; 293 species is ~13 pages,
        // well under one second on a warm connection. Add a slug endpoint later.
        const all: SpeciesItem[] = [];
        let found: SpeciesItem | null = null;
        for (let p = 1; p <= 20 && !found; p++) {
          const result = await fetchSpeciesPage(p);
          all.push(...result.items);
          found = result.items.find((s) => s.slug === slug) ?? null;
        }
        if (cancelled) return;
        setEntry(found);
        setSimilar(found ? all.filter((s) => s.slug !== slug && s.venom_type === found.venom_type).slice(0, 6) : []);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function toggle(section: string) {
    setOpen((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <p role="status" className="text-sm text-ink-secondary">
          Reading the reference set
        </p>
        <div className="card mt-4 h-72 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <ErrorState title="The reference set could not be read" body={error} />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <EmptyState
          title="That species is not in the reference set"
          body="It may have been removed, or the identifier was wrong. Go back to the species list and pick another entry."
          action={
            <button type="button" onClick={onBack} className="btn btn-primary">
              Back to the list
            </button>
          }
        />
      </div>
    );
  }

  const image = entry.image_path ? imageSrc(entry.image_path) : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <button type="button" onClick={onBack} className="btn btn-tertiary -ml-2 mb-4 px-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <Card className="overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={entry.scientific_name}
            className="h-52 w-full object-cover sm:h-64"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-52 w-full items-center justify-center bg-surface-secondary sm:h-64">
            <p className="text-sm text-ink-muted">No image</p>
          </div>
        )}
        <div className="p-5">
          <SectionTitle as="h1" title={entry.scientific_name} />
          <p className="mt-1.5 text-sm text-ink-secondary">
            {entry.common_name_en ?? entry.common_name_local ?? 'Common name not recorded'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={VENOM[entry.venom_type].tone}>{VENOM[entry.venom_type].label}</Badge>
            {entry.observation_count > 0 && (
              <Badge tone="neutral">{entry.observation_count} records</Badge>
            )}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{VENOM[entry.venom_type].description}</p>
        </div>
      </Card>

      {similar.length > 0 && (
        <Card className="mt-5 p-5">
          <p className="text-[15px] font-semibold text-ink">Similar species</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
            Same venom class, so the handling guidance is identical.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {similar.map((s) => (
              <li key={s.slug} className="flex items-center gap-3 py-2.5">
                <img
                  src={s.image_path ? imageSrc(s.image_path) : undefined}
                  alt={s.scientific_name}
                  className="h-10 w-14 flex-none rounded-sm bg-surface-secondary object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{s.scientific_name}</span>
                  <span className="block truncate text-[13px] text-ink-secondary">
                    {s.common_name_en ?? s.common_name_local}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}