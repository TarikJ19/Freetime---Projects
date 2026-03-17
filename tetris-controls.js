// Tastatur- og knappestyring samlet i egen fil.
(function (global) {
	"use strict";

	function attachTetrisControls(ui, handlers) {
		function attachClick(buttonElement, handler) {
			// Samme sikkerhetssjekk for alle knapper: element ma finnes, handler ma vaere funksjon.
			if (buttonElement && typeof handler === "function") {
				buttonElement.addEventListener("click", handler);
			}
		}

		attachClick(ui.startButton, handlers.start);
		attachClick(ui.pauseButton, handlers.pause);
		attachClick(ui.resetButton, handlers.reset);
		attachClick(ui.holdButton, handlers.hold);
		attachClick(ui.hardDropButton, handlers.hardDrop);
		attachClick(ui.ghostToggleButton, handlers.toggleGhost);
		attachClick(ui.soundToggleButton, handlers.toggleSound);
		attachClick(ui.clearHighscoresButton, handlers.clearHighscores);
		attachClick(ui.restartButton, handlers.restart);

		// Samlet tastekart gjor det lettere a se alle bindings pa ett sted.
		const keyActions = {
			ArrowLeft: handlers.left,
			ArrowRight: handlers.right,
			ArrowDown: handlers.down,
			ArrowUp: handlers.rotate,
			Enter: handlers.hardDrop,
			c: handlers.hold,
			C: handlers.hold,
			g: handlers.toggleGhost,
			G: handlers.toggleGhost,
			m: handlers.toggleSound,
			M: handlers.toggleSound,
			" ": handlers.pause,
			Spacebar: handlers.pause,
			p: handlers.pause,
			P: handlers.pause,
			r: handlers.reset,
			R: handlers.reset,
		};

		document.addEventListener("keydown", (event) => {
			if (event.ctrlKey || event.altKey || event.metaKey) {
				return;
			}

			// BUTTON er inkludert sa knappetrykk ikke trigger spillhandlinger i tillegg.
			// Uten denne sjekken ville f.eks. Enter pa en knapp oga trigge hard drop.
			if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName)) {
				return;
			}

			const action = keyActions[event.key];
			if (typeof action !== "function") {
				return;
			}

			event.preventDefault();
			action();
		});
	}

	global.TetrisControls = {
		attachTetrisControls,
	};
})(window);
