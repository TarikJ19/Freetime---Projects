// Tastatur- og knappestyring samlet i egen fil.
(function (global) {
	"use strict";

	function attachTetrisControls(ui, handlers) {
		if (ui.startButton) {
			ui.startButton.addEventListener("click", handlers.start);
		}

		if (ui.pauseButton) {
			ui.pauseButton.addEventListener("click", handlers.pause);
		}

		if (ui.resetButton) {
			ui.resetButton.addEventListener("click", handlers.reset);
		}

		if (ui.holdButton) {
			ui.holdButton.addEventListener("click", handlers.hold);
		}

		if (ui.hardDropButton) {
			ui.hardDropButton.addEventListener("click", handlers.hardDrop);
		}

		if (ui.ghostToggleButton && typeof handlers.toggleGhost === "function") {
			ui.ghostToggleButton.addEventListener("click", handlers.toggleGhost);
		}

		if (ui.soundToggleButton && typeof handlers.toggleSound === "function") {
			ui.soundToggleButton.addEventListener("click", handlers.toggleSound);
		}

		if (ui.restartButton) {
			ui.restartButton.addEventListener("click", handlers.restart);
		}

		document.addEventListener("keydown", (event) => {
			if (event.ctrlKey || event.altKey || event.metaKey) {
				return;
			}

			// BUTTON er inkludert sa knappetrykk ikke trigger spillhandlinger i tillegg.
			// Uten denne sjekken ville f.eks. Enter pa en knapp oga trigge hard drop.
			if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName)) {
				return;
			}

			// Tastkartet er samlet her for a holde kontrollogikken lett a finne.
			switch (event.key) {
				case "ArrowLeft":
					event.preventDefault();
					handlers.left();
					break;
				case "ArrowRight":
					event.preventDefault();
					handlers.right();
					break;
				case "ArrowDown":
					event.preventDefault();
					handlers.down();
					break;
				case "ArrowUp":
					event.preventDefault();
					handlers.rotate();
					break;
				case "Enter":
					event.preventDefault();
					handlers.hardDrop();
					break;
				case "c":
				case "C":
					event.preventDefault();
					handlers.hold();
					break;
				case "g":
				case "G":
					event.preventDefault();
					if (typeof handlers.toggleGhost === "function") {
						handlers.toggleGhost();
					}
					break;
				case "m":
				case "M":
					event.preventDefault();
					if (typeof handlers.toggleSound === "function") {
						handlers.toggleSound();
					}
					break;
				case " ":
				case "Spacebar":
				case "p":
				case "P":
					event.preventDefault();
					handlers.pause();
					break;
				case "r":
				case "R":
					event.preventDefault();
					handlers.reset();
					break;
				default:
					break;
			}
		});
	}

	global.TetrisControls = {
		attachTetrisControls,
	};
})(window);
