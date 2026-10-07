import { SEVERITY, formatDateTime } from '../lib/clinical';
import { ownedIncidents, useIncidents, useSpecies } from '../lib/data';
import { useAppStore } from '../store/store';
import { Badge, Card, EmptyState, ErrorState, Metric, SectionTitle } from './ui/Primitives';

interface DashboardProps {
  onNavigate: (page: 'triage' | 'history' | 'identify' | 'discover') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { account } = useAppStore();
  const incidents = useIncidents();
  const species = useSpecies();

  if (incidents.loading || species.loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <p role="status" className="text-sm text-ink-secondary">
          Reading your local record
        </p>
        <div className="card mt-4 h-40 animate-pulse" />
      </div>
    );
  }

  if (incidents.error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
        <ErrorState
          title="Your local record could not be read"
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

  const mine = ownedIncidents(incidents.data ?? [], account?.name ?? null);
  const venomous = new Set(mine.filter((i) => i.details.species_prediction.risk !== 'NON-VENOMOUS'));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <SectionTitle
        as="h1"
        overline={account ? `Signed in as ${account.name}` : 'Signed out'}
        title="Your activity"
        lede={
          account
            ? 'Saved assessments from this device. Nothing here leaves the phone unless you sync it.'
            : 'You are using the app without an account, so there is nothing saved yet. Assessments still work; they just are not kept.'
        }
      />

      {/* One metric carries the screen, the rest support it. */}
      <Card className="mt-6 p-5">
        <div className="grid gap-6 sm:grid-cols-3">
          <Metric
            label="Saved assessments"
            value={String(mine.length)}
            detail={account ? 'On this device' : 'Sign in to keep any'}
            emphasis
          />
          <Metric label="Venomous cases" value={String(venomous.size)} detail="Distinct species identified" />
          <Metric label="Reference set" value={String(species.data?.length ?? 0)} detail="Species stored on device" />
        </div>
      </Card>

      {mine.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No assessments yet"
            body={
              account
                ? 'Your saved assessments will appear here once you complete one.'
                : 'Start an assessment from the home screen. It runs straight through to a result, with no account needed.'
            }
            action={
              <button type="button" onClick={() => onNavigate('triage')} className="btn btn-primary">
                Start an assessment
              </button>
            }
          />
        </div>
      ) : (
        <>
          <h2 className="mt-8 text-lg font-semibold text-ink">Recent assessments</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {mine.slice(0, 5).map((incident) => {
              const grade = incident.details.severity_assessment.grade;
              const severity = SEVERITY[grade];
              return (
                <li key={incident.incident_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{severity.label}</p>
                    <p className="num mt-0.5 text-[13px] text-ink-secondary">
                      {formatDateTime(incident.timestamp)} &middot; {incident.details.species_prediction.primary}
                    </p>
                  </div>
                  <Badge tone={severity.tone}>Grade {grade}</Badge>
                  <button
                    type="button"
                    onClick={() => onNavigate('history')}
                    className="text-[13px] font-semibold text-brand hover:underline"
                  >
                    Open
                  </button>
                </li>
              );
            })}
          </ul>
          {mine.length > 5 && (
            <button type="button" onClick={() => onNavigate('history')} className="btn btn-tertiary mt-3 px-0">
              See all {mine.length} assessments
            </button>
          )}
        </>
      )}
    </div>
  );
}
