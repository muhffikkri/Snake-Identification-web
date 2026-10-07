import { ArrowLeft } from 'lucide-react';
import { SEVERITY, VENOM, formatDateTime } from '../lib/clinical';
import { ownedIncidents, useIncidents } from '../lib/data';
import { useAppStore } from '../store/store';
import { Badge, Card, EmptyState, ErrorState, SectionTitle } from './ui/Primitives';

interface HistoryProps {
  onBack: () => void;
}

export default function History({ onBack }: HistoryProps) {
  const { accountName } = useAppStore();
  const incidents = useIncidents();

  if (incidents.loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <p role="status" className="text-sm text-ink-secondary">
          Reading your local record
        </p>
        <div className="card mt-4 h-40 animate-pulse" />
      </div>
    );
  }

  if (incidents.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <ErrorState
          title="Your history could not be read"
          body={incidents.error}
          action={
            <button type="button" onClick={() => void incidents.reload()} className="btn btn-primary">
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const mine = ownedIncidents(incidents.data ?? [], accountName);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <button type="button" onClick={onBack} className="btn btn-tertiary -ml-2 mb-4 px-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <SectionTitle
        as="h1"
        overline={accountName ? `Signed in as ${accountName}` : 'Signed out'}
        title="Assessment history"
        lede="A chronological record held on this device, newest first. Select an entry to read the full assessment."
      />

      {mine.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={accountName ? 'No saved assessments yet' : 'Nothing is saved while signed out'}
            body={
              accountName
                ? 'Complete an assessment and save it, and it will appear here.'
                : 'Assessments you complete without an account are still shown to the health service, but they are not added to your history. Create an account to keep them.'
            }
          />
        </div>
      ) : (
        <ol className="mt-6 space-y-4">
          {mine.map((incident) => {
            const grade = incident.details.severity_assessment.grade;
            const severity = SEVERITY[grade];
            const risk = incident.details.species_prediction.risk;
            return (
              <li key={incident.incident_id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="num text-[13px] text-ink-muted">{formatDateTime(incident.timestamp)}</p>
                      <h2 className="mt-1 text-[15px] font-semibold text-ink">
                        {severity.label}, grade {grade}
                      </h2>
                      <p className="num mt-1 text-[13px] text-ink-secondary">Case {incident.incident_id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={severity.tone}>Grade {grade}</Badge>
                      <Badge tone={VENOM[risk].tone}>{VENOM[risk].label}</Badge>
                      <Badge tone={incident.sync_status === 'SYNCED' ? 'success' : 'warning'}>
                        {incident.sync_status === 'SYNCED' ? 'Synced' : 'Waiting to sync'}
                      </Badge>
                    </div>
                  </div>

                  <details className="group mt-3">
                    <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-[13px] font-semibold text-brand">
                      <span className="group-open:hidden">Read the full assessment</span>
                      <span className="hidden group-open:inline">Hide the detail</span>
                    </summary>
                    <dl className="mt-2 space-y-2 border-t border-line pt-3 text-[13px]">
                      {[
                        ['Species', incident.details.species_prediction.primary],
                        ['Bite location', incident.details.symptoms.bite_location],
                        ['Pain reported', `${incident.details.symptoms.pain_scale} of 10`],
                        ['Swelling grade', String(incident.details.symptoms.swelling_grade)],
                        ['Whole-body signs', incident.details.symptoms.systemic_effects.join(', ') || 'none recorded'],
                        [
                          'Coordinate',
                          `${incident.details.gps_coordinates.lat.toFixed(4)}, ${incident.details.gps_coordinates.lng.toFixed(4)}`,
                        ],
                      ].map(([term, value]) => (
                        <div key={term} className="grid gap-0.5 sm:grid-cols-12 sm:gap-4">
                          <dt className="font-semibold text-ink sm:col-span-4">{term}</dt>
                          <dd className="text-ink-secondary sm:col-span-8">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {incident.photos.length > 0 && (
                      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {incident.photos.map((photo, index) => (
                          <li key={index}>
                            <img
                              src={photo}
                              alt={`Wound photograph ${index + 1}`}
                              className="aspect-square w-full rounded-sm object-cover"
                              loading="lazy"
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}