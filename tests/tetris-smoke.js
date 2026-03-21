/**
 * tetris-smoke.js
 * Kjor med: node tests/tetris-smoke.js
 * Tester grunnlogikk i Tetris-motoren.
 */

"use strict";

const fs = require("fs");
const vm = require("vm");

let passed = 0;
let failed = 0;

function section(name) {
	console.log(`\n=== ${name} ===`);
}

function assert(name, condition) {
	if (condition) {
		console.log(`  PASS  ${name}`);
		passed += 1;
	} else {
		console.error(`  FAIL  ${name}`);
		failed += 1;
	}
}

function makeClassList() {
	const classes = new Set();
	return {
		add(...names) {
			for (const name of names) {
				classes.add(name);
			}
		},
		remove(...names) {
			for (const name of names) {
				classes.delete(name);
			}
		},
		toggle(name, force) {
			if (typeof force === "boolean") {
				if (force) {
					classes.add(name);
				} else {
					classes.delete(name);
				}
				return classes.has(name);
			}

			if (classes.has(name)) {
				classes.delete(name);
				return false;
			}

			classes.add(name);
			return true;
		},
		contains(name) {
			return classes.has(name);
		},
	};
}

function makeUiElement() {
	return {
		textContent: "",
		disabled: false,
		className: "",
		classList: makeClassList(),
		setAttribute() {},
	};
}

// Enkel sandbox som etterligner window-global i browser.
const sandbox = {
	console,
	window: null,
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("projects/project3-tetris/tetris-config.js", "utf8"), sandbox);
vm.runInContext(fs.readFileSync("projects/project3-tetris/tetris-engine.js", "utf8"), sandbox);
vm.runInContext(fs.readFileSync("projects/project3-tetris/tetris-render.js", "utf8"), sandbox);

const C = sandbox.TetrisConfig;
const E = sandbox.TetrisEngine;
const R = sandbox.TetrisRenderer;
const sharedStyles = fs.readFileSync("shared/styles.css", "utf8");

section("State-opprettelse");
const state = E.createInitialTetrisState(C);
assert("Rows = 20", state.rows === 20);
assert("Cols = 10", state.cols === 10);
assert("Board har 20 rader", state.board.length === 20);
assert("Hver rad har 10 kolonner", state.board.every((row) => row.length === 10));

section("Lydprofil i config");
assert("LINE_CLEAR_SOUND_MAX_GAIN finnes", typeof C.LINE_CLEAR_SOUND_MAX_GAIN === "number");
assert("CLEAR_HIGHSCORES_SOUND_GAIN_SCALE finnes", typeof C.CLEAR_HIGHSCORES_SOUND_GAIN_SCALE === "number");
assert("CANCEL_CLEAR_SOUND_MAX_GAIN finnes", typeof C.CANCEL_CLEAR_SOUND_MAX_GAIN === "number");
assert("LEVEL_UP_SOUND_MAX_GAIN finnes", typeof C.LEVEL_UP_SOUND_MAX_GAIN === "number");
assert("GAME_OVER_SOUND_MAX_GAIN finnes", typeof C.GAME_OVER_SOUND_MAX_GAIN === "number");

section("UI-timing i config");
assert("ROW_FLASH_MS finnes", typeof C.ROW_FLASH_MS === "number");
assert("LINE_CLEAR_FLASH_MS finnes", typeof C.LINE_CLEAR_FLASH_MS === "number");
assert("CLEAR_HIGHSCORES_FLASH_MS finnes", typeof C.CLEAR_HIGHSCORES_FLASH_MS === "number");
assert("FEEDBACK_TOAST_MS finnes", typeof C.FEEDBACK_TOAST_MS === "number");

section("Vanskelighetsgrader i config");
assert("DIFFICULTY_START_LEVELS er array", Array.isArray(C.DIFFICULTY_START_LEVELS));
assert("DIFFICULTY_START_LEVELS har minst 5 elementer", C.DIFFICULTY_START_LEVELS.length >= 5);
assert("DEFAULT_DIFFICULTY finnes", typeof C.DEFAULT_DIFFICULTY === "number");
assert(
	"DEFAULT_DIFFICULTY er innenfor tilgjengelige niva",
	C.DEFAULT_DIFFICULTY >= 1 && C.DEFAULT_DIFFICULTY <= C.DIFFICULTY_START_LEVELS.length
);
assert(
	"Alle difficulty-niva er positive tall",
	C.DIFFICULTY_START_LEVELS.every((level) => typeof level === "number" && Number.isFinite(level) && level > 0)
);
assert(
	"Difficulty-niva er ikke synkende",
	C.DIFFICULTY_START_LEVELS.every((level, index, levels) => index === 0 || level >= levels[index - 1])
);

