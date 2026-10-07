import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Triage from '../components/Triage';
import { useAppStore } from '../store/store';

vi.mock('../db/db', () => ({
  db: {
    incidents: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
      }),
    },
  },
  upsertIncident: vi.fn().mockResolvedValue(undefined),
  markAllSynced: vi.fn().mockResolvedValue(undefined),
}));

const mockFinished = vi.fn();
const mockOpenSpecies = vi.fn();

function renderTriage() {
  return render(
    <Triage species={null} imageDataUrl={null} onOpenSpecies={mockOpenSpecies} onFinished={mockFinished} />,
  );
}

function goToStep(label: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

describe('Triage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      gps: { lat: -6.2088, lng: 106.8456, accuracy: 15, timestamp: 1 },
      accountName: null,
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
    // No sign-in wall anywhere on the path to the result.
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.getByText(/No account needed/i)).toBeInTheDocument();
  });

  it('bans the tourniquet on the result screen', async () => {
    renderTriage();

    goToStep(/step 4 of 4|result/i);

    await waitFor(() => {
      expect(screen.getByText(/never apply a tourniquet/i)).toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/below 90/i);
    });
  });

  it('shows the result before asking for an account', async () => {
    renderTriage();

    goToStep(/step 4 of 4|result/i);

    const gradeHeading = await screen.findByRole('heading', { name: /Grade 0/i });
    const accountPrompt = screen.getByRole('button', { name: /create an account to save/i });

    // DESIGN.md 18: the prompt must not obstruct the result.
    expect(gradeHeading.compareDocumentPosition(accountPrompt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('creates an account inline and offers to save', async () => {
    renderTriage();

    goToStep(/step 4 of 4|result/i);
    fireEvent.click(screen.getByRole('button', { name: /create an account to save/i }));

    const input = await screen.findByLabelText(/account name/i);
    fireEvent.change(input, { target: { value: 'Rina' } });
    fireEvent.click(screen.getByRole('button', { name: /create and save/i }));

    expect(useAppStore.getState().accountName).toBe('Rina');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save this assessment to Rina/i })).toBeInTheDocument();
    });
  });

  it('lets the user continue without saving', async () => {
    renderTriage();

    goToStep(/step 4 of 4|result/i);
    fireEvent.click(await screen.findByRole('button', { name: /continue without saving/i }));

    expect(useAppStore.getState().accountName).toBeNull();
  });
});