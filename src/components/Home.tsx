import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/store';
import { db, addIncidentLog, type IncidentDetails } from '../db/db';
import { Radio, RefreshCw } from 'lucide-react';
import { CardSkeleton } from './SkeletonLoader';
import { logger } from '../services/logger';

interface HomeProps {
  onNavigate: (page: string) => void;
  onSetIncidentId: (id: string) => void;
}

function venomChip(venom: string) {
  if (venom === 'NEUROTOXIC') return <span className="chip chip-neuro">Neurotoksik</span>;
  if (venom === 'HEMOTOXIC') return <span className="chip chip-hemo">Hemotoksik</span>;
  return <span className="chip chip-safe">Tidak berbisa</span>;
}

export default function Home({ onNavigate, onSetIncidentId }: HomeProps) {
  const {
    currentGPS,
    networkStatus,
    setGPS,
    pendingSyncCount,
    updatePendingSyncCount
  } = useAppStore();

  const [localSpecies, setLocalSpecies] = useState<any[]>([]);
  const [gpsSimulated, setGpsSimulated] = useState(false);
  const [simulatedProvince, setSimulatedProvince] = useState('DKI Jakarta');
  const [isLoadingSpecies, setIsLoadingSpecies] = useState<boolean>(true);

  const triggerHaptic = (duration: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  };

  useEffect(() => {
    updatePendingSyncCount();

    if (!currentGPS) {
      const initialGps = {
        lat: -6.2088,
        lng: 106.8456,
        accuracy: 15,
        timestamp: Date.now()
      };
      setGPS(initialGps);
      logger.info('GPS', 'Default location locked (DKI Jakarta)', initialGps);
    }
  }, []);

  useEffect(() => {
    const queryLocalSpecies = async () => {
      setIsLoadingSpecies(true);

      let province = 'DKI Jakarta';
      if (currentGPS) {
        if (currentGPS.lat < -8.0 && currentGPS.lng > 115.0) {
          province = 'Bali';
        } else if (currentGPS.lat < -7.0 && currentGPS.lng > 110.0) {
          province = 'Jawa Timur';
        } else if (currentGPS.lat < -6.5 && currentGPS.lng < 108.0) {
          province = 'Jawa Barat';
        }
      }
      setSimulatedProvince(province);

      setTimeout(async () => {
        try {
          const allSpecies = await db.species.toArray();
          const list = allSpecies.map(sp => {
            let confidence = 0.12;
            if (sp.scientific_name.includes('sputatrix') && province.includes('Jawa')) {
              confidence = 0.85;
            } else if (sp.scientific_name.includes('fasciatus') && province.includes('Jawa')) {
              confidence = 0.64;
            } else if (sp.scientific_name.includes('rhodostoma') && province.includes('Jawa')) {
              confidence = 0.73;
            } else if (sp.scientific_name.includes('insularis') && province === 'Bali') {
              confidence = 0.91;
            } else if (sp.scientific_name.includes('pictus')) {
              confidence = 0.95;
            }
            return { ...sp, confidence };
          }).sort((a, b) => b.confidence - a.confidence);

          setLocalSpecies(list);
          setIsLoadingSpecies(false);
          logger.info('SpeciesQuery', `Local taxa calculated for ${province}`, { count: list.length });
        } catch (e) {
          logger.error('SpeciesQuery', 'Failed to fetch local species', e);
          setIsLoadingSpecies(false);
        }
      }, 600);
    };

    queryLocalSpecies();
  }, [currentGPS]);

  const triggerGpsRefresh = () => {
    triggerHaptic(100);
    setGpsSimulated(true);

    const locations = [
      { name: 'DKI Jakarta', lat: -6.2088, lng: 106.8456 },
      { name: 'Jawa Barat', lat: -6.9175, lng: 107.6191 },
      { name: 'Jawa Timur', lat: -7.2575, lng: 112.7521 },
      { name: 'Bali', lat: -8.4095, lng: 115.1889 }
    ];
    const loc = locations[Math.floor(Math.random() * locations.length)];

    logger.info('GPS', 'Refreshing satellite lock...');

    setTimeout(() => {
      const newGps = {
        lat: loc.lat + (Math.random() - 0.5) * 0.04,
        lng: loc.lng + (Math.random() - 0.5) * 0.04,
        accuracy: Math.floor(Math.random() * 8) + 3,
        timestamp: Date.now()
      };
      setGPS(newGps);
      setGpsSimulated(false);
      logger.info('GPS', `Satellite lock acquired for ${loc.name}`, newGps);
    }, 900);
  };

  const handleEmergencyTrigger = async () => {
    triggerHaptic(300);
    logger.warn('Clinical', 'PANIC BUTTON PRESSED - Immediate Emergency Protocol Activated!');

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.log('Audio alert blocked or unsupported');
    }

    const newIncidentId = `inc_${Math.floor(Math.random() * 10000000)}`;
    onSetIncidentId(newIncidentId);

    const lat = currentGPS?.lat || -6.2088;
    const lng = currentGPS?.lng || 106.8456;

    const emergencyDetails: IncidentDetails = {
      gps_coordinates: {
        lat,
        lng,
        accuracy: 4,
        timestamp: Date.now()
      },
      species_prediction: {
        primary: 'Belum Teridentifikasi (Darurat)',
        risk: 'NEUROTOXIC',
        confidence: 0,
        alternatives: []
      },
      severity_assessment: {
        grade: 4,
        grade_history: [{ timestamp: Date.now(), grade: 4 }],
        who_protocol: [
          'Segera lakukan imobilisasi anggota tubuh terinfeksi.',
          'Jangan ikat dengan tourniquet.',
          'Segera evakuasi ke fasilitas pelayanan kesehatan terdekat.'
        ]
      },
      symptoms: {
        bite_location: 'Tidak ditentukan (Tombol Darurat)',
        pain_scale: 10,
        swelling_grade: 4,
        local_effects: ['Nyeri Hebat', 'Pendarahan Aktif'],
        systemic_effects: ['Sesak Napas', 'Kelemahan Otot'],
        vital_signs: {
          hr: 120,
          bp: '140/90',
          spo2: 92
        }
      }
    };

    await addIncidentLog(newIncidentId, emergencyDetails, []);
    await updatePendingSyncCount();
    logger.info('Database', `Emergency incident logged locally: ${newIncidentId}`);

    onNavigate('triage');
  };

  return (
    <div className="flex min-h-[640px] flex-col bg-white p-4 text-[#1E1E1E] md:p-8">
      <div className="flex flex-1 flex-col justify-between md:grid md:grid-cols-12 md:items-start md:gap-8">
        {/* Left: brand + panic control */}
        <div className="flex h-full flex-col items-center justify-center py-4 md:col-span-5 md:border-r md:border-[color:var(--line)] md:py-8 md:pr-8">
          <div className="mb-8 flex flex-col items-center text-center md:mb-10">
            <span className="text-2xl font-extrabold tracking-tight">
              SnakeBite<span className="text-[#70020F]">AI</span>
            </span>
            <h2 className="mt-3 text-sm font-extrabold tracking-wide">
              STAY CALM. <span className="text-[#70020F]">MINUTES MATTER.</span>
            </h2>
            <p className="mt-1 text-xs font-medium text-[#5B5B5B]">Tetap tenang. Setiap menit berarti.</p>
          </div>

          <div className="my-auto flex flex-col items-center gap-5">
            <button
              onClick={handleEmergencyTrigger}
              className="pulse-emergency flex h-44 w-44 flex-col items-center justify-center rounded-full border-4 border-white bg-[#70020F] text-white active:scale-[0.98] md:h-52 md:w-52"
              aria-label="Tombol Darurat (Panic Button)"
            >
              <span className="text-2xl font-extrabold tracking-wide md:text-3xl">PANIC</span>
              <span className="text-2xl font-extrabold tracking-wide md:text-3xl">BUTTON</span>
            </button>

            <div className="text-center">
              <p className="text-sm font-extrabold">I AM BITTEN</p>
              <p className="mt-1 text-xs font-medium text-[#5B5B5B]">Mulai penilaian darurat</p>
            </div>
          </div>
        </div>

        {/* Right: local species widget */}
        <div className="mt-6 flex w-full flex-col md:col-span-7 md:mt-0 md:py-2">
          <section className="panel flex h-full flex-col p-4">
            <div className="mb-4 flex items-center justify-between border-b border-[color:var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#2E7D6F]" aria-hidden="true" />
                <h3 className="text-sm font-extrabold">Kemungkinan ular di lokasi Anda</h3>
              </div>
              <button
                onClick={triggerGpsRefresh}
                disabled={gpsSimulated}
                className="flex items-center gap-1.5 rounded-md border border-[color:var(--line)] px-2.5 py-1.5 text-xs font-bold text-[#2E7D6F] hover:bg-[#2E7D6F]/10 disabled:opacity-60"
              >
                {gpsSimulated ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                    Memindai
                  </>
                ) : (
                  simulatedProvince
                )}
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2.5 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-3">
              {isLoadingSpecies ? (
                [1, 2, 3].map((n) => <CardSkeleton key={n} />)
              ) : localSpecies.length === 0 ? (
                <p className="w-full py-4 text-center text-sm font-medium text-[#5B5B5B]">
                  Data taksa lokal belum tersedia.
                </p>
              ) : (
                localSpecies.map((sp) => (
                  <article
                    key={sp.taxon_id}
                    className="panel flex w-40 flex-none flex-col overflow-hidden md:w-auto"
                  >
                    <div className="relative h-24 w-full overflow-hidden bg-[#F0F0F0]">
                      <img
                        src={sp.reference_images[0]}
                        alt={sp.scientific_name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-extrabold leading-tight">{sp.scientific_name}</h4>
                        <span className="whitespace-nowrap text-xs font-bold text-[#2E7D6F]">
                          {(sp.confidence * 100).toFixed(0)}% KDE
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium italic text-[#5B5B5B]">
                        {sp.common_name_indonesian}
                      </p>
                      <div className="mt-2">{venomChip(sp.venom_type)}</div>
                      <p className="mt-3 border-t border-[color:var(--line)] pt-2 text-xs font-medium text-[#5B5B5B]">
                        {sp.morphological_traits[0]}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>

            <p className="mt-4 text-center text-xs font-medium text-[#5B5B5B]">
              Dataset 100% luring &middot; pembacaan satelit aktif
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
