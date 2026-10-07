import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GovernmentDashboard from '../components/GovernmentDashboard';
import { useAppStore } from '../store/store';
import { fixtureIncidents, fixtureSpecies } from './fixtures';

/*
  The fixtures are imported by the hoisted mock factory and by the test body,
  so the sync-status cases can drive the same objects the component reads.
*/
vi.mock('../db/db', async () => {
  const actual = await vi.importActual<typeof import('../db/db')>('../db/db');
  return {
    ...actual,
    getAllDecryptedIncidents: vi.fn(async () => fixtureIncidents),
    markAllSynced: vi.fn(async () => {
      fixtureIncidents.forEach((i) => {
        i.sync_status = 'SYNCED';
      });
    }),
    db: {
      species: { toArray: vi.fn(async () => fixtureSpecies) },
      incidents: {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(1) }),
        }),
      },
    },
  };
});

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tile" />,
  Polygon: ({ children }: { children?: React.ReactNode }) => <div data-testid="polygon">{children}</div>,
  Popup: ({ children }: { children?: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  Marker: ({ children }: { children?: React.ReactNode }) => <div data-testid="marker">{children}</div>,
}));

vi.mock('leaflet', () => ({ default: { divIcon: vi.fn().mockReturnValue({}) } }));

describe('GovernmentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtureIncidents[0].sync_status = 'PENDING';
    fixtureIncidents[1].sync_status = 'SYNCED';
    useAppStore.setState({ networkStatus: 'online', pendingSyncCount: 1 });
  });

  it('states that the figures cover this device, not the country', () => {
    render(<GovernmentDashboard />);
    expect(screen.getByText(/computed from assessment records held on this device/i)).toBeInTheDocument();
  });

  it('leads the overview with the critical share', async () => {
    render(<GovernmentDashboard />);
    await waitFor(() => expect(screen.getByText('50%')).toBeInTheDocument());
    expect(screen.getByText(/1 of 2 assessments were graded 3 or 4/i)).toBeInTheDocument();
  });

  it('counts real records instead of inventing totals', async () => {
    render(<GovernmentDashboard />);
    await waitFor(() => expect(screen.getByText(/total assessments/i)).toBeInTheDocument());
    const total = screen.getByText(/total assessments/i).parentElement;
    const venomous = screen.getByText(/venomous cases/i).parentElement;
    expect(total?.textContent).toContain('2');
    expect(venomous?.textContent).toContain('1');
  });

  it('names every density step in words, not colour alone', async () => {
    render(<GovernmentDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /distribution map/i }));

    await waitFor(() => expect(screen.getByTestId('map')).toBeInTheDocument());
    expect(screen.getByText('No reports')).toBeInTheDocument();
    expect(screen.getByText('Low, 1 to 2')).toBeInTheDocument();
    expect(screen.getByText('High, over 10')).toBeInTheDocument();
  });

  it('draws every region on the map', async () => {
    render(<GovernmentDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /distribution map/i }));

    await waitFor(() => expect(screen.getAllByTestId('polygon')).toHaveLength(7));
  });

  it('admits the boundaries are schematic', async () => {
    render(<GovernmentDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /distribution map/i }));

    await waitFor(() => expect(screen.getByText(/schematic island-group shapes/i)).toBeInTheDocument());
  });

  it('filters the map by venom status', async () => {
    render(<GovernmentDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /distribution map/i }));
    await waitFor(() => expect(screen.getByTestId('map')).toBeInTheDocument());

    expect(screen.getByText(/2 assessments match the filters/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/venom status/i), { target: { value: 'harmless' } });
    await waitFor(() => expect(screen.getByText(/1 assessments match the filters/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/venom status/i), { target: { value: 'venomous' } });
    await waitFor(() => expect(screen.getByText(/1 assessments match the filters/i)).toBeInTheDocument());
  });

  it('explains an empty filtered result instead of showing a blank map', async () => {
    render(<GovernmentDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /distribution map/i }));
    await waitFor(() => expect(screen.getByTestId('map')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/^species$/i), { target: { value: 'zzz' } });
    await waitFor(() => expect(screen.getByText('No assessments match these filters')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitFor(() => expect(screen.getByText(/2 assessments match the filters/i)).toBeInTheDocument());
  });

  it('reports per-species counts in a real table', async () => {
    render(<GovernmentDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /^species$/i }));

    await waitFor(() => expect(screen.getByRole('rowheader', { name: /Acanthophis laevis/i })).toBeInTheDocument());
    expect(screen.getByRole('rowheader', { name: /Ahaetulla prasina/i })).toBeInTheDocument();
  });

  it('syncs queued records and reports the new state', async () => {
    render(<GovernmentDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /data and reports/i }));

    await waitFor(() => expect(screen.getByText('Sync queue')).toBeInTheDocument());
    expect(screen.getByText('Queued')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sync pending records/i }));
    await waitFor(() => expect(screen.queryByText('Queued')).not.toBeInTheDocument(), { timeout: 6000 });
    expect(screen.getAllByText('Delivered').length).toBeGreaterThan(0);
  });

  it('disables the sync control when nothing is queued', async () => {
    fixtureIncidents.forEach((incident) => {
      incident.sync_status = 'SYNCED';
    });
    render(<GovernmentDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /data and reports/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sync pending records/i })).toBeDisabled();
    });
  });
});