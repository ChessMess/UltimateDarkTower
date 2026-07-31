import { describe, expect, it, vi } from 'vitest';
import { syncSkulls } from './skullSync';

function fakeHandle() {
  return { dropSkull: vi.fn(), clearSkulls: vi.fn() };
}

describe('syncSkulls', () => {
  it('drops one skull per increment', () => {
    const handle = fakeHandle();
    const prev = syncSkulls(handle, 0, 3);
    expect(prev).toBe(3);
    expect(handle.dropSkull).toHaveBeenCalledTimes(3);
    expect(handle.clearSkulls).not.toHaveBeenCalled();
  });

  it('drops only the delta on a further increment', () => {
    const handle = fakeHandle();
    const prev = syncSkulls(handle, 3, 4);
    expect(prev).toBe(4);
    expect(handle.dropSkull).toHaveBeenCalledTimes(1);
  });

  it('clears and drops nothing when the count resets to zero', () => {
    const handle = fakeHandle();
    const prev = syncSkulls(handle, 4, 0);
    expect(prev).toBe(0);
    expect(handle.clearSkulls).toHaveBeenCalledTimes(1);
    expect(handle.dropSkull).not.toHaveBeenCalled();
  });

  it('clears and replays from zero when the count decreases but is nonzero', () => {
    const handle = fakeHandle();
    const prev = syncSkulls(handle, 4, 2);
    expect(prev).toBe(2);
    expect(handle.clearSkulls).toHaveBeenCalledTimes(1);
    expect(handle.dropSkull).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the count is unchanged', () => {
    const handle = fakeHandle();
    const prev = syncSkulls(handle, 3, 3);
    expect(prev).toBe(3);
    expect(handle.dropSkull).not.toHaveBeenCalled();
    expect(handle.clearSkulls).not.toHaveBeenCalled();
  });

  it('always clears on a reset to zero, even if prev already reads zero', () => {
    const handle = fakeHandle();
    const prev = syncSkulls(handle, 0, 0);
    expect(prev).toBe(0);
    expect(handle.clearSkulls).toHaveBeenCalledTimes(1);
    expect(handle.dropSkull).not.toHaveBeenCalled();
  });
});
