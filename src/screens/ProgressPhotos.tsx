import { useMemo, useRef, useState } from 'react';
import { Camera, GitCompareArrows, Lock, Plus, Trash2, X } from 'lucide-react';
import type { PhotoPose, ProgressPhoto } from '@/types';
import { useStore } from '@/store/useStore';
import { uid } from '@/lib/id';
import { now, shortDate } from '@/lib/date';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { BeforeAfterSlider } from '@/components/progress/BeforeAfterSlider';
import { PoseGuide } from '@/components/progress/PoseGuide';

const POSES: { value: PhotoPose; label: string }[] = [
  { value: 'front-relaxed', label: 'Front' },
  { value: 'side-relaxed', label: 'Side' },
  { value: 'back-relaxed', label: 'Back' },
  { value: 'front-flex', label: 'Front flex' },
  { value: 'back-flex', label: 'Back flex' },
];

export function ProgressPhotos() {
  const photos = useStore((s) => s.photos);
  const addPhoto = useStore((s) => s.addPhoto);
  const deletePhoto = useStore((s) => s.deletePhoto);

  const [filter, setFilter] = useState<PhotoPose | 'all'>('all');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSel, setCompareSel] = useState<ProgressPhoto[]>([]);

  // capture form
  const [pose, setPose] = useState<PhotoPose>('front-relaxed');
  const [preview, setPreview] = useState<string | null>(null);
  const [bodyWeight, setBodyWeight] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(
    () =>
      [...photos]
        .filter((p) => filter === 'all' || p.pose === filter)
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()),
    [photos, filter],
  );

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const savePhoto = () => {
    if (!preview) return;
    const weekLabel = `Week ${photos.length + 1}`;
    addPhoto({
      id: uid('photo'),
      pose,
      dataUrl: preview,
      takenAt: now(),
      weekLabel,
      bodyWeightKg: bodyWeight ? Number.parseFloat(bodyWeight) : undefined,
    });
    setPreview(null);
    setBodyWeight('');
    setCaptureOpen(false);
  };

  const toggleCompareSel = (photo: ProgressPhoto) => {
    setCompareSel((sel) => {
      if (sel.find((p) => p.id === photo.id)) return sel.filter((p) => p.id !== photo.id);
      return [...sel, photo].slice(-2);
    });
  };

  const [before, after] =
    compareSel.length === 2
      ? [...compareSel].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())
      : [undefined, undefined];

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Progress photos"
        back="/progress"
        right={
          photos.length > 0 ? (
            <button
              aria-label="Compare"
              onClick={() => {
                setCompareMode((c) => !c);
                setCompareSel([]);
              }}
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${compareMode ? 'text-accent' : 'text-content-muted'} hover:bg-surface-2`}
            >
              <GitCompareArrows size={20} />
            </button>
          ) : undefined
        }
      />

      {/* Privacy assurance */}
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-content-muted">
        <Lock size={14} className="shrink-0 text-success" />
        Private by default. Photos stay on this device and are never uploaded or shared.
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={<Camera size={24} />}
          title="No progress photos"
          description="Take your first standardized photo to begin your private body timeline."
          action={<Button onClick={() => setCaptureOpen(true)}><Plus size={16} /> Add photo</Button>}
        />
      ) : (
        <>
          {compareMode && before && after && (
            <BeforeAfterSlider
              before={before.dataUrl}
              after={after.dataUrl}
              beforeLabel={before.weekLabel}
              afterLabel={after.weekLabel}
            />
          )}
          {compareMode && (
            <p className="text-center text-xs text-content-faint">
              {compareSel.length < 2 ? `Select ${2 - compareSel.length} more photo${2 - compareSel.length > 1 ? 's' : ''} to compare` : 'Drag the slider to compare'}
            </p>
          )}

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterChip>
            {POSES.map((p) => (
              <FilterChip key={p.value} active={filter === p.value} onClick={() => setFilter(p.value)}>{p.label}</FilterChip>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {shown.map((photo) => {
              const selIndex = compareSel.findIndex((p) => p.id === photo.id);
              return (
                <div key={photo.id} className="group relative overflow-hidden rounded-2xl border border-line bg-surface-2">
                  <button
                    onClick={() => compareMode && toggleCompareSel(photo)}
                    className="block aspect-[3/4] w-full"
                  >
                    <img src={photo.dataUrl} alt={`${photo.pose} ${photo.weekLabel}`} className="h-full w-full object-cover" />
                  </button>
                  {compareMode && selIndex >= 0 && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink">
                      {selIndex + 1}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2">
                    <div>
                      <p className="text-xs font-semibold text-white">{photo.weekLabel}</p>
                      <p className="text-[0.6rem] text-white/70">{shortDate(photo.takenAt)}{photo.bodyWeightKg ? ` · ${photo.bodyWeightKg}kg` : ''}</p>
                    </div>
                    {!compareMode && (
                      <button aria-label="Delete photo" onClick={() => deletePhoto(photo.id)} className="text-white/70 hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="secondary" fullWidth onClick={() => setCaptureOpen(true)}>
            <Plus size={16} /> Add photo
          </Button>
        </>
      )}

      {/* Capture sheet */}
      <Sheet open={captureOpen} onClose={() => setCaptureOpen(false)} title="New progress photo">
        <div className="flex flex-col gap-4">
          <div className="relative mx-auto aspect-[3/4] w-40 overflow-hidden rounded-2xl border border-line bg-surface-2">
            {preview ? (
              <>
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                <button aria-label="Clear" onClick={() => setPreview(null)} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white">
                  <X size={14} />
                </button>
              </>
            ) : (
              <PoseGuide className="h-full w-full p-4" />
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button variant="secondary" fullWidth onClick={() => fileRef.current?.click()}>
            <Camera size={16} /> {preview ? 'Retake' : 'Capture or choose'}
          </Button>

          <div>
            <span className="label-tiny">Pose</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POSES.map((p) => (
                <FilterChip key={p.value} active={pose === p.value} onClick={() => setPose(p.value)}>{p.label}</FilterChip>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
            <span className="text-sm text-content-muted">Body weight (optional)</span>
            <span className="flex items-center gap-1">
              <input
                inputMode="decimal"
                value={bodyWeight}
                onChange={(e) => setBodyWeight(e.target.value)}
                placeholder="—"
                className="w-14 bg-transparent text-right text-content outline-none"
              />
              <span className="text-xs text-content-faint">kg</span>
            </span>
          </label>

          <Button fullWidth disabled={!preview} onClick={savePhoto}>
            Save to private timeline
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-content-muted'}`}
    >
      {children}
    </button>
  );
}
