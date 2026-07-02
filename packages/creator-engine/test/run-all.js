// Runs all engine test suites sequentially as child processes.
// Each suite calls process.exit(), so they must be spawned separately.
const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
  'verbs_test.js',
  'battle_test.js',
  'dungeon_test.js',
  'lockstep_test.js',
  'corpus_test.js',
  'fixture_test.js',
  'full_turn_test.js',
  'events_test.js',
];

let allPassed = true;

for (const suite of suites) {
  console.log(`\n── ${suite} ──`);
  const result = spawnSync('node', [path.join(__dirname, suite)], { stdio: 'inherit' });
  if (result.status !== 0) {
    allPassed = false;
    break;
  }
}

process.exit(allPassed ? 0 : 1);
