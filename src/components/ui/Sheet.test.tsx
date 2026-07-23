import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Sheet } from './Sheet';

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open sheet</button>
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        title="Test sheet"
      >
        <button>First action</button>
        <button>Second action</button>
      </Sheet>
    </div>
  );
}

describe('Sheet accessibility', () => {
  it('is a labelled modal dialog', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Open sheet'));
    const dialog = screen.getByRole('dialog', { name: 'Test sheet' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus into the sheet on open and restores it on close', () => {
    render(<Harness />);
    const opener = screen.getByText('Open sheet');
    opener.focus();
    fireEvent.click(opener);
    // Initial focus lands on the first focusable control inside the sheet.
    expect(
      screen.getByRole('dialog', { name: 'Test sheet' }).contains(document.activeElement),
    ).toBe(true);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('traps Tab focus inside the sheet', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Open sheet'));
    const dialog = screen.getByRole('dialog', { name: 'Test sheet' });
    const last = screen.getByText('Second action');
    last.focus();
    // jsdom has no layout, so offsetParent-based visibility filtering keeps
    // document.activeElement; Tab from the last item must wrap to the first.
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('locks body scroll while open and unlocks on close', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Open sheet'));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });

  it('closes via Escape exactly once', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByText('Open sheet'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
