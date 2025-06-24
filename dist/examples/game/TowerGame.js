"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = __importStar(require("../../src"));
const DarkTower = new src_1.default();
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
    GameDifficulty: null,
    TowerPicks: [],
    PlayerPicks: [],
    DoorwayLights: []
};
const GameState = Object.create(GAME_STATE);
const startGame = () => {
    this.isGameOver = false;
    const btn = document.getElementById('challenge-btn');
    btn.textContent = 'Challenge Tower';
    btn.disabled = false;
    const sbtn = document.getElementById('start-game-btn');
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
            !this.hasCalibrated && DarkTower.calibrate();
            this.hasCalibrated = true;
        })();
    }
    console.log('[GAME] New game started');
};
async function challengeTower() {
    if (this.isGameOver) {
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
    const isGameOver = GameState.TotalPlayerScore >= GameState.WIN_SCORE || GameState.CurrentMonth === GameState.END_OF_GAME;
    if (isGameOver) {
        gameOver();
    }
}
async function gameOver() {
    this.isGameOver = true;
    const playerWon = GameState.TotalPlayerScore >= GameState.WIN_SCORE;
    const sbtn = document.getElementById('start-game-btn');
    sbtn.disabled = false;
    sbtn.textContent = "Start New Game";
    disableDifficultyChange(false);
    const cbtn = document.getElementById('challenge-btn');
    cbtn.textContent = 'Game Over';
    if (playerWon) {
        cbtn.textContent = 'You Beat The Tower!!';
        fireConfettiCannon();
    }
    console.log(`[GAME] Game over, final score ${GameState.TotalPlayerScore}`);
}
async function revealPicksOnTower() {
    var _a, _b, _c;
    console.log("[GAME] The Tower reveals...", GameState.TowerPicks);
    // drums
    // split is used because of values like 'empty south' etc
    const topGlyph = (_a = src_1.GLYPHS[GameState.TowerPicks[0]]) !== null && _a !== void 0 ? _a : { side: GameState.TowerPicks[0].split(" ")[1] };
    const middleGlyph = (_b = src_1.GLYPHS[GameState.TowerPicks[1]]) !== null && _b !== void 0 ? _b : { side: GameState.TowerPicks[1].split(" ")[1] };
    const bottomGlyph = (_c = src_1.GLYPHS[GameState.TowerPicks[2]]) !== null && _c !== void 0 ? _c : { side: GameState.TowerPicks[2].split(" ")[1] };
    const rotate = { top: topGlyph.side, middle: middleGlyph.side, bottom: bottomGlyph.side };
    // lights
    const doorwayLights = getDoorwayLightsCommand();
    const lights = { doorway: doorwayLights };
    // sound
    const sound = getScoringSound();
    await DarkTower.MultiCommand(rotate, lights, sound);
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
};
const getDoorwayLightsCommand = () => {
    // light up the doorways
    // matches set lights to full on, unmatched set to flicker
    let doorways = [];
    let level = ["top", "middle", "bottom"];
    for (let index = 0; index < GameState.PlayerPicks.length; index++) {
        if (GameState.PlayerPicks[index] === GameState.TowerPicks[index]) {
            doorways.push({ position: "north", level: level[index], style: "on" });
        }
        else {
            doorways.push({ position: "north", level: level[index], style: "flicker" });
        }
    }
    return doorways;
};
const getScoringSound = () => {
    const matchedAll = GameState.RoundScore >= 3;
    const matchedNone = GameState.RoundScore === 0;
    const isGameOver = GameState.TotalPlayerScore >= GameState.WIN_SCORE || GameState.CurrentMonth === GameState.END_OF_GAME;
    const didPlayerWin = isGameOver && GameState.TotalPlayerScore >= GameState.WIN_SCORE;
    const didPlayerLose = isGameOver && !didPlayerWin;
    let sound = 0;
    if (matchedAll)
        sound = src_1.TOWER_AUDIO_LIBRARY.ClassicAttackTower.value;
    if (matchedNone)
        sound = src_1.TOWER_AUDIO_LIBRARY.TowerGloat1.value;
    if (didPlayerWin)
        sound = src_1.TOWER_AUDIO_LIBRARY.ClassicStartMonth.value;
    if (didPlayerLose)
        sound = src_1.TOWER_AUDIO_LIBRARY.ClassicQuestFailed.value;
    return sound;
};
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
};
const disableDifficultyChange = (setting) => {
    const btns = document.getElementsByName('difficulty');
    btns.forEach(b => { if (!b.checked)
        b.disabled = setting; });
};
// 50% chance per level
const setDifficultyNormal = () => {
    GameState.GameDifficulty = {
        top: ["Cleanse", "Quest"],
        middle: ["Battle", "Empty South"],
        bottom: ["Banner", "Reinforce"]
    };
    populateSelections();
};
// 33% chance per level
const setDifficultyGritty = () => {
    GameState.GameDifficulty = {
        top: ["Cleanse", "Quest", "Empty East"],
        middle: ["Battle", "Empty East", "Empty West"],
        bottom: ["Banner", "Reinforce", "Empty West"]
    };
    populateSelections();
};
// 25% chance per level
const setDifficultyMax = () => {
    GameState.GameDifficulty = {
        top: ["Cleanse", "Quest", "Empty East", "Empty West"],
        middle: ["Battle", "Empty East", "Empty West", "Empty South"],
        bottom: ["Banner", "Reinforce", "Empty East", "Empty West"]
    };
    populateSelections();
};
const resetScore = () => {
    GameState.CurrentMonth = 0;
    GameState.TotalPlayerScore = 0;
    const cm = document.getElementById("currentMonth");
    const cs = document.getElementById("currentScore");
    cm.innerHTML = GameState.CurrentMonth.toString();
    cs.innerHTML = GameState.TotalPlayerScore.toString();
};
const updateScoreHTML = () => {
    const cm = document.getElementById("currentMonth");
    const cs = document.getElementById("currentScore");
    cm.innerHTML = GameState.CurrentMonth.toString();
    cs.innerHTML = GameState.TotalPlayerScore.toString();
};
const updateTowerPicksHTML = () => {
    const top = document.querySelector("select[name='tower-picks'][data-level='top']");
    top.textContent = GameState.TowerPicks[0];
    const middle = document.querySelector("select[name='tower-picks'][data-level='middle']");
    middle.textContent = GameState.TowerPicks[1];
    const bottom = document.querySelector("select[name='tower-picks'][data-level='bottom']");
    bottom.textContent = GameState.TowerPicks[2];
};
const updatePlayerPicks = () => {
    GameState.PlayerPicks = [];
    const top = document.querySelector("select[name='player-picks'][data-level='top']");
    GameState.PlayerPicks[0] = top.value.toLowerCase();
    const middle = document.querySelector("select[name='player-picks'][data-level='middle']");
    GameState.PlayerPicks[1] = middle.value.toLowerCase();
    const bottom = document.querySelector("select[name='player-picks'][data-level='bottom']");
    GameState.PlayerPicks[2] = bottom.value.toLowerCase();
};
const setTowerPicks = () => {
    GameState.TowerPicks = [];
    for (let level = 1; level < 4; level++) {
        GameState.TowerPicks.push(pickRandomGlyph(level).toLowerCase());
    }
    updateTowerPicksHTML();
};
// malevolant sentience
const pickRandomGlyph = (difficultyLevel) => {
    let glyphs = null;
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
    const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
    return glyph;
};
// populate dropdowns
const populateSelections = () => {
    const dropDowns = document.querySelectorAll('select[id="glyphs"]');
    dropDowns.forEach((item) => {
        const el = Object.keys(item)[0];
        while (item.options.length > 1) {
            item.options.remove(1);
        }
        let glyphs = null;
        switch (item.dataset.level) {
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
        glyphs.forEach(aGlyph => {
            var el = document.createElement("option");
            el.textContent = aGlyph;
            el.value = aGlyph;
            item.appendChild(el);
        });
    });
};
// user clicks on glyphs
const glyphClick = (glyph) => {
    let top = null;
    let middle = null;
    let bottom = null;
    switch (glyph) {
        case "cleanse":
            top = document.querySelector("select[name='player-picks'][data-level='top']");
            GameState.PlayerPicks[0] = "Cleanse";
            top.value = "Cleanse";
            break;
        case "quest":
            top = document.querySelector("select[name='player-picks'][data-level='top']");
            GameState.PlayerPicks[0] = "Quest";
            top.value = "Quest";
            break;
        case "battle":
            middle = document.querySelector("select[name='player-picks'][data-level='middle']");
            GameState.PlayerPicks[1] = "Battle";
            middle.value = "Battle";
            break;
        case "banner":
            bottom = document.querySelector("select[name='player-picks'][data-level='bottom']");
            GameState.PlayerPicks[2] = "Banner";
            bottom.value = "Banner";
            break;
        case "reinforce":
            bottom = document.querySelector("select[name='player-picks'][data-level='bottom']");
            GameState.PlayerPicks[2] = "Reinforce";
            bottom.value = "Reinforce";
            break;
    }
};
//# sourceMappingURL=TowerGame.js.map