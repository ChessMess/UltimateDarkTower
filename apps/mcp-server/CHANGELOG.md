# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-02-24

### Added

- Dual-transport MCP server: stdio and HTTP (Streamable HTTP) with session management
- HTTP endpoints: `POST /mcp`, `GET /mcp` (SSE), `DELETE /mcp`, `GET /health`
- CLI flags: `--stdio-only`, `--http-only`, `--port <n>`
- 32 MCP tools across 6 categories:
  - Connection (9): `tower_connect`, `tower_disconnect`, `tower_calibrate`, `tower_status`, `tower_device_info`, `tower_is_responsive`, `tower_reconnect`, `tower_set_connection_monitoring`, `tower_set_battery_monitoring`
  - Audio (3): `tower_play_sound`, `tower_play_sound_by_name`, `tower_list_sounds`
  - Lights (6): `tower_set_lights`, `tower_set_led`, `tower_light_sequence`, `tower_light_sequence_by_name`, `tower_lights_on`, `tower_lights_off`
  - Drums (4): `tower_rotate`, `tower_rotate_drum`, `tower_random_rotate`, `tower_get_drum_positions`
  - Seals (5): `tower_break_seal`, `tower_is_seal_broken`, `tower_get_broken_seals`, `tower_reset_seals`, `tower_random_seal`
  - State & Glyphs (5): `tower_get_state`, `tower_send_state`, `tower_get_glyphs`, `tower_get_glyph`, `tower_glyphs_facing`, `tower_skull_count`, `tower_reset_skull_count`
- 17 MCP resources:
  - Tower state snapshots: `tower://connection`, `tower://device-info`, `tower://battery`, `tower://drums`, `tower://glyphs`, `tower://seals`, `tower://state`, `tower://audio-library`, `tower://light-effects`
  - Game content: `tower://game/rules`, `tower://game/adversaries`, `tower://game/quests`, `tower://game/items`, `tower://game/heroes`, `tower://game/buildings`, `tower://game/lore`, `tower://game/glossary`
- 8 MCP prompt templates: `dramatic_entrance`, `victory_sequence`, `defeat_sequence`, `monthly_transition`, `dungeon_run`, `battle_start`, `game_master_setup`, `sound_browser`
- `TowerController` singleton wrapping `ultimatedarktower` with full connection lifecycle, calibration, state management, and error wrapping via `wrapToolHandler()`
- `TowerSnapshot` interface for resource generation
- Zod validation schemas for all tool inputs (navigation, lights, audio, seals, glyphs)
- Lookup maps for case-insensitive name resolution (sounds, light sequences, light effects)
- MCP-compatible logging bridge (`McpLogOutput`)
- GitHub Flow release process and commit conventions in `CONTRIBUTING.md`
- `ci`, `type-check`, `format`, `format:check`, `prepack`, `prepublishOnly`, `publish:check` npm scripts
- `files` allowlist and `publishConfig` for clean npm publishing

### Removed

- SVG glyph assets (glyphs managed via game state resources)
