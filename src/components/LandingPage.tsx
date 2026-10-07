
import { Shield, ArrowRight, HelpCircle, Ban, Activity } from 'lucide-react';

interface LandingPageProps {
  onStartApp: () => void;
}

const PROBLEMS = [
  {
    icon: HelpCircle,
    title: 'Salah membaca jenis ular',
    body: 'Korban dan saksi sulit membedakan ular berbisa dari yang tidak. Akibatnya kepanikan atau meremehkan bahaya klinis.',
  },
  {
    icon: Ban,
    title: 'Pertolongan pertama yang membahayakan',
    body: 'Tourniquet dilaporkan pada 26-93% kasus. Pemotongan dan torehan tradisional memperparah kerusakan jaringan lokal.',
  },
  {
    icon: Activity,
    title: 'Data pra-rumah sakit yang kosong',
    body: 'Korban tiba di Puskesmas atau RS tanpa data dasar: spesies, garis waktu pembengkakan, dan tindakan awal yang sudah dilakukan.',
  },
];

const WORKFLOW = [
  { num: '01', title: 'Pengumpulan input', items: ['Foto visual ular', 'Kondisi bekas gigitan', 'Koordinat GPS satelit'] },
  { num: '02', title: 'Pemrosesan Edge-AI', items: ['Prediksi taksa ular', 'Kalkulasi parameter WHO', 'Penyaringan area distribusi'] },
  { num: '03', title: 'Keluaran real-time', items: ['Probabilitas & jenis bisa', 'Panduan imobilisasi elastis', 'Alarm monitoring ulang'] },
  { num: '04', title: 'Pemantauan berkelanjutan', items: ['Uji progresi berkala', 'Linimasa foto luka', 'Kalkulasi ulang grade'] },
  { num: '05', title: 'Serah terima klinis', items: ['Laporan digital pra-RS', 'Enkripsi data asinkron', 'Ringkasan rujukan'] },
];

const REFERRAL_NETWORK = [
  { name: 'Universitas Diponegoro', note: 'Semarang, Indonesia' },
  { name: 'Harvard T.H. Chan', note: 'School of Public Health' },
  { name: 'Health Systems Innovation Lab', note: 'Harvard University' },
  { name: 'AISX - AI for Smart-X', note: 'Kolaborasi riset' },
  { name: 'PATH', note: 'Kesehatan global' },
];

