import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Triage from '../components/Triage';

// Mock DB module
vi.mock('../db/db', () => {
  return {
    db: {
      incidents: {
        add: vi.fn().mockResolvedValue(true),
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            count: vi.fn().mockResolvedValue(0)
          })
        })
      }
    },
    addIncidentLog: vi.fn().mockResolvedValue(true),
    getIncidentLog: vi.fn().mockResolvedValue(null)
  };
});

describe('Triage Component', () => {
  const mockOnNavigate = vi.fn();
  const mockIncidentId = 'inc_12345';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stepper header and Context step inputs', () => {
    render(<Triage incidentId={mockIncidentId} onNavigate={mockOnNavigate} />);

    expect(screen.getByText('1. Lokasi & Waktu Gigitan')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contoh: Pergelangan Kaki Kanan')).toBeInTheDocument();
  });

  it('navigates through step 2 and checks swelling grade and pain score inputs', () => {
    render(<Triage incidentId={mockIncidentId} onNavigate={mockOnNavigate} />);

    // Click next step button
    const nextBtn = screen.getByRole('button', { name: /Lanjut ke Luka Lokal/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('2. Gejala Fisik Lokal')).toBeInTheDocument();
    expect(screen.getByText('Skala Nyeri (VAS 1-10):')).toBeInTheDocument();
    expect(screen.getByText('Pembengkakan (Swelling):')).toBeInTheDocument();
  });

  it('calculates severity Grade 0 when no symptoms are present', () => {
    render(<Triage incidentId={mockIncidentId} onNavigate={mockOnNavigate} />);

    // Go to step 4 directly (protocol step) to verify severity
    // Click step button in header (item 4 is index 3)
    const stepButtons = screen.getAllByRole('button');
    // Button 4 is "WHO" or "Protokol"
    const step4Btn = stepButtons.find(btn => btn.textContent?.includes('Protokol') || btn.textContent?.includes('4'));
    if (step4Btn) {
      fireEvent.click(step4Btn);
    }

    expect(screen.getByText('Grade 0')).toBeInTheDocument();
    expect(screen.getAllByText(/Nir-Envenomasi/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Dilarang keras memasang Tourniquet/i)).toBeInTheDocument();
  });

  it('calculates Grade 4 and displays warning for respiratory failure', async () => {
    render(<Triage incidentId={mockIncidentId} onNavigate={mockOnNavigate} />);

    // Navigate to step 3 (Systemic symptoms)
    const stepButtons = screen.getAllByRole('button');
    const step3Btn = stepButtons.find(btn => btn.textContent?.includes('Sistemik') || btn.textContent?.includes('3'));
    if (step3Btn) {
      fireEvent.click(step3Btn);
    }

    expect(screen.getByText('3. Gejala Sistemik & Vital')).toBeInTheDocument();

    // Check "Sesak Napas (Respiratory Failure)" checkbox
    const respiratoryCheckbox = screen.getByLabelText(/Sesak Napas/i);
    fireEvent.click(respiratoryCheckbox);

    // Go to step 4
    const step4Btn = stepButtons.find(btn => btn.textContent?.includes('Protokol') || btn.textContent?.includes('4'));
    if (step4Btn) {
      fireEvent.click(step4Btn);
    }

    expect(screen.getByText('Grade 4')).toBeInTheDocument();
    expect(screen.getByText(/Mengancam Jiwa/i)).toBeInTheDocument();
    expect(screen.getByText(/TINDAKAN KRITIS/i)).toBeInTheDocument();
  });
});
