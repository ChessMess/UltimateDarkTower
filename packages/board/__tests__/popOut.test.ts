// Regression coverage for the dispose()/pagehide race: closing the host stage while
// popped out must not let a late `pagehide` (timing varies by browser) rebuild the 3D
// view into DOM the stage has already torn down. See src/stage/popOut.ts.
import { createPopOut } from '../src/stage/popOut';
import type { PopOutHooks } from '../src/stage/popOut';

/** A minimal fake `Window` sufficient for `createPopOut`'s `buildPopupDocument` + listener wiring. */
function makeFakeWindow() {
  const listeners: Record<string, EventListener[]> = {};
  const doc = {
    open: jest.fn(),
    write: jest.fn(),
    close: jest.fn(),
    title: '',
    head: document.createElement('head'),
    body: document.createElement('body'),
    documentElement: document.createElement('html'),
    createElement: (tag: string) => document.createElement(tag),
  } as unknown as Document;

  const win = {
    document: doc,
    closed: false,
    close: jest.fn(),
    addEventListener: jest.fn((type: string, cb: EventListener) => {
      (listeners[type] ??= []).push(cb);
    }),
    removeEventListener: jest.fn((type: string, cb: EventListener) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== cb);
    }),
    dispatchEvent: jest.fn(() => true),
  } as unknown as Window & { closed: boolean; close: jest.Mock };

  return { win, listeners };
}

function makeHooks(): PopOutHooks & { create3D: jest.Mock; dispose3D: jest.Mock } {
  const panel = document.createElement('div');
  const container = document.createElement('div');
  container.appendChild(panel);
  document.body.appendChild(container);
  return {
    panel,
    towerHost: document.createElement('div'),
    toggleButton: document.createElement('button'),
    create3D: jest.fn(),
    dispose3D: jest.fn(),
    setLayoutSuspended: jest.fn(),
    stageCss: '',
    towerCss: () => null,
  };
}

describe('createPopOut — dispose vs. a late pagehide', () => {
  let openSpy: jest.SpyInstance;

  afterEach(() => {
    openSpy?.mockRestore();
    document.body.innerHTML = '';
  });

  it('unregisters the popup pagehide listener on dispose, and a stray call is a no-op', () => {
    const { win, listeners } = makeFakeWindow();
    openSpy = jest.spyOn(window, 'open').mockReturnValue(win);

    const hooks = makeHooks();
    const ctl = createPopOut(hooks);

    ctl.toggle(); // opens — create3D runs once as part of the normal open flow
    expect(hooks.create3D).toHaveBeenCalledTimes(1);

    const pagehideHandlers = [...(listeners['pagehide'] ?? [])];
    expect(pagehideHandlers).toHaveLength(1);

    hooks.create3D.mockClear();
    ctl.dispose();

    expect(win.removeEventListener).toHaveBeenCalledWith('pagehide', pagehideHandlers[0]);

    // Simulate the handler firing anyway (the exact race this test guards against) — it must
    // no-op instead of calling back into `restore()` and rebuilding the 3D view.
    pagehideHandlers[0]({} as Event);
    expect(hooks.create3D).not.toHaveBeenCalled();
    expect(hooks.setLayoutSuspended).not.toHaveBeenCalledWith(false);
  });
});
