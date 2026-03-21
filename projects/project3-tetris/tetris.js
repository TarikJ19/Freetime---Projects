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
		helpButton: document.getElementById("tetris-help"),
		helpPanel: document.getElementById("tetris-help-panel"),
		difficultybtnList: document.querySelectorAll(".difficulty-btn"),
		touchLeftBtn: document.getElementById("tetris-touch-left"),
		touchRightBtn: document.getElementById("tetris-touch-right"),
		touchDownBtn: document.getElementById("tetris-touch-down"),
		touchRotateBtn: document.getElementById("tetris-touch-rotate"),
		touchHardDropBtn: document.getElementById("tetris-touch-hard-drop"),
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
	const DIFFICULTY_STORAGE_KEY = "freetime-tetris-difficulty-v1";
	const HIGH_SCORE_LIMIT = 5;
	const CLEAR_HIGHSCORES_FLASH_LABEL = "Cleared!";
	// UI-timing leses fra config, men fallback holder bakoverkompatibilitet.
	const CLEAR_HIGHSCORES_FLASH_MS =
		typeof config.CLEAR_HIGHSCORES_FLASH_MS === "number" && config.CLEAR_HIGHSCORES_FLASH_MS > 0
			? config.CLEAR_HIGHSCORES_FLASH_MS
			: 1600;
	const FEEDBACK_TOAST_MS =
		typeof config.FEEDBACK_TOAST_MS === "number" && config.FEEDBACK_TOAST_MS > 0 ? config.FEEDBACK_TOAST_MS : 1700;
	// ROW_FLASH_MS ma vaere <= CSS-animasjonens varighet i @keyframes tetrisRowFlash
	// slik at cellen fremdeles blinker nar renderAll nullstiller className.
	const ROW_FLASH_MS = typeof config.ROW_FLASH_MS === "number" && config.ROW_FLASH_MS > 0 ? config.ROW_FLASH_MS : 160;
	// LINE_CLEAR_FLASH_MS ma vaere <= CSS-animasjonens varighet i @keyframes tetrisLineClearFlash
	// slik at hele brettet blinker nar linjer fjernes.
	const LINE_CLEAR_FLASH_MS =
		typeof config.LINE_CLEAR_FLASH_MS === "number" && config.LINE_CLEAR_FLASH_MS > 0 ? config.LINE_CLEAR_FLASH_MS : 240;
	// Lydprofiler leses fra config, men fallback holder bakoverkompatibilitet.
	const LINE_CLEAR_SOUND_MAX_GAIN =
		typeof config.LINE_CLEAR_SOUND_MAX_GAIN === "number" ? config.LINE_CLEAR_SOUND_MAX_GAIN : 0.08;
	const CLEAR_HIGHSCORES_SOUND_GAIN_SCALE =
		typeof config.CLEAR_HIGHSCORES_SOUND_GAIN_SCALE === "number" ? config.CLEAR_HIGHSCORES_SOUND_GAIN_SCALE : 0.65;
	const CANCEL_CLEAR_SOUND_MAX_GAIN =
		typeof config.CANCEL_CLEAR_SOUND_MAX_GAIN === "number" ? config.CANCEL_CLEAR_SOUND_MAX_GAIN : 0.035;
	const LEVEL_UP_SOUND_MAX_GAIN =
		typeof config.LEVEL_UP_SOUND_MAX_GAIN === "number" ? config.LEVEL_UP_SOUND_MAX_GAIN : 0.12;
	const GAME_OVER_SOUND_MAX_GAIN =
		typeof config.GAME_OVER_SOUND_MAX_GAIN === "number" ? config.GAME_OVER_SOUND_MAX_GAIN : 0.15;
	// Vanskelighetsgrader: hvilke start-niva er tilgjengelige, og default.
	const DIFFICULTY_START_LEVELS =
		Array.isArray(config.DIFFICULTY_START_LEVELS) && config.DIFFICULTY_START_LEVELS.length >= 5
			? config.DIFFICULTY_START_LEVELS
			: [1, 3, 5, 7, 10];
	const DEFAULT_DIFFICULTY =
		typeof config.DEFAULT_DIFFICULTY === "number" && config.DEFAULT_DIFFICULTY > 0 ? config.DEFAULT_DIFFICULTY : 2;

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
	// Tracker variabler for a detektere level-up og game-over hendelser.
	let previousLevel = 1;
	let previousGameOver = false;
	// Vanskelighetsgrad lastes fra localStorage (eller bruk default).
	let selectedDifficulty = loadStoredDifficulty();

	const playLineClearSoundStub = createLineClearSoundStub();
	const playClearHighscoresSound = createClearHighscoresSoundStub();
	const playCancelClearHighscoresSound = createCancelClearHighscoresSoundStub();
	const playLevelUpSound = createLevelUpSoundStub();
	const playGameOverSound = createGameOverSoundStub();

	ui.boardCells = renderer.buildBoardCells(ui.board, state.rows, state.cols);
	ui.holdCells = renderer.buildPreviewCells(ui.holdPiece, config.PREVIEW_SIZE);
	ui.previewCells = renderer.buildPreviewCells(ui.nextPiece, config.PREVIEW_SIZE);
	if (ui.board) {
		// Synk CSS-animasjon mot config-styrt varighet i JS.
		ui.board.style.setProperty("--tetris-row-flash-ms", `${ROW_FLASH_MS}ms`);
		ui.board.style.setProperty("--tetris-line-clear-flash-ms", `${LINE_CLEAR_FLASH_MS}ms`);
	}

	// Oppdater visuell marking av valgt vanskelighetsgrad og koble opp knappehandlere.
	updateDifficultyUI();
	if (ui.difficultybtnList && ui.difficultybtnList.length > 0) {
		ui.difficultybtnList.forEach((btn) => {
			btn.addEventListener("click", () => {
				const difficultyLevel = Number(btn.dataset.difficulty);
				setDifficulty(difficultyLevel);
			});
		});
	}

	// Hooke opp mobile touch-button handlers.
	// Disse kalles direkte her (ikke via controls.attachTetrisControls) fordi de mangler i handlers-objektet.
	if (ui.touchLeftBtn) {
		ui.touchLeftBtn.addEventListener("touchstart", (e) => {
			e.preventDefault();
			moveLeft();
		});
	}
	if (ui.touchRightBtn) {
		ui.touchRightBtn.addEventListener("touchstart", (e) => {
			e.preventDefault();
			moveRight();
		});
	}
	if (ui.touchDownBtn) {
		ui.touchDownBtn.addEventListener("touchstart", (e) => {
			e.preventDefault();
			softDrop();
		});
	}
	if (ui.touchRotateBtn) {
		ui.touchRotateBtn.addEventListener("touchstart", (e) => {
			e.preventDefault();
			rotatePiece();
		});
	}
	if (ui.touchHardDropBtn) {
		ui.touchHardDropBtn.addEventListener("touchstart", (e) => {
			e.preventDefault();
			hardDrop();
		});
	}

	function renderAll() {
		// Detekter level-up hendelse (enkelt fram for state-endringer).
		if (state.level > previousLevel) {
			playLevelUpSound();
			previousLevel = state.level;
		}

		// Detekter game-over hendelse.
		if (state.gameOver && !previousGameOver) {
			playGameOverSound();
			previousGameOver = state.gameOver;
		}

		// Reset game-over tracker naar spillet starter paNew (underforstatt i startGame()).
		if (!state.gameOver && previousGameOver) {
			previousGameOver = false;
		}

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

	function loadStoredDifficulty() {
		if (typeof window.localStorage === "undefined") {
			return DEFAULT_DIFFICULTY;
		}

		try {
			const rawValue = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
			const parsed = Number(rawValue);
			// Sjekk at varet er gyldig vanskelighetsgrad (1-5).
			if (Number.isFinite(parsed) && parsed >= 1 && parsed <= DIFFICULTY_START_LEVELS.length) {
				return parsed;
			}
			return DEFAULT_DIFFICULTY;
		} catch (error) {
			return DEFAULT_DIFFICULTY;
		}
	}

	function saveStoredDifficulty(difficulty) {
		if (typeof window.localStorage === "undefined") {
			return;
		}

		try {
			window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, String(difficulty));
		} catch (error) {
			// Ignorer lagringsfeil.
		}
	}

	function updateDifficultyUI() {
		// Oppdater visuell marking av valgt vanskelighetsgrad.
		if (ui.difficultybtnList && ui.difficultybtnList.length > 0) {
			ui.difficultybtnList.forEach((btn) => {
				const btnDifficulty = Number(btn.dataset.difficulty);
				if (btnDifficulty === selectedDifficulty) {
					btn.classList.add("is-selected");
				} else {
					btn.classList.remove("is-selected");
				}
			});
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
			// Highlight det forste elementet hvis det er en ny highscore (eller ny beste score generelt).
			if (index === 0 && ui.lastGameWasNewBest) {
				item.classList.add("is-new-highscore");
			}
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
		const hadNewHighscoreBefore = ui.lastGameWasNewBest;
		rememberFinishedRoundScore();

		// Vis toast hvis spillet nettopp avsluttet med en ny highscore.
		if (!hadNewHighscoreBefore && ui.lastGameWasNewBest) {
			showFeedback("🎉 New highscore!", "success");
		}

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

	function showFeedback(message, variant) {
		if (!ui.feedback) {
			return;
		}

		// Variant-klasser gir tydelig forskjell mellom suksess og avbrutt handling.
		const variantClass = variant === "cancel" ? "is-cancel" : "is-success";
		ui.feedback.textContent = message;
		ui.feedback.classList.remove("is-cancel", "is-success");
		ui.feedback.classList.add("is-visible", variantClass);

		if (feedbackTimeoutId) {
			window.clearTimeout(feedbackTimeoutId);
		}

		// Kort toast: tydelig bekreftelse uten at panelet blir visuelt stoyete.
		feedbackTimeoutId = window.setTimeout(() => {
			if (!ui.feedback) {
				return;
			}

			ui.feedback.classList.remove("is-visible", "is-cancel", "is-success");
			ui.feedback.textContent = "";
			feedbackTimeoutId = 0;
		}, FEEDBACK_TOAST_MS);
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
		return (clearedLines, gainScale) => {
			// soundEnabled sjekkes pa kall-tidspunktet slik at toggle virker umiddelbart.
			if (!clearedLines || ui.soundEnabled === false) {
				return;
			}

			const safeGainScale = typeof gainScale === "number" && gainScale > 0 ? gainScale : 1;
			const targetGain = LINE_CLEAR_SOUND_MAX_GAIN * safeGainScale;

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
			gain.gain.linearRampToValueAtTime(targetGain, now + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

			osc.connect(gain);
			gain.connect(context.destination);

			osc.start(now);
			osc.stop(now + 0.18);
		};
	}

	function createClearHighscoresSoundStub() {
		// Gjenbruker eksisterende linje-lyd med lav intensitet for enkel, konsistent UX.
		return () => {
			playLineClearSoundStub(1, CLEAR_HIGHSCORES_SOUND_GAIN_SCALE);
		};
	}

	function createCancelClearHighscoresSoundStub() {
		const AudioCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtor) {
			return () => {};
		}

		let context = null;
		return () => {
			if (ui.soundEnabled === false) {
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

			// Lav, kort tone signaliserer at handlingen ble avbrutt.
			osc.type = "sine";
			osc.frequency.setValueAtTime(260, now);
			osc.frequency.exponentialRampToValueAtTime(190, now + 0.12);

			gain.gain.setValueAtTime(0.001, now);
			gain.gain.linearRampToValueAtTime(CANCEL_CLEAR_SOUND_MAX_GAIN, now + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

			osc.connect(gain);
			gain.connect(context.destination);

			osc.start(now);
			osc.stop(now + 0.13);
		};
	}

	function createLevelUpSoundStub() {
		// Oppover-glimt: stigning fra 440 Hz til 880 Hz signaliserer framskritt.
		const AudioCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtor) {
			return () => {};
		}

		let context = null;
		return () => {
			if (ui.soundEnabled === false) {
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

			// Oppover-glimt signaliserer at nivaa har okt.
			osc.type = "sine";
			osc.frequency.setValueAtTime(440, now);
			osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

			gain.gain.setValueAtTime(0.001, now);
			gain.gain.linearRampToValueAtTime(LEVEL_UP_SOUND_MAX_GAIN, now + 0.05);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

			osc.connect(gain);
			gain.connect(context.destination);

			osc.start(now);
			osc.stop(now + 0.21);
		};
	}

	function createGameOverSoundStub() {
		// Nedover-glimt: stigning fra 300 Hz ned signaliserer at spillet er over.
		const AudioCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtor) {
			return () => {};
		}

		let context = null;
		return () => {
			if (ui.soundEnabled === false) {
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

			// Nedover-glimt signaliserer at spillet er slutt.
			osc.type = "sine";
			osc.frequency.setValueAtTime(262.5, now);
			osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);

			gain.gain.setValueAtTime(0.001, now);
			gain.gain.linearRampToValueAtTime(GAME_OVER_SOUND_MAX_GAIN, now + 0.05);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

			osc.connect(gain);
			gain.connect(context.destination);

			osc.start(now);
			osc.stop(now + 0.41);
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
		}, LINE_CLEAR_FLASH_MS + 20);

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
			// Anvend valgt vanskelighetsgrad som start-level.
			const startLevel = DIFFICULTY_START_LEVELS[selectedDifficulty - 1];
			if (typeof startLevel === "number" && startLevel > 0) {
				state.level = startLevel;
				// Beregn drop-intervall basert pa niva (same formel som engine).
				const curveFactor = typeof config.DROP_CURVE_FACTOR === "number" ? config.DROP_CURVE_FACTOR : 0.88;
				const speed = Math.round(config.BASE_DROP_MS * Math.pow(curveFactor, state.level - 1));
				state.dropIntervalMs = Math.max(config.MIN_DROP_MS, speed);
			}
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

	function toggleHelp() {
		// Viser/skjuler hjelpepanelet med tastaturkontroller.
		if (ui.helpPanel) {
			ui.helpPanel.classList.toggle("is-visible");
		}
	}

	function setDifficulty(difficultyLevel) {
		// Endrte valgt vanskelighetsgrad og oppdater UI.
		if (typeof difficultyLevel === "number" && difficultyLevel >= 1 && difficultyLevel <= DIFFICULTY_START_LEVELS.length) {
			selectedDifficulty = difficultyLevel;
			saveStoredDifficulty(selectedDifficulty);
			updateDifficultyUI();
		}
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
				playCancelClearHighscoresSound();
				showFeedback("Sletting avbrutt.", "cancel");
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
		playClearHighscoresSound();
		flashClearHighscoresButtonLabel();
		showFeedback("Topplisten er slettet.", "success");
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
		toggleHelp,
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
