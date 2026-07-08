# Ultimate Dark Tower Creator Node Catalog

A complete reference for all current node kinds in the scenario graph.

This document is reference-first:

- Fast lookup table for every node kind.
- Category-by-category details with purpose, inputs, outputs, props, runtime behavior, and usage notes.
- Clear status badges so authors can see what is runtime-supported vs creator-only.

## Status Legend

- `Implemented`: Executed by engine runtime in `packages/engine/src/engine/nodes.js`.
- `Creator-only`: Available in schema/creator palette, but not interpreted by current engine runtime.
- `Annotation`: Authoring/documentation node, never executed; special L3 validation rules.
- `Partial`: Some contract exists, but runtime behavior is incomplete (currently `media.showImage`).

## Sources Of Truth

Use these files when updating this catalog:

- `apps/creator/src/types/index.ts`: node list (`NODE_KINDS`), categories, output handles.
- `packages/schema/src/scenario.schema.json`: canonical `node.kind` enum and closed props schemas.
- `packages/engine/src/engine/nodes.js`: runtime semantics per implemented node.
- `packages/engine/src/engine/types.ts`: request/input/directive vocabularies.
- `packages/adapters/src/validate-graph.ts`: graph-level constraints and annotation rules.

## Quick Navigation

- [Quick Index](#quick-index)
- [Execution Model](#execution-model)
- [Lifecycle Nodes](#lifecycle-nodes)
- [Action Nodes](#action-nodes)
- [Battle Nodes](#battle-nodes)
- [Dungeon Nodes](#dungeon-nodes)
- [Event Nodes](#event-nodes)
- [Trigger Nodes](#trigger-nodes)
- [Condition Nodes](#condition-nodes)
- [Effect Nodes](#effect-nodes)
- [Tower Nodes](#tower-nodes)
- [Media Nodes](#media-nodes)
- [Win/Loss Nodes](#winloss-nodes)
- [Utility Nodes](#utility-nodes)
- [Closed Props Matrix](#closed-props-matrix)
- [Known Gaps And Mismatches](#known-gaps-and-mismatches)

## Execution Model

### Wiring model

- Most nodes have one input (`in`) and one output (`out`).
- Named outputs exist for branching kinds (for example `cond.branch`, `event.router`).
- `lifecycle.gameStart` has no input handle.
- Annotation kinds (`util.comment`, `util.group`) have no runtime wires.

### Await boundaries (engine asks for input)

Current engine input boundaries:

- `lifecycle.actionMiddle` -> request `action` (`choice`)
- `lifecycle.actionEnd` -> request `skullCounter` (`observed`)
- `action.move` and `battle.selectFoe`/`action.battle` -> request `target`
- `battle.applyAdvantage` -> request `advantageSpend`
- `action.trade` -> request `trade`
- `lifecycle.selectHero` -> request `heroSelect` (`choice`), one round-trip per active seat

### Directive surface (what nodes emit)

Implemented nodes emit directives from this closed set:

- `ui.update`
- `ui.prompt`
- `tower.program`
- `board.mutate`
- `log.entry`
- `media.play`

## Quick Index

| Kind                           | Category  | Status       | Await/Input            | Outputs                                                                     | Props                              |
| ------------------------------ | --------- | ------------ | ---------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| lifecycle.gameStart            | lifecycle | Implemented  | No                     | out                                                                         | Open                               |
| lifecycle.importSeed           | lifecycle | Creator-only | No                     | out                                                                         | Open                               |
| lifecycle.selectGameDifficulty | lifecycle | Creator-only | No                     | out                                                                         | Open                               |
| lifecycle.selectAdversary      | lifecycle | Creator-only | No                     | out                                                                         | Open                               |
| lifecycle.selectFoes           | lifecycle | Creator-only | No                     | out                                                                         | Open                               |
| lifecycle.selectMainGoal       | lifecycle | Creator-only | No                     | out                                                                         | Open                               |
| lifecycle.selectAlly           | lifecycle | Creator-only | No                     | out                                                                         | Open                               |
| lifecycle.selectHero           | lifecycle | Implemented  | Yes (`heroSelect`)     | out                                                                         | Closed (heroIds)                   |
| lifecycle.boardSetup           | lifecycle | Implemented  | No                     | out                                                                         | Closed (spawns)                    |
| lifecycle.startMonth           | lifecycle | Implemented  | No                     | out                                                                         | Open                               |
| lifecycle.playerTurn           | lifecycle | Implemented  | No                     | out                                                                         | Open                               |
| lifecycle.actionStart          | lifecycle | Implemented  | No                     | out                                                                         | Open                               |
| lifecycle.actionMiddle         | lifecycle | Implemented  | Yes (`action`)         | out,battle,dungeon,trade                                                    | Open                               |
| lifecycle.actionEnd            | lifecycle | Implemented  | Yes (`skullCounter`)   | out                                                                         | Open                               |
| lifecycle.newMonthCheck        | lifecycle | Implemented  | No                     | out                                                                         | Open                               |
| lifecycle.newQuests            | lifecycle | Implemented  | No                     | out                                                                         | Open                               |
| lifecycle.gameEnd              | lifecycle | Implemented  | No                     | won,lost (creator)                                                          | Open                               |
| action.banner                  | action    | Implemented  | No                     | out                                                                         | Closed (title,body,splashResource) |
| action.move                    | action    | Implemented  | Yes (`moveTarget`)     | out                                                                         | Open                               |
| action.cleanse                 | action    | Implemented  | No                     | out                                                                         | Open                               |
| action.battle                  | action    | Implemented  | Yes (`target`)         | out                                                                         | Open                               |
| action.quest                   | action    | Implemented  | No                     | out                                                                         | Open                               |
| action.reinforce               | action    | Implemented  | No                     | out                                                                         | Open                               |
| action.skullDrop               | action    | Creator-only | No                     | out                                                                         | Open                               |
| action.endTurn                 | action    | Creator-only | No                     | out                                                                         | Open                               |
| action.trade                   | action    | Implemented  | Yes (`trade`)          | out                                                                         | Closed (from,to,give,receive)      |
| battle.selectFoe               | battle    | Implemented  | Yes (`target`)         | out                                                                         | Open                               |
| battle.cardSelect              | battle    | Creator-only | No                     | out                                                                         | Open                               |
| battle.applyAdvantage          | battle    | Implemented  | Yes (`advantageSpend`) | out                                                                         | Open                               |
| battle.retreat                 | battle    | Creator-only | No                     | out                                                                         | Open                               |
| battle.end                     | battle    | Implemented  | No                     | out                                                                         | Open                               |
| battle.removeFoeNoBattle       | battle    | Creator-only | No                     | out                                                                         | Open                               |
| battle.foeStatus               | battle    | Creator-only | No                     | out                                                                         | Open                               |
| dungeon.subflow                | dungeon   | Implemented  | No                     | enter,completed,left                                                        | Closed (dungeonId)                 |
| dungeon.room                   | dungeon   | Implemented  | Depends on room        | dynamic (often N/E/S/W or out)                                              | Open                               |
| dungeon.relicTower             | dungeon   | Creator-only | No                     | out                                                                         | Open                               |
| event.router                   | event     | Implemented  | No                     | quest,foesStrike,foesSpawn,foesGrow,towerStirs,towerActs,companion,newWares | Open                               |
| event.foesStrike               | event     | Implemented  | No                     | out                                                                         | Open                               |
| event.foesSpawn                | event     | Implemented  | No                     | out                                                                         | Open                               |
| event.foesGrow                 | event     | Implemented  | No                     | out                                                                         | Open                               |
| event.towerStirs               | event     | Implemented  | No                     | out                                                                         | Open                               |
| event.towerActs                | event     | Implemented  | No                     | out                                                                         | Open                               |
| event.companion                | event     | Implemented  | No                     | out                                                                         | Closed (companionId,month)         |
| event.newWares                 | event     | Implemented  | No                     | out                                                                         | Open                               |
| event.readAloud                | event     | Implemented  | No                     | out                                                                         | Open                               |
| trigger.schedule               | trigger   | Implemented  | No                     | out                                                                         | Closed (trigger)                   |
| trigger.onState                | trigger   | Implemented  | No                     | out                                                                         | Closed (trigger)                   |
| cond.check                     | cond      | Implemented  | No                     | pass,fail (creator)                                                         | Closed (condition)                 |
| cond.branch                    | cond      | Implemented  | No                     | true,false                                                                  | Closed (condition)                 |
| cond.glyphGate                 | cond      | Implemented  | No                     | match,nomatch (creator)                                                     | Open                               |
| cond.random                    | cond      | Creator-only | No                     | out                                                                         | Open                               |
| cond.setFlag                   | cond      | Creator-only | No                     | out                                                                         | Open                               |
| effect.apply                   | effect    | Implemented  | No                     | out                                                                         | Closed (`effect` or `effects`)     |
| tower.op                       | tower     | Implemented  | No                     | out                                                                         | Closed (towerOp)                   |
| media.playVideo                | media     | Creator-only | No                     | out                                                                         | Open                               |
| media.playSound                | media     | Creator-only | No                     | out                                                                         | Open                               |
| media.showImage                | media     | Partial      | No                     | out                                                                         | Closed (imageRef)                  |
| media.narration                | media     | Implemented  | No                     | out                                                                         | Closed (text)                      |
| media.cutscene                 | media     | Creator-only | No                     | out                                                                         | Open                               |
| winloss.mainGoal               | winloss   | Implemented  | No                     | out                                                                         | Closed (questId)                   |
| winloss.winCondition           | winloss   | Implemented  | No                     | out                                                                         | Closed (condition)                 |
| winloss.lossCondition          | winloss   | Implemented  | No                     | out                                                                         | Closed (condition)                 |
| winloss.competitiveEnd         | winloss   | Creator-only | No                     | out                                                                         | Open                               |
| util.linkOut                   | util      | Creator-only | No                     | out                                                                         | Open                               |
| util.linkIn                    | util      | Creator-only | No                     | none                                                                        | Open                               |
| util.group                     | util      | Annotation   | No                     | none                                                                        | Closed (nodeIds,color)             |
| util.comment                   | util      | Annotation   | No                     | none                                                                        | Closed (empty object)              |
| util.catch                     | util      | Creator-only | No                     | out                                                                         | Open                               |

## Lifecycle Nodes

| Node                             | Purpose / Use                                      | Inputs                        | Outputs                          | Props                            | Runtime behavior                                                                                                                                 |
| -------------------------------- | -------------------------------------------------- | ----------------------------- | -------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lifecycle.gameStart`            | Start of scenario flow.                            | None                          | `out`                            | Open                             | Logs `gameStart`, then follows `out`.                                                                                                            |
| `lifecycle.importSeed`           | Authoring-time seed import step in creator flows.  | None                          | `out`                            | Open                             | Not interpreted by current engine.                                                                                                               |
| `lifecycle.selectGameDifficulty` | Authoring step for difficulty selection.           | None                          | `out`                            | Open                             | Creator-only node.                                                                                                                               |
| `lifecycle.selectAdversary`      | Authoring step for adversary choice.               | None                          | `out`                            | Open                             | Creator-only node.                                                                                                                               |
| `lifecycle.selectFoes`           | Authoring step for foe roster selection.           | None                          | `out`                            | Open                             | Creator-only node.                                                                                                                               |
| `lifecycle.selectMainGoal`       | Authoring step for selecting main goal.            | None                          | `out`                            | Open                             | Creator-only node.                                                                                                                               |
| `lifecycle.selectAlly`           | Authoring step for selecting ally.                 | None                          | `out`                            | Open                             | Creator-only node.                                                                                                                               |
| `lifecycle.selectHero`           | Seat-by-seat hero character selection from an authored pool. | Await `heroSelect`            | `out`                            | Closed: `heroIds[]` required     | Each active seat (turnOrder) picks one distinct hero from the shrinking candidate pool; sets `HeroState.heroRef`; loops until every seat is assigned, then continues. |
| `lifecycle.boardSetup`           | Initialize board and place initial heroes/foes.    | None                          | `out`                            | Closed: optional `spawns[]`      | Emits `board.mutate` (`setupBoard`, hero placement), runs `foe.spawn` effects from `props.spawns`, emits `ui.update`.                            |
| `lifecycle.startMonth`           | Start monthly cycle and resolve turn count.        | None                          | `out`                            | Open                             | Increments month, computes turns via PRNG and `setup.monthEnd`, resets latches, logs `startMonth`.                                               |
| `lifecycle.playerTurn`           | Start a player turn for active hero.               | None                          | `out`                            | Open                             | Increments turn counters, resets latches, logs `playerTurn`.                                                                                     |
| `lifecycle.actionStart`          | Anchor between turn start and action loop.         | None                          | `out`                            | Open                             | Pass-through.                                                                                                                                    |
| `lifecycle.actionMiddle`         | Main turn decision loop (compact/full-turn modes). | Await `action`                | `out`,`battle`,`dungeon`,`trade` | Open                             | Emits `ui.prompt` with legal actions based on latches and available spine entries.                                                               |
| `lifecycle.actionEnd`            | Mandatory skull drop boundary.                     | Await observed `skullCounter` | `out`                            | Open                             | Decrements supply, loss on empty supply, emits `tower.program` (`skull.dropTrigger`), emits `ui.update`, then awaits observed skull count delta. |
| `lifecycle.newMonthCheck`        | Month transition and quest expiry logic.           | None                          | `out`                            | Open                             | Expires active monthly quests, applies failure outcomes, routes to end evaluation at month 6 else next month/new quests.                         |
| `lifecycle.newQuests`            | Issue monthly quest pair for upcoming month.       | None                          | `out`                            | Open (runtime expects `monthly`) | Adds companion/adversary quests from props map, emits log and UI update.                                                                         |
| `lifecycle.gameEnd`              | Terminal game result gate.                         | None                          | Creator shows `won`,`lost`       | Open                             | Engine directly terminates: win if adversary defeated else lose out-of-time.                                                                     |

## Action Nodes

| Node               | Purpose / Use                                         | Inputs             | Outputs | Props                                                      | Runtime behavior                                                                       |
| ------------------ | ----------------------------------------------------- | ------------------ | ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `action.banner`    | Show a title/banner prompt in turn flow.              | None               | `out`   | Closed: `title` required, optional `body`,`splashResource` | Emits `ui.prompt` with banner text, then continues.                                    |
| `action.move`      | Move hero to chosen destination.                      | Await `moveTarget` | `out`   | Open                                                       | Emits target prompt and waits for destination decision.                                |
| `action.cleanse`   | Spend action to remove corruption.                    | None               | `out`   | Open                                                       | Applies `corruption.remove` (`count:1`).                                               |
| `action.battle`    | Enter battle target selection flow.                   | Await `target`     | `out`   | Open                                                       | Shares behavior with `battle.selectFoe`: emits target prompt and awaits decision.      |
| `action.quest`     | Resolve a quest action.                               | None               | `out`   | Open (runtime uses optional `questId`)                     | Calls `completeQuest` when `props.questId` exists; can terminate if outcomes end game. |
| `action.reinforce` | Gain warriors and consume reinforce latch.            | None               | `out`   | Open                                                       | Enforces one-use-per-turn latch, applies `resource.gain` (+2 warriors).                |
| `action.skullDrop` | Authoring anchor for explicit skull-drop style flows. | None               | `out`   | Open                                                       | Creator-only node.                                                                     |
| `action.endTurn`   | Authoring anchor for explicit end-turn branch.        | None               | `out`   | Open                                                       | Creator-only node.                                                                     |
| `action.trade`     | Resolve trade agreement between heroes.               | Await `trade`      | `out`   | Closed: `from`,`to`,`give` required, optional `receive`    | Emits trade prompt and waits for decision payload.                                     |

## Battle Nodes

| Node                       | Purpose / Use                                    | Inputs                 | Outputs | Props | Runtime behavior                                                 |
| -------------------------- | ------------------------------------------------ | ---------------------- | ------- | ----- | ---------------------------------------------------------------- |
| `battle.selectFoe`         | Select foe/adversary target for battle.          | Await `target`         | `out`   | Open  | Emits target prompt and waits for decision.                      |
| `battle.cardSelect`        | Authoring node for explicit card-choice step.    | None                   | `out`   | Open  | Creator-only node.                                               |
| `battle.applyAdvantage`    | Spend advantages or retreat decision.            | Await `advantageSpend` | `out`   | Open  | Waits for advantage-spend decision.                              |
| `battle.retreat`           | Authoring node for explicit retreat branch.      | None                   | `out`   | Open  | Creator-only node; retreat is currently handled in resume logic. |
| `battle.end`               | End of battle subflow.                           | None                   | `out`   | Open  | Pass-through.                                                    |
| `battle.removeFoeNoBattle` | Remove foe without full battle sequence.         | None                   | `out`   | Open  | Creator-only node.                                               |
| `battle.foeStatus`         | Read or branch on foe status in authored graphs. | None                   | `out`   | Open  | Creator-only node.                                               |

## Dungeon Nodes

| Node                 | Purpose / Use                                              | Inputs                | Outputs                            | Props                        | Runtime behavior                                                                                                                               |
| -------------------- | ---------------------------------------------------------- | --------------------- | ---------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `dungeon.subflow`    | Enter a library dungeon run and route outcomes.            | None                  | `enter`,`completed`,`left`         | Closed: `dungeonId` required | Validates dungeon id, bypasses cleared target dungeons via `completed`, sets dungeon cursor, emits tower + board directives, jumps to `enter`. |
| `dungeon.room`       | Resolve room behavior and room exits.                      | Depends on room logic | Dynamic (`N`,`E`,`S`,`W` or `out`) | Open                         | Delegated to `resolveRoomEntry`; runtime chooses next room and emits room-related directives.                                                  |
| `dungeon.relicTower` | Specialized authoring room type for relic/tower scenarios. | None                  | `out`                              | Open                         | Creator-only node.                                                                                                                             |

**Authoring (schema 0.4.4–0.4.5).** The Creator's first-class **Dungeons** workspace owns `library.dungeons` (grid, `masterBitmap`, optional `bitmapRect`, rooms with `cell`/`exits`/`name`/`artRef`/`displayText`/`isEntrance`/`isTarget`/`insideEvent`/`improveOnce`/`enterRequirement`). It auto-syncs the `dungeon.room` nodes and their `N/E/S/W` wires from the room graph — but **only for a dungeon that a `dungeon.subflow` references** (a library-only dungeon stays nodeless, so defining one produces no orphan/unreachable-node errors). The subflow's `enter` wire is auto-pointed at the entrance room's node. This pass supports **one entrance room** per dungeon (multi-entrance choice is a follow-up). Room `name`/`artRef` are presentational (engine passthrough). The map canvas's **Align image** mode gives the `masterBitmap` grab handles to move/scale it under the fixed grid; the placement persists as `dungeon.bitmapRect` (`{x,y,w,h}` in grid-cell units, absent = fills the grid — schema 0.4.5, presentational passthrough) and the Player's masked map renders with the same rect. L2/L3 now validate dungeons (see [Known Gaps And Mismatches](#known-gaps-and-mismatches)).

## Event Nodes

| Node               | Purpose / Use                                | Inputs | Outputs                                                                                     | Props                                             | Runtime behavior                                                                              |
| ------------------ | -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `event.router`     | Choose one event branch randomly.            | None   | `quest`,`foesStrike`,`foesSpawn`,`foesGrow`,`towerStirs`,`towerActs`,`companion`,`newWares` | Open                                              | Uses engine PRNG to pick one outbound wire from `wires.out[]`.                                |
| `event.foesStrike` | Run strike effects for current foes.         | None   | `out`                                                                                       | Open (runtime uses optional `foeIds`,`moves`)     | Logs each strike, applies foe strike effects, then optional moves.                            |
| `event.foesSpawn`  | Spawn foes during event phase.               | None   | `out`                                                                                       | Open (runtime uses `spawns[]`)                    | Applies `foe.spawn` effects for authored spawn entries.                                       |
| `event.foesGrow`   | Escalate foe status severity.                | None   | `out`                                                                                       | Open (runtime uses optional `steps`)              | Moves foes up ladder (`panicked` -> `lethal`), logs result.                                   |
| `event.towerStirs` | Rotate drum and optionally remove seal.      | None   | `out`                                                                                       | Open (runtime uses optional `level`,`removeSeal`) | Emits `tower.program` rotate op, recomputes glyph facing, optional `seal.remove`, logs event. |
| `event.towerActs`  | Apply authored tower effects list.           | None   | `out`                                                                                       | Open (runtime uses optional `effects`)            | Logs then applies each effect; can terminate if outcome changes.                              |
| `event.companion`  | Companion event and optional companion gain. | None   | `out`                                                                                       | Closed: optional `companionId`,`month`            | Adds companion to active hero when provided, updates UI, logs event.                          |
| `event.newWares`   | Refresh market wares.                        | None   | `out`                                                                                       | Open (runtime uses optional `cards`)              | Applies `market.refresh`, logs event.                                                         |
| `event.readAloud`  | Narration/read-aloud event output.           | None   | `out`                                                                                       | Open (runtime reads `text`)                       | Emits `media.play` narration directive.                                                       |

## Trigger Nodes

| Node               | Purpose / Use                                     | Inputs | Outputs | Props                      | Runtime behavior                                                       |
| ------------------ | ------------------------------------------------- | ------ | ------- | -------------------------- | ---------------------------------------------------------------------- |
| `trigger.schedule` | Engine-fired trigger root for scheduled hooks.    | None   | `out`   | Closed: `trigger` required | Entered by engine trigger system; currently pass-through once entered. |
| `trigger.onState`  | Engine-fired trigger root for state-driven hooks. | None   | `out`   | Closed: `trigger` required | Entered by engine trigger system; currently pass-through once entered. |

## Condition Nodes

| Node             | Purpose / Use                                      | Inputs | Outputs                       | Props                         | Runtime behavior                                                                       |
| ---------------- | -------------------------------------------------- | ------ | ----------------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| `cond.check`     | Assert condition must pass.                        | None   | creator exposes `pass`,`fail` | Closed: `condition` required  | Evaluates condition and throws if false.                                               |
| `cond.branch`    | Branch on condition result.                        | None   | `true`,`false`                | Closed: `condition` required  | Evaluates condition and routes to matching port; faults if target is missing.          |
| `cond.glyphGate` | Gate actions based on glyph facing and spirit tax. | None   | creator: `match`,`nomatch`    | Open (runtime reads `action`) | If gated and hero has spirit, consumes spirit and continues; else routes to `blocked`. |
| `cond.random`    | Authoring random branch helper.                    | None   | `out`                         | Open                          | Creator-only; use `event.router` for runtime random routing.                           |
| `cond.setFlag`   | Authoring helper for flag branching patterns.      | None   | `out`                         | Open                          | Creator-only; runtime flag mutation is typically via `effect.apply` + `flag.set`.      |

## Effect Nodes

| Node           | Purpose / Use                                            | Inputs | Outputs | Props                           | Runtime behavior                                                                        |
| -------------- | -------------------------------------------------------- | ------ | ------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| `effect.apply` | Apply one or many effects from closed effect vocabulary. | None   | `out`   | Closed: `effect` or `effects[]` | Applies each effect in order via `applyEffect`; can end game if effect changes outcome. |

## Tower Nodes

| Node       | Purpose / Use                               | Inputs | Outputs | Props                      | Runtime behavior                   |
| ---------- | ------------------------------------------- | ------ | ------- | -------------------------- | ---------------------------------- |
| `tower.op` | Emit one tower operation (`tower.program`). | None   | `out`   | Closed: `towerOp` required | Emits `tower.program` with one op. |

## Media Nodes

| Node              | Purpose / Use                       | Inputs | Outputs | Props                       | Runtime behavior                                                                          |
| ----------------- | ----------------------------------- | ------ | ------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `media.playVideo` | Authoring-time video playback node. | None   | `out`   | Open                        | Creator-only node.                                                                        |
| `media.playSound` | Authoring-time sound playback node. | None   | `out`   | Open                        | Creator-only node.                                                                        |
| `media.showImage` | Show image media in flow.           | None   | `out`   | Closed: `imageRef` required | Partial: schema has closed props, runtime implementation is not present in engine switch. |
| `media.narration` | Narration media output.             | None   | `out`   | Closed: `text` required     | Implemented: emits `media.play` narration directive.                                      |
| `media.cutscene`  | Composite cutscene authoring node.  | None   | `out`   | Open                        | Creator-only node.                                                                        |

## Winloss Nodes

| Node                     | Purpose / Use                      | Inputs | Outputs | Props                        | Runtime behavior                                    |
| ------------------------ | ---------------------------------- | ------ | ------- | ---------------------------- | --------------------------------------------------- |
| `winloss.mainGoal`       | Main-goal marker/anchor node.      | None   | `out`   | Closed: `questId` required   | Runtime pass-through in current engine.             |
| `winloss.winCondition`   | Declare a winning condition check. | None   | `out`   | Closed: `condition` required | If condition true, calls `winGame` and terminates.  |
| `winloss.lossCondition`  | Declare a losing condition check.  | None   | `out`   | Closed: `condition` required | If condition true, calls `loseGame` and terminates. |
| `winloss.competitiveEnd` | Competitive mode end resolver.     | None   | `out`   | Open                         | Creator-only node in current MVP slice.             |

## Utility Nodes

| Node           | Purpose / Use                                  | Inputs | Outputs | Props                                        | Runtime behavior                                                                |
| -------------- | ---------------------------------------------- | ------ | ------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| `util.linkOut` | Subgraph wiring helper out of section/subflow. | None   | `out`   | Open                                         | Creator-only node.                                                              |
| `util.linkIn`  | Subgraph wiring helper into section/subflow.   | None   | none    | Open                                         | Creator-only node; creator hides output handle.                                 |
| `util.group`   | Visual grouping/documentation container.       | None   | none    | Closed: `nodeIds` required, optional `color` | Annotation node. L3 enforces no wires, no nested groups, member ids must exist. |
| `util.comment` | Sticky-note documentation on canvas.           | None   | none    | Closed empty object                          | Annotation node. L3 enforces no wires and non-target status.                    |
| `util.catch`   | Authoring catch/fallback branch helper.        | None   | `out`   | Open                                         | Creator-only node.                                                              |

## Closed Props Matrix

These node kinds currently have explicit closed props schemas (`if/then`) in `scenario.schema.json`:

| Kind(s)                                        | Required fields       | Optional fields         |
| ---------------------------------------------- | --------------------- | ----------------------- |
| `effect.apply`                                 | `effect` or `effects` | none                    |
| `tower.op`                                     | `towerOp`             | none                    |
| `action.trade`                                 | `from`,`to`,`give`    | `receive`               |
| `action.banner`                                | `title`               | `body`,`splashResource` |
| `dungeon.subflow`                              | `dungeonId`           | none                    |
| `event.companion`                              | none                  | `companionId`,`month`   |
| `winloss.mainGoal`                             | `questId`             | none                    |
| `winloss.winCondition`,`winloss.lossCondition` | `condition`           | none                    |
| `cond.check`,`cond.branch`                     | `condition`           | none                    |
| `trigger.schedule`,`trigger.onState`           | `trigger`             | none                    |
| `media.narration`                              | `text`                | none                    |
| `media.showImage`                              | `imageRef`            | none                    |
| `lifecycle.boardSetup`                         | none                  | `spawns`                |
| `lifecycle.selectHero`                         | `heroIds`             | none                    |
| `util.comment`                                 | none                  | (no props fields)       |
| `util.group`                                   | `nodeIds`             | `color`                 |

## Authoring Patterns

### Pattern: Input boundary then resolution

Example sequence:

1. `lifecycle.actionMiddle` asks for action.
2. `action.battle` asks for target.
3. `battle.applyAdvantage` asks for spend/retreat.
4. `battle.end` rejoins turn flow.

### Pattern: Deterministic random routing

Use `event.router` for random event branch selection. It uses engine PRNG state, preserving lockstep determinism.

### Pattern: Validation-safe documentation

Use `util.comment` and `util.group` for in-canvas documentation. Do not wire to them. L3 will reject annotation wiring.

## Known Gaps And Mismatches

Current known contract mismatches worth tracking:

1. `media.showImage`

- Schema defines closed props (`imageRef`), but runtime switch does not implement this kind.
- Result: valid schema node can still fault at runtime (`node kind not implemented in MVP slice`).

2. `cond.glyphGate` output naming

- Creator handle map advertises `match`/`nomatch`.
- Runtime logic uses `out` and `blocked` when gated behavior is evaluated.
- Authors should treat this node carefully until naming is unified.

3. `lifecycle.gameEnd` creator outputs vs runtime

- Creator exposes `won`/`lost` outputs.
- Runtime implementation terminates directly and does not route by wire.

## Maintenance Checklist

When adding or changing node kinds:

1. Update `NODE_KINDS` and `OUTPUT_HANDLES` in `apps/creator/src/types/index.ts`.
2. Update schema enum and per-kind props in `packages/schema/src/scenario.schema.json`.
3. Implement or adjust runtime behavior in `packages/engine/src/engine/nodes.js`.
4. Update `packages/engine/src/engine/types.ts` unions as needed.
5. Revisit L3 constraints in `packages/adapters/src/validate-graph.ts`.
6. Update this document:

- Quick index row
- Category row
- Closed props matrix if applicable
- Known gaps section if behavior is partial

7. Run `pnpm validate:nodes` (and CI) to confirm creator/schema/catalog parity.

## Version Note

Catalog reflects the current repository state on 2026-07-04.
