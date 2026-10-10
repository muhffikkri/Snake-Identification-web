import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../components/Home';
import { useAppStore } from '../store/store';

// Home loads species from the Neon catalogue; mock the Neon layer so the
// region-filtering tests stay deterministic and offline.
vi.mock('../lib/neon', () => ({
  fetchSpeciesPage: vi.fn(),
  imageSrc: (p: string) => p,
  PAGE_SIZE: 24,
}));

import { fetchSpeciesPage } from '../lib/neon';

const mockNavigate = vi.fn();
const mockedFetch = fetchSpeciesPage as unknown as ReturnType<typeof vi.fn>;

function mockSpeciesPage(obsCount: number, slug = 'sp-1') {
  mockedFetch.mockResolvedValue({
    items: [
      {
        slug,
        scientific_name: 'Acanthophis laevis',
        common_name_en: 'Smooth-scaled Death Adder',
        common_name_local: 'Ular Kematian Papua',
        venom_type: 'NEUROTOXIC',
        image_path: '',
        observation_count: obsCount,
      },
    ],
    total: 1,
    page: 1,
    pages: 1,
  });
}

function renderHome() {
  return render(<Home onNavigate={mockNavigate} />);
}

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ gps: { lat: -6.2088, lng: 106.8456, accuracy: 15, timestamp: 1 } });
  });

  it('leads with the triage action before identification', async () => {
    mockSpeciesPage(0);
    renderHome();

    const triage = screen.getByRole('button', { name: /start triage assessment/i });
    const identify = screen.getByRole('button', { name: /identify a snake/i });

    // DESIGN.md 17/39: triage is the action that must be easiest to reach.
    expect(triage).toBeInTheDocument();
    expect(triage.compareDocumentPosition(identify) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('navigates to triage without requiring an account', () => {
    mockSpeciesPage(0);
    useAppStore.setState({ account: null });
    renderHome();

    screen.getByRole('button', { name: /start triage assessment/i }).click();

    expect(mockNavigate).toHaveBeenCalledWith('triage');
  });

  it('routes to identification from the identify action', () => {
    mockSpeciesPage(0);
    renderHome();

    screen.getByRole('button', { name: /identify a snake/i }).click();

    expect(mockNavigate).toHaveBeenCalledWith('identify');
  });

  it('names species recorded for the detected region', async () => {
    mockSpeciesPage(5);
    // Central Java is inside the Java region polygon.
    useAppStore.setState({ gps: { lat: -7.2575, lng: 112.7521, accuracy: 10, timestamp: 1 } });
    renderHome();

    await waitFor(() => {
      expect(screen.getByText(/Recorded in Jawa/i)).toBeInTheDocument();
    });
    expect(await screen.findByText(/Acanthophis laevis/i)).toBeInTheDocument();
  });

  it('explains an empty regional result instead of showing a blank card', async () => {
    mockSpeciesPage(0);
    useAppStore.setState({ gps: { lat: -3.5, lng: 128.5, accuracy: 10, timestamp: 1 } });
    renderHome();

    await waitFor(() => {
      expect(screen.getByText(/Recorded in Maluku/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/No species in the reference set match this region/i)).toBeInTheDocument();
  });
});