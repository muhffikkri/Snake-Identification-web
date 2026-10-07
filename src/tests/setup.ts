import { vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';

if (typeof navigator !== 'undefined' && !('vibrate' in navigator)) {
  Object.defineProperty(navigator, 'vibrate', { value: vi.fn().mockReturnValue(true), writable: true });
}

if (typeof window !== 'undefined') {
  class MockAudioContext {
    currentTime = 0;
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createGain() {
      return { connect: vi.fn(), gain: { setValueAtTime: vi.fn() } };
    }
    destination = {};
  }
  (window as any).AudioContext = MockAudioContext;
  (window as any).webkitAudioContext = MockAudioContext;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // jsdom has no geolocation; the discover view asks for it on demand.
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  });
}

// AES key derivation is slow enough to dominate the test run; the crypto module
// has its own coverage and is not what these component tests are checking.
vi.mock('../services/crypto', () => ({
  encryptData: vi.fn().mockImplementation(async (text: string) => `ENCRYPTED:${text}`),
  decryptData: vi.fn().mockImplementation(async (enc: string) =>
    enc.startsWith('ENCRYPTED:') ? enc.substring(10) : enc,
  ),
}));

export { React };