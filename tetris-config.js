// Grunnkonfigurasjon for Tetris. Alt samlet her gir ett sted a justere regler.
(function (global) {
	"use strict";

	global.TetrisConfig = {
		ROWS: 20,
		COLS: 10,
		PREVIEW_SIZE: 4,
		BASE_DROP_MS: 780,
		MIN_DROP_MS: 110,
		DROP_CURVE_FACTOR: 0.88,
		LINES_PER_LEVEL: 8,
		SOFT_DROP_BONUS_PER_ROW: 1,
		HARD_DROP_BONUS_PER_ROW: 2,
		// Lydprofil for enkel finjustering pa ett sted.
		LINE_CLEAR_SOUND_MAX_GAIN: 0.08,
		CLEAR_HIGHSCORES_SOUND_GAIN_SCALE: 0.65,
		CANCEL_CLEAR_SOUND_MAX_GAIN: 0.035,
		LEVEL_UP_SOUND_MAX_GAIN: 0.12,
		GAME_OVER_SOUND_MAX_GAIN: 0.15,
		// UI-timing samlet i config for enkel justering.
		ROW_FLASH_MS: 160,
		LINE_CLEAR_FLASH_MS: 240,
		CLEAR_HIGHSCORES_FLASH_MS: 1600,
		FEEDBACK_TOAST_MS: 1700,
		// Vanskelighetsgrader mapper til start-niva (hogere niva = raskere).
		DIFFICULTY_START_LEVELS: [1, 3, 5, 7, 10],
		DEFAULT_DIFFICULTY: 2,
		SCORE_BY_LINES: {
			1: 100,
			2: 300,
			3: 500,
			4: 800,
		},
		PIECES: [
			{
				name: "I",
				className: "filled-a",
				matrix: [[1, 1, 1, 1]],
			},
			{
				name: "J",
				className: "filled-b",
				matrix: [
					[1, 0, 0],
					[1, 1, 1],
				],
			},
			{
				name: "L",
				className: "filled-c",
				matrix: [
					[0, 0, 1],
					[1, 1, 1],
				],
			},
			{
				name: "O",
				className: "filled-d",
				matrix: [
					[1, 1],
					[1, 1],
				],
			},
			{
				name: "S",
				className: "filled-e",
				matrix: [
					[0, 1, 1],
					[1, 1, 0],
				],
			},
			{
				name: "T",
				className: "filled-f",
				matrix: [
					[0, 1, 0],
					[1, 1, 1],
				],
			},
			{
				name: "Z",
				className: "filled-g",
				matrix: [
					[1, 1, 0],
					[0, 1, 1],
				],
			},
		],
	};
})(window);
