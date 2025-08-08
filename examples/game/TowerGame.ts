
import UltimateDarkTower, { GLYPHS, TOWER_AUDIO_LIBRARY, type DoorwayLight, type TowerLevels, type Glyphs } from '../../src';

const DarkTower = new UltimateDarkTower();

const GAME_STATE = {
  //constants
  WIN_SCORE: 10,
  TOTAL_PICKS: 3,
  END_OF_GAME: 6,
  QUIT_GAME_TEXT: "I Concede Defeat",

  //variables
  CurrentMonth: 0,
  TotalPlayerScore: 0,
  RoundScore: 0,
  HasCalibrated: false,
  GameDifficulty: null as any,
  TowerPicks: [] as string[],
  PlayerPicks: [] as string[],
  DoorwayLights: [] as any[],
  isGameOver: false
};

const GameState = Object.create(GAME_STATE);

const startGame = () => {
  GameState.isGameOver = false;
  const btn = document.getElementById('challenge-btn') as HTMLButtonElement;
  btn.textContent = 'Challenge Tower';
  btn.disabled = false;
  const sbtn = document.getElementById('start-game-btn') as HTMLButtonElement;
  if (sbtn.textContent === GameState.QUIT_GAME_TEXT) {
    gameOver();
    return;
  }
  sbtn.disabled = false;
  sbtn.textContent = GameState.QUIT_GAME_TEXT;

  resetScore();
  populateSelections();

  if (!DarkTower.isConnected) {
    (async () => {
      await DarkTower.connect();
      !GameState.HasCalibrated && DarkTower.calibrate();
      GameState.HasCalibrated = true;
    })();
  }
  console.log('[GAME] New game started');
}

async function challengeTower() {
  if (GameState.isGameOver) {
    if (GameState.TotalPlayerScore >= GameState.WIN_SCORE)
      fireConfettiCannon();
    return;
  }

  // reconnect check
  if (!DarkTower.isConnected) {
    await DarkTower.connect();
    return;
  }

  // lock difficulty once player makes first pick
  if (GameState.CurrentMonth === 1) {
    disableDifficultyChange(true);
  }

  // get player picks and set tower picks
  updatePlayerPicks();

  // the tower chooses and reveals
  setTowerPicks();

  // update score
  GameState.CurrentMonth++;
  updateScore();

  await revealPicksOnTower();
  updateScoreHTML();

  const isGameOver = GameState.TotalPlayerScore >= GameState.WIN_SCORE || GameState.CurrentMonth === GameState.END_OF_GAME
  if (isGameOver) {
    gameOver();
  }
}

async function gameOver() {
  GameState.isGameOver = true;
  const playerWon = GameState.TotalPlayerScore >= GameState.WIN_SCORE;

  const sbtn = document.getElementById('start-game-btn') as HTMLButtonElement;
  sbtn.disabled = false;
  sbtn.textContent = "Start New Game";

  disableDifficultyChange(false);

  const cbtn = document.getElementById('challenge-btn') as HTMLButtonElement;
  cbtn.textContent = 'Game Over';

  if (playerWon) {
    cbtn.textContent = 'You Beat The Tower!!';
    fireConfettiCannon();
  }

  console.log(`[GAME] Game over, final score ${GameState.TotalPlayerScore}`);
}

async function revealPicksOnTower() {
  console.log("[GAME] The Tower reveals...", GameState.TowerPicks);

  // drums
  // split is used because of values like 'empty south' etc
  const topGlyph = GLYPHS[GameState.TowerPicks[0]] ?? { side: GameState.TowerPicks[0].split(" ")[1] };
  const middleGlyph = GLYPHS[GameState.TowerPicks[1]] ?? { side: GameState.TowerPicks[1].split(" ")[1] };
  const bottomGlyph = GLYPHS[GameState.TowerPicks[2]] ?? { side: GameState.TowerPicks[2].split(" ")[1] };

  // lights
  const doorwayLights = getDoorwayLightsCommand();
  const lights = { doorway: doorwayLights };

  // sound
  const sound = getScoringSound();

  // Execute commands in sequence using available API methods
  // Use rotateWithState to preserve other tower state, then set lights and play sound
  await DarkTower.rotateWithState(topGlyph.side, middleGlyph.side, bottomGlyph.side);
  await DarkTower.Lights(lights);
  if (sound > 0) {
    await DarkTower.playSound(sound);
  }
}

