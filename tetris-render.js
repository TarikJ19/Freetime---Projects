// Render-lag for Tetris. Bare DOM-oppdatering skjer her.
(function (global) {
	"use strict";

	function getPieceClasses(config) {
		const classes = [];
		for (const piece of config.PIECES) {
			if (!classes.includes(piece.className)) {
				classes.push(piece.className);
			}
		}
		return classes;
	}

	function buildBoardCells(boardElement, rows, cols) {
		boardElement.replaceChildren();

		const cells = [];
		for (let index = 0; index < rows * cols; index += 1) {
			const cell = document.createElement("span");
			cell.className = "cell";
			cells.push(cell);
			boardElement.append(cell);
		}

		return cells;
	}

	function buildPreviewCells(previewElement, size) {
		previewElement.replaceChildren();

		const cells = [];
		for (let index = 0; index < size * size; index += 1) {
			const cell = document.createElement("span");
			cells.push(cell);
			previewElement.append(cell);
		}

		return cells;
	}

	function buildDisplayBoard(state) {
		// Lag en grunn kopi av brettet for a unnga a mutere game-state direkte.
		// Den aktive brikken males inn i kopien; originalen forblir uendret.
		const board = state.board.map((row) => row.slice());

		if (!state.activePiece) {
			return board;
		}

		for (let row = 0; row < state.activePiece.matrix.length; row += 1) {
			for (let col = 0; col < state.activePiece.matrix[row].length; col += 1) {
				if (!state.activePiece.matrix[row][col]) {
					continue;
				}

				const boardRow = state.activePiece.row + row;
				const boardCol = state.activePiece.col + col;

				if (boardRow >= 0 && boardRow < state.rows && boardCol >= 0 && boardCol < state.cols) {
					board[boardRow][boardCol] = state.activePiece.className;
				}
			}
		}

		return board;
	}

	function renderBoard(state, ui) {
		const displayBoard = buildDisplayBoard(state);
		// activeCellSet holder absolutte koordinater for den aktive brikken.
		// Ghost-renderingen bruker settet for a hoppe over celler som allerede
		// er dekket av den aktive brikken (ghost skal aldri overskrive aktiv).
		const activeCellSet = new Set();

		if (state.activePiece) {
			for (let row = 0; row < state.activePiece.matrix.length; row += 1) {
				for (let col = 0; col < state.activePiece.matrix[row].length; col += 1) {
					if (!state.activePiece.matrix[row][col]) {
						continue;
					}

					const boardRow = state.activePiece.row + row;
					const boardCol = state.activePiece.col + col;
					activeCellSet.add(`${boardRow}:${boardCol}`);
				}
			}
		}

		for (let row = 0; row < state.rows; row += 1) {
			for (let col = 0; col < state.cols; col += 1) {
				const index = row * state.cols + col;
				const className = displayBoard[row][col];
				ui.boardCells[index].className = className ? `cell ${className}` : "cell";
			}
		}

		if (state.showGhostPiece !== false && global.TetrisEngine && typeof global.TetrisEngine.getGhostPiece === "function") {
			const ghostPiece = global.TetrisEngine.getGhostPiece(state);
			if (ghostPiece) {
				for (let row = 0; row < ghostPiece.matrix.length; row += 1) {
					for (let col = 0; col < ghostPiece.matrix[row].length; col += 1) {
						if (!ghostPiece.matrix[row][col]) {
							continue;
						}

						const boardRow = ghostPiece.row + row;
						const boardCol = ghostPiece.col + col;
						if (boardRow < 0 || boardRow >= state.rows || boardCol < 0 || boardCol >= state.cols) {
							continue;
						}

						const key = `${boardRow}:${boardCol}`;
						if (activeCellSet.has(key) || state.board[boardRow][boardCol]) {
							continue;
						}

						const index = boardRow * state.cols + boardCol;
						ui.boardCells[index].className = `cell ghost-piece ghost-${ghostPiece.className}`;
					}
				}
			}
		}
	}

	function buildNextPreviewMatrix(nextPiece, previewSize) {
		const grid = [];
		for (let row = 0; row < previewSize; row += 1) {
			grid.push(new Array(previewSize).fill(""));
		}

		if (!nextPiece) {
			return grid;
		}

		const pieceRows = nextPiece.matrix.length;
		const pieceCols = nextPiece.matrix[0].length;
		// Midtstill neste brikke i 4x4-ruten for mer lesbar preview.
		const rowOffset = Math.floor((previewSize - pieceRows) / 2);
		const colOffset = Math.floor((previewSize - pieceCols) / 2);

		for (let row = 0; row < pieceRows; row += 1) {
			for (let col = 0; col < pieceCols; col += 1) {
				if (nextPiece.matrix[row][col]) {
					const targetRow = row + rowOffset;
					const targetCol = col + colOffset;
					if (targetRow >= 0 && targetRow < previewSize && targetCol >= 0 && targetCol < previewSize) {
						grid[targetRow][targetCol] = nextPiece.className;
					}
				}
			}
		}

		return grid;
	}

	function renderNextPiece(state, ui, config) {
		const preview = buildNextPreviewMatrix(state.nextPiece, config.PREVIEW_SIZE);

		for (let row = 0; row < config.PREVIEW_SIZE; row += 1) {
			for (let col = 0; col < config.PREVIEW_SIZE; col += 1) {
				const index = row * config.PREVIEW_SIZE + col;
				const className = preview[row][col];
				ui.previewCells[index].className = className || "";
			}
		}
	}

	function renderHoldPiece(state, ui, config) {
		if (!ui.holdCells) {
			return;
		}

		const preview = buildNextPreviewMatrix(state.holdPiece, config.PREVIEW_SIZE);

		for (let row = 0; row < config.PREVIEW_SIZE; row += 1) {
			for (let col = 0; col < config.PREVIEW_SIZE; col += 1) {
				const index = row * config.PREVIEW_SIZE + col;
				const className = preview[row][col];
				ui.holdCells[index].className = className || "";
			}
		}
	}

	function renderHoldHint(state, ui) {
		if (!ui.holdHint) {
			return;
		}

		ui.holdHint.classList.remove("is-ready", "is-locked");

		if (!state.holdPiece) {
			ui.holdHint.textContent = "Hold: Empty (press C to store current piece)";
			return;
		}

		if (state.hasUsedHoldThisTurn) {
			ui.holdHint.textContent = "Hold: Used this turn, wait for next piece";
			ui.holdHint.classList.add("is-locked");
			return;
		}

		ui.holdHint.textContent = "Hold: Ready (press C to swap with active piece)";
		ui.holdHint.classList.add("is-ready");
	}

	function renderStats(state, ui) {
		ui.score.textContent = String(state.score).padStart(6, "0");
		ui.lines.textContent = String(state.lines);
		ui.level.textContent = String(state.level);

		if (ui.speed) {
			const speedFactor = configSafeDivide(ui.baseDropMs || 1, state.dropIntervalMs || 1);
			ui.speed.textContent = `x${speedFactor.toFixed(2)}`;
		}
	}

	function configSafeDivide(top, bottom) {
		// Vern mot divisjon med null/null/NaN; returnerer 0 i stedet for Infinity.
		if (!bottom) {
			return 0;
		}

		return top / bottom;
	}

	function renderStatus(state, ui) {
		ui.status.classList.remove("is-running", "is-paused", "is-game-over");

		if (state.gameOver) {
			ui.status.textContent = "Status: Game over";
			ui.status.classList.add("is-game-over");
			return;
		}

		if (state.running) {
			ui.status.textContent = state.hasUsedHoldThisTurn
				? "Status: Running (hold used this turn, wait for next piece)"
				: "Status: Running";
			ui.status.classList.add("is-running");
			return;
		}

		ui.status.textContent = "Status: Ready / Paused";
		ui.status.classList.add("is-paused");
	}

	function renderButtons(state, ui) {
		if (ui.startButton) {
			ui.startButton.disabled = state.running && !state.gameOver;
		}

		if (ui.pauseButton) {
			ui.pauseButton.disabled = state.gameOver || !state.activePiece;
		}

		if (ui.resetButton) {
			ui.resetButton.disabled = false;
		}

		if (ui.hardDropButton) {
			ui.hardDropButton.disabled = !state.running || state.gameOver;
		}

		if (ui.holdButton) {
			ui.holdButton.disabled = !state.running || state.gameOver || state.hasUsedHoldThisTurn || !state.activePiece;
		}

		if (ui.ghostToggleButton) {
			const isGhostOn = state.showGhostPiece !== false;
			ui.ghostToggleButton.textContent = isGhostOn ? "Ghost: ON" : "Ghost: OFF";
			ui.ghostToggleButton.classList.toggle("is-off", !isGhostOn);
			ui.ghostToggleButton.setAttribute("aria-pressed", isGhostOn ? "true" : "false");
		}

		if (ui.soundToggleButton) {
			const isSoundOn = ui.soundEnabled !== false;
			ui.soundToggleButton.textContent = isSoundOn ? "Sound: ON" : "Sound: OFF";
			ui.soundToggleButton.classList.toggle("is-off", !isSoundOn);
			ui.soundToggleButton.setAttribute("aria-pressed", isSoundOn ? "true" : "false");
		}
	}

	function renderOverlay(state, ui) {
		if (!ui.overlay) {
			return;
		}

		// Overlay vises kun ved game-over for en tydelig restart-flyt.
		const show = state.gameOver;
		ui.overlay.classList.toggle("is-hidden", !show);

		if (show && ui.overlayText) {
			ui.overlayText.textContent = `Final score: ${String(state.score).padStart(6, "0")} | Lines: ${state.lines}`;
		}
	}

	function renderTetris(state, ui, config) {
		renderBoard(state, ui);
		renderHoldPiece(state, ui, config);
		renderHoldHint(state, ui);
		renderNextPiece(state, ui, config);
		renderStats(state, ui);
		renderStatus(state, ui);
		renderButtons(state, ui);
		renderOverlay(state, ui);
	}

	global.TetrisRenderer = {
		getPieceClasses,
		buildBoardCells,
		buildPreviewCells,
		renderTetris,
	};
})(window);
