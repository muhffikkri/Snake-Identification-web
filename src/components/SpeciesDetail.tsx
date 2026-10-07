import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { VENOM } from '../lib/clinical';
import { useSpecies } from '../lib/data';
import { Badge, Card, EmptyState, ErrorState, SectionTitle } from './ui/Primitives';

interface SpeciesProps {
  taxonId: number;
  onBack: () => void;
}

/** Progressive disclosure: overview first, detail behind a disclosure. */
const DETAIL_SECTIONS = [
  'Identification',
  'Distribution',
  'Habitat',
  'Venom and clinical risk',
  'Physical characteristics',
] as const;

export default function SpeciesDetail({ taxonId, onBack }: SpeciesProps) {
  const { data: species, error, loading } = useSpecies();
  const [open, setOpen] = useState<string[]>(['Identification']);

  const entry = species?.find((s) => s.taxon_id === taxonId);

  function toggle(section: string) {
    setOpen((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <p role="status" className="text-sm text-ink-secondary">
          Reading the on-device reference set
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

  const similar = species?.filter((s) => s.taxon_id !== entry.taxon_id && s.venom_type === entry.venom_type) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <button type="button" onClick={onBack} className="btn btn-tertiary -ml-2 mb-4 px-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <Card className="overflow-hidden">
        <img
          src={entry.reference_images[0]}
          alt={entry.scientific_name}
          className="h-52 w-full object-cover sm:h-64"
        />
        <div className="p-5">
          <SectionTitle as="h1" title={entry.scientific_name} />
          <p className="mt-1.5 text-sm text-ink-secondary">
            {entry.common_name} &middot; locally known as {entry.common_name_local}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={VENOM[entry.venom_type].tone}>{VENOM[entry.venom_type].label}</Badge>
            <Badge tone="neutral">Clinical priority {entry.clinical_priority} of 5</Badge>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{VENOM[entry.venom_type].description}</p>
        </div>
      </Card>

      <div className="mt-5 divide-y divide-line border-y border-line">
        {DETAIL_SECTIONS.map((section) => {
          const isOpen = open.includes(section);
          return (
            <div key={section}>
              <button
                type="button"
                onClick={() => toggle(section)}
                aria-expanded={isOpen}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span className="text-[15px] font-semibold text-ink">{section}</span>
                <span aria-hidden="true" className={`text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 5.5 7 9.5l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              {isOpen && (
                <div className="pb-5">
                  {section === 'Identification' && (
                    <ul className="space-y-1.5">
                      {entry.morphological_traits.map((trait) => (
                        <li key={trait} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-secondary">
                          <Check className="mt-0.5 h-4 w-4 flex-none text-success" aria-hidden="true" />
                          <span>{trait}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section === 'Distribution' && (
                    <div className="text-sm leading-relaxed text-ink-secondary">
                      <p>
                        Recorded between {entry.geo_bbox.latMin}° and {entry.geo_bbox.latMax}° latitude,{' '}
                        {entry.geo_bbox.lngMin}° and {entry.geo_bbox.lngMax}° longitude.
                      </p>
                      <p className="mt-2">
                        The reference set holds {entry.kde_params.n_observations} observation records for this
                        species. A sighting outside this box is worth recording rather than dismissing.
                      </p>
                    </div>
                  )}
                  {section === 'Habitat' && <p className="text-sm leading-relaxed text-ink-secondary">{entry.habitat}</p>}
                  {section === 'Venom and clinical risk' && (
                    <p className="text-sm leading-relaxed text-ink-secondary">{entry.venom_notes}</p>
                  )}
                  {section === 'Physical characteristics' && (
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {entry.morphological_traits.map((trait) => (
                        <li key={trait} className="text-sm leading-relaxed text-ink-secondary">
                          {trait}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {similar.length > 0 && (
        <Card className="mt-5 p-5">
          <p className="text-[15px] font-semibold text-ink">Similar species</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
            Same venom class, so the handling guidance is identical. Identification is what separates them.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {similar.map((s) => (
              <li key={s.taxon_id} className="flex items-center gap-3 py-2.5">
                <img src={s.reference_images[0]} alt={s.scientific_name} className="h-10 w-14 flex-none rounded-sm object-cover" loading="lazy" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{s.scientific_name}</span>
                  <span className="block truncate text-[13px] text-ink-secondary">{s.common_name}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}