section("Overlay-synlighet (regresjon)");
// Sikrer at game-over overlay kan skjules i starttilstand.
assert(
	"shared/styles.css har .tetris-overlay.is-hidden",
	/\.tetris-overlay\.is-hidden\s*\{[^}]*\}/m.test(sharedStyles)
);
assert(
	".tetris-overlay.is-hidden setter display: none",
	/\.tetris-overlay\.is-hidden\s*\{[^}]*display\s*:\s*none\s*;[^}]*\}/m.test(sharedStyles)
);

section("Preview-farger (regresjon)");
assert(
	"shared/styles.css har filled-regler for mini-grid",
	/\.mini-grid\s+span\.filled-a\s*\{[^}]*\}/m.test(sharedStyles) &&
		/\.mini-grid\s+span\.filled-g\s*\{[^}]*\}/m.test(sharedStyles)
);

section("Overlay-rendering (UI-kontrakt)");
const overlayState = E.createInitialTetrisState(C);
E.resetTetrisState(overlayState, C);
const overlayUi = {
	boardCells: Array.from({ length: overlayState.rows * overlayState.cols }, () => ({ className: "cell" })),
	holdCells: Array.from({ length: C.PREVIEW_SIZE * C.PREVIEW_SIZE }, () => ({ className: "" })),
	previewCells: Array.from({ length: C.PREVIEW_SIZE * C.PREVIEW_SIZE }, () => ({ className: "" })),
	holdHint: makeUiElement(),
	score: makeUiElement(),
	lines: makeUiElement(),
	level: makeUiElement(),
	speed: makeUiElement(),
	status: makeUiElement(),
	startButton: makeUiElement(),
	pauseButton: makeUiElement(),
	resetButton: makeUiElement(),
	hardDropButton: makeUiElement(),
	holdButton: makeUiElement(),
	ghostToggleButton: makeUiElement(),
	soundToggleButton: makeUiElement(),
	clearHighscoresButton: makeUiElement(),
	overlay: makeUiElement(),
	overlayText: makeUiElement(),
	soundEnabled: true,
	baseDropMs: C.BASE_DROP_MS,
	highscoreValues: [],
	bestScoreValue: 0,
	lastGameWasNewBest: false,
};

R.renderTetris(overlayState, overlayUi, C);
assert("Overlay skjules i starttilstand", overlayUi.overlay.classList.contains("is-hidden") === true);

overlayState.gameOver = true;
overlayState.score = 4321;
overlayState.lines = 12;
overlayUi.lastGameWasNewBest = true;
R.renderTetris(overlayState, overlayUi, C);
assert("Overlay vises ved game over", overlayUi.overlay.classList.contains("is-hidden") === false);
assert("Overlay-tekst viser score", overlayUi.overlayText.textContent.includes("004321"));
assert("Overlay-tekst viser New best", overlayUi.overlayText.textContent.includes("New best!"));

section("Reset + spawn");
E.resetTetrisState(state, C);
assert("Active piece finnes", Boolean(state.activePiece));
assert("Next piece finnes", Boolean(state.nextPiece));
assert("7-bag finnes i state", Array.isArray(state.pieceBag));
assert("7-bag har 5 igjen etter active+next", state.pieceBag.length === 5);

const firstBagNames = [state.activePiece.name, state.nextPiece.name].concat(state.pieceBag.map((piece) => piece.name));
const uniqueFirstBagNames = new Set(firstBagNames);
assert("Forste bag har totalt 7 brikker", firstBagNames.length === 7);
assert("Forste bag inneholder 7 unike brikker", uniqueFirstBagNames.size === 7);

assert("Running starter som false", state.running === false);
assert("Game over starter som false", state.gameOver === false);
assert("Ghost preview starter pa", state.showGhostPiece === true);

state.showGhostPiece = false;
E.resetTetrisState(state, C);
assert("Ghost toggle beholdes gjennom reset", state.showGhostPiece === false);

section("Roteringshjelper");
const rotated = E.rotateMatrixClockwise([
	[1, 2],
	[3, 4],
]);
assert("Rotering gir riktig resultat", rotated[0][0] === 3 && rotated[0][1] === 1 && rotated[1][0] === 4 && rotated[1][1] === 2);

section("Bevegelse");
const moveState = E.createInitialTetrisState(C);
E.resetTetrisState(moveState, C);
const startCol = moveState.activePiece.col;
const movedLeft = E.tryMoveActivePiece(moveState, 0, -1);
assert("Kan flytte venstre minst ett steg", movedLeft === true);
assert("Kolonne er oppdatert", moveState.activePiece.col === startCol - 1);

