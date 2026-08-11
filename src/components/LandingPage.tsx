import React from 'react';
import { Shield, ArrowRight, ShieldCheck, Cpu, Zap, Activity, Users, HelpCircle, Calendar } from 'lucide-react';

interface LandingPageProps {
  onStartApp: () => void;
}

export default function LandingPage({ onStartApp }: LandingPageProps) {
  const teamMembers = [
    { name: 'Haidar Ali Laudza', background: 'Informatics', role: 'Project Leader, AI Engineer' },
    { name: 'Julius Tegar Aji Putra', background: 'Informatics', role: 'AI Engineer, Mobile App Developer' },
    { name: 'Muhammad Fikri', background: 'Informatics', role: 'Backend Developer, System Integrator' },
    { name: 'Cahya Mutiara Sandi', background: 'Nursing Science', role: 'Clinical Advisor & Domain Expert' },
    { name: 'Elizabet Febriani', background: 'Nursing Science', role: 'Clinical Advisor & Domain Expert' },
  ];

  const developmentTimeline = [
    {
      quarter: 'Q1',
      phase: 'Foundation',
      milestones: 'Finish core app & AI • Setup emergency alerts',
      kpis: 'App works offline • Medical permits submitted'
    },
    {
      quarter: 'Q2',
      phase: 'Early Testing',
      milestones: 'Test in 2 high-risk areas • Secure first NGO partner',
      kpis: 'Highly accurate AI (>90%) • 50+ patients helped'
    },
    {
      quarter: 'Q3',
      phase: 'Government Tie-up',
      milestones: 'Track patient recoveries • Engage local health department',
      kpis: 'Official agreement signed • 100+ patients helped'
    },
    {
      quarter: 'Q4',
      phase: 'Proven Impact',
      milestones: 'Expand to 200 cases • Start hospital partnerships',
      kpis: '20% faster diagnosis • Accurate antivenom match'
    }
  ];

  return (
    <div className="bg-[#FAFAFA] text-[#1E1E1E] font-sans selection:bg-[#2E7D6F]/20">
      
      {/* Navigation Bar */}
      <nav className="sticky top-0 bg-white/85 backdrop-blur-md border-b border-gray-100 z-50 transition-all">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-[#70020F] p-1.5 rounded-lg flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight block leading-none">
                SHIELD: <span className="text-[#70020F]">SnakeBiteAI</span>
              </span>
              <span className="text-[7px] font-black tracking-widest uppercase text-gray-400 mt-1 block font-mono">
                Bandung Hub - Indonesia
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-6 text-[10px] font-black uppercase tracking-wider text-gray-500">
            <a href="#masalah" className="hover:text-black transition-colors">Masalah</a>
            <a href="#alur" className="hover:text-black transition-colors">Alur Lapangan</a>
            <a href="#rencana" className="hover:text-black transition-colors">Kesiapan Klinis</a>
            <a href="#tim" className="hover:text-black transition-colors">Tim Kami</a>
          </div>

          <button
            onClick={onStartApp}
            className="px-5 py-2 bg-[#2E7D6F] hover:bg-[#20594f] text-white font-extrabold text-xs rounded-full shadow-md active:scale-95 transition-transform duration-200 uppercase tracking-wider"
          >
            Mulai Diagnosis
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-6xl mx-auto px-6 pt-10 pb-16 md:py-24 grid md:grid-cols-12 gap-12 items-center">
        
        {/* Hero Details (Left) */}
        <div className="md:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 bg-[#70020F]/10 border border-[#70020F]/20 text-[#70020F] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
            Developed by Kenapa Mendadak Banget Sih
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tight uppercase">
            WHEN MINUTES MATTER, <br />
            <span className="text-[#70020F]">SNAKEBITEAI</span> DELIVERS <br />
            <span className="text-[#2E7D6F]">CLARITY.</span>
          </h1>
          
          <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-semibold max-w-lg">
            Menjembatani celah pre-hospital kritis dalam penanganan gigitan ular. Menghubungkan identifikasi taksa visual, pertolongan pertama berbasis bukti klinis, dan serah terima data pasien terstruktur dalam satu alur kerja luring.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
            <button
              onClick={onStartApp}
              className="px-6 py-3.5 bg-[#2E7D6F] hover:bg-[#20594f] text-white font-extrabold text-[10px] rounded-full shadow-lg active:scale-95 transition-transform duration-200 flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              <span>Mulai Diagnosis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#masalah"
              className="px-6 py-3.5 border border-gray-300 hover:border-gray-500 text-gray-800 font-extrabold text-[10px] rounded-full text-center active:scale-95 transition-transform duration-200 uppercase tracking-widest bg-white shadow-sm"
            >
              Pelajari Kasus
            </a>
          </div>
        </div>

        {/* Hero Mockup (Right) */}
        <div className="md:col-span-6 flex justify-center">
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden p-3.5">
            <div className="rounded-2xl overflow-hidden h-64 bg-gray-100 relative">
              <img
                src="https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?auto=format&fit=crop&w=600&q=80&fm=webp"
                alt="Snake Identification AI Mockup"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-[#70020F]/90 text-white font-black text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                Global Snakebite Response
              </div>
            </div>
            
            <div className="p-4 flex items-center justify-between border-t border-gray-100 mt-3 text-xs">
              <div>
                <span className="text-[9px] font-black uppercase text-gray-400 block tracking-widest">HSIL Hackathon 2026</span>
                <span className="font-black text-gray-900">🟢 OFFLINE CAPABLE WORKFLOW</span>
              </div>
              <div className="bg-[#2E7D6F]/10 border border-[#2E7D6F]/20 text-[#2E7D6F] font-black text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider">
                Edge-AI Active
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* Slide 2: The Problem Section */}
      <section id="masalah" className="bg-white border-y border-gray-100 py-16 md:py-24 px-6 text-center">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="space-y-3">
            <span className="text-[10px] font-black text-[#70020F] uppercase tracking-widest block">━ THE PROBLEM ━</span>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-gray-900 tracking-tight">
              A Critical Pre-Hospital Gap in Snakebite Care
            </h2>
            <p className="text-xs md:text-sm text-gray-500 font-bold max-w-3xl mx-auto leading-relaxed">
              Envenomasi gigitan ular adalah penyakit tropis terabaikan (Neglected Tropical Disease) yang ditetapkan oleh WHO, menyebabkan <span className="text-gray-900 font-extrabold">81.000 - 138.000 kematian</span> dan <span className="text-gray-900 font-extrabold">hingga 400.000 disabilitas setiap tahunnya</span>, terutama berdampak pada populasi pedesaan di Indonesia.
            </p>
          </div>

          {/* 3 Main Challenges Grid */}
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#70020F]/10 text-[#70020F] flex items-center justify-center border border-[#70020F]/20">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">Identification Failure</h3>
              <p className="text-[11px] text-gray-600 leading-relaxed font-semibold">
                Korban gigitan ular dan saksi mata tidak dapat membedakan secara andal ular berbisa dari ular yang tidak berbisa, memicu kepanikan atau meremehkan bahaya klinis.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#70020F]/10 text-[#70020F] flex items-center justify-center border border-[#70020F]/20">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">Harmful First Aid</h3>
              <p className="text-[11px] text-gray-600 leading-relaxed font-semibold">
                Tindakan pertolongan pertama yang tidak tepat seperti pemasangan tourniquet (dilaporkan dalam 26-93% kasus) atau torehan tradisional memperburuk kerusakan jaringan lokal.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#70020F]/10 text-[#70020F] flex items-center justify-center border border-[#70020F]/20">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">Pre-Hospital Data Void</h3>
              <p className="text-[11px] text-gray-600 leading-relaxed font-semibold">
                Korban tiba di Puskesmas atau RS tanpa data klinis mendasar (spesies, garis waktu pembengkakan, pertolongan pertama), memaksa dokter lapangan membuat keputusan medis darurat tanpa data penunjang.
              </p>
            </div>
          </div>

          <div className="bg-[#70020F]/5 border border-[#70020F]/10 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#70020F] block">Indonesia (Crisis Epicenter)</span>
              <p className="text-xs text-gray-700 font-bold mt-1 max-w-2xl leading-normal">
                Dengan estimasi <span className="text-gray-900 font-extrabold">135.000 kasus gigitan ular pertahun</span> dan <span className="text-gray-900 font-extrabold">10.547 kematian pertahun</span>, Indonesia mewakili <span className="text-[#70020F] font-extrabold">~97% dari seluruh kematian gigitan ular di wilayah ASEAN</span>.
              </p>
            </div>
            <div className="font-mono font-black text-2xl text-[#70020F] bg-white border border-[#70020F]/20 rounded-xl px-4 py-2 shadow-sm shrink-0">
              97% ASEAN
            </div>
          </div>
        </div>
      </section>

      {/* Slide 4: Product Field Flow Section */}
      <section id="alur" className="max-w-6xl mx-auto px-6 py-16 md:py-24 text-center">
        <div className="space-y-12">
          <div className="space-y-3">
            <span className="text-[10px] font-black text-[#2E7D6F] uppercase tracking-widest block">━ PRODUCT WORKFLOW ━</span>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-gray-900 tracking-tight">
              How SnakeBiteAI Works in the Field
            </h2>
            <p className="text-xs text-gray-500 font-bold max-w-xl mx-auto leading-relaxed">
              Platform kami bekerja langsung di titik kejadian (*point of incident*) untuk memandu pengambilan keputusan klinis luring.
            </p>
          </div>

          {/* 5 steps timeline grid */}
          <div className="grid md:grid-cols-5 gap-6 text-left">
            {[
              {
                num: '1',
                title: 'Input Collection',
                items: ['Foto visual ular', 'Kondisi bekas gigitan', 'Data koordinat satelit GPS']
              },
              {
                num: '2',
                title: 'AI Processing',
                items: ['Prediksi jenis taksa ular', 'Kalkulasi parameter WHO', 'Eliminasi area distribusi']
              },
              {
                num: '3',
                title: 'Real-Time Output',
                items: ['Probabilitas & bahaya bisa', 'Panduan imobilisasi elastis', 'Alarm monitoring re-assess']
              },
              {
                num: '4',
                title: 'Continuous Monitoring',
                items: ['Uji progresi berkala', 'Linimasa foto luka klinis', 'Kalkulasi ulang grade klinis']
              },
              {
                num: '5',
                title: 'Clinical Handoff',
                items: ['Laporan digital pre-hospital', 'Enkripsi data asinkron', 'Kompilasi ringkasan rujukan']
              }
            ].map((step, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 relative shadow-sm hover:border-gray-300 transition-all flex flex-col justify-between">
                <span className="absolute -top-3.5 left-5 w-8 h-8 rounded-full bg-[#1E1E1E] text-white font-mono font-black text-xs flex items-center justify-center border-4 border-white shadow-md">
                  {step.num}
                </span>
                
                <div className="pt-3 flex-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 mb-3 block leading-tight">
                    {step.title}
                  </h4>
                  <ul className="space-y-1.5">
                    {step.items.map((it, i) => (
                      <li key={i} className="text-[10px] text-gray-600 font-semibold leading-relaxed flex items-start gap-1">
                        <span className="text-[#2E7D6F]">•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 10: 12-Month Clinical Readiness Plan Section */}
      <section id="rencana" className="bg-white border-y border-gray-100 py-16 md:py-24 px-6 text-center">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="space-y-3">
            <span className="text-[10px] font-black text-[#2E7D6F] uppercase tracking-widest block">━ DEVELOPMENT PLAN ━</span>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-gray-900 tracking-tight">
              12-Month Clinical Readiness Plan
            </h2>
            <p className="text-xs text-gray-500 font-bold max-w-xl mx-auto">
              Tahapan operasional klinis dan target pengembangan sistem dalam 12 bulan ke depan.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 text-left">
            {developmentTimeline.map((item, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-gray-200">
                  <span className="text-base font-mono font-black text-[#2E7D6F]">{item.quarter}</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 bg-white px-2 py-0.5 rounded border">{item.phase}</span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-wider block">Milestone Strategis:</span>
                    <p className="text-[10px] text-gray-700 font-bold mt-0.5 leading-normal">{item.milestones}</p>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-wider block">Key Performance Indicators (KPI):</span>
                    <p className="text-[10px] text-gray-900 font-black mt-0.5 leading-normal">{item.kpis}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 13: Multidisciplinary Team Section */}
      <section id="tim" className="max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
        <div className="space-y-12">
          <div className="space-y-3">
            <span className="text-[10px] font-black text-[#2E7D6F] uppercase tracking-widest block">━ TEAM MEMBERS ━</span>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-gray-900 tracking-tight">
              Multidisciplinary by Design Team
            </h2>
            <p className="text-xs text-gray-500 font-bold max-w-xl mx-auto leading-relaxed">
              Berkolaborasi lintas disiplin informatika dan ilmu keperawatan klinis untuk menghasilkan akurasi penanganan terbaik.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-center flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#1E1E1E]/5 border border-gray-200 flex items-center justify-center mx-auto text-lg">
                    👤
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-gray-900 block leading-tight truncate">
                      {member.name}
                    </h4>
                    <span className="text-[8px] font-bold text-gray-400 block mt-0.5">
                      {member.background}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 border-t border-gray-100 pt-2 text-[8px] text-[#2E7D6F] font-black uppercase tracking-wider">
                  {member.role.split(',')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnerships Section (Supported By) */}
      <section id="mitra" className="bg-white py-14 border-t border-gray-100 px-6 text-center">
        <div className="max-w-6xl mx-auto space-y-8">
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block">
            GLOBAL HEALTH SYSTEM & ACADEMIC COLLABORATORS
          </span>
          
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
            {/* Logo 1: Harvard T.H. Chan */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-extrabold text-gray-900 tracking-wider">HARVARD T.H. CHAN</span>
              <span className="text-[7px] text-gray-400 uppercase tracking-widest font-semibold">School of Public Health</span>
            </div>

            {/* Logo 2: Health Systems Lab */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-extrabold text-gray-900 tracking-wider">HEALTH SYSTEMS INNOVATION LAB</span>
              <span className="text-[7px] text-gray-400 uppercase tracking-widest font-semibold">Harvard University</span>
            </div>

            {/* Logo 3: AISX */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-extrabold text-gray-900 tracking-wider">AISX AI FOR SMART-X</span>
              <span className="text-[7px] text-gray-400 uppercase tracking-widest font-semibold">Research Collaboration</span>
            </div>

            {/* Logo 4: PATH */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-extrabold text-[#70020F] tracking-widest">P A T H</span>
              <span className="text-[7px] text-gray-400 uppercase tracking-widest font-semibold">Global Health</span>
            </div>

            {/* Logo 5: Undip */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-extrabold text-gray-900 tracking-wider">UNIVERSITAS DIPONEGORO</span>
              <span className="text-[7px] text-gray-400 uppercase tracking-widest font-semibold">Semarang, Indonesia</span>
            </div>
          </div>

          <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider pt-4">
            Supported in HSIL Hackathon 2026 Bandung Hub
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-white py-12 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-400 font-bold uppercase tracking-wider">
          <div>
            <span>© 2026 SHIELD: SnakeBiteAI. All rights reserved.</span>
          </div>
          
          <div className="flex space-x-6">
            <span className="hover:text-black cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-black cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
