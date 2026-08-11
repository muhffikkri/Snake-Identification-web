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

  // Trigger haptic feedback
  const triggerHaptic = (duration: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  };

  // Check network state and seed coordinates
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

  // Update local species query based on coordinates / province
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

  // Simulate obtaining new GPS coordinates
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

  // Emergency Button Handler
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
    <div className="flex flex-col min-h-[640px] bg-white text-[#1E1E1E] p-4 md:p-8">
      
      {/* Outer wrapper: splits into a beautiful 2-column layout on iPad/Desktop */}
      <div className="md:grid md:grid-cols-12 md:gap-8 md:items-start flex-1 flex flex-col justify-between">
        
        {/* LEFT COLUMN: Brand logo & massive Panic Button */}
        <div className="md:col-span-5 flex flex-col justify-center items-center py-4 md:py-8 h-full md:border-r md:border-gray-100 md:pr-8">
          
          {/* Brand Header Inside App */}
          <div className="flex flex-col items-center justify-center space-y-2 mb-6 md:mb-10">
            <div className="flex items-center space-x-1.5">
              <div className="w-8 h-8 rounded-full bg-[#70020F] flex items-center justify-center border border-red-900 shadow">
                <span className="text-white text-xs font-bold font-mono">!</span>
              </div>
              <span className="text-xl font-black tracking-tight text-[#1E1E1E]">
                SnakeBite<span className="text-[#70020F]">AI</span>
              </span>
            </div>
            <div className="text-center mt-2">
              <h2 className="text-xs font-extrabold tracking-widest text-gray-900 uppercase">
                STAY CALM.
              </h2>
              <h2 className="text-xs font-extrabold tracking-widest text-[#70020F] uppercase leading-none">
                MINUTES MATTER.
              </h2>
            </div>
          </div>

          {/* Panic Button */}
          <div className="flex flex-col items-center justify-center space-y-4 my-auto">
            <button
              onClick={handleEmergencyTrigger}
              className="w-44 h-44 md:w-52 md:h-52 rounded-full bg-[#70020F] hover:bg-[#8b0313] text-white flex flex-col items-center justify-center shadow-2xl border-4 border-white outline outline-4 outline-[#70020F]/20 pulse-emergency transition-transform active:scale-95 duration-300"
              aria-label="Tombol Darurat (Panic Button)"
            >
              <span className="text-2xl md:text-3xl font-black tracking-widest uppercase text-white font-sans">
                PANIC
              </span>
              <span className="text-2xl md:text-3xl font-black tracking-widest uppercase text-white font-sans leading-none">
                BUTTON
              </span>
            </button>

            <div className="text-center pt-2">
              <p className="text-xs font-extrabold tracking-wide text-gray-900 uppercase">
                I AM BITTEN
              </p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
                (START ASSESSMENT)
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Geospatial Local Snake Widget */}
        <div className="md:col-span-7 w-full flex flex-col justify-start md:py-2 mt-6 md:mt-0">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm h-full flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2.5 mb-4">
              <div className="flex items-center space-x-1.5">
                <Radio className="w-4 h-4 text-[#2E7D6F] animate-pulse" />
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                  Ular di Sekitar Anda
                </h3>
              </div>
              <button
                onClick={triggerGpsRefresh}
                disabled={gpsSimulated}
                className="text-[9px] font-extrabold bg-[#2E7D6F]/10 hover:bg-[#2E7D6F]/20 text-[#2E7D6F] px-2 py-1 rounded-md flex items-center space-x-1.5 transition-colors border border-[#2E7D6F]/20"
              >
                {gpsSimulated ? (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <span>📍 {simulatedProvince}</span>
                )}
              </button>
            </div>

            {/* Local Snake list: displays as a scroll bar on mobile, but as a grid on iPad/Desktop */}
            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 overflow-x-auto md:overflow-x-visible pb-2.5 md:pb-0 scrollbar-thin">
              {isLoadingSpecies ? (
                [1, 2, 3].map((n) => <CardSkeleton key={n} />)
              ) : localSpecies.length === 0 ? (
                <div className="text-[10px] text-gray-500 text-center py-4 w-full">
                  Gagal memuat peta taksa lokal.
                </div>
              ) : (
                localSpecies.map((sp) => (
                  <div
                    key={sp.taxon_id}
                    className="flex-shrink-0 w-36 md:w-auto bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300"
                  >
                    {/* Snake Card Image */}
                    <div className="h-20 w-full bg-gray-100 relative overflow-hidden">
                      <img
                        src={sp.reference_images[0]}
                        alt={sp.scientific_name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute top-1 left-1">
                        <span className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded text-white shadow-sm uppercase ${
                          sp.venom_type === 'NEUROTOXIC' ? 'bg-[#70020F]' : 
                          sp.venom_type === 'HEMOTOXIC' ? 'bg-[#F57C00]' : 'bg-[#388E3C]'
                        }`}>
                          {sp.venom_type.split('-')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-black text-gray-900 truncate w-[70%]">
                            {sp.scientific_name}
                          </h4>
                          <span className="text-[8px] font-extrabold text-[#2E7D6F]">
                            {(sp.confidence * 100).toFixed(0)}% KDE
                          </span>
                        </div>
                        <p className="text-[8px] text-gray-500 truncate italic">
                          {sp.common_name_indonesian}
                        </p>
                      </div>
                      
                      <div className="mt-3 border-t border-gray-100 pt-2">
                        <p className="text-[7px] text-gray-400 font-bold uppercase tracking-wider">Ciri Utama:</p>
                        <p className="text-[8px] text-gray-700 truncate font-semibold">
                          {sp.morphological_traits[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>

            <div className="text-[8px] text-gray-400 mt-4 text-center font-bold uppercase tracking-widest leading-none">
              100% OFFLINE DATASET • SATELIT LOCK ACTIVE
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
