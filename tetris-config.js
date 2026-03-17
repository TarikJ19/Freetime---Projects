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
