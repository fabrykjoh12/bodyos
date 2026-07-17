import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Profile } from './Profile';
import { useStore } from '@/store/useStore';
import { useSyncStore } from '@/store/cloudSync';

function renderProfile() {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Profile />
    </MemoryRouter>,
  );
}

describe('Profile account card', () => {
  beforeEach(() => {
    useStore.getState().resetAll();
  });

  it('prompts to create an account when signed out', () => {
    useSyncStore.setState({ status: 'signedOut', email: null });
    renderProfile();
    expect(screen.getByText('Back up & sync your training')).toBeInTheDocument();
  });

  it('shows the account email and sync status when signed in', () => {
    useSyncStore.setState({ status: 'synced', email: 'lifter@example.com' });
    renderProfile();
    expect(screen.getByText('lifter@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Synced across your devices/)).toBeInTheDocument();
    expect(screen.queryByText('Back up & sync your training')).not.toBeInTheDocument();
  });

  it('hides the card entirely when cloud sync is not configured', () => {
    useSyncStore.setState({ status: 'unconfigured', email: null });
    renderProfile();
    expect(screen.queryByText('Back up & sync your training')).not.toBeInTheDocument();
  });
});
