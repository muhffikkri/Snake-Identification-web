import { describe, it, expect } from 'vitest';
import { gradeFromSymptoms, SEVERITY, VENOM, ALWAYS_DO, NEVER_DO, recheckInterval } from '../lib/clinical';
import { REGIONS, regionAt, nearestRegion } from '../lib/regions';

describe('severity grading', () => {
  const base = { swellingGrade: 0, painScale: 1, localEffects: [], systemicEffects: [], spo2: 98 };

  it('grades no envenoming when nothing is recorded', () => {
    expect(gradeFromSymptoms(base)).toBe(0);
  });

  it('grades mild on pain or first-degree swelling', () => {
    expect(gradeFromSymptoms({ ...base, painScale: 6 })).toBe(1);
    expect(gradeFromSymptoms({ ...base, swellingGrade: 1 })).toBe(1);
  });

  it('grades moderate on active bleeding', () => {
    expect(gradeFromSymptoms({ ...base, localEffects: ['Active bleeding'] })).toBe(2);
  });

  it('grades severe on any systemic sign', () => {
    expect(gradeFromSymptoms({ ...base, systemicEffects: ['Drooping eyelid'] })).toBe(3);
    expect(gradeFromSymptoms({ ...base, systemicEffects: ['Vomiting blood'] })).toBe(3);
  });

  it('grades life threatening on breathing difficulty or low SpO2', () => {
    expect(gradeFromSymptoms({ ...base, systemicEffects: ['Difficulty breathing'] })).toBe(4);
    expect(gradeFromSymptoms({ ...base, spo2: 85 })).toBe(4);
  });

  it('prioritises the highest grade when several apply', () => {
    expect(
      gradeFromSymptoms({ ...base, painScale: 9, swellingGrade: 4, spo2: 82, systemicEffects: ['Difficulty breathing'] }),
    ).toBe(4);
  });
});

describe('clinical guidance', () => {
  it('always bans the tourniquet and never recommends it', () => {
    expect(NEVER_DO.join(' ')).toMatch(/tourniquet/i);
    expect(ALWAYS_DO.join(' ')).not.toMatch(/tourniquet/i);
  });

  it('always covers immobilisation', () => {
    expect(ALWAYS_DO.join(' ')).toMatch(/immobili/i);
  });

  it('gives every grade a distinct action', () => {
    const actions = ([0, 1, 2, 3, 4] as const).map((g) => SEVERITY[g].action);
    expect(new Set(actions).size).toBe(5);
  });

  it('shortens the recheck interval as the grade rises', () => {
    expect(recheckInterval(0)).toBeGreaterThan(recheckInterval(3));
  });

  it('labels every venom class in words, not colour alone', () => {
    expect(VENOM.NEUROTOXIC.label).toBe('Neurotoxic');
    expect(VENOM.HEMOTOXIC.label).toBe('Hemotoxic');
    expect(VENOM['NON-VENOMOUS'].label).toBe('Non-venomous');
  });
});

describe('region lookup', () => {
  it('resolves a coordinate inside a known region', () => {
    expect(regionAt(-7.2575, 112.7521)?.id).toBe('java');
    expect(regionAt(-4.5, 137)?.id).toBe('papua');
  });

  it('returns null outside every polygon', () => {
    expect(regionAt(-2.5, 60)).toBeNull();
  });

  it('falls back to the nearest region rather than nothing', () => {
    expect(nearestRegion(-2.5, 60).id).toBeDefined();
  });

  it('gives every region an id and a name', () => {
    expect(REGIONS).toHaveLength(7);
    for (const region of REGIONS) {
      expect(region.id).toBeTruthy();
      expect(region.name).toBeTruthy();
      expect(region.outline.length).toBeGreaterThan(3);
    }
  });
});