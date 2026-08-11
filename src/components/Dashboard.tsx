import React, { useState, useEffect } from 'react';
import { db, getAllDecryptedIncidents, addIncidentLog } from '../db/db';
import { useAppStore } from '../store/store';
import { MapContainer, TileLayer, Polygon, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import { UploadCloud, Database, Wifi, ShieldCheck, RefreshCw, BarChart2, MapPin, Eye } from 'lucide-react';
import { DashboardStatsSkeleton, MapSkeleton } from './SkeletonLoader';
import { logger } from '../services/logger';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

// Simplified geographic coordinates for major Indonesian island regions (provinces/groups)
const PROVINCES_DATA = [
  {
    name: 'Sumatera',
    taxaCount: 78,
    density: 'dense',
    color: '#5A9A8F', // Medium
    coordinates: [
      [5.5, 95.3], [4.5, 98.0], [1.5, 99.0], [-1.0, 101.5], [-3.0, 102.5], [-5.5, 105.0],
      [-5.8, 104.2], [-4.0, 102.0], [-1.5, 100.0], [1.0, 97.5], [4.0, 96.0]
    ] as [number, number][]
  },
  {
    name: 'Jawa',
    taxaCount: 112,
    density: 'dense',
    color: '#2E7D6F', // High
    coordinates: [
      [-6.0, 106.0], [-6.2, 108.0], [-6.8, 111.0], [-6.9, 114.0], [-7.5, 114.5],
      [-8.5, 114.3], [-8.0, 110.0], [-7.5, 107.0], [-6.5, 105.5]
    ] as [number, number][]
  },
  {
    name: 'Kalimantan',
    taxaCount: 89,
    density: 'dense',
    color: '#2E7D6F', // High
    coordinates: [
      [2.0, 109.0], [4.0, 111.0], [4.2, 114.0], [4.0, 117.8], [2.0, 117.9],
      [-1.0, 117.0], [-3.5, 116.5], [-4.0, 114.5], [-3.0, 111.5], [-1.5, 109.5]
    ] as [number, number][]
  },
  {
    name: 'Sulawesi',
    taxaCount: 65,
    density: 'sparse',
    color: '#5A9A8F', // Medium
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
    color: '#5A9A8F', // Medium
    coordinates: [
      [-8.3, 115.0], [-8.3, 116.5], [-8.5, 119.0], [-8.5, 121.0], [-8.3, 124.0],
      [-8.5, 125.0], [-10.2, 124.0], [-9.8, 120.0], [-8.9, 116.0], [-8.8, 115.0]
    ] as [number, number][]
  },
  {
    name: 'Maluku',
    taxaCount: 28,
    density: 'sparse',
    color: '#A8C5BC', // Low
    coordinates: [
      [-1.0, 127.0], [-0.5, 129.0], [-1.5, 130.5], [-3.8, 131.0], [-4.0, 129.0],
      [-3.0, 127.0]
    ] as [number, number][]
  },
  {
    name: 'Papua',
    taxaCount: 39,
    density: 'sparse',
    color: '#A8C5BC', // Low
    coordinates: [
      [-1.5, 131.0], [-0.8, 134.0], [-2.5, 137.0], [-2.6, 141.0], [-9.0, 141.0],
      [-8.0, 138.0], [-5.0, 136.0], [-4.0, 134.0]
    ] as [number, number][]
  }
];

// SVG custom Leaflet icon based on severity grade
const createCustomIcon = (grade: number) => {
  const color = grade >= 3 ? '#70020F' : grade === 2 ? '#F57C00' : '#388E3C';
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><span style="display: block; width: 4px; height: 4px; border-radius: 50%; background-color: white;"></span></div>`,
    className: 'custom-leaflet-icon',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { networkStatus, setNetworkStatus, pendingSyncCount, updatePendingSyncCount } = useAppStore();

  const [incidents, setIncidents] = useState<any[]>([]);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewLogDetail, setViewLogDetail] = useState<any | null>(null);

  // Statistics summaries
  const [stats, setStats] = useState({
    totalBites: 0,
    mostCommonSnake: 'Menghitung...',
    mostCommonSnakeImg: '',
    mostCommonSnakeVenom: 'NON-VENOMOUS',
    hottestRegion: 'Menghitung...',
    emergencyRatio: '0.0%'
  });

  // Trigger haptic feedback
  const triggerHaptic = (duration: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  };

  // Seed mock incidents if database is empty to make exhibition look high fidelity
  const checkAndSeedMockIncidents = async () => {
    const count = await db.incidents.count();
    if (count === 0) {
      logger.info('Database', 'Seeding 4 mock clinical incidents for exhibition display...');
      
      const mockIncidents = [
        {
          id: 'inc_mock1',
          lat: -6.2088,
          lng: 106.8456,
          species: 'Naja sputatrix',
          risk: 'NEUROTOXIC' as const,
          grade: 3,
          pain: 8,
          swelling: 3,
          localEffects: ['Pendarahan Aktif'],
          systemicEffects: ['Ptosis (Kelopak Mata Layu)', 'Sulit Menelan (Dysphagia)'],
          vital: { hr: 95, bp: '130/85', spo2: 94 },
          photo: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80',
          sync: 'PENDING' as const
        },
        {
          id: 'inc_mock2',
          lat: -6.9175,
          lng: 107.6191,
          species: 'Calloselasma rhodostoma',
          risk: 'HEMOTOXIC' as const,
          grade: 2,
          pain: 6,
          swelling: 2,
          localEffects: ['Kebas/Mati Rasa Lokal'],
          systemicEffects: [],
          vital: { hr: 84, bp: '120/80', spo2: 98 },
          photo: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
          sync: 'SYNCED' as const
        },
        {
          id: 'inc_mock3',
          lat: -7.2575,
          lng: 112.7521,
          species: 'Bungarus fasciatus',
          risk: 'NEUROTOXIC' as const,
          grade: 4,
          pain: 9,
          swelling: 2,
          localEffects: ['Pendarahan Aktif', 'Kebas/Mati Rasa Lokal'],
          systemicEffects: ['Ptosis (Kelopak Mata Layu)', 'Sesak Napas (Respiratory Failure)'],
          vital: { hr: 115, bp: '145/95', spo2: 88 },
          photo: 'https://images.unsplash.com/photo-1604186838320-c7f822919558?auto=format&fit=crop&w=400&q=80',
          sync: 'SYNCED' as const
        },
        {
          id: 'inc_mock4',
          lat: -8.4095,
          lng: 115.1889,
          species: 'Trimeresurus insularis',
          risk: 'HEMOTOXIC' as const,
          grade: 3,
          pain: 7,
          swelling: 3,
          localEffects: ['Lepuhan Cairan (Blisters)'],
          systemicEffects: ['Muntah Darah (Hematemesis)'],
          vital: { hr: 92, bp: '125/82', spo2: 95 },
          photo: 'https://images.unsplash.com/photo-1582239454477-8bb0b1c0bfeb?auto=format&fit=crop&w=400&q=80',
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
        
        // Mock individual sync state
        if (item.sync === 'SYNCED') {
          await db.incidents.update(item.id, { sync_status: 'SYNCED' });
        }
      }
      logger.info('Database', 'Mock clinical incidents loaded into Dexie DB.');
    }
  };

  // Load all data from local DB
  const loadDashboardData = async () => {
    setIsLoading(true);
    await checkAndSeedMockIncidents();
    
    const list = await getAllDecryptedIncidents();
    const species = await db.species.toArray();
    setIncidents(list);
    setSpeciesList(species);

    // Calculate metrics
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

    // Find most reported snake
    let mostCommon = 'Naja sputatrix'; // default dummy
    let maxCount = 0;
    Object.entries(snakeCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = name;
      }
    });

    const matchingSpecies = species.find(s => s.scientific_name === mostCommon);
    const mostCommonImg = matchingSpecies?.reference_images[0] || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80&fm=webp';
    const mostCommonVenom = matchingSpecies?.venom_type || 'NEUROTOXIC';

    // Calculate emergency ratio
    const ratio = total > 0 ? ((emergencyCount / total) * 100).toFixed(1) + '%' : '0.0%';

    setStats({
      totalBites: total,
      mostCommonSnake: mostCommon,
      mostCommonSnakeImg: mostCommonImg,
      mostCommonSnakeVenom: mostCommonVenom,
      hottestRegion: 'Jawa & NTT (Endemis)', // based on HSIL slide 5
      emergencyRatio: ratio
    });

    await updatePendingSyncCount();
    
    // Simulate natural map load latency
    setTimeout(() => {
      setIsLoading(false);
      logger.info('Dashboard', 'Dashboard statistics loaded successfully', { totalIncidents: total });
    }, 850);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Trigger simulated sync process
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
      "🔄 [SYNC-WORKER] Memulai delayed background sync untuk antrean data...",
      "🌐 [HTTP-CLIENT] Mendeteksi status jaringan: ONLINE (onLine = true)",
      "🔒 [SECURE-VAULT] Menyiapkan enkapsulasi data klinis terenkripsi AES-256-GCM...",
      `📦 [BATCHER] Mengelompokkan ${pendingSyncCount} insiden dalam antrean JSON batch...`,
      "📡 [API-GATEWAY] POST https://kemenkes.go.id/api/v2/incidents/batch HTTP/1.1",
      "📤 [API-GATEWAY] Mentransmisikan payload terenkripsi medis (JSON)..."
    ];

    for (let i = 0; i < logMessages.length; i++) {
      await addSyncLog(logMessages[i], i * 300);
    }

    const hasPhotos = pendingIncidents.some(inc => inc.photos && inc.photos.length > 0);
    if (hasPhotos) {
      await addSyncLog("📸 [MULTIPART] Mentransmisikan wound_photographs (BLOB)...", 1800);
    }

    await addSyncLog("📥 [API-GATEWAY] HTTP/1.1 201 Created", 2200);
    await addSyncLog("✅ [DATABASE] Server Kemenkes/BRIN: Sinkronisasi batch sukses.", 2500);

    // Update DB status to SYNCED
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

  // Helper to resolve snake image from scientific name
  const getSnakeImage = (name: string) => {
    const match = speciesList.find(s => s.scientific_name === name);
    return match?.reference_images[0] || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 step-transition">
      
      {isLoading ? (
        <div className="space-y-6">
          <DashboardStatsSkeleton />
          <MapSkeleton />
        </div>
      ) : (
        <>
          {/* Summary Statistics Cards (Grid Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Bites Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700">
                <MapPin className="w-6 h-6 text-[#2E7D6F]" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Total Kasus</span>
                <p className="text-2xl font-black text-gray-900 leading-none mt-1">{stats.totalBites}</p>
                <span className="text-[9px] text-gray-500 font-bold block mt-1">Insiden Terdata Lokal</span>
              </div>
            </div>

            {/* Most Common Snake Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow col-span-1 md:col-span-1">
              <div className="w-14 h-14 rounded-lg bg-gray-50 overflow-hidden border border-gray-200 flex-shrink-0">
                <img src={stats.mostCommonSnakeImg} alt={stats.mostCommonSnake} className="w-full h-full object-cover" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Ular Terbanyak</span>
                <p className="text-xs font-black text-gray-900 leading-tight mt-1 truncate">{stats.mostCommonSnake}</p>
                <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded text-white mt-1 uppercase ${
                  stats.mostCommonSnakeVenom === 'NEUROTOXIC' ? 'bg-[#70020F]' :
                  stats.mostCommonSnakeVenom === 'HEMOTOXIC' ? 'bg-[#F57C00]' : 'bg-[#388E3C]'
                }`}>
                  {stats.mostCommonSnakeVenom.split('-')[0]}
                </span>
              </div>
            </div>

            {/* Hottest Region Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700">
                <BarChart2 className="w-6 h-6 text-[#2E7D6F]" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Densitas Tertinggi</span>
                <p className="text-xs font-black text-gray-900 leading-none mt-1">{stats.hottestRegion}</p>
                <span className="text-[9px] text-gray-500 font-bold block mt-1.5">Wilayah Kepulauan</span>
              </div>
            </div>

            {/* Emergency Ratio Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-gray-700">
                <span className="text-xl font-bold text-[#70020F]">🚨</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Rasio Kritis (G3/G4)</span>
                <p className="text-2xl font-black text-[#70020F] leading-none mt-1">{stats.emergencyRatio}</p>
                <span className="text-[9px] text-[#70020F] font-bold block mt-1 uppercase tracking-wide">Butuh Atensi SABU</span>
              </div>
            </div>

          </div>

          {/* Interactive Map and Sync Panel Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Leaflet map container */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Peta Populasi Taksa & Insiden Lokasi</h3>
                    <p className="text-[9px] text-gray-500 mt-1">Interaksi popup menampilkan detail rekomendasi ular berbentuk card foto.</p>
                  </div>
                  <div className="text-[8px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                    LEAFLET MAP
                  </div>
                </div>

                <div className="h-[400px] border border-gray-200 rounded-xl overflow-hidden relative z-0 shadow-inner">
                  <MapContainer
                    center={[-2.5489, 118.0149]} // Center of Indonesia
                    zoom={5}
                    zoomControl={true}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Choropleth Polygon Layers */}
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
                          <div className="font-sans text-[10px] p-0.5 space-y-1">
                            <h4 className="font-black text-gray-900 uppercase tracking-wide border-b pb-0.5 leading-none">{prov.name}</h4>
                            <p className="font-semibold text-gray-600 mt-1">
                              Spesies Lokal: <strong>{prov.taxaCount} taksa</strong>
                            </p>
                          </div>
                        </Popup>
                      </Polygon>
                    ))}

                    {/* Coordinate Incident Markers */}
                    {incidents.map((inc) => (
                      <Marker
                        key={inc.incident_id}
                        position={[inc.details.gps_coordinates.lat, inc.details.gps_coordinates.lng]}
                        icon={createCustomIcon(inc.details.severity_assessment.grade)}
                      >
                        <Popup maxWidth={180}>
                          {/* Snake recommendations MUST always be displayed as cards with photos inside popups too! */}
                          <div className="font-sans text-[10px] p-0.5 w-[150px] space-y-2">
                            <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
                              <div className="h-16 w-full bg-gray-50 relative">
                                <img
                                  src={getSnakeImage(inc.details.species_prediction.primary)}
                                  alt={inc.details.species_prediction.primary}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-2 space-y-1">
                                <h5 className="font-black text-gray-900 truncate leading-tight">
                                  {inc.details.species_prediction.primary}
                                </h5>
                                <span className={`inline-block text-[7px] font-black px-1 rounded text-white shadow-sm uppercase ${
                                  inc.details.severity_assessment.grade >= 3 ? 'bg-[#70020F]' :
                                  inc.details.severity_assessment.grade === 2 ? 'bg-[#F57C00]' : 'bg-[#388E3C]'
                                }`}>
                                  Grade {inc.details.severity_assessment.grade}
                                </span>
                                <p className="text-[7px] text-gray-400 font-bold block mt-1 leading-none">
                                  ⌚ {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>

                  {/* Map Legend Overlay */}
                  <div className="absolute bottom-3 left-3 bg-white/95 border border-gray-200 p-2.5 rounded-xl text-[8px] font-bold z-[1000] space-y-1.5 shadow-md leading-none">
                    <div className="text-[9px] border-b pb-1 mb-1 text-gray-900 font-black uppercase">Tingkat Populasi</div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-3 h-2 bg-[#2E7D6F] block rounded-sm border border-gray-300" />
                      <span>Tinggi (&gt;80 taksa)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-3 h-2 bg-[#5A9A8F] block rounded-sm border border-gray-300" />
                      <span>Sedang (40-80 taksa)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-3 h-2 bg-[#A8C5BC] block rounded-sm border border-gray-300" />
                      <span>Rendah (&lt;40 taksa)</span>
                    </div>
                    <div className="border-t pt-1.5 mt-1">
                      <span className="text-gray-400 font-bold uppercase text-[7px] block">PIN INSIDEN:</span>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#70020F] block border border-white" />
                        <span>Kritis (G3/G4)</span>
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F57C00] block border border-white" />
                        <span>Sedang (G2)</span>
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#388E3C] block border border-white" />
                        <span>Ringan (G0/G1)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sync Queue Panel & Terminals */}
            <div className="space-y-4">
              
              {/* Sync controls */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-2 border-gray-100">
                  <div className="flex items-center space-x-1.5">
                    <Database className="w-4 h-4 text-[#2E7D6F]" />
                    <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Antrean Sinkronisasi</span>
                  </div>
                  
                  {networkStatus === 'online' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black bg-[#388E3C] text-white uppercase shadow-sm">
                      <Wifi className="w-3 h-3 mr-1" />
                      ONLINE
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black bg-[#F57C00] text-white animate-pulse uppercase shadow-sm">
                      🟢 OFFLINE READY
                    </span>
                  )}
                </div>

                {/* Table of incidents */}
                <div className="max-h-[150px] overflow-y-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-[10px] text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200 text-[8px]">
                      <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">Ular</th>
                        <th className="p-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold">
                      {incidents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-gray-400 italic">
                            Belum ada rekam medis gigitan ular.
                          </td>
                        </tr>
                      ) : (
                        incidents.map((inc) => (
                          <tr key={inc.incident_id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-2 font-mono text-gray-500">{inc.incident_id.substring(4, 10)}</td>
                            <td className="p-2 text-gray-900 truncate max-w-[80px]">{inc.details.species_prediction.primary}</td>
                            <td className="p-2 text-right">
                              <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${
                                inc.sync_status === 'SYNCED' ? 'bg-[#388E3C]/10 text-[#388E3C] border border-[#388E3C]/20' :
                                inc.sync_status === 'FAILED' ? 'bg-[#70020F]/10 text-[#70020F] border border-[#70020F]/20' :
                                'bg-[#F57C00]/10 text-[#F57C00] border border-[#F57C00]/20 animate-pulse'
                              }`}>
                                {inc.sync_status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex space-x-2 pt-1.5">
                  <button
                    onClick={triggerSync}
                    disabled={syncing}
                    className="flex-1 py-2.5 bg-[#2E7D6F] hover:bg-[#5A9A8F] text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-transform flex items-center justify-center space-x-1.5 uppercase tracking-wider"
                  >
                    {syncing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>SINKRONISASI BATCH</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      triggerHaptic(50);
                      const nextStatus = networkStatus === 'online' ? 'offline' : 'online';
                      setNetworkStatus(nextStatus);
                      logger.info('Network', `Toggled simulated interface connection to ${nextStatus.toUpperCase()}`);
                    }}
                    className="px-3 py-2.5 border border-gray-300 text-xs font-bold bg-white text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                    title="Simulasikan putus internet"
                  >
                    🔄 Koneksi
                  </button>
                </div>
              </div>

              {/* Console sync terminal logs */}
              {syncLogs.length > 0 && (
                <div className="bg-[#1E1E1E] text-[#388E3C] p-3 rounded-2xl font-mono text-[9px] space-y-1 shadow-inner h-32 overflow-y-auto border border-gray-800 leading-snug">
                  {syncLogs.map((log, idx) => (
                    <div key={idx}>
                      {log}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </>
      )}

    </div>
  );
}
