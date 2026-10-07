import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Home from './components/Home';
import Inference from './components/Inference';
import Triage from './components/Triage';
import Dashboard from './components/Dashboard';
import { Home as HomeIcon, Camera, ClipboardList, Shield, ShieldCheck, ChevronDown } from 'lucide-react';
import { useAppStore } from './store/store';
import { logger } from './services/logger';

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [currentIncidentId, setCurrentIncidentId] = useState<string>('');

  const { authMode, setAuthMode, networkStatus, setNetworkStatus } = useAppStore();

  useEffect(() => {
    logger.info('System', 'Application initialized', { network: networkStatus, mode: authMode });

    const updateNetwork = () => {
      const status = navigator.onLine ? 'online' : 'offline';
      setNetworkStatus(status);
      logger.info('Network', `Network status changed to ${status.toUpperCase()}`);
    };
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  const handleNavigate = (page: string) => {
    logger.info('Navigation', `Navigated to page: ${page.toUpperCase()}`);
    setCurrentPage(page);

    setTimeout(() => {
      document.getElementById('app-viewport')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSetIncidentId = (id: string) => {
    setCurrentIncidentId(id);
  };

  const handleRoleSwitch = (mode: 'GUEST' | 'SECURE') => {
    if (mode === 'SECURE') {
      setAuthMode('SECURE');
      logger.info('Auth', 'Role switched to PEMERINTAH (Direct switch for demo)');
      setCurrentPage('dashboard');
    } else {
      setAuthMode('GUEST');
      logger.info('Auth', 'Role switched to USER UMUM');
      setCurrentPage('home');
    }
  };

  const scrollToApp = () => {
    document.getElementById('app-viewport')?.scrollIntoView({ behavior: 'smooth' });
  };

  const navItems = [
    { key: 'home', label: 'Beranda', icon: HomeIcon, aria: 'Navigasi ke Beranda' },
    { key: 'inference', label: 'Edge-AI', icon: Camera, aria: 'Navigasi ke Identifikasi AI' },
    { key: 'triage', label: 'Triage', icon: ClipboardList, aria: 'Navigasi ke Triage Medis' },
  ];

  return (
    <div className="min-h-screen bg-primaryBg font-sans antialiased text-[#1E1E1E]">
      {/* Application header */}
      <header className="dark-surface sticky top-0 z-[999] w-full border-b border-[#333333] bg-[#1E1E1E] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center bg-[#70020F]">
              <Shield className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-base font-extrabold tracking-tight">SHIELD</span>
              <span className="text-[11px] font-semibold text-[#B8B8B8]">v2.0</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Connectivity status: dot + text, never color alone */}
            <span
              role="status"
              className={`chip ${
                networkStatus === 'online'
                  ? 'border-[#388E3C]/60 bg-[#388E3C]/20 text-[#A5D6A7]'
                  : 'border-[#F57C00]/50 bg-[#F57C00]/15 text-[#FFD8A8]'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${networkStatus === 'online' ? 'bg-[#66BB6A]' : 'bg-[#F57C00]'}`}
                aria-hidden="true"
              />
              {networkStatus === 'online' ? 'Terhubung' : 'Luring siap'}
            </span>

            {/* Role selector */}
            <div className="relative">
              <select
                aria-label="Pilih peran pengguna"
                value={authMode}
                onChange={(e) => handleRoleSwitch(e.target.value as 'GUEST' | 'SECURE')}
                className="cursor-pointer appearance-none rounded-md border border-[#4A4A4A] bg-[#2D2D2D] py-1.5 pl-3 pr-8 text-xs font-bold text-white"
              >
                <option value="GUEST">User Umum</option>
                <option value="SECURE">Pemerintah</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B8B8B8]"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </header>

      {authMode === 'SECURE' ? (
        /* Government layout */
        <div className="mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col px-4 py-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--line)] pb-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
                <ShieldCheck className="h-6 w-6 text-[#2E7D6F]" aria-hidden="true" />
                Dasbor Pengawasan Nasional
              </h1>
              <p className="mt-1 text-sm font-medium text-[#5B5B5B]">
                Pemantauan terpadu gigitan ular dan distribusi taksa wilayah Indonesia.
              </p>
            </div>
            <button
              onClick={() => {
                setAuthMode('GUEST');
                setCurrentPage('home');
              }}
              className="border border-[color:var(--line)] px-3 py-2 text-xs font-bold text-[#70020F] hover:bg-[#70020F]/5"
            >
              Keluar mode instansi
            </button>
          </div>

          <main className="flex-1">
            <Dashboard onNavigate={handleNavigate} />
          </main>
        </div>
      ) : (
        /* General user layout */
        <div className="flex flex-col">
          <LandingPage onStartApp={scrollToApp} />

          <div id="app-viewport" className="flex items-start justify-center bg-[#F5F5F5] px-4 py-12 scroll-mt-16">
            <div className="relative flex min-h-[720px] w-full max-w-md flex-col overflow-hidden border border-[color:var(--line)] bg-white md:max-w-5xl">
              <main className="flex-1 overflow-y-auto pb-24 md:pb-28">
                {currentPage === 'home' && (
                  <Home onNavigate={handleNavigate} onSetIncidentId={handleSetIncidentId} />
                )}

                {currentPage === 'inference' && (
                  <Inference onNavigate={handleNavigate} onSetIncidentId={handleSetIncidentId} />
                )}

                {currentPage === 'triage' && (
                  <Triage incidentId={currentIncidentId} onNavigate={handleNavigate} />
                )}
              </main>

              {/* Bottom thumb-zone navigation */}
              <nav
                aria-label="Navigasi utama"
                className="dark-surface absolute bottom-4 left-1/2 z-[99] flex w-[92%] -translate-x-1/2 items-center justify-around rounded-xl border border-[#333333] bg-[#1E1E1E] px-2 py-2 md:max-w-md"
              >
                {navItems.map((item) => {
                  const active = currentPage === item.key;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavigate(item.key)}
                      aria-label={item.aria}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-w-[64px] flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors ${
                        active ? 'text-[#5A9A8F]' : 'text-[#B8B8B8] hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
