// Phase-0 GATE (M3): live one-marker orientation check.
//
// Places a colored marker at EVERY building anchor on the REAL textured disc
// (board art kept visible) via Display 0.9's `anchorToWorld`, colored by the
// location's kingdom. If `anchorToWorld(anchor, discMetrics, 0)` is faithful to
// "match current render", every marker sits on its printed building and the four
// kingdom colors cluster into the four printed regions. This validates the
// northKingdom:0 path against the verbatim board.png + getBoardTextureRotation
// BEFORE the real plugin is built. Not shipped — example-only.
import * as THREE from 'three';
import { TowerRenderView, attachScenePlugin, anchorToWorld } from 'ultimatedarktowerdisplay';
import type { ScenePlugin, ScenePluginContext } from 'ultimatedarktowerdisplay';
import { BOARD_SPOTS, BOARD_LOCATION_BY_NAME } from '../../src/index';
import type { BoardKingdom } from '../../src/index';

const container = document.getElementById('scene');
if (!container) throw new Error('#scene not found');

const KINGDOM_COLOR: Record<BoardKingdom, number> = {
  north: 0x3b82f6,
  east: 0x22c55e,
  south: 0xef4444,
  west: 0xeab308,
};

const view = new TowerRenderView({ container, modelUrl: './tower.glb' });
const view3D = view.view3D;
if (!view3D) throw new Error('view3D unavailable');

const placed: THREE.Sprite[] = [];
let context: ScenePluginContext | null = null;

const plugin: ScenePlugin = {
  id: 'orientation-check',
  attach(ctx: ScenePluginContext): void {
    context = ctx; // ctx.scene is the public seam (Tower3DView.scene is private)
  },
  onModelLoaded(): void {
    if (!context) return;
    const metrics = view3D.getDiscMetrics();
    const size = metrics.radius * 0.012;
    let n = 0;
    for (const [loc, spots] of Object.entries(BOARD_SPOTS)) {
      const spot = spots.find((s) => s.id === 'building');
      if (!spot) continue;
      const kingdom = BOARD_LOCATION_BY_NAME[loc]?.kingdom as BoardKingdom | undefined;
      const color = kingdom ? KINGDOM_COLOR[kingdom] : 0xff00ff;
      const pos = anchorToWorld(spot.at, metrics, 0);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ color, depthTest: false, depthWrite: false }),
      );
      sprite.position.set(pos.x, pos.y + size, pos.z);
      sprite.scale.set(size * 2, size * 2, 1);
      sprite.renderOrder = 999;
      context.scene.add(sprite);
      placed.push(sprite);
      n++;
    }

    console.log(`[orientation-check] placed ${n} building markers at nk=0`);

    // Force a top-down camera each frame (override OrbitControls) so the whole
    // disc is visible and markers can be checked against printed buildings.
    const c = metrics.center;
    const cam = context.camera;
    cam.up.set(0, 0, -1);
    context.registerFrameCallback(() => {
      cam.position.set(c.x, c.y + metrics.radius * 2.4, c.z);
      cam.up.set(0, 0, -1);
      cam.lookAt(c.x, c.y, c.z);
      cam.updateProjectionMatrix();
    });
  },
  dispose(): void {
    for (const s of placed) {
      s.material.dispose();
      s.removeFromParent();
    }
    placed.length = 0;
  },
};

attachScenePlugin(view3D, plugin);
