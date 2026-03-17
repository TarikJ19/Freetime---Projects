// Denne filen er dedikert til Project 3 (Tetris).
// Forelopig er siden en visningsprototype, men denne starten
// gir et tydelig sted for spilllogikk i neste fase.
function initTetrisPage() {
	const board = document.querySelector(".board-grid");
	if (!board) {
		return;
	}

	// Midlertidig statusmarkor for at filkobling og init fungerer.
	board.dataset.engine = "ready";
}

document.addEventListener("DOMContentLoaded", () => {
	// Init kjøres kun på spillsiden, så skriptet er trygt å laste globalt.
	if (document.body.classList.contains("page-game")) {
		initTetrisPage();
	}
});
