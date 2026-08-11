import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Home from './components/Home';
import Inference from './components/Inference';
import Triage from './components/Triage';
import Dashboard from './components/Dashboard';
import { Home as HomeIcon, Camera, ClipboardList, Shield, ShieldCheck } from 'lucide-react';
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
    
    // Smoothly scroll to diagnostic viewport on page navigation change
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

  return (
    <div className="min-h-screen bg-primaryBg font-sans select-none antialiased text-[#1E1E1E] transition-colors duration-300">
      
      {/* Sticky Header Selector */}
      <header className="w-full bg-[#1E1E1E] text-[#FAFAFA] border-b border-gray-800 shadow-md sticky top-0 z-[999]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-[#70020F] p-1.5 rounded-lg border border-red-950 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">SHIELD</span>
              <span className="text-gray-400 text-xs font-semibold ml-1.5 border-l border-gray-700 pl-1.5 uppercase font-mono">v2.0</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Network status */}
            <div className="flex items-center">
              {networkStatus === 'online' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#388E3C] text-white">
                  🟢 ONLINE
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F57C00] text-white animate-pulse">
                  🟢 OFFLINE READY
                </span>
              )}
            </div>

            {/* Role drop-down selector */}
            <div className="relative">
              <select
                value={authMode}
                onChange={(e) => handleRoleSwitch(e.target.value as any)}
                className="bg-[#2D2D2D] text-xs font-bold text-white px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2E7D6F] cursor-pointer appearance-none pr-8"
              >
                <option value="GUEST">👤 User Umum</option>
                <option value="SECURE">🏢 Pemerintah</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                ▼
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div>
        {authMode === 'SECURE' ? (
          /* Government Desktop Layout (Wide, side-by-side or well-spaced grid) */
          <div className="max-w-6xl mx-auto p-4 w-full min-h-[80vh] flex flex-col py-6">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-2">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-6 h-6 text-[#2E7D6F]" />
                  Dasbor Pengawasan Nasional
                </h1>
                <p className="text-xs text-gray-500">Sistem Pemantauan Terpadu Gigitan Ular & Distribusi Taksa Wilayah Indonesia</p>
              </div>
              <button
                onClick={() => {
                  setAuthMode('GUEST');
                  setCurrentPage('home');
                }}
                className="text-xs font-semibold text-[#70020F] hover:underline"
              >
                Keluar Mode Instansi
              </button>
            </div>
            
            <main className="flex-1">
              <Dashboard onNavigate={handleNavigate} />
            </main>
          </div>
        ) : (
          /* General User Layout */
          <div className="flex flex-col">
            {/* Premium Landing Page */}
            <LandingPage onStartApp={scrollToApp} />

            {/* Diagnostic App Workspace Viewport */}
            <div id="app-viewport" className="scroll-mt-16 bg-[#F5F5F5] py-12 px-4 flex justify-center items-start">
              <div className="w-full max-w-md md:max-w-5xl bg-white border border-gray-200 rounded-[28px] shadow-2xl overflow-hidden relative min-h-[720px] flex flex-col transition-all duration-300">
                
                {/* Viewport screen */}
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

                {/* Bottom Thumb-zone Navigation bar */}
                <nav className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] md:max-w-md bg-[#1E1E1E] border border-gray-800 rounded-2xl shadow-xl flex items-center justify-around py-2.5 px-2 z-[99]">
                  <button
                    onClick={() => handleNavigate('home')}
                    className={`flex flex-col items-center space-y-0.5 focus:outline-none transition-all ${
                      currentPage === 'home' ? 'text-[#5A9A8F] scale-110 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                    aria-label="Navigasi ke Beranda"
                  >
                    <HomeIcon className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-wider font-bold">Beranda</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('inference')}
                    className={`flex flex-col items-center space-y-0.5 focus:outline-none transition-all ${
                      currentPage === 'inference' ? 'text-[#5A9A8F] scale-110 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                    aria-label="Navigasi ke Identifikasi AI"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-wider font-bold">Edge-AI</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('triage')}
                    className={`flex flex-col items-center space-y-0.5 focus:outline-none transition-all ${
                      currentPage === 'triage' ? 'text-[#5A9A8F] scale-110 font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                    aria-label="Navigasi ke Triage Medis"
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-wider font-bold">Triage</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
