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

	const state = engine.createInitialTetrisState(config);
	engine.resetTetrisState(state, config);
	if (typeof state.showGhostPiece !== "boolean") {
		state.showGhostPiece = true;
	}
	ui.baseDropMs = config.BASE_DROP_MS;
	ui.soundEnabled = true;
	let lineClearFlashTimeoutId = 0;
	// ROW_FLASH_MS ma vaere <= CSS-animasjonens varighet i @keyframes tetrisRowFlash
	// slik at cellen fremdeles blinker nar renderAll nullstiller className.
	const ROW_FLASH_MS = 160;

	const playLineClearSoundStub = createLineClearSoundStub();

	ui.boardCells = renderer.buildBoardCells(ui.board, state.rows, state.cols);
	ui.holdCells = renderer.buildPreviewCells(ui.holdPiece, config.PREVIEW_SIZE);
	ui.previewCells = renderer.buildPreviewCells(ui.nextPiece, config.PREVIEW_SIZE);

	function renderAll() {
		renderer.renderTetris(state, ui, config);
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

	function startGame() {
		if (state.running && !state.gameOver) {
			return;
		}

		if (state.gameOver || !state.activePiece) {
			engine.resetTetrisState(state, config);
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
		state.running = false;
		renderAll();
	}

	function restartGame() {
		// Restart fra overlay skal starte en ny runde umiddelbart.
		engine.resetTetrisState(state, config);
		state.running = true;
		renderAll();
	}

	function moveLeft() {
		if (!state.running || state.gameOver) {
			return;
		}

		engine.tryMoveActivePiece(state, 0, -1);
		renderAll();
	}

	function moveRight() {
		if (!state.running || state.gameOver) {
			return;
		}

		engine.tryMoveActivePiece(state, 0, 1);
		renderAll();
	}

	function rotatePiece() {
		if (!state.running || state.gameOver) {
			return;
		}

		engine.tryRotateActivePiece(state);
		renderAll();
	}

	function softDrop() {
		if (!state.running || state.gameOver) {
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
		if (!state.running || state.gameOver) {
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

	function holdPiece() {
		if (!state.running || state.gameOver) {
			return;
		}

		engine.holdActivePiece(state, config);
		renderAll();
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
		hardDrop,
	});

	function scheduleDrop() {
		// Timeout-lesing av state.dropIntervalMs gir automatisk ny fart ved level-up.
		setTimeout(() => {
			if (state.running && !state.gameOver) {
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
