import { useEffect, useState } from 'react';
import { Camera, ClipboardList, LayoutDashboard, Map, Radio, History, Building2, User, Menu, X } from 'lucide-react';
import LandingPage from './components/LandingPage';
import Home from './components/Home';
import Identify from './components/Identify';
import Triage from './components/Triage';
import Discover from './components/Discover';
import SpeciesDetail from './components/SpeciesDetail';
import Dashboard from './components/Dashboard';
import HistoryView from './components/History';
import Account from './components/Account';
import GovernmentDashboard from './components/GovernmentDashboard';
import { useAppStore } from './store/store';
import { logger } from './services/logger';
import type { SnakeSpecies } from './db/db';

import type { Page } from './lib/navigation';

const USER_NAV = [
  { key: 'home' as const, label: 'Home', icon: Radio },
  { key: 'identify' as const, label: 'Identify', icon: Camera },
  { key: 'discover' as const, label: 'Snake Map', icon: Map },
  { key: 'triage' as const, label: 'Triage', icon: ClipboardList },
  { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { key: 'history' as const, label: 'History', icon: History },
];

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [species, setSpecies] = useState<SnakeSpecies | null>(null);
  const [identificationImage, setIdentificationImage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { audience, setAudience, networkStatus, setNetworkStatus, accountName } = useAppStore();

  useEffect(() => {
    logger.info('System', 'Application started', { audience, account: accountName, network: networkStatus });

    const updateNetwork = () => setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  useEffect(() => {
    if (page === 'triage' && species && identificationImage) {
      // Once triage starts from a confirmed identification, the species is
      // carried forward; clearing it here avoids a stale pairing.
      setIdentificationImage(identificationImage);
    }
  }, [page]);

  function navigate(next: Page) {
    setPage(next);
    setMenuOpen(false);
    document.getElementById('app-viewport')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openSpecies(taxonId: number) {
    setSpecies({ taxon_id: taxonId } as SnakeSpecies);
    setPage('species');
    setMenuOpen(false);
    document.getElementById('app-viewport')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startTriage() {
    setSpecies(null);
    setIdentificationImage(null);
    navigate('triage');
  }

  const isGovernment = page === 'government';

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink antialiased">
      <a
        href="#app-viewport"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to the app
      </a>

      {/* Shell header. Compact on purpose: on a phone every fixed pixel is content. */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={() => (isGovernment ? navigate('home') : navigate('home'))}
            className="flex min-h-[44px] items-center gap-2.5"
            aria-label="SnakeBiteAI home"
          >
            <img src="/Logo_1.webp" alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
            <span className="text-sm font-semibold tracking-tight">SnakeBiteAI</span>
          </button>

          <div className="flex items-center gap-2.5">
            {/* Dot plus word, so the state never depends on colour alone. */}
            <span
              role="status"
              className={`badge ${
                networkStatus === 'online' ? 'badge-success' : 'badge-warning'
              }`}
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              {networkStatus === 'online' ? 'Online' : 'Offline, ready'}
            </span>

            {audience === 'GOVERNMENT' ? (
              <button type="button" onClick={() => { setAudience('GENERAL'); navigate('home'); }} className="btn btn-secondary px-3 text-[13px]">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Exit agency</span>
                <span className="sm:hidden">Exit</span>
              </button>
            ) : (
              <button
              type="button"
              onClick={() => navigate('account')}
              aria-label={accountName ? `Account, signed in as ${accountName}` : 'Account, signed out'}
              className="btn btn-secondary min-w-[44px] justify-center px-3 text-[13px]"
            >
                <User className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{accountName ?? 'Account'}</span>
                <span className="sr-only sm:hidden">{accountName ?? 'Account'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="app-navigation"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="btn btn-secondary min-w-[44px] justify-center px-3"
            >
              {menuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{menuOpen ? 'Close' : 'Menu'}</span>
              <span className="sr-only sm:hidden">{menuOpen ? 'Close navigation menu' : 'Open navigation menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {page === 'home' && (
        <LandingPage
          onIdentify={() => {
            navigate('identify');
          }}
          onTriage={startTriage}
        />
      )}

      {page === 'government' ? (
        <GovernmentDashboard />
      ) : (
        <>
          <nav
            id="app-navigation"
            aria-label="Main"
            className={`border-b border-line bg-surface ${menuOpen ? 'block' : 'hidden'}`}
          >
            <ul className="mx-auto flex max-w-5xl flex-col px-2 pb-3 sm:flex-row sm:flex-wrap sm:px-4">
              {USER_NAV.map((item) => {
                const active = page === item.key;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => navigate(item.key)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-3 text-sm font-semibold transition-colors sm:w-auto ${
                        active ? 'bg-brand-50 text-brand' : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
                      }`}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
              <li className="sm:ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setAudience('GOVERNMENT');
                    navigate('government');
                  }}
                  className="flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-3 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink sm:w-auto"
                >
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  Agency view
                </button>
              </li>
            </ul>
          </nav>

          <main id="app-viewport" className="scroll-mt-16">
            {page === 'home' && <Home onNavigate={navigate} />}
            {page === 'identify' && (
              <Identify
                onBack={() => navigate('home')}
                onOpenSpecies={openSpecies}
                onProceed={({ chosen, imageDataUrl }) => {
                  setSpecies(chosen);
                  setIdentificationImage(imageDataUrl);
                  navigate('triage');
                }}
              />
            )}
            {page === 'triage' && (
              <Triage
                species={species}
                imageDataUrl={identificationImage}
                onOpenSpecies={openSpecies}
                onFinished={() => navigate('dashboard')}
              />
            )}
            {page === 'discover' && <Discover onOpenSpecies={openSpecies} />}
            {page === 'species' && species && (
              <SpeciesDetail taxonId={species.taxon_id} onBack={() => navigate('discover')} />
            )}
            {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
            {page === 'history' && <HistoryView onBack={() => navigate('dashboard')} />}
            {page === 'account' && <Account onSignedOut={() => navigate('home')} />}
          </main>

          {/* Bottom nav: the four destinations a phone user reaches by thumb. */}
          <nav
            aria-label="Primary"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
          >
            <ul className="mx-auto flex max-w-md">
              {USER_NAV.slice(0, 4).map((item) => {
                const active = page === item.key;
                return (
                  <li key={item.key} className="flex-1">
                    <button
                      type="button"
                      onClick={() => navigate(item.key)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold ${
                        active ? 'text-brand' : 'text-ink-secondary'
                      }`}
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Reserve the bottom nav's height so it never covers the last control. */}
          <div aria-hidden="true" className="h-[72px] md:hidden" />
        </>
      )}

      {isGovernment && <div aria-hidden="true" className="h-8" />}
    </div>
  );
}