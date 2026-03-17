// Spillmotor med fokus pa enkel lesbarhet.
// Denne filen er bevisst uten DOM-kode, sa logikken kan testes separat.
(function (global) {
	"use strict";

	function createEmptyBoard(rows, cols) {
		const board = [];
		for (let row = 0; row < rows; row += 1) {
			board.push(new Array(cols).fill(""));
		}
		return board;
	}

	function cloneMatrix(matrix) {
		return matrix.map((row) => row.slice());
	}

	function clonePiece(piece) {
		return {
			name: piece.name,
			className: piece.className,
			matrix: cloneMatrix(piece.matrix),
			row: piece.row,
			col: piece.col,
		};
	}

	function rotateMatrixClockwise(matrix) {
		// Rotasjonsalgoritme: les kolonner fra venstre til hoyre, rader baklengs.
		// Tilsvarer en 90-graders klokkevis rotasjon av hele matrisen.
		// Eksempel 2x3 -> 3x2: kolonne 0 (lest nedenfra) blir ny rad 0.
		const sourceRows = matrix.length;
		const sourceCols = matrix[0].length;
		const rotated = [];

		for (let col = 0; col < sourceCols; col += 1) {
			const nextRow = [];
			for (let row = sourceRows - 1; row >= 0; row -= 1) {
				nextRow.push(matrix[row][col]);
			}
			rotated.push(nextRow);
		}

		return rotated;
	}

	function forEachFilledCell(piece, callback) {
		// matrix[row][col] er truthy (1) for fargede celler, falsy (0) for tomme.
		// Gir tilbake absolutte brett-koordinater (piece.row + lokalt row, osv.).
		for (let row = 0; row < piece.matrix.length; row += 1) {
			for (let col = 0; col < piece.matrix[row].length; col += 1) {
				if (piece.matrix[row][col]) {
					callback(piece.row + row, piece.col + col);
				}
			}
		}
	}

	function canPlacePiece(board, piece, rows, cols) {
		// NB: boardRow kan vaere negativ nar brikken akkurat har spawnet (over toppen).
		// Kun rad >= 0 sjekkes mot brettet; rader over brettet er alltid akseptert
		// slik at en ny brikke kan starte utenfor synlig omrade.
		let valid = true;

		forEachFilledCell(piece, (boardRow, boardCol) => {
			if (!valid) {
				return;
			}

			if (boardCol < 0 || boardCol >= cols || boardRow >= rows) {
				valid = false;
				return;
			}

			if (boardRow >= 0 && board[boardRow][boardCol]) {
				valid = false;
			}
		});

		return valid;
	}

	function centerPiece(piece, cols) {
		piece.row = 0;
		piece.col = Math.floor((cols - piece.matrix[0].length) / 2);
	}

	function createPieceFromTemplate(template, cols) {
		const piece = {
			name: template.name,
			className: template.className,
			matrix: cloneMatrix(template.matrix),
			row: 0,
			col: 0,
		};

		centerPiece(piece, cols);
		return piece;
	}

	function getRandomPiece(config) {
		const templates = config.PIECES;
		const index = Math.floor(Math.random() * templates.length);
		return createPieceFromTemplate(templates[index], config.COLS);
	}

	function getPieceTemplateByName(config, pieceName) {
		if (!config || !Array.isArray(config.PIECES)) {
			return null;
		}

		return config.PIECES.find((entry) => entry.name === pieceName) || null;
	}

	function buildDropIntervalMs(level, config) {
		// Eksponentiell kurve gir jevnere fartsokning enn fast lineart steg.
		const safeLevel = Math.max(1, Number(level) || 1);
		const curveFactor = typeof config.DROP_CURVE_FACTOR === "number" ? config.DROP_CURVE_FACTOR : 0.88;
		const speed = Math.round(config.BASE_DROP_MS * Math.pow(curveFactor, safeLevel - 1));
		return Math.max(config.MIN_DROP_MS, speed);
	}

	function createInitialTetrisState(config) {
		return {
			rows: config.ROWS,
			cols: config.COLS,
			board: createEmptyBoard(config.ROWS, config.COLS),
			activePiece: null,
			nextPiece: null,
			holdPiece: null,
			hasUsedHoldThisTurn: false,
			showGhostPiece: true,
			score: 0,
			lines: 0,
			level: 1,
			running: false,
			gameOver: false,
			dropIntervalMs: buildDropIntervalMs(1, config),
		};
	}

	function spawnNextPiece(state, config) {
		// Look-ahead: nextPiece er allerede valgt fra forrige spawn,
		// slik at spilleren alltid kan se neste brikke i panelet.
		if (!state.nextPiece) {
			state.nextPiece = getRandomPiece(config);
		}

		state.activePiece = clonePiece(state.nextPiece);
		centerPiece(state.activePiece, state.cols);
		state.nextPiece = getRandomPiece(config);
		state.hasUsedHoldThisTurn = false;

		if (!canPlacePiece(state.board, state.activePiece, state.rows, state.cols)) {
			state.gameOver = true;
			state.running = false;
		}
	}

	function resetTetrisState(state, config) {
		state.board = createEmptyBoard(state.rows, state.cols);
		state.activePiece = null;
		state.nextPiece = null;
		state.holdPiece = null;
		state.hasUsedHoldThisTurn = false;
		if (typeof state.showGhostPiece !== "boolean") {
			state.showGhostPiece = true;
		}
		state.score = 0;
		state.lines = 0;
		state.level = 1;
		state.running = false;
		state.gameOver = false;
		state.dropIntervalMs = buildDropIntervalMs(1, config);

		spawnNextPiece(state, config);
	}

	function tryMoveActivePiece(state, rowDelta, colDelta) {
		if (!state.activePiece || state.gameOver) {
			return false;
		}

		const candidate = clonePiece(state.activePiece);
		candidate.row += rowDelta;
		candidate.col += colDelta;

		if (!canPlacePiece(state.board, candidate, state.rows, state.cols)) {
			return false;
		}

		state.activePiece = candidate;
		return true;
	}

	function tryRotateActivePiece(state) {
		if (!state.activePiece || state.gameOver) {
			return false;
		}

		const candidate = clonePiece(state.activePiece);
		candidate.matrix = rotateMatrixClockwise(candidate.matrix);

		// Enkle "wall kicks" gjor rotasjon mer tilgivende naer veggene.
		const offsetAttempts = [0, -1, 1, -2, 2];
		for (const offset of offsetAttempts) {
			candidate.col = state.activePiece.col + offset;
			if (canPlacePiece(state.board, candidate, state.rows, state.cols)) {
				state.activePiece = candidate;
				return true;
			}
		}

		return false;
	}

	function lockActivePiece(state) {
		if (!state.activePiece) {
			return;
		}

		forEachFilledCell(state.activePiece, (boardRow, boardCol) => {
			// Brikke som lases ovenfor rad 0 betyr at brettet er fullt -> game over.
			if (boardRow < 0) {
				state.gameOver = true;
				state.running = false;
				return;
			}

			if (boardRow < state.rows && boardCol >= 0 && boardCol < state.cols) {
				state.board[boardRow][boardCol] = state.activePiece.className;
			}
		});

		state.activePiece = null;
	}

	function clearFilledLines(state) {
		// To-pass-strategi: forste pass samler rad-indeksene fra det UENDREDE brettet.
		// Disse brukes av render-laget til rad-spesifikk flash mot orginalbrettet.
		// Andre pass gjor selve fjerningen (splice+unshift endrer indekser, derav to pass).
		const clearedRows = [];
		for (let row = 0; row < state.rows; row += 1) {
			if (state.board[row].every((cell) => Boolean(cell))) {
				clearedRows.push(row);
			}
		}

		// Andre pass: fjern fulle rader og legg tomme rader opp.
		for (let row = state.rows - 1; row >= 0; row -= 1) {
			if (!state.board[row].every((cell) => Boolean(cell))) {
				continue;
			}

			state.board.splice(row, 1);
			state.board.unshift(new Array(state.cols).fill(""));
			row += 1;
		}

		return { cleared: clearedRows.length, clearedRows };
	}

	function applyScoring(state, clearedLines, config) {
		if (!clearedLines) {
			return;
		}

		const baseScore = config.SCORE_BY_LINES[clearedLines] || 0;
		state.score += baseScore * state.level;
		state.lines += clearedLines;

		const newLevel = Math.floor(state.lines / config.LINES_PER_LEVEL) + 1;
		if (newLevel !== state.level) {
			state.level = newLevel;
			state.dropIntervalMs = buildDropIntervalMs(state.level, config);
		}
	}

	function stepTetrisState(state, config) {
		if (state.gameOver || !state.activePiece) {
			return { moved: false, locked: false, clearedLines: 0, clearedRows: [], gameOver: state.gameOver };
		}

		if (tryMoveActivePiece(state, 1, 0)) {
			return { moved: true, locked: false, clearedLines: 0, gameOver: false };
		}

		lockActivePiece(state);
		const { cleared: clearedLines, clearedRows } = clearFilledLines(state);
		applyScoring(state, clearedLines, config);
		spawnNextPiece(state, config);

		return {
			moved: false,
			locked: true,
			clearedLines,
			clearedRows,
			gameOver: state.gameOver,
		};
	}

	function getGhostPiece(state) {
		if (!state.activePiece || state.gameOver) {
			return null;
		}

		const ghost = clonePiece(state.activePiece);

		// Flytt ghost nedover en rad om gangen til neste steg ville ga kollisjon.
		// Nar loopen bryter er ghost.row den laveste gyldige posisjonen.
		while (true) {
			const candidate = clonePiece(ghost);
			candidate.row += 1;

			if (!canPlacePiece(state.board, candidate, state.rows, state.cols)) {
				break;
			}

			ghost.row = candidate.row;
		}

		return ghost;
	}

	function holdActivePiece(state, config) {
		if (state.gameOver || !state.activePiece || state.hasUsedHoldThisTurn) {
			return false;
		}

		const activeTemplate = getPieceTemplateByName(config, state.activePiece.name);
		if (!activeTemplate) {
			return false;
		}

		if (!state.holdPiece) {
			state.holdPiece = createPieceFromTemplate(activeTemplate, state.cols);
			state.activePiece = null;
			spawnNextPiece(state, config);
		} else {
			const heldTemplate = getPieceTemplateByName(config, state.holdPiece.name);
			if (!heldTemplate) {
				return false;
			}

			// Hold bytter aktiv brikke med lagret brikke, men holder samme board-state.
			state.holdPiece = createPieceFromTemplate(activeTemplate, state.cols);
			state.activePiece = createPieceFromTemplate(heldTemplate, state.cols);

			if (!canPlacePiece(state.board, state.activePiece, state.rows, state.cols)) {
				state.gameOver = true;
				state.running = false;
			}
		}

		state.hasUsedHoldThisTurn = true;
		return !state.gameOver;
	}

	function hardDropActivePiece(state, config) {
		if (state.gameOver || !state.activePiece) {
			return {
				distance: 0,
				moved: false,
				locked: false,
				clearedLines: 0,
				clearedRows: [],
				gameOver: state.gameOver,
			};
		}

		let distance = 0;
		while (tryMoveActivePiece(state, 1, 0)) {
			distance += 1;
		}

		// Hard drop gir en liten bonus per rad for mer responsiv spillflyt.
		const bonusPerRow = config.HARD_DROP_BONUS_PER_ROW || 0;
		if (distance > 0 && bonusPerRow > 0) {
			state.score += distance * bonusPerRow;
		}

		const stepResult = stepTetrisState(state, config);
		return {
			distance,
			moved: stepResult.moved,
			locked: stepResult.locked,
			clearedLines: stepResult.clearedLines,
			clearedRows: stepResult.clearedRows || [],
			gameOver: stepResult.gameOver,
		};
	}

	global.TetrisEngine = {
		createEmptyBoard,
		createInitialTetrisState,
		resetTetrisState,
		rotateMatrixClockwise,
		canPlacePiece,
		tryMoveActivePiece,
		tryRotateActivePiece,
		lockActivePiece,
		clearFilledLines,
		buildDropIntervalMs,
		stepTetrisState,
		getGhostPiece,
		holdActivePiece,
		hardDropActivePiece,
	};
})(window);
