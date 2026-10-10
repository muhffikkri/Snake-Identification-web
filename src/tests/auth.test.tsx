import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LandingPage from '../components/LandingPage';

const props = { onIdentify: vi.fn(), onTriage: vi.fn(), onGovernment: vi.fn(), onDiscover: vi.fn() };

describe('Landing navigation', () => {
  it('shows the Demo Dashboard button in place of Sign in / Register', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage {...props} />
      </MemoryRouter>,
    );

    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();
    expect(nav?.textContent).not.toContain('Sign in');
    expect(nav?.textContent).not.toContain('Register');
    expect(nav?.textContent).toContain('Demo Dashboard');
  });

  it('keeps Identify, Triage and Discover reachable from the hero and navbar', () => {
    render(
      <MemoryRouter>
        <LandingPage {...props} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('button', { name: /identify a snake/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /start triage assessment/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /discover/i }).length).toBeGreaterThan(0);
  });
});
