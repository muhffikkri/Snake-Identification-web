import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { commitDraft, type AssessmentDraft } from '../../lib/assessment';
import { Badge, Card, SectionTitle } from '../ui/Primitives';

interface AuthPageProps {
  mode: 'login' | 'register';
}

const COPY = {
  login: {
    overline: 'Sign in',
    title: 'Sign in to SnakeBiteAI',
    lede: 'Signing in brings back the history saved on this device. It is not required to identify a snake or to run an assessment.',
    submit: 'Sign in',
    switchPrompt: 'No account yet?',
    switchHref: '/register',
    switchLabel: 'Create one',
  },
  register: {
    overline: 'Create an account',
    title: 'Create an account',
    lede: 'An account keeps your assessment history on this device. The name is stored in this browser and is never sent anywhere.',
    submit: 'Create account',
    switchPrompt: 'Already have an account?',
    switchHref: '/login',
    switchLabel: 'Sign in',
  },
} as const;

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const { login, pendingAssessment, setPendingAssessment, refreshPendingSyncCount } = useAppStore();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const copy = COPY[mode];
  const isRegister = mode === 'register';
  const draft = pendingAssessment as AssessmentDraft | null;

  async function finish(name: string, role: 'USER' | 'GOVERNMENT') {
    login(name, role);
    if (role === 'GOVERNMENT') {
      setPendingAssessment(null);
      navigate('/government');
      return;
    }
    if (draft) {
      await commitDraft(draft, name);
      await refreshPendingSyncCount();
      setPendingAssessment(null);
    }
    navigate('/activity');
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Enter a name of at least two characters.');
      return;
    }
    setError('');
    void finish(trimmed, 'USER');
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <SectionTitle as="h1" overline={copy.overline} title={copy.title} lede={copy.lede} />

      {draft && (
        <div className="mt-6">
          <Card className="border-l-4 border-l-brand p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Assessment held</Badge>
              <span className="num text-[13px] text-ink-secondary">Case {draft.incidentId}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
              The assessment you just finished is being carried across. It saves to your history as soon as the
              account exists.
            </p>
            <button
              type="button"
              onClick={() => {
                setPendingAssessment(null);
                navigate('/triage');
              }}
              className="btn btn-tertiary mt-2 px-0 text-[13px]"
            >
              Go back to the assessment instead
            </button>
          </Card>
        </div>
      )}

      <Card className="mt-6 p-5">
        <form onSubmit={submit} noValidate>
          <label htmlFor="auth-name" className="label">
            {isRegister ? 'Your name' : 'Account name'}
          </label>
          <input
            id="auth-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="field mt-1.5"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'auth-name-error' : undefined}
          />
          {error && (
            <p id="auth-name-error" role="alert" className="mt-1.5 text-[13px] font-semibold text-danger">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary mt-4 w-full">
            {copy.submit}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-ink-secondary">
          {copy.switchPrompt}{' '}
          <Link to={copy.switchHref} className="link font-semibold">
            {copy.switchLabel}
          </Link>
        </p>

        <div className="mt-5 border-t border-line pt-4 text-center">
          <button
            type="button"
            onClick={() => void finish(name.trim() || 'Agency', 'GOVERNMENT')}
            className="btn btn-tertiary min-h-[36px] px-2 text-[13px]"
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {isRegister ? 'Register as a government account' : 'Sign in as a government account'}
          </button>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            Opens the surveillance view. Same device storage, different permissions.
          </p>
        </div>
      </Card>

      <p className="mt-5 text-center text-[13px] leading-relaxed text-ink-secondary">
        {isRegister ? (
          <>
            Not ready to sign up?{' '}
            <Link to="/triage" className="link font-semibold">
              Run the assessment without saving
            </Link>
            .
          </>
        ) : (
          <>
            You can still{' '}
            <Link to="/triage" className="link font-semibold">
              run an assessment
            </Link>{' '}
            or{' '}
            <Link to="/identify" className="link font-semibold">
              identify a snake
            </Link>{' '}
            without an account.
          </>
        )}
      </p>
    </div>
  );
}