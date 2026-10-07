import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogOut, User, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '../store/store';
import { Badge, Card, SectionTitle } from './ui/Primitives';

interface AccountProps {
  onSignedOut: () => void;
}

export default function Account({ onSignedOut }: AccountProps) {
  const navigate = useNavigate();
  const { account, login, logout, pendingSyncCount, networkStatus, setNetworkStatus } = useAppStore();
  const [draft, setDraft] = useState(account?.name ?? '');

  const isAgency = account?.role === 'GOVERNMENT';

  /** Switching role changes what the navigation shows, so it also moves the user
      to the view that now applies. */
  function switchTo(role: 'USER' | 'GOVERNMENT') {
    if (!account) return;
    login(draft.trim() || account.name, role);
    navigate(role === 'GOVERNMENT' ? '/government' : '/activity');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <SectionTitle
        as="h1"
        overline="Account"
        title={account ? `Signed in as ${account.name}` : 'Signed out'}
        lede="An account keeps your assessment history on this device. It is never required for identification or triage, and nothing is sent to a server."
      />

      {account && (
        <div className="mt-4">
          <Badge tone={isAgency ? 'brand' : 'neutral'}>
            {isAgency && <Building2 className="h-3 w-3" aria-hidden="true" />}
            {isAgency ? 'Government account' : 'General user'}
          </Badge>
        </div>
      )}

      <Card className="mt-5 p-5">
        <label htmlFor="account" className="label">
          Display name
        </label>
        <div className="mt-1.5 flex flex-col gap-2.5 sm:flex-row">
          <input
            id="account"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your name"
            className="field sm:max-w-xs"
          />
          {account ? (
            <button
              type="button"
              onClick={() => {
                if (draft.trim()) login(draft.trim(), account.role);
              }}
              className="btn btn-primary"
            >
              Update name
            </button>
          ) : (
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link to="/register" className="btn btn-primary">
                Create account
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Sign in
              </Link>
            </div>
          )}
          {account && (
            <button
              type="button"
              onClick={() => {
                logout();
                onSignedOut();
              }}
              className="btn btn-secondary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-secondary">
          Stored in this browser only. Clearing site data removes it, and signing out does not delete assessments
          already saved to your history.
        </p>
      </Card>

      <Card className="mt-5 p-5">
        <p className="text-[15px] font-semibold text-ink">Device status</p>
        <dl className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-2.5">
            <dt className="flex items-center gap-2 text-ink-secondary">
              {networkStatus === 'online' ? (
                <Wifi className="h-4 w-4" aria-hidden="true" />
              ) : (
                <WifiOff className="h-4 w-4" aria-hidden="true" />
              )}
              Connection
            </dt>
            <dd className="font-semibold text-ink">{networkStatus === 'online' ? 'Online' : 'Offline'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-line pb-2.5">
            <dt className="flex items-center gap-2 text-ink-secondary">
              <User className="h-4 w-4" aria-hidden="true" />
              Records waiting to sync
            </dt>
            <dd className="num font-semibold text-ink">{pendingSyncCount}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setNetworkStatus(networkStatus === 'online' ? 'offline' : 'online')}
          className="btn btn-secondary mt-4"
        >
          Simulate {networkStatus === 'online' ? 'offline' : 'online'}
        </button>
      </Card>

      {account && !isAgency && (
        <Card className="mt-5 p-5">
          <p className="text-[15px] font-semibold text-ink">Agency access</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            The surveillance view is a separate account type. Switching keeps this device&apos;s data.
          </p>
          <button type="button" onClick={() => switchTo('GOVERNMENT')} className="btn btn-secondary mt-3">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Switch to a government account
          </button>
        </Card>
      )}

      {account && isAgency && (
        <Card className="mt-5 p-5">
          <p className="text-[15px] font-semibold text-ink">General user</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            Switch back to use identification, triage and your own history.
          </p>
          <button type="button" onClick={() => switchTo('USER')} className="btn btn-secondary mt-3">
            Switch to a general user account
          </button>
        </Card>
      )}
    </div>
  );
}