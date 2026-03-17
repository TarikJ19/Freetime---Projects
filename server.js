// =============================================
// Enkel lokal webserver med Node.js
// =============================================
// SLIK BRUKER DU:
//   1. Åpne terminal i denne prosjektmappen
//   2. Skriv: node server.js
//   3. Åpne nettleser på: http://localhost:3000
//   4. Trykk Ctrl+C for å stoppe serveren
// =============================================

// Disse linjene laster innebygde Node.js-moduler (ingen ekstra installasjon)
const http = require("http");
const fs   = require("fs");
const path = require("path");

// Portnummeret er som en "dør" inn til serveren
const PORT = 3000;

// Denne tabellen forteller nettleseren hvilken filtype som sendes
const FILE_TYPES = {
	".html": "text/html",
	".css":  "text/css",
	".js":   "text/javascript",
	".py":   "text/plain",
	".md":   "text/plain",
};

// Opprett serveren. Funksjonen kjøres hver gang en side forespørres.
const server = http.createServer(function (request, response) {

	// Finn ut hvilken fil nettleseren ber om
	let filePath = "." + request.url;

	// Hvis brukeren går til "/", send startsiden
	if (filePath === "./") {
		filePath = "./index.html";
	}

	// Les filendelsen for å velge riktig Content-Type
	const extension   = path.extname(filePath);
	const contentType = FILE_TYPES[extension] || "text/plain";

	// Prøv å lese filen fra disken
	fs.readFile(filePath, function (error, fileContent) {

		// Hvis filen ikke finnes, send enkel 404-feil
		if (error) {
			response.writeHead(404, { "Content-Type": "text/plain" });
			response.end("404 — Page not found: " + filePath);
			return;
		}

		// Fil funnet: send innholdet til nettleseren
		response.writeHead(200, { "Content-Type": contentType });
		response.end(fileContent);
	});
});

// Start serveren og lytt på valgt port
server.listen(PORT, function () {
	console.log("===========================================");
	console.log("  Server is running using Node.js v" + process.version);
	console.log("  Open your browser and go to:");
	console.log("  http://localhost:" + PORT);
	console.log("  Press Ctrl+C to stop.");
	console.log("===========================================");
});
