import React, { useState, useEffect } from 'react';
import { db, getAllDecryptedIncidents, addIncidentLog } from '../db/db';
import { useAppStore } from '../store/store';
import { MapContainer, TileLayer, Polygon, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Wifi, RefreshCw, BarChart2, UploadCloud, CheckCircle2 } from 'lucide-react';
import { DashboardStatsSkeleton, MapSkeleton } from './SkeletonLoader';
import { logger } from '../services/logger';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const PROVINCES_DATA = [
  {
    name: 'Sumatera',
    taxaCount: 78,
    density: 'dense',
    color: '#5A9A8F',
    coordinates: [
      [5.5, 95.3], [4.5, 98.0], [1.5, 99.0], [-1.0, 101.5], [-3.0, 102.5], [-5.5, 105.0],
      [-5.8, 104.2], [-4.0, 102.0], [-1.5, 100.0], [1.0, 97.5], [4.0, 96.0]
    ] as [number, number][]
  },
  {
    name: 'Jawa',
    taxaCount: 112,
    density: 'dense',
    color: '#2E7D6F',
    coordinates: [
      [-6.0, 106.0], [-6.2, 108.0], [-6.8, 111.0], [-6.9, 114.0], [-7.5, 114.5],
      [-8.5, 114.3], [-8.0, 110.0], [-7.5, 107.0], [-6.5, 105.5]
    ] as [number, number][]
  },
  {
    name: 'Kalimantan',
    taxaCount: 89,
    density: 'dense',
    color: '#2E7D6F',
    coordinates: [
      [2.0, 109.0], [4.0, 111.0], [4.2, 114.0], [4.0, 117.8], [2.0, 117.9],
      [-1.0, 117.0], [-3.5, 116.5], [-4.0, 114.5], [-3.0, 111.5], [-1.5, 109.5]
    ] as [number, number][]
  },
  {
    name: 'Sulawesi',
    taxaCount: 65,
    density: 'sparse',
    color: '#5A9A8F',
    coordinates: [
      [1.5, 120.0], [1.8, 125.0], [1.0, 125.0], [0.5, 122.0], [-1.0, 121.5],
      [-0.8, 123.5], [-3.0, 124.0], [-5.5, 122.5], [-5.0, 119.5], [-2.5, 119.0],
      [-1.5, 120.0]
    ] as [number, number][]
  },
  {
    name: 'Bali & Nusa Tenggara',
    taxaCount: 52,
    density: 'dense',
    color: '#5A9A8F',
    coordinates: [
      [-8.3, 115.0], [-8.3, 116.5], [-8.5, 119.0], [-8.5, 121.0], [-8.3, 124.0],
      [-8.5, 125.0], [-10.2, 124.0], [-9.8, 120.0], [-8.9, 116.0], [-8.8, 115.0]
    ] as [number, number][]
  },
  {
    name: 'Maluku',
    taxaCount: 28,
    density: 'sparse',
    color: '#A8C5BC',
    coordinates: [
      [-1.0, 127.0], [-0.5, 129.0], [-1.5, 130.5], [-3.8, 131.0], [-4.0, 129.0],
      [-3.0, 127.0]
    ] as [number, number][]
  },
  {
    name: 'Papua',
    taxaCount: 39,
    density: 'sparse',
    color: '#A8C5BC',
    coordinates: [
      [-1.5, 131.0], [-0.8, 134.0], [-2.5, 137.0], [-2.6, 141.0], [-9.0, 141.0],
      [-8.0, 138.0], [-5.0, 136.0], [-4.0, 134.0]
    ] as [number, number][]
  }
];