const updateScore = () => {
  // reset round score
  GameState.RoundScore = 0;

  // score matches
  console.log('scoring', GameState.TowerPicks, GameState.PlayerPicks);
  for (let index = 0; index < GameState.PlayerPicks.length; index++) {
    if (GameState.PlayerPicks[index] === GameState.TowerPicks[index]) {
      GameState.RoundScore++;
    }
  }

  // add bonus
  const matchedAll = GameState.RoundScore === 3;
  if (matchedAll) {
    GameState.RoundScore += GameState.GameDifficulty.top.length - 1;
  }

  GameState.TotalPlayerScore += GameState.RoundScore;
  console.log(`[GAME] currentMonth: ${GameState.CurrentMonth}  currentScore: ${GameState.TotalPlayerScore}`);
}

const getDoorwayLightsCommand = (): Array<DoorwayLight> => {
  // light up the doorways
  // matches set lights to full on, unmatched set to flicker
  let doorways: Array<DoorwayLight> = [];
  let level: Array<TowerLevels> = ["top", "middle", "bottom"];
  for (let index = 0; index < GameState.PlayerPicks.length; index++) {
    if (GameState.PlayerPicks[index] === GameState.TowerPicks[index]) {
      doorways.push({ position: "north", level: level[index], style: "on" });
    } else {
      doorways.push({ position: "north", level: level[index], style: "flicker" });
    }
  }
  return doorways;
}

const getScoringSound = (): number => {
  const matchedAll = GameState.RoundScore >= 3;
  const matchedNone = GameState.RoundScore === 0;
  const isGameOver = GameState.TotalPlayerScore >= GameState.WIN_SCORE || GameState.CurrentMonth === GameState.END_OF_GAME
  const didPlayerWin = isGameOver && GameState.TotalPlayerScore >= GameState.WIN_SCORE
  const didPlayerLose = isGameOver && !didPlayerWin;
  let sound = 0;

  if (matchedAll)
    sound = TOWER_AUDIO_LIBRARY.ClassicAttackTower.value;
  if (matchedNone)
    sound = TOWER_AUDIO_LIBRARY.TowerGloat1.value;
  if (didPlayerWin)
    sound = TOWER_AUDIO_LIBRARY.ClassicStartMonth.value;
  if (didPlayerLose)
    sound = TOWER_AUDIO_LIBRARY.ClassicQuestFailed.value;

  return sound;
}

const fireConfettiCannon = () => {
  var scalar = 3;
  // @ts-ignore
  var skull = confetti.shapeFromText({ text: '💀', scalar });
  // @ts-ignore
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
  // @ts-ignore
  confetti({
    startVelocity: 100,
    decay: .82,
    particleCount: 75,
    spread: 70,
    origin: { y: 0.6 },
    shapes: [skull],
    scalar
  });
}

const disableDifficultyChange = (setting: boolean) => {
  const btns = document.getElementsByName('difficulty') as NodeListOf<HTMLInputElement>;
  btns.forEach(b => { if (!b.checked) b.disabled = setting; })
}

// 50% chance per level
const setDifficultyNormal = () => {
  GameState.GameDifficulty = {
    top: ["Cleanse", "Quest"],
    middle: ["Battle", "Empty South"],
    bottom: ["Banner", "Reinforce"]
  };
  populateSelections();
}

// 33% chance per level
const setDifficultyGritty = () => {
  GameState.GameDifficulty = {
    top: ["Cleanse", "Quest", "Empty East"],
    middle: ["Battle", "Empty East", "Empty West"],
    bottom: ["Banner", "Reinforce", "Empty West"]
  };
  populateSelections();
}

// 25% chance per level
const setDifficultyMax = () => {
  GameState.GameDifficulty = {
    top: ["Cleanse", "Quest", "Empty East", "Empty West"],
    middle: ["Battle", "Empty East", "Empty West", "Empty South"],
    bottom: ["Banner", "Reinforce", "Empty East", "Empty West"]
  };
  populateSelections();
}

const resetScore = () => {
  GameState.CurrentMonth = 0;
  GameState.TotalPlayerScore = 0;
  const cm = document.getElementById("currentMonth");
  const cs = document.getElementById("currentScore");
  if (cm) cm.innerHTML = GameState.CurrentMonth.toString();
  if (cs) cs.innerHTML = GameState.TotalPlayerScore.toString();
}

const updateScoreHTML = () => {
  const cm = document.getElementById("currentMonth");
  const cs = document.getElementById("currentScore");
  if (cm) cm.innerHTML = GameState.CurrentMonth.toString();
  if (cs) cs.innerHTML = GameState.TotalPlayerScore.toString();
}