let hitWall = false;
for (let i = 0; i < 20; i += 1) {
	if (!E.tryMoveActivePiece(moveState, 0, -1)) {
		hitWall = true;
		break;
	}
}
assert("Stopper ved venstre vegg", hitWall === true);

section("Linjerydding");
const clearState = E.createInitialTetrisState(C);
E.resetTetrisState(clearState, C);
for (let col = 1; col < clearState.cols; col += 1) {
	clearState.board[clearState.rows - 1][col] = "filled-a";
}
clearState.activePiece = {
	name: "Test",
	className: "filled-b",
	matrix: [[1]],
	row: clearState.rows - 1,
	col: 0,
};
E.lockActivePiece(clearState);
const clearResult = E.clearFilledLines(clearState);
assert("En full rad blir ryddet", clearResult.cleared === 1);
assert("clearFilledLines returnerer rad-indekser", Array.isArray(clearResult.clearedRows) && clearResult.clearedRows.length === 1);
assert("Nederste rad er tom etter rydding", clearState.board[clearState.rows - 1].every((cell) => cell === ""));

section("Step + scoring");
const scoreState = E.createInitialTetrisState(C);
E.resetTetrisState(scoreState, C);
for (let col = 1; col < scoreState.cols; col += 1) {
	scoreState.board[scoreState.rows - 1][col] = "filled-a";
}
scoreState.activePiece = {
	name: "Test",
	className: "filled-c",
	matrix: [[1]],
	row: scoreState.rows - 1,
	col: 0,
};
scoreState.running = true;
const stepResult = E.stepTetrisState(scoreState, C);
assert("Step lasser brikken", stepResult.locked === true);
assert("Step rapporterer 1 ryddet linje", stepResult.clearedLines === 1);
assert("Step returnerer clearedRows-array", Array.isArray(stepResult.clearedRows) && stepResult.clearedRows.length === 1);
assert("Score ok for 1 linje", scoreState.score === 100);
assert("Lines teller opp", scoreState.lines === 1);

section("Hard drop");
const dropState = E.createInitialTetrisState(C);
E.resetTetrisState(dropState, C);
dropState.activePiece = {
	name: "Test",
	className: "filled-d",
	matrix: [[1]],
	row: 0,
	col: 0,
};
dropState.running = true;
const hardDropResult = E.hardDropActivePiece(dropState, C);
assert("Hard drop flytter minst 1 rad", hardDropResult.distance > 0);
assert("Hard drop laster brikken", hardDropResult.locked === true);
assert("Hard drop gir bonuspoeng", dropState.score === hardDropResult.distance * C.HARD_DROP_BONUS_PER_ROW);

section("Hold piece");
const holdState = E.createInitialTetrisState(C);
E.resetTetrisState(holdState, C);
const originalActiveName = holdState.activePiece.name;
const holdWorked = E.holdActivePiece(holdState, C);
assert("Forste hold fungerer", holdWorked === true);
assert("Hold slot fylles", Boolean(holdState.holdPiece) && holdState.holdPiece.name === originalActiveName);
assert("Hold kan kun brukes en gang per turn", holdState.hasUsedHoldThisTurn === true);

const blockedHold = E.holdActivePiece(holdState, C);
assert("Andre hold i samme turn blokkeres", blockedHold === false);

holdState.hasUsedHoldThisTurn = false;
const previousHoldName = holdState.holdPiece.name;
const previousActiveName = holdState.activePiece.name;
const swapWorked = E.holdActivePiece(holdState, C);
assert("Hold swap fungerer", swapWorked === true);
assert("Aktiv brikke blir tidligere hold", holdState.activePiece.name === previousHoldName);
assert("Hold blir tidligere aktiv", holdState.holdPiece.name === previousActiveName);

section("Ghost piece");
const ghostState = E.createInitialTetrisState(C);
E.resetTetrisState(ghostState, C);
ghostState.activePiece = {
	name: "Test",
	className: "filled-a",
	matrix: [[1]],
	row: 0,
	col: 2,
};
const ghost = E.getGhostPiece(ghostState);
assert("Ghost beregnes", Boolean(ghost));
assert("Ghost lander pa nederste rad", ghost.row === ghostState.rows - 1);

section("Drop-hastighet");
assert("Niva 1 bruker base speed", E.buildDropIntervalMs(1, C) === C.BASE_DROP_MS);
assert("Niva 5 er raskere enn niva 1", E.buildDropIntervalMs(5, C) < E.buildDropIntervalMs(1, C));
assert("Hoyt niva stopper pa min speed", E.buildDropIntervalMs(99, C) === C.MIN_DROP_MS);

const total = passed + failed;
console.log(`\n${"-".repeat(46)}`);
console.log(`Resultat: ${passed}/${total} bestatt`);
if (failed > 0) {
	process.exit(1);
}
