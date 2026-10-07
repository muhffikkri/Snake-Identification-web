import { useEffect, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Building2, Camera, ClipboardList, History, LayoutDashboard, Map, Menu, Radio, User, X } from 'lucide-react';
import LandingPage from './components/LandingPage';
import Home from './components/Home';
import Identify from './components/Identify';
import Triage from './components/Triage';
import Discover from './components/Discover';
import SpeciesDetail from './components/SpeciesDetail';
import Dashboard from './components/Dashboard';
import HistoryView from './components/History';
import AccountPage from './components/Account';
import AuthPage from './components/auth/AuthPage';
import GovernmentDashboard from './components/GovernmentDashboard';
import { useAppStore } from './store/store';
import { logger } from './services/logger';
import type { SnakeSpecies } from './db/db';

/** Legacy page keys used by the components, mapped onto real paths. */
const PATH_BY_PAGE: Record<string, string> = {
  home: '/',
  identify: '/identify',
  triage: '/triage',
  discover: '/discover',
  dashboard: '/activity',
  history: '/history',
  account: '/account',
};

const APP_NAV = [
  { to: '/', label: 'Home', icon: Radio, end: true },
  { to: '/identify', label: 'Identify', icon: Camera, end: false },
  { to: '/discover', label: 'Snake Map', icon: Map, end: false },
  { to: '/triage', label: 'Triage', icon: ClipboardList, end: false },
  { to: '/activity', label: 'Activity', icon: LayoutDashboard, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { account, networkStatus } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isAgency = account?.role === 'GOVERNMENT';

  // The landing page carries its own navigation, so the shell chrome is skipped
  // there rather than stacking a second bar on top of it.
  const onLanding = pathname === '/';

  // The app navigation is for a signed-in general user. Signed out, the landing
  // page and the assessment and identification routes stay reachable.
  const showAppNav = Boolean(account) && !isAgency && !onLanding;

  if (onLanding) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink antialiased">
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to the app
      </a>

      <header className="sticky top-0 z-50 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Link to="/" className="flex min-h-[44px] items-center gap-2.5" aria-label="SnakeBiteAI home">
            <img src="/Logo_1.webp" alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
            <span className="text-sm font-semibold tracking-tight">SnakeBiteAI</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <span role="status" className={`badge ${networkStatus === 'online' ? 'badge-success' : 'badge-warning'}`}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              {networkStatus === 'online' ? 'Online' : 'Offline, ready'}
            </span>

            {account ? (
              <>
                {isAgency && (
                  <span className="badge badge-brand hidden sm:inline-flex">
                    <Building2 className="h-3 w-3" aria-hidden="true" />
                    Agency view
                  </span>
                )}
                <Link
                  to="/account"
                  aria-label={`Account, signed in as ${account.name}`}
                  className="btn btn-secondary min-w-[44px] justify-center px-3 text-[13px]"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{account.name}</span>
                  <span className="sr-only sm:hidden">{account.name}</span>
                </Link>
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
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary min-w-[44px] justify-center px-3 text-[13px]">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary min-w-[44px] justify-center px-3 text-[13px]">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {showAppNav && (
        <nav id="app-navigation" aria-label="Main" className={`border-b border-line bg-surface ${menuOpen ? 'block' : 'hidden'}`}>
          <ul className="mx-auto flex max-w-5xl flex-col px-2 pb-3 sm:flex-row sm:flex-wrap sm:px-4">
            {APP_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-[44px] w-full items-center gap-2.5 rounded-md px-3 text-sm font-semibold transition-colors sm:w-auto ${
                      isActive ? 'bg-brand-50 text-brand' : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main id="main" className="flex-1">
        {children}
      </main>

      {showAppNav && (
        <>
          <nav
            aria-label="Primary"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
          >
            <ul className="mx-auto flex max-w-md">
              {APP_NAV.slice(0, 4).map((item) => (
                <li key={item.to} className="flex-1">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold ${
                        isActive ? 'text-brand' : 'text-ink-secondary'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div aria-hidden="true" className="h-[72px] md:hidden" />
        </>
      )}
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="overline">Page not found</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">That page does not exist</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        The link may point at an older build. Everything reachable is on the home screen.
      </p>
      <button type="button" onClick={() => navigate('/')} className="btn btn-primary mt-5">
        Back to the home screen
      </button>
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const { identified, setIdentified } = useAppStore();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            onIdentify={() => navigate('/identify')}
            onTriage={() => navigate('/triage')}
            onSignIn={() => navigate('/login')}
            onRegister={() => navigate('/register')}
          />
        }
      />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route
        path="/triage"
        element={
          <Triage
            species={(identified.species as SnakeSpecies | null) ?? null}
            imageDataUrl={identified.imageDataUrl}
            onOpenSpecies={(taxonId) => navigate(`/species/${taxonId}`)}
            onFinished={() => navigate('/')}
            onCleared={() => setIdentified({ species: null, imageDataUrl: null })}
          />
        }
      />
      <Route
        path="/identify"
        element={
          <Identify
            onBack={() => navigate(-1)}
            onOpenSpecies={(taxonId) => navigate(`/species/${taxonId}`)}
            onProceed={({ chosen, imageDataUrl }) => {
              setIdentified({ species: chosen, imageDataUrl });
              navigate('/triage');
            }}
          />
        }
      />
      <Route path="/discover" element={<Discover onOpenSpecies={(taxonId) => navigate(`/species/${taxonId}`)} />} />
      <Route path="/species/:taxonId" element={<SpeciesRoute />} />
      <Route path="/activity" element={<Dashboard onNavigate={(page: string) => navigate(PATH_BY_PAGE[page] ?? '/activity')} />} />
      <Route path="/history" element={<HistoryView onBack={() => navigate('/activity')} />} />
      <Route path="/account" element={<AccountPage onSignedOut={() => navigate('/')} />} />
      <Route path="/government" element={<GovernmentDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function SpeciesRoute() {
  const navigate = useNavigate();
  const { taxonId } = useParams();
  const parsed = Number(taxonId);
  return <SpeciesDetail taxonId={Number.isFinite(parsed) ? parsed : -1} onBack={() => navigate(-1)} />;
}

function NetworkWatcher() {
  const { networkStatus, setNetworkStatus } = useAppStore();

  useEffect(() => {
    logger.info('System', 'Application started', { network: networkStatus });
    const update = () => setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <NetworkWatcher />
      <ScrollToTop />
      <Shell>
        <AppRoutes />
      </Shell>
    </BrowserRouter>
  );
}
