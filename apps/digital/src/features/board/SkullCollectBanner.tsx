/**
 * Surfaces the pending-skull pool (skulls collected off the tower floor, awaiting placement
 * on a building) and offers both assign paths: click-to-place one at a time on the board, or
 * open the bulk assign dialog. Self-gates — renders nothing while the pool is empty.
 */
import { useEffect, useState } from 'react';
import { useBoardLocationPick, useSkullPool } from '@/lib/hooks';
import { SkullAssignDialog } from './SkullAssignDialog';

export function SkullCollectBanner() {
  const { pending, placeSkulls } = useSkullPool();
  const locationPick = useBoardLocationPick();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [armedTotal, setArmedTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);

  // The pick loop stays armed across placements (LocationPickStore.pick() doesn't self-disarm),
  // so one arm covers the whole run — `remaining` (local, not the store) tracks how many are left.
  useEffect(() => {
    if (!locationPick) return;
    return locationPick.subscribe((event) => {
      if (event.type === 'picked') {
        placeSkulls({ [event.location]: 1 });
        setRemaining((r) => {
          const next = r - 1;
          if (next <= 0) locationPick.disarm();
          return next;
        });
      } else if (event.type === 'disarmed') {
        setRemaining(0);
      }
    });
  }, [locationPick, placeSkulls]);

  if (pending <= 0 && remaining <= 0) return null;

  const armPlaceOnBoard = () => {
    if (!locationPick || pending <= 0) return;
    locationPick.arm({ kind: 'building', label: 'skull (building)', targets: 'buildings' });
    setArmedTotal(pending);
    setRemaining(pending);
  };
  const cancelArm = () => locationPick?.disarm();

  return (
    <section className="panel">
      <h2>Skulls to place</h2>
      {remaining > 0 ? (
        <>
          <p className="muted">
            Placing {armedTotal - remaining + 1} of {armedTotal} — click a building
          </p>
          <button className="board-arm-cancel" onClick={cancelArm}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            {pending === 1 ? '1 skull to place' : `${pending} skulls to place`}
          </p>
          <div className="board-place-actions">
            <button disabled={!locationPick} onClick={armPlaceOnBoard}>
              Place on board
            </button>
            <button onClick={() => setDialogOpen(true)}>Place all…</button>
          </div>
        </>
      )}
      {dialogOpen && <SkullAssignDialog onClose={() => setDialogOpen(false)} />}
    </section>
  );
}
