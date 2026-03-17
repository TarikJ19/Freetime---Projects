// Entry-point for Tetris. Denne filen binder sammen config, engine, render og controls.
function initTetrisPage() {
	if (!window.TetrisConfig || !window.TetrisEngine || !window.TetrisRenderer || !window.TetrisControls) {
		return;
	}

	const ui = {
		board: document.getElementById("tetris-board"),
		holdPiece: document.getElementById("tetris-hold-piece"),
		holdHint: document.getElementById("tetris-hold-hint"),
		nextPiece: document.getElementById("tetris-next-piece"),
		score: document.getElementById("tetris-score"),
		bestScore: document.getElementById("tetris-best-score"),
		highscoreList: document.getElementById("tetris-highscore-list"),
		clearHighscoresButton: document.getElementById("tetris-clear-highscores"),
		feedback: document.getElementById("tetris-feedback"),
		lines: document.getElementById("tetris-lines"),
		level: document.getElementById("tetris-level"),
		speed: document.getElementById("tetris-speed"),
		status: document.getElementById("tetris-status"),
		overlay: document.getElementById("tetris-overlay"),
		overlayText: document.getElementById("tetris-overlay-text"),
		startButton: document.getElementById("tetris-start"),
		pauseButton: document.getElementById("tetris-pause"),
		holdButton: document.getElementById("tetris-hold"),
		ghostToggleButton: document.getElementById("tetris-ghost-toggle"),
		soundToggleButton: document.getElementById("tetris-sound-toggle"),
		hardDropButton: document.getElementById("tetris-hard-drop"),
		resetButton: document.getElementById("tetris-reset"),
		restartButton: document.getElementById("tetris-restart"),
	};

	if (
		!ui.board ||
		!ui.holdPiece ||
		!ui.nextPiece ||
		!ui.score ||
		!ui.lines ||
		!ui.level ||
		!ui.speed ||
		!ui.status ||
		!ui.overlay ||
		!ui.overlayText ||
		!ui.startButton ||
		!ui.pauseButton ||
		!ui.holdButton ||
		!ui.ghostToggleButton ||
		!ui.hardDropButton ||
		!ui.resetButton
	) {
		return;
	}

	const config = window.TetrisConfig;
	const engine = window.TetrisEngine;
	const renderer = window.TetrisRenderer;
	const controls = window.TetrisControls;
	const BEST_SCORE_STORAGE_KEY = "freetime-tetris-best-score-v1";
	const HIGH_SCORE_LIST_STORAGE_KEY = "freetime-tetris-highscore-list-v1";
	const HIGH_SCORE_LIMIT = 5;
	const CLEAR_HIGHSCORES_FLASH_LABEL = "Cleared!";
	const CLEAR_HIGHSCORES_FLASH_MS = 1600;

	const state = engine.createInitialTetrisState(config);
	engine.resetTetrisState(state, config);
	if (typeof state.showGhostPiece !== "boolean") {
		state.showGhostPiece = true;
	}
	ui.highscoreValues = loadStoredHighScoreList();
	ui.bestScoreValue = Math.max(loadStoredBestScore(), ui.highscoreValues[0] || 0);
	ui.roundStartBestScore = ui.bestScoreValue;
	ui.hasRecordedCurrentGameScore = false;
	ui.lastGameWasNewBest = false;
	ui.clearHighscoresDefaultLabel = ui.clearHighscoresButton ? ui.clearHighscoresButton.textContent : "Clear Top 5";
	ui.baseDropMs = config.BASE_DROP_MS;
	ui.soundEnabled = true;
	let lineClearFlashTimeoutId = 0;
	let feedbackTimeoutId = 0;
	let clearHighscoresLabelTimeoutId = 0;
	// ROW_FLASH_MS ma vaere <= CSS-animasjonens varighet i @keyframes tetrisRowFlash
	// slik at cellen fremdeles blinker nar renderAll nullstiller className.
	const ROW_FLASH_MS = 160;

	const playLineClearSoundStub = createLineClearSoundStub();

	ui.boardCells = renderer.buildBoardCells(ui.board, state.rows, state.cols);
	ui.holdCells = renderer.buildPreviewCells(ui.holdPiece, config.PREVIEW_SIZE);
	ui.previewCells = renderer.buildPreviewCells(ui.nextPiece, config.PREVIEW_SIZE);

	function renderAll() {
		syncPersistentScores();
		renderer.renderTetris(state, ui, config);
		renderHighScoreList();
	}

	function loadStoredBestScore() {
		if (typeof window.localStorage === "undefined") {
			return 0;
		}

		try {
			const rawValue = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
			const parsed = Number(rawValue);
			return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
		} catch (error) {
			return 0;
		}
	}

	function loadStoredHighScoreList() {
		if (typeof window.localStorage === "undefined") {
			return [];
		}

		try {
			const rawValue = window.localStorage.getItem(HIGH_SCORE_LIST_STORAGE_KEY);
			if (!rawValue) {
				return [];
			}

			const parsed = JSON.parse(rawValue);
			if (!Array.isArray(parsed)) {
				return [];
			}

			return parsed
				.map((value) => Number(value))
				.filter((value) => Number.isFinite(value) && value > 0)
				.sort((left, right) => right - left)
				.slice(0, HIGH_SCORE_LIMIT);
		} catch (error) {
			return [];
		}
	}

	function saveStoredBestScore(score) {
		if (typeof window.localStorage === "undefined") {
			return;
		}

		try {
			window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(score));
		} catch (error) {
			// Ignorer lagringsfeil (f.eks. private mode / blokkert storage).
		}
	}

	function saveStoredHighScoreList(scoreList) {
		if (typeof window.localStorage === "undefined") {
			return;
		}

		try {
			window.localStorage.setItem(HIGH_SCORE_LIST_STORAGE_KEY, JSON.stringify(scoreList));
		} catch (error) {
			// Ignorer lagringsfeil (f.eks. private mode / blokkert storage).
		}
	}

	function clearStoredScores() {
		if (typeof window.localStorage === "undefined") {
			return;
		}

		try {
			window.localStorage.removeItem(BEST_SCORE_STORAGE_KEY);
			window.localStorage.removeItem(HIGH_SCORE_LIST_STORAGE_KEY);
		} catch (error) {
			// Ignorer lagringsfeil (f.eks. private mode / blokkert storage).
		}
	}

	function renderHighScoreList() {
		if (!ui.highscoreList) {
			return;
		}

		ui.highscoreList.replaceChildren();

		if (!ui.highscoreValues.length) {
			const emptyItem = document.createElement("li");
			emptyItem.className = "is-empty";
			emptyItem.textContent = "No scores yet";
			ui.highscoreList.append(emptyItem);
			return;
		}

		for (let index = 0; index < ui.highscoreValues.length; index += 1) {
			const item = document.createElement("li");
			item.textContent = `#${index + 1} ${String(ui.highscoreValues[index]).padStart(6, "0")}`;
			ui.highscoreList.append(item);
		}
	}

	function rememberFinishedRoundScore() {
		if (!state.gameOver || ui.hasRecordedCurrentGameScore) {
			return;
		}

		ui.hasRecordedCurrentGameScore = true;
		ui.lastGameWasNewBest = state.score > ui.roundStartBestScore;

		if (state.score <= 0) {
			return;
		}

		// Enkel toppliste: legg til score, sorter synkende, behold topp 5.
		ui.highscoreValues.push(state.score);
		ui.highscoreValues.sort((left, right) => right - left);
		ui.highscoreValues = ui.highscoreValues.slice(0, HIGH_SCORE_LIMIT);
		saveStoredHighScoreList(ui.highscoreValues);
	}

	function syncPersistentScores() {
		rememberFinishedRoundScore();

		const listBest = ui.highscoreValues[0] || 0;
		const nextBest = Math.max(ui.bestScoreValue, state.score, listBest);
		if (nextBest !== ui.bestScoreValue) {
			ui.bestScoreValue = nextBest;
			saveStoredBestScore(ui.bestScoreValue);
		}

		if (ui.bestScore) {
			ui.bestScore.textContent = String(ui.bestScoreValue).padStart(6, "0");
		}
	}

	function markRoundStart() {
		ui.hasRecordedCurrentGameScore = false;
		ui.lastGameWasNewBest = false;
		ui.roundStartBestScore = ui.bestScoreValue;
	}

	function showFeedback(message) {
		if (!ui.feedback) {
			return;
		}

		ui.feedback.textContent = message;
		ui.feedback.classList.add("is-visible");

		if (feedbackTimeoutId) {
			window.clearTimeout(feedbackTimeoutId);
		}

		// Kort toast: tydelig bekreftelse uten at panelet blir visuelt stoyete.
		feedbackTimeoutId = window.setTimeout(() => {
			if (!ui.feedback) {
				return;
			}

			ui.feedback.classList.remove("is-visible");
			ui.feedback.textContent = "";
			feedbackTimeoutId = 0;
		}, 1700);
	}

	function flashClearHighscoresButtonLabel() {
		if (!ui.clearHighscoresButton) {
			return;
		}

		ui.clearHighscoresButton.textContent = CLEAR_HIGHSCORES_FLASH_LABEL;

		if (clearHighscoresLabelTimeoutId) {
			window.clearTimeout(clearHighscoresLabelTimeoutId);
		}

		// Kort visning av suksess-tekst pa knappen for tydelig handlingseffekt.
		clearHighscoresLabelTimeoutId = window.setTimeout(() => {
			if (!ui.clearHighscoresButton) {
				return;
			}

			ui.clearHighscoresButton.textContent = ui.clearHighscoresDefaultLabel;
			clearHighscoresLabelTimeoutId = 0;
		}, CLEAR_HIGHSCORES_FLASH_MS);
	}

	function createLineClearSoundStub() {
		// AudioContext opprettes lazily (forste linjerydding) for a unnga
		// autoplay-blokkering i nettlesere som krever brukerinteraksjon forst.
		const AudioCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtor) {
			return () => {};
		}

		let context = null;
		return (clearedLines) => {
			// soundEnabled sjekkes pa kall-tidspunktet slik at toggle virker umiddelbart.
			if (!clearedLines || ui.soundEnabled === false) {
				return;
			}

			if (!context) {
				context = new AudioCtor();
			}

			if (context.state === "suspended") {
				context.resume().catch(() => {});
			}

			const osc = context.createOscillator();
			const gain = context.createGain();

			const now = context.currentTime;
			// Hoyre toneleie nar flere linjer cleares pa en gang.
			const baseHz = 420 + Math.min(clearedLines, 4) * 55;

			// Lydbanen: oscillator -> gain-node -> output.
			// Gain rampes opp raskt og ned eksponentielt for en kort 'ping'-lyd.
			osc.type = "triangle";
			osc.frequency.setValueAtTime(baseHz, now);
			osc.frequency.linearRampToValueAtTime(baseHz + 90, now + 0.08);

			gain.gain.setValueAtTime(0.001, now);
			gain.gain.linearRampToValueAtTime(0.08, now + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

			osc.connect(gain);
			gain.connect(context.destination);

			osc.start(now);
			osc.stop(now + 0.18);
		};
	}

	function triggerLineClearFeedback(clearedLines, clearedRows, onComplete) {
		if (!clearedLines || !ui.board) {
			if (onComplete) {
				onComplete();
			}
			return;
		}

		// Hel-brett-glimt (eksisterende global flash).
		if (lineClearFlashTimeoutId) {
			window.clearTimeout(lineClearFlashTimeoutId);
		}

		// void offsetWidth tvinger nettleseren til a gjore en reflow.
		// Dette nullstiller CSS-animasjonen slik at den spiller av pa nytt
		// selv om klassen allerede var pa elementet fra forrige clear.
		ui.board.classList.remove("is-line-clear-flash");
		void ui.board.offsetWidth;
		ui.board.classList.add("is-line-clear-flash");

		lineClearFlashTimeoutId = window.setTimeout(() => {
			ui.board.classList.remove("is-line-clear-flash");
			lineClearFlashTimeoutId = 0;
		}, 260);

		// Rad-spesifikk flash pa cellene som ble ryddet (vises mot det gamle brettet).
		if (clearedRows && clearedRows.length && ui.boardCells) {
			for (const rowIndex of clearedRows) {
				for (let col = 0; col < state.cols; col += 1) {
					const idx = rowIndex * state.cols + col;
					if (ui.boardCells[idx]) {
						ui.boardCells[idx].classList.add("is-row-flash");
					}
				}
			}
		}

		// Lyd-stubben sjekker ui.soundEnabled internt.
		playLineClearSoundStub(clearedLines);

		// Forsink renderAll slik at flash-animasjonen spiller av mot det gamle brettet.
		if (onComplete) {
			window.setTimeout(onComplete, ROW_FLASH_MS);
		}
	}

	function applyStepFeedback(stepResult, onComplete) {
		if (!stepResult || !stepResult.clearedLines) {
			if (onComplete) {
				onComplete();
			}
			return;
		}

		triggerLineClearFeedback(stepResult.clearedLines, stepResult.clearedRows || [], onComplete);
	}

	function isRoundActive() {
		// Felles sjekk: spillerinput skal kun gjelde mens runden er aktiv.
		return state.running && !state.gameOver;
	}

	function runActiveAction(action) {
		// Reduserer repetisjon i venstre/hoyre/roter/hold-handlere.
		if (!isRoundActive()) {
			return;
		}

		action();
		renderAll();
	}

	function startGame() {
		if (state.running && !state.gameOver) {
			return;
		}

		if (state.gameOver || !state.activePiece) {
			engine.resetTetrisState(state, config);
			markRoundStart();
		}

		state.running = true;
		renderAll();
	}

	function togglePause() {
		if (state.gameOver) {
			return;
		}

		state.running = !state.running;
		renderAll();
	}

	function resetGame() {
		engine.resetTetrisState(state, config);
		markRoundStart();
		state.running = false;
		renderAll();
	}

	function restartGame() {
		// Restart fra overlay skal starte en ny runde umiddelbart.
		engine.resetTetrisState(state, config);
		markRoundStart();
		state.running = true;
		renderAll();
	}

	function moveLeft() {
		runActiveAction(() => {
			engine.tryMoveActivePiece(state, 0, -1);
		});
	}

	function moveRight() {
		runActiveAction(() => {
			engine.tryMoveActivePiece(state, 0, 1);
		});
	}

	function rotatePiece() {
		runActiveAction(() => {
			engine.tryRotateActivePiece(state);
		});
	}

	function softDrop() {
		if (!isRoundActive()) {
			return;
		}

		const moved = engine.tryMoveActivePiece(state, 1, 0);
		if (moved && config.SOFT_DROP_BONUS_PER_ROW) {
			state.score += config.SOFT_DROP_BONUS_PER_ROW;
		}

		if (!moved) {
			const stepResult = engine.stepTetrisState(state, config);
			// renderAll passeres som callback og kalles etter eventuell rad-flash.
			applyStepFeedback(stepResult, renderAll);
			return;
		}

		renderAll();
	}

	function hardDrop() {
		if (!isRoundActive()) {
			return;
		}

		// Hard drop flytter brikken rett ned, laster den, og trigger neste spawn.
		const stepResult = engine.hardDropActivePiece(state, config);
		applyStepFeedback(stepResult, renderAll);
	}

	function toggleGhost() {
		state.showGhostPiece = !state.showGhostPiece;
		renderAll();
	}

	function toggleSound() {
		// Flipp lydtilstand; knapp-tekst oppdateres via renderAll.
		ui.soundEnabled = !ui.soundEnabled;
		renderAll();
	}

	function clearHighscores() {
		if (state.running) {
			return;
		}

		// Ingen lagrede scorer: da er det ingenting a nullstille.
		if (!ui.highscoreValues.length && ui.bestScoreValue <= 0) {
			return;
		}

		// Bekreftelse hindrer utilsiktet sletting av topplisten.
		if (typeof window.confirm === "function") {
			const confirmed = window.confirm("Vil du slette Top 5 og best score?");
			if (!confirmed) {
				return;
			}
		}

		// Ved game over nullstiller vi runden for a unnga at gammel score settes tilbake.
		if (state.gameOver) {
			engine.resetTetrisState(state, config);
			state.running = false;
		}

		ui.highscoreValues = [];
		ui.bestScoreValue = 0;
		markRoundStart();
		clearStoredScores();
		renderAll();
		flashClearHighscoresButtonLabel();
		showFeedback("Topplisten er slettet.");
	}

	function holdPiece() {
		runActiveAction(() => {
			engine.holdActivePiece(state, config);
		});
	}

	controls.attachTetrisControls(ui, {
		start: startGame,
		pause: togglePause,
		reset: resetGame,
		restart: restartGame,
		left: moveLeft,
		right: moveRight,
		down: softDrop,
		rotate: rotatePiece,
		hold: holdPiece,
		toggleGhost,
		toggleSound,
		clearHighscores,
		hardDrop,
	});

	function scheduleDrop() {
		// Timeout-lesing av state.dropIntervalMs gir automatisk ny fart ved level-up.
		setTimeout(() => {
			if (isRoundActive()) {
				const stepResult = engine.stepTetrisState(state, config);
				// renderAll via callback; kalles etter eventuell rad-flash.
				applyStepFeedback(stepResult, renderAll);
			}

			scheduleDrop();
		}, state.dropIntervalMs);
	}

	renderAll();
	scheduleDrop();
}

document.addEventListener("DOMContentLoaded", () => {
	if (document.body.classList.contains("page-game")) {
		initTetrisPage();
	}
});
