import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Triage from '../components/Triage';
import { useAppStore } from '../store/store';
import { commitDraft } from '../lib/assessment';

vi.mock('../db/db', async () => {
  const actual = await vi.importActual<typeof import('../db/db')>('../db/db');
  return {
    ...actual,
    db: {
      incidents: {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
        }),
      },
    },
  };
});

vi.mock('../lib/assessment', async () => {
  const actual = await vi.importActual<typeof import('../lib/assessment')>('../lib/assessment');
  return { ...actual, commitDraft: vi.fn().mockResolvedValue(undefined) };
});

const mockCleared = vi.fn();
const mockFinished = vi.fn();
const mockOpenSpecies = vi.fn();

function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  const location = useLocation();
  onChange(location.pathname);
  return null;
}

function renderTriage() {
  let current = '';
  const result = render(
    <MemoryRouter initialEntries={['/triage']}>
      <LocationProbe onChange={(p) => (current = p)} />
      <Triage
        species={null}
        imageDataUrl={null}
        onOpenSpecies={mockOpenSpecies}
        onFinished={mockFinished}
        onCleared={mockCleared}
      />
    </MemoryRouter>,
  );
  return { path: () => current, ...result };
}

function goToStep(label: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

async function reachResult() {
  goToStep(/step 1 of 4|result/i);
}

describe('Triage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      gps: { lat: -6.2088, lng: 106.8456, accuracy: 15, timestamp: 1 },
      account: null,
      pendingAssessment: null,
    });
  });

  it('runs end to end with no account', async () => {
    renderTriage();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /see the result/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Grade 0: No envenoming/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/No account needed/i)).toBeInTheDocument();
  });

  it('bans the tourniquet on the result screen', async () => {
    renderTriage();
    await reachResult();
    await waitFor(() => expect(screen.getByText(/never apply a tourniquet/i)).toBeInTheDocument());
  });

  it('grades breathing difficulty as life threatening', async () => {
    renderTriage();

    goToStep(/whole-body signs/i);
    fireEvent.click(screen.getByRole('checkbox', { name: /difficulty breathing/i }));
    fireEvent.click(screen.getByRole('button', { name: /see the result/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Grade 4: Life threatening/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/support breathing and start resuscitation/i)).toBeInTheDocument();
  });

  it('warns that a low SpO2 alone forces the highest grade', async () => {
    renderTriage();

    goToStep(/whole-body signs/i);
    fireEvent.change(screen.getByLabelText(/SpO2/i), { target: { value: '85' } });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/below 90/i));
  });

  it('sends the finished assessment to register instead of blocking on a form', async () => {
    const { path } = renderTriage();
    await reachResult();

    fireEvent.click(screen.getByRole('button', { name: /create an account to save/i }));

    await waitFor(() => expect(path()).toBe('/register'));
    const draft = useAppStore.getState().pendingAssessment as { incidentId: string; details: unknown };
    expect(draft).toBeTruthy();
    expect(draft.incidentId).toBeTruthy();
    expect((draft.details as { severity_assessment: { grade: number } }).severity_assessment.grade).toBe(0);
    // Nothing is written until an account exists.
    expect(commitDraft).not.toHaveBeenCalled();
  });

  it('offers three destinations after continuing without saving', async () => {
    renderTriage();
    await reachResult();

    fireEvent.click(screen.getByRole('button', { name: /continue without saving/i }));

    await waitFor(() => expect(screen.getByText(/where to next/i)).toBeInTheDocument());
    expect(commitDraft).toHaveBeenCalledWith(expect.anything(), null);
    expect(screen.getByRole('button', { name: /back to the landing page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse the snake map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /photograph the snake/i })).toBeInTheDocument();
  });

  it('sends the landing option back to the root path when signed out', async () => {
    const { path } = renderTriage();
    await reachResult();

    fireEvent.click(screen.getByRole('button', { name: /continue without saving/i }));
    await waitFor(() => expect(screen.getByText(/where to next/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /back to the landing page/i }));

    await waitFor(() => expect(path()).toBe('/'));
    expect(mockCleared).toHaveBeenCalled();
  });

  it('sends the landing option to activity when signed in', async () => {
    useAppStore.setState({ account: { name: 'Rina', role: 'USER' } });
    const { path } = renderTriage();
    await reachResult();

    fireEvent.click(screen.getByRole('button', { name: /continue without saving/i }));
    await waitFor(() => expect(screen.getByText(/where to next/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /back to the landing page/i }));

    await waitFor(() => expect(path()).toBe('/activity'));
  });

  it('returns to the landing page on cancel while signed out', async () => {
    const { path } = renderTriage();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(path()).toBe('/'));
  });

  it('returns to activity on cancel while signed in', async () => {
    useAppStore.setState({ account: { name: 'Rina', role: 'USER' } });
    const { path } = renderTriage();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(path()).toBe('/activity'));
  });

  it('saves straight to the account when already signed in', async () => {
    useAppStore.setState({ account: { name: 'Rina', role: 'USER' } });
    renderTriage();
    await reachResult();

    fireEvent.click(screen.getByRole('button', { name: /save to Rina/i }));

    await waitFor(() => expect(commitDraft).toHaveBeenCalledWith(expect.anything(), 'Rina'));
    expect(await screen.findByText(/saved to Rina/i)).toBeInTheDocument();
  });
});