export default function LandingPage({ onStartApp }: LandingPageProps) {
  const teamMembers = [
    { name: 'Haidar Ali Laudza', background: 'Informatika', role: 'Project Leader, AI Engineer' },
    { name: 'Julius Tegar Aji Putra', background: 'Informatika', role: 'AI Engineer, Mobile App Developer' },
    { name: 'Muhammad Fikri', background: 'Informatika', role: 'Backend Developer, System Integrator' },
    { name: 'Cahya Mutiara Sandi', background: 'Ilmu Keperawatan', role: 'Clinical Advisor & Domain Expert' },
    { name: 'Elizabet Febriani', background: 'Ilmu Keperawatan', role: 'Clinical Advisor & Domain Expert' },
  ];

  const developmentTimeline = [
    { quarter: 'Q1', phase: 'Fondasi', milestones: 'Selesaikan aplikasi inti & AI. Siapkan sistem peringatan darurat.', kpis: 'Aplikasi berjalan luring. Perizinan medis diajukan.' },
    { quarter: 'Q2', phase: 'Uji awal', milestones: 'Uji di 2 wilayah risiko tinggi. Amankan mitra NGO pertama.', kpis: 'Akurasi AI >90%. 50+ pasien terbantu.' },
    { quarter: 'Q3', phase: 'Kemitraan pemerintah', milestones: 'Lacak pemulihan pasien. Libatkan dinas kesehatan setempat.', kpis: 'Perjanjian resmi ditandatangani. 100+ pasien terbantu.' },
    { quarter: 'Q4', phase: 'Dampak terukur', milestones: 'Perluas ke 200 kasus. Mulai kemitraan rumah sakit.', kpis: 'Diagnosis 20% lebih cepat. Pencocokan SABU akurat.' },
  ];

  return (
    <div className="bg-[#FAFAFA] text-[#1E1E1E]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[#FAFAFA]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <a href="#top" className="flex items-center gap-2.5" aria-label="SHIELD: SnakeBiteAI, kembali ke atas">
            <span className="flex h-8 w-8 items-center justify-center bg-[#1E1E1E]">
              <Shield className="h-4 w-4 text-[#F5F5F5]" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-extrabold tracking-tight">SHIELD: SnakeBiteAI</span>
              <span className="mt-0.5 text-[10px] font-semibold text-[#5B5B5B]">Bandung Hub, Indonesia</span>
            </span>
          </a>

          <div className="hidden items-center gap-7 text-sm font-semibold text-[#5B5B5B] md:flex">
            <a href="#masalah" className="hover:text-[#1E1E1E]">Masalah</a>
            <a href="#alur" className="hover:text-[#1E1E1E]">Alur lapangan</a>
            <a href="#rencana" className="hover:text-[#1E1E1E]">Kesiapan klinis</a>
            <a href="#tim" className="hover:text-[#1E1E1E]">Tim</a>
          </div>

          <button
            onClick={onStartApp}
            className="bg-[#1E1E1E] px-4 py-2 text-sm font-bold text-white hover:bg-black"
          >
            Mulai identifikasi
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header id="top" className="mx-auto max-w-6xl px-5 pb-16 pt-12 md:grid md:grid-cols-12 md:gap-14 md:pb-24 md:pt-20">
        <div className="md:col-span-7">
          <p className="eyebrow">Alat bantu keputusan klinis luring</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
            Menit menentukan.
            <br />
            <span className="text-[#70020F]">SnakeBiteAI</span> memberi kejelasan.
          </h1>
          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-[#5B5B5B]">
            Menjembatani celah pra-rumah sakit pada penanganan gigitan ular: identifikasi taksa visual,
            pertolongan pertama berbasis bukti klinis, dan serah terima data pasien yang terstruktur dalam satu alur kerja luring.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onStartApp}
              className="inline-flex items-center justify-center gap-2 bg-[#2E7D6F] px-6 py-3 text-sm font-bold text-white hover:bg-[#256a5e]"
            >
              Mulai identifikasi
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              href="#alur"
              className="inline-flex items-center justify-center border border-[#1E1E1E] px-6 py-3 text-sm font-bold text-[#1E1E1E] hover:bg-[#1E1E1E] hover:text-white"
            >
              Lihat cara kerja
            </a>
          </div>
        </div>

        {/* Reference specimen card */}
        <div className="mt-12 md:col-span-5 md:mt-0">
          <figure className="border border-[color:var(--line)] bg-white">
            <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-2.5">
              <span className="text-xs font-bold text-[#5B5B5B]">Contoh citra rujukan lokal</span>
              <span className="chip chip-neuro">Neurotoksik</span>
            </div>
            <img
              src="/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg"
              alt="Ular Acanthophis laevis (Ular Kematian Papua) dari dataset rujukan luring"
              className="h-56 w-full object-cover"
            />
            <figcaption className="px-4 py-3">
              <p className="text-sm font-extrabold">Acanthophis laevis</p>
              <p className="mt-0.5 text-xs font-medium text-[#5B5B5B]">
                Ular Kematian Papua &middot; contoh satu dari matriks taksa yang tersimpan di perangkat.
              </p>
            </figcaption>
          </figure>
        </div>
      </header>

      {/* Problem */}
      <section id="masalah" className="border-y border-[color:var(--line)] bg-white px-5 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow text-[#70020F]">Masalah</p>
          <h2 className="mt-3 max-w-2xl text-2xl font-extrabold tracking-tight md:text-3xl">
            Celah kritis pada penanganan gigitan ular sebelum pasien mencapai rumah sakit
          </h2>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-[#5B5B5B]">
            Envenomasi gigitan ular adalah penyakit tropis terabaikan yang ditetapkan WHO, menyebabkan{' '}
            <span className="font-bold text-[#1E1E1E]">81.000-138.000 kematian</span> dan{' '}
            <span className="font-bold text-[#1E1E1E]">hingga 400.000 disabilitas setiap tahun</span>,
            utamanya menjangkau populasi pedesaan di Indonesia.
          </p>

          <div className="mt-10 border-t border-[color:var(--line)]">
            {PROBLEMS.map((p, i) => (
              <div
                key={p.title}
                className="grid gap-4 border-b border-[color:var(--line)] py-6 md:grid-cols-12 md:gap-8"
              >
                <div className="flex items-center gap-3 md:col-span-4">
                  <span className="font-mono text-sm font-bold text-[#5B5B5B]">{String(i + 1).padStart(2, '0')}</span>
                  <p.icon className="h-5 w-5 text-[#70020F]" aria-hidden="true" />
                  <h3 className="text-base font-extrabold">{p.title}</h3>
                </div>
                <p className="text-sm font-medium leading-relaxed text-[#5B5B5B] md:col-span-8">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start gap-6 border border-[color:var(--line)] bg-[#F5F5F5] p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow text-[#70020F]">Indonesia, episentrum krisis</p>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[#3D3D3D]">
                Estimasi <span className="font-bold text-[#1E1E1E]">135.000 kasus gigitan</span> dan{' '}
                <span className="font-bold text-[#1E1E1E]">10.547 kematian per tahun</span>. Indonesia mencakup{' '}
                <span className="font-bold text-[#70020F]">sekitar 97% kematian gigitan ular di ASEAN</span>.
              </p>
            </div>
            <p className="font-mono text-4xl font-extrabold text-[#70020F]">97%</p>
          </div>
        </div>
      </section>

      {/* Field workflow */}
      <section id="alur" className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <p className="eyebrow text-[#2E7D6F]">Alur lapangan</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">Cara kerja di titik kejadian</h2>
        <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-[#5B5B5B]">
          Lima langkah, seluruhnya dapat dijalankan tanpa koneksi internet.
        </p>

        <div className="mt-10 border-t border-[color:var(--line)]">
          {WORKFLOW.map((step) => (
            <div key={step.num} className="grid gap-3 border-b border-[color:var(--line)] py-5 md:grid-cols-12 md:items-start md:gap-8">
              <div className="flex items-baseline gap-4 md:col-span-4">
                <span className="font-mono text-sm font-bold text-[#2E7D6F]">{step.num}</span>
                <h3 className="text-base font-extrabold">{step.title}</h3>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-1.5 md:col-span-8">
                {step.items.map((it) => (
                  <li key={it} className="flex items-center gap-2 text-sm font-medium text-[#5B5B5B]">
                    <span className="h-1 w-1 flex-none bg-[#5B5B5B]" aria-hidden="true" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Clinical readiness plan */}
      <section id="rencana" className="border-y border-[color:var(--line)] bg-white px-5 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow text-[#2E7D6F]">Rencana pengembangan</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">Kesiapan klinis 12 bulan</h2>

          <div className="mt-10 border-t border-[color:var(--line)]">
            {developmentTimeline.map((item) => (
              <div key={item.quarter} className="grid gap-4 border-b border-[color:var(--line)] py-6 md:grid-cols-12 md:items-start md:gap-8">
                <div className="flex items-baseline gap-3 md:col-span-3">
                  <span className="font-mono text-lg font-extrabold text-[#2E7D6F]">{item.quarter}</span>
                  <span className="text-sm font-bold">{item.phase}</span>
                </div>
                <div className="md:col-span-5">
                  <p className="text-xs font-bold text-[#5B5B5B]">Milestone</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-[#3D3D3D]">{item.milestones}</p>
                </div>
                <div className="md:col-span-4">
                  <p className="text-xs font-bold text-[#5B5B5B]">Indikator</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-[#3D3D3D]">{item.kpis}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="tim" className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <p className="eyebrow text-[#2E7D6F]">Tim</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">Lintas disiplin sejak awal</h2>
        <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-[#5B5B5B]">
          Informatika dan ilmu keperawatan klinis bekerja bersama pada satu alur kerja.
        </p>

        <div className="mt-10 border-t border-[color:var(--line)]">
          {teamMembers.map((member) => (
            <div key={member.name} className="flex flex-col gap-1 border-b border-[color:var(--line)] py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-baseline gap-3">
                <p className="text-base font-bold">{member.name}</p>
                <p className="text-sm font-medium text-[#5B5B5B]">{member.background}</p>
              </div>
              <p className="text-sm font-semibold text-[#2E7D6F]">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Referral network (acknowledgements, not endorsements) */}
      <section id="mitra" className="border-t border-[color:var(--line)] bg-white px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Jejaring rujukan & dukungan akademik</p>
          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-5">
            {REFERRAL_NETWORK.map((org) => (
              <div key={org.name}>
                <p className="text-sm font-extrabold">{org.name}</p>
                <p className="mt-0.5 text-xs font-medium text-[#5B5B5B]">{org.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-xs font-medium leading-relaxed text-[#5B5B5B]">
            Nama lembaga dicantumkan sebagai bagian dari jejaring dukungan, referensi, dan pembelajaran tim
            pada HSIL Hackathon 2026 Bandung Hub. Pencantuman ini bukan pernyataan kemitraan resmi maupun endorsement.
          </p>
        </div>
      </section>

      <footer className="border-t border-[color:var(--line)] bg-white px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 text-sm font-medium text-[#5B5B5B] md:flex-row md:items-center">
          <p>&copy; 2026 SHIELD: SnakeBiteAI.</p>
          <div className="flex gap-6">
            <button className="hover:text-[#1E1E1E]">Kebijakan privasi</button>
            <button className="hover:text-[#1E1E1E]">Ketentuan layanan</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
