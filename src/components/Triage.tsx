import React, { useState, useEffect } from 'react';
import { db, getIncidentLog, addIncidentLog, type IncidentDetails } from '../db/db';
import { useAppStore } from '../store/store';
import { Camera, Clock, Plus, Trash2, Volume2, CheckCircle2, ChevronRight, Check, MapPin } from 'lucide-react';
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

  const [painScale, setPainScale] = useState<number>(1);
  const [swellingGrade, setSwellingGrade] = useState<number>(0);
  const [localEffects, setLocalEffects] = useState<string[]>([]);

  const [systemicEffects, setSystemicEffects] = useState<string[]>([]);

  const [hr, setHr] = useState<number>(80);
  const [bp, setBp] = useState<string>('120/80');
  const [spo2, setSpo2] = useState<number>(98);

  const [woundPhotos, setWoundPhotos] = useState<Array<{ blob: string, timestamp: number }>>([]);

  const [severityGrade, setSeverityGrade] = useState<number>(0);
  const [whoProtocol, setWhoProtocol] = useState<string[]>([]);
  const [alarmInterval, setAlarmInterval] = useState<number>(30);
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [alarmTimerSeconds, setAlarmTimerSeconds] = useState<number>(0);

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

  const severityGradeChip = () => {
    if (severityGrade >= 3) return <span className="chip chip-neuro">Grade {severityGrade}</span>;
    if (severityGrade === 2) return <span className="chip chip-hemo">Grade {severityGrade}</span>;
    return <span className="chip chip-safe">Grade {severityGrade}</span>;
  };

  const renderLeftColumn = () => {
    return (
      <div className="space-y-4">
        <div className="panel flex items-center justify-between p-3">
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
                aria-label={`Langkah ${stepNum}: ${label}`}
                aria-current={isActive ? 'step' : undefined}
                className="flex flex-1 flex-col items-center py-1.5"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                    isActive
                      ? 'border-transparent bg-[#2E7D6F] text-white'
                      : isCompleted
                        ? 'border-transparent bg-[#1E1E1E] text-white'
                        : 'border-[color:var(--line)] bg-white text-[#5B5B5B]'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    stepNum
                  )}
                </span>
                <span
                  className={`mt-1 text-[11px] font-bold ${
                    isActive ? 'text-[#2E7D6F]' : 'text-[#5B5B5B]'
                  }`}
                >
                  {label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {currentStep === 1 && (
          <div className="step-transition space-y-4">
            <div className="panel space-y-4 p-4">
              <h3 className="border-b border-[color:var(--line)] pb-2 text-sm font-extrabold">
                1. Lokasi &amp; Waktu Gigitan
              </h3>

              <div className="space-y-1">
                <label htmlFor="bite-location" className="block text-xs font-bold text-[#5B5B5B]">
                  Lokasi anatomi gigitan
                </label>
                <input
                  id="bite-location"
                  type="text"
                  value={biteLocation}
                  onChange={e => setBiteLocation(e.target.value)}
                  className="field"
                  placeholder="Contoh: Pergelangan Kaki Kanan"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="bite-time" className="block text-xs font-bold text-[#5B5B5B]">
                  Waktu gigitan ular
                </label>
                <input
                  id="bite-time"
                  type="datetime-local"
                  value={biteTime}
                  onChange={e => setBiteTime(e.target.value)}
                  className="field"
                />
              </div>

              <div className="border border-[color:var(--line)] bg-[#F5F5F5] p-3">
                <p className="eyebrow">Pembacaan satelit GPS</p>
                <p className="mt-1.5 flex items-start gap-2 text-sm font-bold text-[#3D3D3D]">
                  <MapPin className="mt-0.5 h-4 w-4 flex-none text-[#2E7D6F]" aria-hidden="true" />
                  {currentGPS
                    ? `${currentGPS.lat.toFixed(5)}, ${currentGPS.lng.toFixed(5)} (Akurasi: ${currentGPS.accuracy}m)`
                    : 'Menunggu lock koordinat...'}
                </p>
              </div>
            </div>

            <button
              onClick={() => { triggerHaptic(50); setCurrentStep(2); }}
              className="flex w-full items-center justify-center gap-1 bg-[#1E1E1E] py-3 text-sm font-bold text-white hover:bg-black"
            >
              <span>Lanjut ke Luka Lokal</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="step-transition space-y-4">
            <div className="panel space-y-4 p-4">
              <h3 className="border-b border-[color:var(--line)] pb-2 text-sm font-extrabold">
                2. Gejala Fisik Lokal
              </h3>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="pain-scale" className="text-xs font-bold text-[#5B5B5B]">
                    Skala Nyeri (VAS 1-10):
                  </label>
                  <span className="chip chip-neuro">{painScale} / 10</span>
                </div>
                <input
                  id="pain-scale"
                  type="range"
                  min="1"
                  max="10"
                  value={painScale}
                  onChange={e => setPainScale(Number(e.target.value))}
                  className="w-full accent-[#70020F]"
                />
                <div className="flex justify-between text-[11px] font-medium text-[#5B5B5B]">
                  <span>Nir nyeri</span>
                  <span>Sedang</span>
                  <span>Hebat</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#5B5B5B]">Pembengkakan (Swelling):</label>
                  <span className="chip chip-info">Grade {swellingGrade}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Grade pembengkakan">
                  {[0, 1, 2, 3, 4].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => { triggerHaptic(50); setSwellingGrade(g); }}
                      aria-pressed={swellingGrade === g}
                      className={`py-2 text-xs font-bold ${
                        swellingGrade === g
                          ? 'bg-[#2E7D6F] text-white'
                          : 'border border-[color:var(--line)] bg-white hover:bg-[#F5F5F5]'
                      }`}
                    >
                      G{g}
                    </button>
                  ))}
                </div>
                <p className="text-xs font-medium leading-relaxed text-[#5B5B5B]">
                  {swellingGrade === 0 && 'G0: Tidak ada pembengkakan'}
                  {swellingGrade === 1 && 'G1: Terbatas di daerah sekitar gigitan'}
                  {swellingGrade === 2 && 'G2: Meluas sampai setengah ekstremitas'}
                  {swellingGrade === 3 && 'G3: Meluas ke seluruh ekstremitas'}
                  {swellingGrade === 4 && 'G4: Menjalar melewati ekstremitas ke arah tubuh utama'}
                </p>
              </div>

              <fieldset className="space-y-1.5 border-t border-[color:var(--line)] pt-3">
                <legend className="text-xs font-bold text-[#5B5B5B]">Kondisi luka lainnya</legend>
                {localEffectsChoices.map(eff => (
                  <label
                    key={eff}
                    className={`flex cursor-pointer items-center gap-2.5 border p-2.5 text-xs font-semibold ${
                      localEffects.includes(eff)
                        ? 'border-[#1E1E1E] bg-[#1E1E1E]/5'
                        : 'border-[color:var(--line)] hover:border-[#5B5B5B]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={localEffects.includes(eff)}
                      onChange={() => handleToggleLocalEffect(eff)}
                      className="h-4 w-4 accent-[#2E7D6F]"
                    />
                    <span>{eff}</span>
                  </label>
                ))}
              </fieldset>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { triggerHaptic(50); setCurrentStep(1); }}
                className="w-1/3 border border-[color:var(--line)] py-2.5 text-xs font-bold text-[#1E1E1E] hover:bg-[#F5F5F5]"
              >
                Kembali
              </button>
              <button
                onClick={() => { triggerHaptic(50); setCurrentStep(3); }}
                className="flex w-2/3 items-center justify-center gap-1 bg-[#1E1E1E] py-2.5 text-xs font-bold text-white hover:bg-black"
              >
                <span>Lanjut ke Sistemik</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="step-transition space-y-4">
            <div className="panel space-y-4 p-4">
              <h3 className="border-b border-[color:var(--line)] pb-2 text-sm font-extrabold">
                3. Gejala Sistemik &amp; Vital
              </h3>

              <div className="space-y-1.5">
                <p className="eyebrow text-[#70020F]">Efek neurotoksik (saraf/kelumpuhan)</p>
                {neurotoxicChoices.map(nt => (
                  <label
                    key={nt}
                    className={`flex cursor-pointer items-center gap-2.5 border p-2.5 text-xs font-semibold ${
                      systemicEffects.includes(nt)
                        ? 'border-[#70020F] bg-[#70020F]/5'
                        : 'border-[color:var(--line)] hover:border-[#5B5B5B]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={systemicEffects.includes(nt)}
                      onChange={() => handleToggleSystemicEffect(nt)}
                      className="h-4 w-4 accent-[#70020F]"
                    />
                    <span>{nt}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1.5 border-t border-[color:var(--line)] pt-3">
                <p className="eyebrow text-[#8A4B00]">Efek hemotoksik (pendarahan/darah)</p>
                {hemotoxicChoices.map(ht => (
                  <label
                    key={ht}
                    className={`flex cursor-pointer items-center gap-2.5 border p-2.5 text-xs font-semibold ${
                      systemicEffects.includes(ht)
                        ? 'border-[#F57C00] bg-[#F57C00]/10'
                        : 'border-[color:var(--line)] hover:border-[#5B5B5B]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={systemicEffects.includes(ht)}
                      onChange={() => handleToggleSystemicEffect(ht)}
                      className="h-4 w-4 accent-[#F57C00]"
                    />
                    <span>{ht}</span>
                  </label>
                ))}
              </div>

              <fieldset className="space-y-2 border-t border-[color:var(--line)] pt-3">
                <legend className="eyebrow text-[#2E7D6F]">Tanda vital pasien</legend>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 text-center">
                    <label htmlFor="vital-hr" className="block text-[11px] font-bold text-[#5B5B5B]">
                      HR (bpm)
                    </label>
                    <input
                      id="vital-hr"
                      type="number"
                      value={hr}
                      onChange={e => setHr(Number(e.target.value))}
                      className="field text-center"
                    />
                  </div>
                  <div className="space-y-1 text-center">
                    <label htmlFor="vital-bp" className="block text-[11px] font-bold text-[#5B5B5B]">
                      BP (mmHg)
                    </label>
                    <input
                      id="vital-bp"
                      type="text"
                      value={bp}
                      onChange={e => setBp(e.target.value)}
                      className="field text-center"
                    />
                  </div>
                  <div className="space-y-1 text-center">
                    <label htmlFor="vital-spo2" className="block text-[11px] font-bold text-[#5B5B5B]">
                      SpO2 (%)
                    </label>
                    <input
                      id="vital-spo2"
                      type="number"
                      value={spo2}
                      onChange={e => setSpo2(Number(e.target.value))}
                      className="field text-center"
                    />
                  </div>
                </div>
              </fieldset>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { triggerHaptic(50); setCurrentStep(2); }}
                className="w-1/3 border border-[color:var(--line)] py-2.5 text-xs font-bold text-[#1E1E1E] hover:bg-[#F5F5F5]"
              >
                Kembali
              </button>
              <button
                onClick={() => { triggerHaptic(50); setCurrentStep(4); }}
                className="flex w-2/3 items-center justify-center gap-1 bg-[#1E1E1E] py-2.5 text-xs font-bold text-white hover:bg-black"
              >
                <span>Lihat Protokol WHO</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRightColumn = () => {
    return (
      <div className="space-y-4">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-3">
            <span className="text-sm font-extrabold">Triage envenomasi</span>
            {severityGradeChip()}
          </div>

          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3 border border-[color:var(--line)] bg-[#F5F5F5] p-3">
              <span
                className={`h-3.5 w-3.5 flex-none rounded-full border ${
                  severityGrade === 4 ? 'bg-[#70020F]' :
                  severityGrade === 3 ? 'bg-[#70020F]' :
                  severityGrade === 2 ? 'bg-[#F57C00]' :
                  severityGrade === 1 ? 'bg-[#388E3C]' : 'bg-[#9E9E9E]'
                }`}
                aria-hidden="true"
              />
              <div>
                <h4 className="text-sm font-extrabold leading-none">
                  {severityGrade === 0 && 'Nir-Envenomasi'}
                  {severityGrade === 1 && 'Ringan (Mild Local)'}
                  {severityGrade === 2 && 'Sedang (Moderate Local)'}
                  {severityGrade === 3 && 'Berat (Severe Systemic)'}
                  {severityGrade === 4 && 'Mengancam Jiwa (Life Threatening)'}
                </h4>
                <p className="mt-1.5 text-xs font-medium text-[#5B5B5B]">Status kritis gigitan ular</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="eyebrow">Prosedur penanganan medis (WHO)</p>
              <ol className="space-y-2">
                {whoProtocol.map((line, idx) => {
                  const isWarning = line.includes('Dilarang') || line.includes('CRITICAL') || line.includes('DARURAT') || line.includes('TINDAKAN KRITIS');
                  return (
                    <li
                      key={idx}
                      className={`border p-2.5 text-xs font-medium leading-relaxed ${
                        isWarning
                          ? 'border-[#70020F]/25 bg-[#70020F]/5 text-[#70020F]'
                          : 'border-[color:var(--line)] text-[#3D3D3D]'
                      }`}
                    >
                      {line}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="flex items-center justify-between border border-[color:var(--line)] p-3">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-[#2E7D6F]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-extrabold leading-none">Re-assessment timer</p>
                  <p className="mt-1 text-[11px] font-medium text-[#5B5B5B]">
                    Observasi tiap {alarmInterval} menit
                  </p>
                </div>
              </div>

              {alarmTimerSeconds > 0 ? (
                <span className="font-mono text-sm font-extrabold text-[#70020F]">
                  00:{alarmTimerSeconds.toString().padStart(2, '0')}
                </span>
              ) : (
                <button
                  onClick={startSimulatedAlarm}
                  className="flex items-center gap-1.5 bg-[#2E7D6F] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#256a5e]"
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Beep (10 detik)
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="panel space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-[color:var(--line)] pb-2">
            <div className="flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-[#2E7D6F]" aria-hidden="true" />
              <span className="text-sm font-extrabold">Histori progresi foto luka</span>
            </div>
            <span className="text-[11px] font-medium text-[#5B5B5B]">Pencatatan berkala</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {woundPhotos.map((photo, index) => {
              const dateLabel = new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return (
                <div key={index} className="relative aspect-square overflow-hidden border border-[color:var(--line)] bg-[#F0F0F0]">
                  <img src={photo.blob} alt={`Foto luka ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    aria-label={`Hapus foto luka ${index + 1}`}
                    className="absolute right-0.5 top-0.5 bg-[#70020F] p-1 text-white hover:bg-[#8b0313]"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <span className="absolute inset-x-0 bottom-0 truncate bg-[#1E1E1E]/80 px-1 py-0.5 text-center text-[10px] font-bold text-white">
                    {dateLabel}
                  </span>
                </div>
              );
            })}

            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center border border-dashed border-[#5B5B5B] text-center text-[#5B5B5B] hover:border-[#1E1E1E]">
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span className="mt-1 text-[11px] font-bold">Ambil Foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAddWoundPhoto}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="hidden pt-2 md:flex">
          <button
            onClick={handleSaveAssessment}
            className="flex w-full items-center justify-center gap-1.5 bg-[#2E7D6F] py-3 text-sm font-bold text-white hover:bg-[#256a5e]"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Simpan Rekam Medis
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-[640px] flex-col bg-white p-4 text-[#1E1E1E] md:p-8">
      <div className="mb-4 flex items-center justify-between border-b border-[color:var(--line)] pb-3">
        <button
          onClick={() => onNavigate('home')}
          className="border border-[color:var(--line)] px-2.5 py-1.5 text-xs font-bold text-[#5B5B5B] hover:text-[#1E1E1E]"
        >
          Beranda
        </button>
        <h1 className="text-sm font-extrabold">Triage Klinis WHO</h1>
        <div className="w-10" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col justify-start">
        <div className="flex flex-1 flex-col justify-start md:grid md:grid-cols-12 md:items-start md:gap-8">
          <div className="flex w-full flex-col justify-start md:col-span-6">
            {(currentStep < 4 || !window.matchMedia('(min-width: 768px)').matches) ? (
              renderLeftColumn()
            ) : (
              <div className="panel space-y-4 p-6 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-[#2E7D6F]" aria-hidden="true" />
                <h3 className="text-sm font-extrabold">Formulir triase selesai</h3>
                <p className="text-xs font-medium leading-relaxed text-[#5B5B5B]">
                  Rincian triase pasien dan instruksi darurat WHO ditampilkan di panel sebelah kanan.
                  Gunakan tombol simpan untuk merekam data secara terenkripsi.
                </p>
                <button
                  onClick={() => { triggerHaptic(50); setCurrentStep(1); }}
                  className="border border-[color:var(--line)] px-4 py-2 text-xs font-bold text-[#1E1E1E] hover:bg-[#F5F5F5]"
                >
                  Ubah data gejala
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex w-full flex-col justify-start md:col-span-6 md:mt-0">
            {(currentStep === 4 || window.matchMedia('(min-width: 768px)').matches) ? (
              renderRightColumn()
            ) : (
              <div className="hidden border border-dashed border-[#5B5B5B]/40 p-8 text-center text-xs font-medium text-[#5B5B5B] md:block">
                Mengisi kuesioner gejala di sebelah kiri akan menghitung tingkat keparahan triage secara real-time.
              </div>
            )}

            {currentStep === 4 && (
              <div className="mt-4 flex gap-2 md:hidden">
                <button
                  onClick={() => { triggerHaptic(50); setCurrentStep(3); }}
                  className="w-1/3 border border-[color:var(--line)] py-3 text-xs font-bold text-[#1E1E1E] hover:bg-[#F5F5F5]"
                >
                  Kembali
                </button>
                <button
                  onClick={handleSaveAssessment}
                  className="flex w-2/3 items-center justify-center gap-1.5 bg-[#2E7D6F] py-3 text-xs font-bold text-white hover:bg-[#256a5e]"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Simpan Rekam Medis
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}