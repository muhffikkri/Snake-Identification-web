import React, { useState, useEffect } from 'react';
import { db, getIncidentLog, addIncidentLog, type IncidentDetails } from '../db/db';
import { useAppStore } from '../store/store';
import { Camera, Clock, Plus, Trash2, Volume2, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { logger } from '../services/logger';

interface TriageProps {
  incidentId: string;
  onNavigate: (page: string) => void;
}

export default function Triage({ incidentId, onNavigate }: TriageProps) {
  const { currentGPS, updatePendingSyncCount } = useAppStore();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [biteLocation, setBiteLocation] = useState<string>('Lengan Kanan');
  const [biteTime, setBiteTime] = useState<string>(new Date().toISOString().substring(0, 16));
  
  // Local symptoms
  const [painScale, setPainScale] = useState<number>(1);
  const [swellingGrade, setSwellingGrade] = useState<number>(0);
  const [localEffects, setLocalEffects] = useState<string[]>([]);
  
  // Systemic symptoms
  const [systemicEffects, setSystemicEffects] = useState<string[]>([]);
  
  // Vital signs
  const [hr, setHr] = useState<number>(80);
  const [bp, setBp] = useState<string>('120/80');
  const [spo2, setSpo2] = useState<number>(98);

  // Wound photos: Array<{ blob: string, timestamp: number }>
  const [woundPhotos, setWoundPhotos] = useState<Array<{ blob: string, timestamp: number }>>([]);
  
  // Severity output
  const [severityGrade, setSeverityGrade] = useState<number>(0);
  const [whoProtocol, setWhoProtocol] = useState<string[]>([]);
  const [alarmInterval, setAlarmInterval] = useState<number>(30);
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [alarmTimerSeconds, setAlarmTimerSeconds] = useState<number>(0);

  // Trigger haptic feedback
  const triggerHaptic = (duration: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  };

  const localEffectsChoices = [
    'Pendarahan Aktif', 'Nekrosis Kulit (Kulit Mati)', 'Lepuhan Cairan (Blisters)', 'Kebas/Mati Rasa Lokal'
  ];

  const neurotoxicChoices = [
    'Ptosis (Kelopak Mata Layu)', 'Sulit Menelan (Dysphagia)', 'Bicara Cadel (Dysarthria)', 'Kelemahan Otot/Kelumpuhan', 'Sesak Napas (Respiratory Failure)'
  ];

  const hemotoxicChoices = [
    'Muntah Darah (Hematemesis)', 'Gusi Berdarah', 'Memar Luas (Ecchymosis)', 'Kencing Merah (Hematuria)'
  ];

  // Load existing incident data if any
  useEffect(() => {
    const loadIncident = async () => {
      if (!incidentId) return;
      try {
        const data = await getIncidentLog(incidentId);
        if (data) {
          const { details, photos } = data;
          setBiteLocation(details.symptoms.bite_location);
          setPainScale(details.symptoms.pain_scale);
          setSwellingGrade(details.symptoms.swelling_grade);
          setLocalEffects(details.symptoms.local_effects);
          setSystemicEffects(details.symptoms.systemic_effects);
          setHr(details.symptoms.vital_signs.hr);
          setBp(details.symptoms.vital_signs.bp);
          setSpo2(details.symptoms.vital_signs.spo2);
          
          const mappedPhotos = photos.map((blob, index) => ({
            blob,
            timestamp: Date.now() - (photos.length - 1 - index) * 600000
          }));
          setWoundPhotos(mappedPhotos);
          
          logger.info('Triage', `Loaded existing incident data for triage: ${incidentId}`);
        }
      } catch (e) {
        logger.error('Triage', 'Failed to load existing incident log', e);
      }
    };
    loadIncident();
  }, [incidentId]);

  // Calculate severity grade when inputs change
  useEffect(() => {
    let grade = 0;

    const hasNeurotoxic = systemicEffects.some(e => neurotoxicChoices.includes(e));
    const hasHemotoxic = systemicEffects.some(e => hemotoxicChoices.includes(e));
    const hasSevereLocal = swellingGrade >= 3 || localEffects.includes('Nekrosis Kulit (Kulit Mati)');

    if (spo2 < 90 || systemicEffects.includes('Sesak Napas (Respiratory Failure)')) {
      grade = 4;
    } else if (hasNeurotoxic || hasHemotoxic || swellingGrade === 4) {
      grade = 3;
    } else if (hasSevereLocal || localEffects.includes('Pendarahan Aktif')) {
      grade = 2;
    } else if (painScale > 4 || swellingGrade >= 1) {
      grade = 1;
    } else {
      grade = 0;
    }

    setSeverityGrade(grade);

    const protocol = [];
    protocol.push('IMOBILISASI: Posisikan anggota tubuh yang digigit sejajar jantung, sanggah dengan bidai/kayu, lalu balut dengan perban elastis. Batasi gerakan ekstremitas secara penuh.');
    protocol.push('Dilarang keras memasang Tourniquet (ikatan ketat) karena mematikan aliran darah secara total dan memicu nekrosis kulit hebat.');
    protocol.push('Dilarang menyedot racun menggunakan mulut/alat sedot manual, menoreh luka, menyayat, memijat, maupun mengoleskan jamu tradisional.');

    if (grade === 4) {
      protocol.unshift('TINDAKAN KRITIS (Grade 4): Segera fasilitasi ventilasi oksigen & Resusitasi Jantung Paru (RJP) jika napas terengah-engah. Segera evakuasi pasien ke ICU Rumah Sakit!');
    } else if (grade === 3) {
      protocol.unshift('DARURAT SISTEMIK (Grade 3): Pasang akses infus intravena (IV) ganda. Siapkan Anti-Bisa Ular (SABU) polivalen secara darurat.');
    } else if (grade === 2) {
      protocol.unshift('RISIKO MODERAT (Grade 2): Segera rujuk ke Rumah Sakit terdekat. Siapkan observasi SABU jika gejala memburuk secara progresif.');
    } else if (grade === 1) {
      protocol.unshift('PEMANTAUAN KLINIS (Grade 1): Bersihkan luka dengan antiseptik/alkohol swab. Berikan parasetamol untuk analgesik. Pantau pembengkakan berkala.');
    } else {
      protocol.unshift('Grade 0 (Nir-Envenomasi): Observasi ketat di Puskesmas/RS selama minimal 6-12 jam. Gejala envenomasi bisa timbul terlambat.');
    }

    setWhoProtocol(protocol);

    if (grade >= 3) {
      setAlarmInterval(15);
    } else if (grade >= 1) {
      setAlarmInterval(30);
    } else {
      setAlarmInterval(60);
    }
    
    logger.info('Triage', 'Severity recalculated', { grade, alarmInterval: grade >= 3 ? 15 : grade >= 1 ? 30 : 60 });
  }, [painScale, swellingGrade, localEffects, systemicEffects, spo2]);

  // Alarm simulation trigger
  useEffect(() => {
    let intervalId: any;
    if (alarmActive && alarmTimerSeconds > 0) {
      intervalId = setInterval(() => {
        setAlarmTimerSeconds(prev => {
          if (prev <= 1) {
            triggerAlarmFeedback();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (alarmTimerSeconds === 0 && alarmActive) {
      setAlarmActive(false);
    }
    return () => clearInterval(intervalId);
  }, [alarmActive, alarmTimerSeconds]);

  const triggerAlarmFeedback = () => {
    triggerHaptic(300);
    setTimeout(() => triggerHaptic(300), 500);
    logger.warn('Triage', 'Alarm Re-Assessment Fired!');

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = (time: number, freq: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.3, time);
        osc.start(time);
        osc.stop(time + 0.18);
      };
      
      const now = audioCtx.currentTime;
      playBeep(now, 523.25);
      playBeep(now + 0.25, 523.25);
      playBeep(now + 0.5, 659.25);
    } catch (e) {
      console.log('AudioContext alarm error', e);
    }
  };

  const startSimulatedAlarm = () => {
    triggerHaptic(100);
    setAlarmTimerSeconds(10);
    setAlarmActive(true);
    logger.info('Triage', 'Simulated 10-second re-assessment alarm started');
  };

  const handleToggleLocalEffect = (effect: string) => {
    setLocalEffects(prev =>
      prev.includes(effect) ? prev.filter(x => x !== effect) : [...prev, effect]
    );
  };

  const handleToggleSystemicEffect = (effect: string) => {
    setSystemicEffects(prev =>
      prev.includes(effect) ? prev.filter(x => x !== effect) : [...prev, effect]
    );
  };

  const handleAddWoundPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          triggerHaptic(50);
          const newPhoto = {
            blob: event.target.result as string,
            timestamp: Date.now()
          };
          setWoundPhotos(prev => [...prev, newPhoto]);
          logger.info('Triage', 'Wound photograph captured chronologically', { timestamp: newPhoto.timestamp });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (index: number) => {
    triggerHaptic(50);
    setWoundPhotos(prev => prev.filter((_, i) => i !== index));
    logger.info('Triage', `Wound photograph removed at index ${index}`);
  };

  const handleSaveAssessment = async () => {
    triggerHaptic(150);
    
    let existingLog = await getIncidentLog(incidentId);
    let species_prediction: IncidentDetails['species_prediction'] = {
      primary: 'Tidak Teridentifikasi',
      risk: 'NON-VENOMOUS',
      confidence: 0,
      alternatives: []
    };

    if (existingLog) {
      species_prediction = existingLog.details.species_prediction;
    }

    const updatedDetails: IncidentDetails = {
      gps_coordinates: {
        lat: currentGPS?.lat || -6.2088,
        lng: currentGPS?.lng || 106.8456,
        accuracy: currentGPS?.accuracy || 15,
        timestamp: Date.now()
      },
      species_prediction,
      severity_assessment: {
        grade: severityGrade,
        grade_history: existingLog 
          ? [...existingLog.details.severity_assessment.grade_history, { timestamp: Date.now(), grade: severityGrade }]
          : [{ timestamp: Date.now(), grade: severityGrade }],
        who_protocol: whoProtocol
      },
      symptoms: {
        bite_location: biteLocation,
        pain_scale: painScale,
        swelling_grade: swellingGrade,
        local_effects: localEffects,
        systemic_effects: systemicEffects,
        vital_signs: { hr, bp, spo2 }
      }
    };

    const rawPhotoBlobs = woundPhotos.map(p => p.blob);
    await addIncidentLog(incidentId, updatedDetails, rawPhotoBlobs);
    await updatePendingSyncCount();

    logger.info('Triage', `Incident triage report successfully encrypted and saved to DB`, {
      incidentId,
      severityGrade
    });

    alert('Rekam Medis Triage disimpan di basis data lokal secara terenkripsi!');
    onNavigate('home');
  };

  const stepLabels = ['Konteks', 'Luka Lokal', 'Sistemik', 'Protokol WHO'];

  // Left Column Content: render form inputs based on active step
  const renderLeftColumn = () => {
    return (
      <div className="space-y-4">
        {/* Stepper progress circles */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-3 rounded-2xl shadow-inner">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;
            return (
              <button
                key={idx}
                onClick={() => {
                  triggerHaptic(50);
                  setCurrentStep(stepNum);
                }}
                className="flex flex-col items-center flex-1 relative group focus:outline-none"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border transition-all ${
                  isActive ? 'bg-[#2E7D6F] border-transparent text-white ring-4 ring-[#2E7D6F]/10' :
                  isCompleted ? 'bg-[#1E1E1E] border-transparent text-white' :
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? '✓' : stepNum}
                </div>
                <span className={`text-[8px] font-bold mt-1 uppercase tracking-wider ${
                  isActive ? 'text-[#2E7D6F]' : 'text-gray-400'
                }`}>
                  {label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step 1: Context & Location */}
        {currentStep === 1 && (
          <div className="space-y-4 step-transition">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">
                1. Lokasi & Waktu Gigitan
              </h3>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Lokasi Anatomi Gigitan:</label>
                <input
                  type="text"
                  value={biteLocation}
                  onChange={e => setBiteLocation(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#2E7D6F] transition-all"
                  placeholder="Contoh: Pergelangan Kaki Kanan"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Waktu Gigitan Ular:</label>
                <input
                  type="datetime-local"
                  value={biteTime}
                  onChange={e => setBiteTime(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#2E7D6F] transition-all"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-[10px]">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">Pembacaan Satelit GPS:</span>
                <p className="font-extrabold text-gray-900 mt-1 flex items-center gap-1.5">
                  📍 {currentGPS ? `${currentGPS.lat.toFixed(5)}, ${currentGPS.lng.toFixed(5)} (Akurasi: ${currentGPS.accuracy}m)` : 'Menunggu lock koordinat...'}
                </p>
              </div>
            </div>

            <button
              onClick={() => { triggerHaptic(50); setCurrentStep(2); }}
              className="w-full py-3 bg-[#1E1E1E] hover:bg-black text-white font-extrabold rounded-xl text-xs tracking-wider uppercase transition-transform active:scale-95 duration-200 flex items-center justify-center space-x-1"
            >
              <span>Lanjut ke Luka Lokal</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Step 2: Local wound signs */}
        {currentStep === 2 && (
          <div className="space-y-4 step-transition">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">
                2. Gejala Fisik Lokal
              </h3>

              {/* Pain Scale */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Skala Nyeri (VAS 1-10):</label>
                  <span className="text-xs font-black text-[#70020F] bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">{painScale} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={painScale}
                  onChange={e => setPainScale(Number(e.target.value))}
                  className="w-full accent-[#70020F] cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[8px] text-gray-400 font-bold uppercase tracking-wider px-1">
                  <span>Nir Nyeri</span>
                  <span>Sedang</span>
                  <span>Hebat</span>
                </div>
              </div>

              {/* Swelling Grade */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pembengkakan (Swelling):</label>
                  <span className="text-xs font-black text-[#2E7D6F] bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full">Grade {swellingGrade}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 1, 2, 3, 4].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => { triggerHaptic(50); setSwellingGrade(g); }}
                      className={`py-2 rounded-lg border text-center font-bold text-xs transition-all ${
                        swellingGrade === g
                          ? 'bg-[#2E7D6F] border-transparent text-white font-black shadow-sm'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      G{g}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-gray-500 font-semibold italic leading-normal">
                  {swellingGrade === 0 && 'G0: Tidak ada pembengkakan'}
                  {swellingGrade === 1 && 'G1: Terbatas di daerah sekitar gigitan'}
                  {swellingGrade === 2 && 'G2: Meluas sampai setengah ekstremitas'}
                  {swellingGrade === 3 && 'G3: Meluas ke seluruh ekstremitas'}
                  {swellingGrade === 4 && 'G4: Menjalar melewati ekstremitas ke arah tubuh utama'}
                </p>
              </div>

              {/* Local effects checklist */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Kondisi Luka Lainnya:</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {localEffectsChoices.map(eff => (
                    <label
                      key={eff}
                      className={`flex items-center space-x-2.5 p-2.5 border rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                        localEffects.includes(eff) ? 'border-[#1E1E1E] bg-[#1E1E1E]/5' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={localEffects.includes(eff)}
                        onChange={() => handleToggleLocalEffect(eff)}
                        className="text-[#2E7D6F] focus:ring-[#2E7D6F] rounded h-4 w-4"
                      />
                      <span>{eff}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => { triggerHaptic(50); setCurrentStep(1); }}
                className="w-1/3 py-2.5 border border-gray-300 font-bold rounded-xl text-xs bg-white text-gray-700 hover:bg-gray-50"
              >
                Kembali
              </button>
              <button
                onClick={() => { triggerHaptic(50); setCurrentStep(3); }}
                className="w-2/3 py-2.5 bg-[#1E1E1E] hover:bg-black text-white font-extrabold rounded-xl text-xs tracking-wider uppercase flex items-center justify-center space-x-1"
              >
                <span>Lanjut ke Sistemik</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Systemic symptoms */}
        {currentStep === 3 && (
          <div className="space-y-4 step-transition">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">
                3. Gejala Sistemik & Vital
              </h3>

              {/* Neurotoxic */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-[#70020F] font-black uppercase tracking-wider block">A. Efek Neurotoksik (Saraf/Kelumpuhan):</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {neurotoxicChoices.map(nt => (
                    <label
                      key={nt}
                      className={`flex items-center space-x-2.5 p-2.5 border rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                        systemicEffects.includes(nt) ? 'border-[#70020F] bg-[#70020F]/5' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={systemicEffects.includes(nt)}
                        onChange={() => handleToggleSystemicEffect(nt)}
                        className="text-[#70020F] focus:ring-[#70020F] rounded h-4 w-4"
                      />
                      <span>{nt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Hemotoxic */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <span className="text-[9px] text-[#F57C00] font-black uppercase tracking-wider block">B. Efek Hemotoksik (Pendarahan/Darah):</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {hemotoxicChoices.map(ht => (
                    <label
                      key={ht}
                      className={`flex items-center space-x-2.5 p-2.5 border rounded-lg cursor-pointer text-xs font-semibold transition-all ${
                        systemicEffects.includes(ht) ? 'border-[#F57C00] bg-[#F57C00]/5' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={systemicEffects.includes(ht)}
                        onChange={() => handleToggleSystemicEffect(ht)}
                        className="text-[#F57C00] focus:ring-[#F57C00] rounded h-4 w-4"
                      />
                      <span>{ht}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vital Signs */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-[9px] text-[#2E7D6F] font-black uppercase tracking-wider block">C. Tanda Vital Pasien:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 text-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <label className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">HR (bpm)</label>
                    <input
                      type="number"
                      value={hr}
                      onChange={e => setHr(Number(e.target.value))}
                      className="w-full text-center py-1 bg-white border border-gray-300 rounded font-black text-xs text-[#1E1E1E]"
                    />
                  </div>
                  <div className="space-y-1 text-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <label className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">BP (mmHg)</label>
                    <input
                      type="text"
                      value={bp}
                      onChange={e => setBp(e.target.value)}
                      className="w-full text-center py-1 bg-white border border-gray-300 rounded font-black text-xs text-[#1E1E1E]"
                    />
                  </div>
                  <div className="space-y-1 text-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <label className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">SpO2 (%)</label>
                    <input
                      type="number"
                      value={spo2}
                      onChange={e => setSpo2(Number(e.target.value))}
                      className="w-full text-center py-1 bg-white border border-gray-300 rounded font-black text-xs text-[#1E1E1E]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => { triggerHaptic(50); setCurrentStep(2); }}
                className="w-1/3 py-2.5 border border-gray-300 font-bold rounded-xl text-xs bg-white text-gray-700 hover:bg-gray-50"
              >
                Kembali
              </button>
              <button
                onClick={() => { triggerHaptic(50); setCurrentStep(4); }}
                className="w-2/3 py-2.5 bg-[#1E1E1E] hover:bg-black text-white font-extrabold rounded-xl text-xs tracking-wider uppercase flex items-center justify-center space-x-1"
              >
                <span>Lihat Protokol WHO</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Right Column Content: always visible on iPad/Desktop, only visible on Step 4 on Mobile
  const renderRightColumn = () => {
    return (
      <div className="space-y-4">
        {/* Severity Card */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-[#1E1E1E] text-white px-4 py-3 flex items-center justify-between border-b border-gray-800">
            <span className="text-[9px] font-black uppercase tracking-wider">Triage Envenomasi</span>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded text-white shadow-sm border border-white/20 uppercase ${
              severityGrade >= 3 ? 'bg-[#70020F]' : 
              severityGrade === 2 ? 'bg-[#F57C00]' : 'bg-[#388E3C]'
            }`}>
              Grade {severityGrade}
            </span>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Visual indicator of severity */}
            <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 p-3 rounded-xl">
              <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/30 ${
                severityGrade === 4 ? 'bg-[#70020F] animate-ping' :
                severityGrade === 3 ? 'bg-[#70020F]' :
                severityGrade === 2 ? 'bg-[#F57C00]' :
                severityGrade === 1 ? 'bg-[#388E3C]' : 'bg-gray-400'
              }`} />
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide leading-none">
                  {severityGrade === 0 && 'Nir-Envenomasi'}
                  {severityGrade === 1 && 'Ringan (Mild Local)'}
                  {severityGrade === 2 && 'Sedang (Moderate Local)'}
                  {severityGrade === 3 && 'Berat (Severe Systemic)'}
                  {severityGrade === 4 && 'Mengancam Jiwa (Life Threatening)'}
                </h4>
                <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Status Kritis Gigitan Ular</p>
              </div>
            </div>

            {/* WHO Treatment Protocol */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">PROSEDUR PENANGANAN MEDIS (WHO):</span>
              <div className="bg-[#1E1E1E] text-white rounded-xl p-3.5 space-y-2 text-xs leading-relaxed font-semibold">
                {whoProtocol.map((line, idx) => {
                  const isWarning = line.includes('Dilarang') || line.includes('CRITICAL') || line.includes('DARURAT') || line.includes('TINDAKAN KRITIS');
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-[10px] ${
                        isWarning 
                          ? 'bg-[#70020F]/20 border border-[#70020F]/30 text-red-200' 
                          : 'bg-white/5 border border-white/10 text-gray-200'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active periodic assessment timer */}
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#2E7D6F]" />
                <div>
                  <span className="font-extrabold text-gray-900 block leading-none text-[10px] uppercase">Re-Assessment Timer</span>
                  <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wide">Observasi Tiap {alarmInterval} Menit</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {alarmTimerSeconds > 0 ? (
                  <span className="font-mono font-black text-[#70020F] text-sm bg-white border border-gray-300 px-2 py-0.5 rounded shadow-sm">
                    00:{alarmTimerSeconds.toString().padStart(2, '0')}
                  </span>
                ) : (
                  <button
                    onClick={startSimulatedAlarm}
                    className="px-2 py-1.5 bg-[#2E7D6F] hover:bg-[#5A9A8F] text-white text-[9px] font-black rounded shadow active:scale-95 transition-all flex items-center space-x-1 uppercase"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Beep (10s)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Periodic Chronological Wound Photography logging */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-2 border-gray-100">
            <div className="flex items-center space-x-1">
              <Camera className="w-4 h-4 text-[#2E7D6F]" />
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Histori Progresi Foto Luka</span>
            </div>
            <span className="text-[8px] text-gray-400 font-bold uppercase">CHRONOLOGICAL BASELINE</span>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {woundPhotos.map((photo, index) => {
              const dateLabel = new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return (
                <div key={index} className="relative aspect-square border border-gray-200 rounded-lg bg-gray-50 overflow-hidden group shadow-sm">
                  <img src={photo.blob} alt={`wound-${index}`} className="object-cover w-full h-full" />
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-0.5 right-0.5 bg-[#70020F] text-white rounded-full p-0.5 hover:bg-red-800 transition-colors shadow-md"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 text-[7px] bg-[#1E1E1E]/80 text-[#FAFAFA] py-0.5 text-center font-bold truncate">
                    {dateLabel}
                  </div>
                </div>
              );
            })}
            
            <label className="aspect-square border border-dashed border-gray-300 hover:border-gray-400 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer bg-gray-50 text-gray-500 transition-colors">
              <Plus className="w-5 h-5 text-gray-400" />
              <span className="text-[8px] font-black text-gray-500 uppercase mt-0.5">Ambil Foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAddWoundPhoto}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Action buttons (only displayed here on Desktop view) */}
        <div className="hidden md:flex space-x-2 pt-2">
          <button
            onClick={handleSaveAssessment}
            className="w-full py-3 bg-[#2E7D6F] hover:bg-[#5A9A8F] text-white font-extrabold rounded-xl text-xs tracking-wider uppercase flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-transform"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan Rekam Medis</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-[640px] bg-white text-[#1E1E1E] p-4 md:p-8">
      
      {/* Header bar inside */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
        <button
          onClick={() => onNavigate('home')}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1"
        >
          ← Beranda
        </button>
        <span className="text-sm font-black uppercase tracking-wider">Triage Klinis WHO</span>
        <div className="w-10"></div>
      </div>

      {/* Main Container splits into 2-column on screens >= 768px (iPad/Desktop) */}
      <div className="flex-1 flex flex-col justify-start">
        
        {/* Responsive Grid layout */}
        <div className="md:grid md:grid-cols-12 md:gap-8 md:items-start flex-1 flex flex-col justify-start">
          
          {/* LEFT COLUMN: Stepper form (Steps 1, 2, 3) */}
          <div className="md:col-span-6 w-full flex flex-col justify-start">
            {/* On mobile: show step 1, 2, 3 or 4. On desktop: step 4 is displayed live on the right, so on the left we only display steps 1, 2, 3 */}
            {(currentStep < 4 || !window.matchMedia('(min-width: 768px)').matches) ? (
              renderLeftColumn()
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl shadow-sm text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#2E7D6F]/10 text-[#2E7D6F] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-900">Formulir Triase Selesai</h3>
                <p className="text-xs text-gray-500 leading-normal">
                  Rincian triase pasien dan instruksi darurat WHO telah diperbarui secara langsung di kolom kanan. 
                  Gunakan tombol simpan untuk merekam data secara terenkripsi.
                </p>
                <button
                  onClick={() => { triggerHaptic(50); setCurrentStep(1); }}
                  className="px-4 py-2 border border-gray-300 text-[10px] font-black rounded-lg text-gray-700 bg-white hover:bg-gray-50 uppercase"
                >
                  Ubah Data Gejala
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Results, Protocols & Photos (Always live on Desktop/iPad, step 4 only on mobile) */}
          <div className="md:col-span-6 w-full mt-6 md:mt-0 flex flex-col justify-start">
            {(currentStep === 4 || window.matchMedia('(min-width: 768px)').matches) ? (
              renderRightColumn()
            ) : (
              <div className="hidden md:block bg-gray-50 border border-dashed border-gray-300 p-8 rounded-2xl text-center text-gray-400 text-xs">
                Mengisi kuesioner gejala di sebelah kiri akan menghitung tingkat keparahan triage secara real-time.
              </div>
            )}

            {/* Save button fallback only visible on mobile step 4 */}
            {currentStep === 4 && (
              <div className="md:hidden flex space-x-2 pt-4">
                <button
                  onClick={() => { triggerHaptic(50); setCurrentStep(3); }}
                  className="w-1/3 py-3 border border-gray-300 font-bold rounded-lg text-xs bg-white text-gray-700 uppercase tracking-wider"
                >
                  Kembali
                </button>
                <button
                  onClick={handleSaveAssessment}
                  className="w-2/3 py-3 bg-[#2E7D6F] hover:bg-[#5A9A8F] text-white font-extrabold rounded-lg text-xs tracking-wider uppercase flex items-center justify-center space-x-1.5 shadow"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Rekam Medis</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
