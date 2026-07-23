import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppData } from '@/types';
import { useStore } from '@/store/useStore';
import {
  parseBackup,
  savePreRestoreSnapshot,
  loadPreRestoreSnapshot,
  clearPreRestoreSnapshot,
} from '@/store/repository';
import { CloudSync } from '@/components/account/CloudSync';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

export function Settings() {
  const navigate = useNavigate();
  const settings = useStore((s) => s.user.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const clearHistory = useStore((s) => s.clearHistory);
  const [confirmClear, setConfirmClear] = useState(false);
  const exportData = useStore((s) => s.exportData);
  const replaceAll = useStore((s) => s.replaceAll);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function exportBackup() {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bodyos-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    setImportError(null);
    try {
      const result = parseBackup(await file.text());
      if (result.ok) setPendingImport(result.data);
      else setImportError(result.error);
    } catch {
      setImportError("Couldn't read that file.");
    }
  }

  function confirmImport() {
    if (!pendingImport) return;
    // Safety net: snapshot the current data so a restore can be undone.
    savePreRestoreSnapshot(exportData());
    replaceAll(pendingImport);
    setPendingImport(null);
    navigate('/', { replace: true });
  }

  const preRestore = loadPreRestoreSnapshot();

  function undoRestore() {
    const snap = loadPreRestoreSnapshot();
    if (!snap) return;
    replaceAll(snap.data);
    clearPreRestoreSnapshot();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <ScreenHeader title="Settings" back="/profile" />

      <CloudSync />

      <Group title="Units">
        <SegmentedControl
          ariaLabel="Weight unit"
          value={settings.unit}
          onChange={(unit) => updateSettings({ unit })}
          options={[
            { value: 'kg', label: 'Kilograms' },
            { value: 'lb', label: 'Pounds' },
          ]}
        />
      </Group>

      <Group title="Workout">
        <Toggle
          label="Auto-start rest timer"
          hint="Start the timer automatically after each logged set"
          checked={settings.restTimerAutoStart}
          onChange={(v) => updateSettings({ restTimerAutoStart: v })}
        />
        <Row label="Default rest">
          <NumberStep
            value={settings.defaultRestSec}
            step={15}
            min={30}
            max={300}
            suffix="s"
            onChange={(v) => updateSettings({ defaultRestSec: v })}
          />
        </Row>
        <Toggle
          label="Show RIR / RPE"
          hint="Advanced: log reps-in-reserve for finer progression"
          checked={settings.showRir}
          onChange={(v) => updateSettings({ showRir: v })}
        />
      </Group>

      <Group title="Feedback">
        <Toggle
          label="Haptic feedback"
          checked={settings.hapticFeedback}
          onChange={(v) => updateSettings({ hapticFeedback: v })}
        />
        <Toggle
          label="Rest timer sound"
          hint="Play a chime when the rest timer finishes"
          checked={settings.restAlertSound !== false}
          onChange={(v) => updateSettings({ restAlertSound: v })}
        />
        <Toggle
          label="Reduce motion"
          hint="Minimize animations"
          checked={settings.reducedMotion}
          onChange={(v) => updateSettings({ reducedMotion: v })}
        />
      </Group>

      <Group title="Data">
        <button
          onClick={exportBackup}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        >
          <div className="min-w-0">
            <p className="text-sm text-content">Export data</p>
            <p className="text-xs text-content-faint">
              Download a JSON backup of your workouts, history &amp; settings
            </p>
          </div>
          <Download size={18} className="shrink-0 text-content-faint" />
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        >
          <div className="min-w-0">
            <p className="text-sm text-content">Import data</p>
            <p className="text-xs text-content-faint">
              Restore from a previously exported JSON backup
            </p>
          </div>
          <Upload size={18} className="shrink-0 text-content-faint" />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFilePicked}
        />
        {preRestore && (
          <button
            onClick={undoRestore}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <div className="min-w-0">
              <p className="text-sm text-content">Undo last restore</p>
              <p className="text-xs text-content-faint">
                Bring back the data from before the last import (
                {new Date(preRestore.savedAt).toLocaleString()})
              </p>
            </div>
          </button>
        )}
        <button
          onClick={() => setConfirmClear(true)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        >
          <div className="min-w-0">
            <p className="text-sm text-content">Clear training history</p>
            <p className="text-xs text-content-faint">
              Wipe logged sessions, records &amp; measurements — keeps your workouts and plan
            </p>
          </div>
        </button>
      </Group>

      <button
        onClick={() => setConfirmReset(true)}
        className="mt-2 text-sm font-medium text-danger/80 hover:text-danger"
      >
        Reset all data
      </button>

      <p className="pb-2 text-center text-xs text-content-faint">
        BodyOS <span className="tnum">v{__APP_VERSION__}</span> · build{' '}
        <span className="tnum">{__BUILD_SHA__}</span>
        {' · '}
        <a
          href="https://github.com/fabrykjoh12/bodyos/blob/main/docs/PRIVACY.md"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-content-muted"
        >
          Privacy &amp; data
        </a>
      </p>

      <Sheet
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear training history?"
      >
        <p className="text-sm text-content-muted">
          This removes every logged session, personal record, streak, measurement and photo —
          including any demo data — so your log starts clean. Your workouts, weekly plan and
          settings are kept. This cannot be undone.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              clearHistory();
              setConfirmClear(false);
            }}
          >
            Clear history
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmClear(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?">
        <p className="text-sm text-content-muted">
          This erases everything on this device — workouts, history, records, photos and your
          profile — and starts over from onboarding. This cannot be undone.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              resetAll();
              navigate('/', { replace: true });
            }}
          >
            Reset everything
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title="Restore this backup?"
      >
        {pendingImport && (
          <>
            <p className="text-sm text-content-muted">
              This replaces everything currently on this device with the backup&apos;s{' '}
              <span className="tnum font-semibold text-content">
                {pendingImport.templates.length}
              </span>{' '}
              templates and{' '}
              <span className="tnum font-semibold text-content">
                {pendingImport.sessions.length}
              </span>{' '}
              logged sessions. Your current data is overwritten and can&apos;t be recovered — export
              it first if you want to keep it.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="danger" fullWidth onClick={confirmImport}>
                Restore backup
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setPendingImport(null)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet
        open={importError !== null}
        onClose={() => setImportError(null)}
        title="Couldn't import"
      >
        <p className="text-sm text-content-muted">{importError}</p>
        <div className="mt-5">
          <Button variant="secondary" fullWidth onClick={() => setImportError(null)}>
            OK
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="label-tiny mb-2">{title}</h3>
      <div className="card divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-content">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm text-content">{label}</p>
        {hint && <p className="text-xs text-content-faint">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-3'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'left-6' : 'left-1'}`}
        />
      </button>
    </div>
  );
}

function NumberStep({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="decrease"
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-content-muted"
      >
        −
      </button>
      <span className="tnum w-12 text-center text-sm font-semibold text-content">
        {value}
        {suffix}
      </span>
      <button
        aria-label="increase"
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-content-muted"
      >
        +
      </button>
    </div>
  );
}