const updateTowerPicksHTML = () => {
  const top = document.querySelector("select[name='tower-picks'][data-level='top']");
  if (top) top.textContent = GameState.TowerPicks[0];
  const middle = document.querySelector("select[name='tower-picks'][data-level='middle']");
  if (middle) middle.textContent = GameState.TowerPicks[1];
  const bottom = document.querySelector("select[name='tower-picks'][data-level='bottom']");
  if (bottom) bottom.textContent = GameState.TowerPicks[2];
}

const updatePlayerPicks = () => {
  GameState.PlayerPicks = [];
  const top = document.querySelector("select[name='player-picks'][data-level='top']") as HTMLInputElement;
  GameState.PlayerPicks[0] = top.value.toLowerCase();
  const middle = document.querySelector("select[name='player-picks'][data-level='middle']") as HTMLInputElement;
  GameState.PlayerPicks[1] = middle.value.toLowerCase();
  const bottom = document.querySelector("select[name='player-picks'][data-level='bottom']") as HTMLInputElement;
  GameState.PlayerPicks[2] = bottom.value.toLowerCase();
}

const setTowerPicks = () => {
  GameState.TowerPicks = [];
  for (let level = 1; level < 4; level++) {
    GameState.TowerPicks.push(pickRandomGlyph(level).toLowerCase());
  }
  updateTowerPicksHTML();
}

// malevolant sentience
const pickRandomGlyph = (difficultyLevel: number): string => {
  let glyphs: string[] | null = null;
  switch (difficultyLevel) {
    case 1:
      glyphs = GameState.GameDifficulty.top;
      break;
    case 2:
      glyphs = GameState.GameDifficulty.middle;
      break;
    default:
      glyphs = GameState.GameDifficulty.bottom;
      break;
  }
  if (!glyphs) return "";
  const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
  return glyph;
}

// populate dropdowns
const populateSelections = () => {
  const dropDowns = document.querySelectorAll('select[id="glyphs"]');
  dropDowns.forEach((item) => {
    const selectElement = item as HTMLSelectElement;
    const el = Object.keys(selectElement)[0];
    while (selectElement.options.length > 1) {
      selectElement.options.remove(1);
    }
    let glyphs: string[] | null = null;
    switch (selectElement.dataset.level) {
      case "top":
        glyphs = GameState.GameDifficulty.top;
        break;
      case "middle":
        glyphs = GameState.GameDifficulty.middle;
        break;
      default:
        glyphs = GameState.GameDifficulty.bottom;
        break;
    }

    if (glyphs) {
      glyphs.forEach(aGlyph => {
        var el = document.createElement("option");
        el.textContent = aGlyph;
        el.value = aGlyph;
        selectElement.appendChild(el);
      });
    }
  });
}

// user clicks on glyphs
const glyphClick = (glyph: Glyphs) => {
  let top: HTMLSelectElement | null = null;
  let middle: HTMLSelectElement | null = null;
  let bottom: HTMLSelectElement | null = null;

  switch (glyph) {
    case "cleanse":
      top = document.querySelector("select[name='player-picks'][data-level='top']") as HTMLSelectElement;
      GameState.PlayerPicks[0] = "Cleanse";
      if (top) top.value = "Cleanse";
      break;
    case "quest":
      top = document.querySelector("select[name='player-picks'][data-level='top']") as HTMLSelectElement;
      GameState.PlayerPicks[0] = "Quest";
      if (top) top.value = "Quest";
      break;
    case "battle":
      middle = document.querySelector("select[name='player-picks'][data-level='middle']") as HTMLSelectElement;
      GameState.PlayerPicks[1] = "Battle";
      if (middle) middle.value = "Battle";
      break;
    case "banner":
      bottom = document.querySelector("select[name='player-picks'][data-level='bottom']") as HTMLSelectElement;
      GameState.PlayerPicks[2] = "Banner";
      if (bottom) bottom.value = "Banner";
      break;
    case "reinforce":
      bottom = document.querySelector("select[name='player-picks'][data-level='bottom']") as HTMLSelectElement;
      GameState.PlayerPicks[2] = "Reinforce";
      if (bottom) bottom.value = "Reinforce";
      break;
  }
}

// Make functions available globally for HTML to call
(window as any).startGame = startGame;
(window as any).challengeTower = challengeTower;
(window as any).setDifficultyNormal = setDifficultyNormal;
(window as any).setDifficultyGritty = setDifficultyGritty;
(window as any).setDifficultyMax = setDifficultyMax;
(window as any).populateSelections = populateSelections;
(window as any).resetScore = resetScore;
(window as any).glyphClick = glyphClick;