const createCustomIcon = (grade: number) => {
  const color = grade >= 3 ? '#70020F' : grade === 2 ? '#F57C00' : '#388E3C';
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><span style="display: block; width: 4px; height: 4px; border-radius: 50%; background-color: white;"></span></div>`,
    className: 'custom-leaflet-icon',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

function venomChip(venom: string) {
  if (venom === 'NEUROTOXIC') return <span className="chip chip-neuro">Neurotoksik</span>;
  if (venom === 'HEMOTOXIC') return <span className="chip chip-hemo">Hemotoksik</span>;
  return <span className="chip chip-safe">Tidak berbisa</span>;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { networkStatus, setNetworkStatus, pendingSyncCount, updatePendingSyncCount } = useAppStore();

  const [incidents, setIncidents] = useState<any[]>([]);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [stats, setStats] = useState({
    totalBites: 0,
    mostCommonSnake: 'Menghitung...',
    mostCommonSnakeImg: '',
    mostCommonSnakeVenom: 'NON-VENOMOUS',
    hottestRegion: 'Menghitung...',
    emergencyRatio: '0.0%'
  });

  const triggerHaptic = (duration: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  };

  const checkAndSeedMockIncidents = async () => {
    const count = await db.incidents.count();
    if (count === 0) {
      logger.info('Database', 'Seeding 4 mock clinical incidents for exhibition display...');

      const mockIncidents = [
        {
          id: 'inc_mock1', lat: -6.2088, lng: 106.8456,
          species: 'Acanthophis laevis', risk: 'NEUROTOXIC' as const, grade: 3,
          pain: 8, swelling: 3,
          localEffects: ['Pendarahan Aktif', 'Nyeri Hebat'],
          systemicEffects: ['Ptosis (Kelopak Mata Layu)', 'Kelemahan Otot'],
          vital: { hr: 95, bp: '130/85', spo2: 94 },
          photo: '/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg',
          sync: 'PENDING' as const
        },
        {
          id: 'inc_mock2', lat: -6.9175, lng: 107.6191,
          species: 'Ahaetulla fasciolata', risk: 'NON-VENOMOUS' as const, grade: 0,
          pain: 2, swelling: 1,
          localEffects: ['Gatal Ringan'],
          systemicEffects: [],
          vital: { hr: 72, bp: '120/80', spo2: 99 },
          photo: '/dataset/Ahaetulla_fasciolata_obs202932892_photo358471931.jpg',
          sync: 'SYNCED' as const
        },
        {
          id: 'inc_mock3', lat: -7.2575, lng: 112.7521,
          species: 'Ahaetulla prasina', risk: 'NON-VENOMOUS' as const, grade: 0,
          pain: 1, swelling: 0,
          localEffects: [],
          systemicEffects: [],
          vital: { hr: 68, bp: '115/75', spo2: 100 },
          photo: '/dataset/Ahaetulla_prasina_0003.jpg',
          sync: 'SYNCED' as const
        },
        {
          id: 'inc_mock4', lat: -8.4095, lng: 115.1889,
          species: 'Ahaetulla rufusoculara', risk: 'NON-VENOMOUS' as const, grade: 0,
          pain: 2, swelling: 0,
          localEffects: [],
          systemicEffects: [],
          vital: { hr: 75, bp: '120/80', spo2: 99 },
          photo: '/dataset/Ahaetulla_rufusoculara_obs252803925_photo456126350.jpg',
          sync: 'PENDING' as const
        }
      ];

      for (const item of mockIncidents) {
        const details = {
          gps_coordinates: { lat: item.lat, lng: item.lng, accuracy: 5, timestamp: Date.now() },
          species_prediction: {
            primary: item.species,
            risk: item.risk,
            confidence: 0.94,
            alternatives: []
          },
          severity_assessment: {
            grade: item.grade,
            grade_history: [{ timestamp: Date.now(), grade: item.grade }],
            who_protocol: []
          },
          symptoms: {
            bite_location: 'Kaki (Simulasi)',
            pain_scale: item.pain,
            swelling_grade: item.swelling,
            local_effects: item.localEffects,
            systemic_effects: item.systemicEffects,
            vital_signs: item.vital
          }
        };
        await addIncidentLog(item.id, details, [item.photo]);

        if (item.sync === 'SYNCED') {
          await db.incidents.update(item.id, { sync_status: 'SYNCED' });
        }
      }
      logger.info('Database', 'Mock clinical incidents loaded into Dexie DB.');
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    await checkAndSeedMockIncidents();

    const list = await getAllDecryptedIncidents();
    const species = await db.species.toArray();
    setIncidents(list);
    setSpeciesList(species);

    const total = list.length;
    let emergencyCount = 0;
    const snakeCounts: Record<string, number> = {};

    list.forEach(inc => {
      if (inc.details.severity_assessment.grade >= 3) {
        emergencyCount++;
      }
      const snake = inc.details.species_prediction.primary;
      snakeCounts[snake] = (snakeCounts[snake] || 0) + 1;
    });

    let mostCommon = 'Acanthophis laevis';
    let maxCount = 0;
    Object.entries(snakeCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = name;
      }
    });

    const matchingSpecies = species.find(s => s.scientific_name === mostCommon);
    const mostCommonImg = matchingSpecies?.reference_images[0] || '/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg';
    const mostCommonVenom = matchingSpecies?.venom_type || 'NEUROTOXIC';

    const ratio = total > 0 ? ((emergencyCount / total) * 100).toFixed(1) + '%' : '0.0%';

    setStats({
      totalBites: total,
      mostCommonSnake: mostCommon,
      mostCommonSnakeImg: mostCommonImg,
      mostCommonSnakeVenom: mostCommonVenom,
      hottestRegion: 'Jawa & Nusa Tenggara',
      emergencyRatio: ratio
    });

    await updatePendingSyncCount();

    setTimeout(() => {
      setIsLoading(false);
      logger.info('Dashboard', 'Dashboard statistics loaded successfully', { totalIncidents: total });
    }, 850);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const triggerSync = async () => {
    const pendingIncidents = incidents.filter(x => x.sync_status === 'PENDING');
    if (pendingIncidents.length === 0) {
      alert('Tidak ada antrean laporan darurat yang perlu disinkronkan.');
      return;
    }

    triggerHaptic(200);
    setSyncing(true);
    setSyncLogs([]);

    logger.info('Sync', 'Starting delayed background sync batch...', { pendingCount: pendingIncidents.length });

    const logMessages = [
      "[SYNC-WORKER] Memulai delayed background sync untuk antrean data...",
      "[HTTP-CLIENT] Deteksi status jaringan: ONLINE",
      "[SECURE-VAULT] Enkapsulasi data klinis terenkripsi AES-256-GCM...",
      `[BATCHER] Mengelompokkan ${pendingSyncCount} insiden dalam antrean JSON batch...`,
      "[API-GATEWAY] POST https://kemenkes.go.id/api/v2/incidents/batch HTTP/1.1",
      "[API-GATEWAY] Mentransmisikan payload terenkripsi medis (JSON)..."
    ];

    for (let i = 0; i < logMessages.length; i++) {
      await addSyncLog(logMessages[i], i * 300);
    }

    const hasPhotos = pendingIncidents.some(inc => inc.photos && inc.photos.length > 0);
    if (hasPhotos) {
      await addSyncLog("[MULTIPART] Mentransmisikan wound_photographs (BLOB)...", 1800);
    }

    await addSyncLog("[API-GATEWAY] HTTP/1.1 201 Created", 2200);
    await addSyncLog("[DATABASE] Sinkronisasi batch ke server berhasil.", 2500);

    setTimeout(async () => {
      const records = await db.incidents.toArray();
      for (const rec of records) {
        if (rec.sync_status === 'PENDING') {
          await db.incidents.update(rec.incident_id, { sync_status: 'SYNCED' });
        }
      }
      await loadDashboardData();
      setSyncing(false);
      triggerHaptic(150);
      logger.info('Sync', 'Delayed background sync successfully completed.');
    }, 2800);
  };

  const addSyncLog = (message: string, delay: number): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        setSyncLogs(prev => [...prev, message]);
        resolve();
      }, delay - (syncLogs.length * 40));
    });
  };

  const getSnakeImage = (name: string) => {
    const match = speciesList.find(s => s.scientific_name === name);
    return match?.reference_images[0] || '/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg';
  };

  const syncStatusChip = (status: string) => {
    if (status === 'SYNCED') return <span className="chip chip-safe">Tersinkron</span>;
    if (status === 'FAILED') return <span className="chip chip-neuro">Gagal</span>;
    return <span className="chip chip-hemo">Tertunda</span>;
  };

  return (
    <div className="step-transition mx-auto max-w-6xl space-y-6 pb-12">
      {isLoading ? (
        <div className="space-y-6">
          <DashboardStatsSkeleton />
          <MapSkeleton />
        </div>
      ) : (
        <>
          {/* Situation strip: one panel, one hierarchy */}
          <section className="panel space-y-0 p-5" aria-label="Ringkasan situasi">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#70020F]">Rasio kritis (G3/G4)</p>
                <p className="mt-1 text-4xl font-extrabold text-[#70020F]">{stats.emergencyRatio}</p>
                <p className="mt-1 text-xs font-medium text-[#5B5B5B]">Insiden butuh atensi SABU</p>
              </div>

              <div className="border-t border-[color:var(--line)] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 lg:border-l lg:border-t-0 lg:pt-0">
                <p className="eyebrow">Total kasus terdata</p>
                <p className="mt-1 text-2xl font-extrabold">{stats.totalBites}</p>
                <p className="mt-0.5 text-xs font-medium text-[#5B5B5B]">Rekam medis lokal</p>
              </div>

              <div className="flex items-center gap-3 border-t border-[color:var(--line)] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 lg:border-l lg:border-t-0 lg:pt-0">
                <img
                  src={stats.mostCommonSnakeImg}
                  alt={stats.mostCommonSnake}
                  className="h-12 w-12 flex-none border border-[color:var(--line)] object-cover"
                />
                <div className="min-w-0">
                  <p className="eyebrow">Ular terbanyak</p>
                  <p className="mt-1 truncate text-sm font-extrabold leading-tight">{stats.mostCommonSnake}</p>
                  <div className="mt-1">{venomChip(stats.mostCommonSnakeVenom)}</div>
                </div>
              </div>

              <div className="border-t border-[color:var(--line)] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 lg:border-l lg:border-t-0 lg:pt-0">
                <p className="eyebrow">Densitas tertinggi</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-extrabold">
                  <BarChart2 className="h-4 w-4 text-[#2E7D6F]" aria-hidden="true" />
                  {stats.hottestRegion}
                </p>
                <p className="mt-0.5 text-xs font-medium text-[#5B5B5B]">Wilayah kepulauan</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Map */}
            <div className="space-y-4 lg:col-span-2">
              <div className="panel p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-[color:var(--line)] pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold">Peta populasi taksa &amp; insiden</h3>
                    <p className="mt-1 text-xs font-medium text-[#5B5B5B]">
                      Klik peta untuk melihat detail wilayah dan kasus.
                    </p>
                  </div>
                  <span className="chip chip-info">Leaflet</span>
                </div>

                <div className="relative z-0 h-[400px] overflow-hidden border border-[color:var(--line)]">
                  <MapContainer
                    center={[-2.5489, 118.0149]}
                    zoom={5}
                    zoomControl={true}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {PROVINCES_DATA.map((prov, idx) => (
                      <Polygon
                        key={idx}
                        positions={prov.coordinates}
                        pathOptions={{
                          fillColor: prov.color,
                          fillOpacity: 0.25,
                          color: '#1E1E1E',
                          weight: 1.5,
                          dashArray: prov.density === 'sparse' ? '4, 4' : undefined
                        }}
                      >
                        <Popup>
                          <div className="space-y-1 p-0.5 text-left">
                            <h4 className="border-b border-[color:var(--line)] pb-0.5 text-sm font-extrabold">{prov.name}</h4>
                            <p className="text-xs font-semibold text-[#5B5B5B]">
                              Spesies lokal: <strong className="text-[#1E1E1E]">{prov.taxaCount} taksa</strong>
                            </p>
                          </div>
                        </Popup>
                      </Polygon>
                    ))}

                    {incidents.map((inc) => (
                      <Marker
                        key={inc.incident_id}
                        position={[inc.details.gps_coordinates.lat, inc.details.gps_coordinates.lng]}
                        icon={createCustomIcon(inc.details.severity_assessment.grade)}
                      >
                        <Popup maxWidth={180}>
                          <div className="w-[150px] space-y-2 p-0.5">
                            <div className="overflow-hidden border border-[color:var(--line)]">
                              <div className="h-16 w-full bg-[#F0F0F0]">
                                <img
                                  src={getSnakeImage(inc.details.species_prediction.primary)}
                                  alt={inc.details.species_prediction.primary}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="space-y-1 p-2">
                                <h5 className="truncate text-xs font-extrabold leading-tight">
                                  {inc.details.species_prediction.primary}
                                </h5>
                                <span className={`chip ${inc.details.severity_assessment.grade >= 3 ? 'chip-neuro' : inc.details.severity_assessment.grade === 2 ? 'chip-hemo' : 'chip-safe'}`}>
                                  Grade {inc.details.severity_assessment.grade}
                                </span>
                                <p className="text-[11px] font-medium leading-none text-[#5B5B5B]">
                                  {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>

                  <div className="absolute bottom-3 left-3 z-[1000] border border-[color:var(--line)] bg-white/95 p-2.5 text-[11px] shadow-sm">
                    <p className="mb-1.5 border-b border-[color:var(--line)] pb-1 text-xs font-extrabold">Tingkat populasi</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-3 rounded-sm border border-gray-500 bg-[#2E7D6F]" />
                      <span>Tinggi (&gt;80 taksa)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="h-2 w-3 rounded-sm border border-gray-500 bg-[#5A9A8F]" />
                      <span>Sedang (40-80)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="h-2 w-3 rounded-sm border border-gray-500 bg-[#A8C5BC]" />
                      <span>Rendah (&lt;40)</span>
                    </div>
                    <p className="mb-1 mt-2 border-t border-[color:var(--line)] pt-1.5 pb-0.5 text-[11px] font-extrabold">Pin insiden</p>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border border-white bg-[#70020F]" />
                      <span>Kritis (G3/G4)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border border-white bg-[#F57C00]" />
                      <span>Sedang (G2)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border border-white bg-[#388E3C]" />
                      <span>Ringan (G0/G1)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync panel */}
            <div className="space-y-4">
              <div className="panel space-y-3 p-4">
                <div className="flex items-center justify-between border-b border-[color:var(--line)] pb-2">
                  <p className="text-sm font-extrabold">Antrean sinkronisasi</p>
                  {networkStatus === 'online' ? (
                    <span className="chip chip-safe">
                      <Wifi className="h-3 w-3" aria-hidden="true" />
                      Online
                    </span>
                  ) : (
                    <span className="chip chip-hemo">Luring siap</span>
                  )}
                </div>

                <div className="max-h-[160px] overflow-y-auto rounded-md border border-[color:var(--line)]">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[color:var(--line)] bg-[#F5F5F5] text-[11px] font-bold text-[#5B5B5B]">
                      <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">Ular</th>
                        <th className="p-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--line)] font-medium">
                      {incidents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-xs text-[#5B5B5B]">
                            Belum ada rekam medis gigitan ular.
                          </td>
                        </tr>
                      ) : (
                        incidents.map((inc) => (
                          <tr key={inc.incident_id}>
                            <td className="p-2 font-mono text-[11px] text-[#5B5B5B]">{inc.incident_id.substring(4, 10)}</td>
                            <td className="max-w-[90px] truncate p-2">{inc.details.species_prediction.primary}</td>
                            <td className="p-2 text-right">{syncStatusChip(inc.sync_status)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={triggerSync}
                    disabled={syncing}
                    className="flex flex-1 items-center justify-center gap-2 bg-[#2E7D6F] py-3 text-xs font-bold text-white hover:bg-[#256a5e] disabled:opacity-60"
                  >
                    {syncing ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Sinkronisasi batch
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic(50);
                      const nextStatus = networkStatus === 'online' ? 'offline' : 'online';
                      setNetworkStatus(nextStatus);
                      logger.info('Network', `Toggled simulated interface connection to ${nextStatus.toUpperCase()}`);
                    }}
                    className="border border-[color:var(--line)] px-3 py-2 text-xs font-bold text-[#1E1E1E] hover:bg-[#F5F5F5]"
                    aria-label={`Simulasi koneksi; saat ini ${networkStatus === 'online' ? 'online' : 'luring'}`}
                  >
                    Simulasi koneksi
                  </button>
                </div>
              </div>

              {/* Sync activity: a log, not a fake terminal */}
              {syncLogs.length > 0 && (
                <div className="panel p-3">
                  <p className="eyebrow mb-2">
                    {syncing ? 'Menyinkronkan...' : 'Hasil sinkronisasi'}
                  </p>
                  <ul className="space-y-1.5">
                    {syncLogs.map((log, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 font-mono text-[11px] font-medium leading-relaxed text-[#3D3D3D]"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-[#388E3C]" aria-hidden="true" />
                        <span>{log}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}