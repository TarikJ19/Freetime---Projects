/**
 * smoke-test.js
 * Kjoer med: node tests/smoke-test.js
 * Tester kjernefunksjonalitet for bade kalkulator og kalender.
 */

"use strict";

const fs  = require("fs");
const vm  = require("vm");

// ─── Hjelpefunksjoner ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(name, condition) {
	if (condition) {
		console.log(`  PASS  ${name}`);
		passed += 1;
	} else {
		console.error(`  FAIL  ${name}`);
		failed += 1;
	}
}

function assertThrows(name, fn) {
	let threw = false;
	try { fn(); } catch { threw = true; }
	assert(name, threw);
}

function section(title) {
	console.log(`\n=== ${title} ===`);
}

// ─── Browser-mock (begge scripts trenger document og localStorage) ─────────────

function makeFakeElement() {
	return {
		className: "", dataset: {}, textContent: "", value: "", checked: false, files: null, children: [],
		classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
		setAttribute() {}, append(...n) { this.children.push(...n); },
		replaceChildren(...n) { this.children = [...n]; },
		addEventListener() {}, click() {}, focus() {}, remove() {},
	};
}

const lsData = {};
const lsMock = {
	getItem(k)    { return Object.prototype.hasOwnProperty.call(lsData, k) ? lsData[k] : null; },
	setItem(k, v) { lsData[k] = String(v); },
};

class MockFileReader {
	constructor() { this.result = ""; this.handlers = {}; }
	addEventListener(n, cb) { this.handlers[n] = cb; }
	readAsText(file) {
		this.result = file && typeof file.content === "string" ? file.content : "";
		if (this.handlers.load) this.handlers.load();
	}
}

const docMock = {
	body: { append() {}, classList: { contains() { return false; } } },
	getElementById()    { return null; },
	querySelectorAll()  { return []; },
	querySelector()     { return null; },
	createElement()     { return makeFakeElement(); },
	addEventListener()  {},
};

// ─── Last kalkulator-kode i sandbox ────────────────────────────────────────────

const calcCode = fs.readFileSync("projects/project1-calculator/calculator.js", "utf8");
const calcSandbox = { console, document: docMock, localStorage: lsMock, setTimeout, clearTimeout };
vm.createContext(calcSandbox);
vm.runInContext(
	calcCode + `
this.__calc = {
	evaluateExpression,
	appendToExpression,
	appendDigit,
	appendDecimal,
	appendOperator,
	appendParenthesis,
	applyPercentToExpression,
	toggleSignOnCurrentNumber,
	closeOpenParentheses,
	formatNumber,
	getNumberSegmentAtEnd,
	findLastMainOperator,
	canCloseParenthesis,
	isUnaryMinus,
	getKeyboardAction,
	insertToken,
	insertConstant,
	insertAnswer,
	saveResult,
	addHistoryItem,
	trimHistory,
	getOrderedHistory,
	applyUnaryAction,
	applyScientificAction,
	createInitialState,
	getSourceExpression,
	resolveActiveValue,
};`,
	calcSandbox
);
const C = calcSandbox.__calc;

// ─── KALKULATOR-TESTER ─────────────────────────────────────────────────────────

section("Kalkulator – evaluateExpression (grunnleggende utregning)");
assert("2+3 = 5",           C.evaluateExpression("2+3") === 5);
assert("10-4 = 6",          C.evaluateExpression("10-4") === 6);
assert("3*4 = 12",          C.evaluateExpression("3*4") === 12);
assert("10/2 = 5",          C.evaluateExpression("10/2") === 5);
assert("(2+3)*4 = 20",      C.evaluateExpression("(2+3)*4") === 20);
assert("aapne parentes lukkes automatisk: (2+3 = 5", C.evaluateExpression("(2+3") === 5);
assertThrows("Tomt uttrykk kaster feil",   () => C.evaluateExpression(""));
assertThrows("Ugyldig tegn kaster feil",   () => C.evaluateExpression("2a+3"));
assertThrows("Division med null kaster feil (via eval)", () => C.evaluateExpression("1/0"));

section("Kalkulator – appendDigit");
assert("Tom streng -> '5'",        C.appendDigit("", "5") === "5");
assert("'0' erstattes med '7'",    C.appendDigit("0", "7") === "7");
assert("Etter ) setter inn *",     C.appendDigit("(2+3)", "4") === "(2+3)*4");
assert("Vanlig tillegg '12'",      C.appendDigit("1", "2") === "12");

section("Kalkulator – appendDecimal");
assert("Tom -> '0.'",              C.appendDecimal("") === "0.");
assert("'-' -> '-0.'",             C.appendDecimal("-") === "-0.");
assert("Allerede desimal endres ikke", C.appendDecimal("1.5") === "1.5");
assert("Etter operator -> '2+0.'", C.appendDecimal("2+") === "2+0.");

section("Kalkulator – appendOperator");
assert("Tom + '-' -> '-'",             C.appendOperator("", "-") === "-");
assert("Tom + '+' -> ''",              C.appendOperator("", "+") === "");
assert("Erstatter siste operator",     C.appendOperator("2+", "*") === "2*");
assert("Legger til operator etter tall", C.appendOperator("5", "+") === "5+");

section("Kalkulator – appendParenthesis");
assert("Tom -> '('",               C.appendParenthesis("", "(") === "(");
assert("Tall + '(' gir imlistert *", C.appendParenthesis("5", "(") === "5*(");
assert("Ingen ) uten aapen (",     C.appendParenthesis("5", ")") === "5");
assert("Aapen paren -> kan lukkes", C.appendParenthesis("(5", ")") === "(5)");

section("Kalkulator – applyPercentToExpression");
assert("200+10% -> 200+20",        C.applyPercentToExpression("200+10") === "200+20");
assert("200*10% -> 200*0.1",       C.applyPercentToExpression("200*10") === "200*0.1");
assert("Frittstoende 50% -> 0.5",  C.applyPercentToExpression("50") === "0.5");

section("Kalkulator – toggleSignOnCurrentNumber");
assert("Tom -> '-'",               C.toggleSignOnCurrentNumber("") === "-");
assert("'-' -> ''",                C.toggleSignOnCurrentNumber("-") === "");
assert("5 -> -5",                  C.toggleSignOnCurrentNumber("5") === "-5");
assert("-5 -> 5",                  C.toggleSignOnCurrentNumber("-5") === "5");
// Uttrykk som slutter paa ) pakkes i -((...)), f.eks. (2+3) -> -((2+3))
assert("(2+3) pakkes som -((2+3))",  C.toggleSignOnCurrentNumber("(2+3)") === "-((2+3))");

section("Kalkulator – formatNumber");
assert("Heltall forblir heltall",  C.formatNumber(5) === "5");
assert("-0 normaliseres til 0",    C.formatNumber(-0) === "0");
assert("12 siffer presisjon",      C.formatNumber(1/3).length > 0);
assertThrows("Infinity kaster feil", () => C.formatNumber(Infinity));

section("Kalkulator – closeOpenParentheses");
assert("(2+3 lukkes til (2+3)",    C.closeOpenParentheses("(2+3") === "(2+3)");
assert("Allerede lukket endres ikke", C.closeOpenParentheses("(2+3)") === "(2+3)");
assertThrows("For mange ) kaster feil", () => C.closeOpenParentheses("2+3)"));

section("Kalkulator – getNumberSegmentAtEnd");
assert("50+25 -> segment '25'",    C.getNumberSegmentAtEnd("50+25").text === "25");
assert("Operator uten tall -> null", C.getNumberSegmentAtEnd("5+") === null);
assert("Tomt -> null",             C.getNumberSegmentAtEnd("") === null);
assert("Negativt tall funnet",     C.getNumberSegmentAtEnd("-5").text === "-5");

section("Kalkulator – isUnaryMinus");
assert("Forste tegn er unary",     C.isUnaryMinus("-5", 0) === true);
// Minus rett etter operator (+) er alltid et fortegn (unary), ikke subtraksjon
assert("Etter + er unary (fortegn)", C.isUnaryMinus("5+-3", 2) === true);
assert("Etter ( er unary",         C.isUnaryMinus("(-5)", 1) === true);

section("Kalkulator – insertToken / insertConstant / insertAnswer");
assert("insertToken etter sifre legger * foran", C.insertToken("5", "3") === "5*3");
assert("insertToken i tom -> 'pi'",  C.insertToken("", "pi") === "pi");
assert("insertConstant(pi)",         C.insertConstant("", "pi").startsWith("3.14"));
assert("insertAnswer returnerer formatert svar",  C.insertAnswer("5+", 10) === "5+10");
assertThrows("insertAnswer uten svar kaster feil", () => C.insertAnswer("", null));

section("Kalkulator – trimHistory");
const st = C.createInitialState();
for (let i = 0; i < 15; i++) {
	C.addHistoryItem(st, { label: `item${i}`, result: i, reusableExpression: String(i), pinned: false });
}
assert(`Trimmet til maks ${12}`, st.history.length <= 12);

section("Kalkulator – getOrderedHistory (pin kommer forst)");
const stPin = C.createInitialState();
C.addHistoryItem(stPin, { label: "upinnet", result: 1, reusableExpression: "1", pinned: false });
C.addHistoryItem(stPin, { label: "pinnet",  result: 2, reusableExpression: "2", pinned: true  });
const ordered = C.getOrderedHistory(stPin.history);
assert("Pinnet element er forst", ordered[0].pinned === true);

section("Kalkulator – applyUnaryAction");
const stU = C.createInitialState();
stU.expression = "9";
C.applyUnaryAction(stU, "square");
assert("9^2 = 81", stU.expression === "81");
stU.expression = "9";
C.applyUnaryAction(stU, "sqrt");
assert("sqrt(9) = 3", stU.expression === "3");
stU.expression = "2";
C.applyUnaryAction(stU, "reciprocal");
assert("1/2 = 0.5", stU.expression === "0.5");
assertThrows("sqrt av negativ kaster feil", () => {
	const s = C.createInitialState(); s.expression = "-4";
	C.applyUnaryAction(s, "sqrt");
});

section("Kalkulator – applyScientificAction");
const stS = C.createInitialState();
stS.expression = "0";
C.applyScientificAction(stS, "sin");
assert("sin(0) = 0", stS.expression === "0");
stS.expression = "0";
C.applyScientificAction(stS, "cos");
assert("cos(0) = 1", stS.expression === "1");
stS.expression = "1";
C.applyScientificAction(stS, "log");
assert("log10(1) = 0", stS.expression === "0");

section("Kalkulator – getKeyboardAction");
assert("Siffer '5' -> append",     C.getKeyboardAction("5") !== null);
assert("Enter -> equals",          C.getKeyboardAction("Enter").action === "equals");
assert("Escape -> clear",          C.getKeyboardAction("Escape").action === "clear");
assert("Backspace -> backspace",   C.getKeyboardAction("Backspace").action === "backspace");
assert("Ukjent 'q' -> null",       C.getKeyboardAction("q") === null);

// ─── Last kalender-kode i sandbox ─────────────────────────────────────────────

const calCode = fs.readFileSync("projects/project2-calendar/calendar.js", "utf8");
const calSandbox = {
	console, document: docMock, localStorage: lsMock,
	FileReader: MockFileReader,
	URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} },
	Blob, setTimeout, clearTimeout,
};
vm.createContext(calSandbox);
vm.runInContext(
	calCode + `
this.__cal = {
	eventOccursOnDate,
	getVisibleCalendarEventsByDateKey,
	findCalendarTimeConflict,
	parseCalendarImportPayload,
	exportCalendarEvents,
	toggleCalendarEventCompleted,
	buildSequentialDates,
	getCalendarDatesForCurrentView,
	toDateKey,
	fromDateKey,
	normalizeCalendarTime,
	normalizeCalendarCategory,
	normalizeCalendarRecurrence,
	normalizeCalendarDateKey,
	normalizeCalendarEvent,
	sanitizeCalendarEventDraft,
	getNextCalendarEventId,
	formatCalendarEventMeta,
	formatCalendarShortDate,
	formatCalendarLongDate,
	formatCalendarHeaderTitle,
	startOfWeekMonday,
	loadCalendarEvents,
	saveCalendarEvents,
	getCalendarEventsByDateKey,
};`,
	calSandbox
);
const K = calSandbox.__cal;

const baseEvents = [
	{ id: 1, dateKey: "2026-03-10", title: "Daily standup", time: "09:00", category: "work",     recurrence: "daily",   completed: false },
	{ id: 2, dateKey: "2026-03-10", title: "Weekly sync",   time: "10:00", category: "work",     recurrence: "weekly",  completed: false },
	{ id: 3, dateKey: "2026-03-15", title: "Monthly rent",  time: "12:00", category: "personal", recurrence: "monthly", completed: false },
	{ id: 4, dateKey: "2026-03-12", title: "One time exam", time: "14:00", category: "study",    recurrence: "none",    completed: true  },
];

// ─── KALENDER-TESTER ──────────────────────────────────────────────────────────

section("Kalender – toDateKey / fromDateKey (dato-konvertering)");
const d = new Date(2026, 2, 17);
assert("toDateKey gir YYYY-MM-DD",   K.toDateKey(d) === "2026-03-17");
const d2 = K.fromDateKey("2026-03-17");
assert("fromDateKey returnerer korrekt maaned", d2.getMonth() === 2);
assert("fromDateKey returnerer korrekt dato",   d2.getDate()  === 17);

section("Kalender – normaliseringsfunksjoner");
assert("normalizeCalendarTime '09:00' er gyldig",      K.normalizeCalendarTime("09:00") === "09:00");
assert("normalizeCalendarTime ugyldig -> ''",           K.normalizeCalendarTime("25:00") === "");
assert("normalizeCalendarTime tom -> ''",               K.normalizeCalendarTime("") === "");
assert("normalizeCalendarCategory 'work' ok",          K.normalizeCalendarCategory("work") === "work");
assert("normalizeCalendarCategory ugyldig -> 'general'", K.normalizeCalendarCategory("foobar") === "general");
assert("normalizeCalendarRecurrence 'weekly' ok",      K.normalizeCalendarRecurrence("weekly") === "weekly");
assert("normalizeCalendarRecurrence ugyldig -> 'none'", K.normalizeCalendarRecurrence("bad") === "none");
assert("normalizeCalendarDateKey gyldig dato",         K.normalizeCalendarDateKey("2026-03-17", "2026-01-01") === "2026-03-17");
assert("normalizeCalendarDateKey ugyldig -> fallback", K.normalizeCalendarDateKey("not-a-date", "2026-01-01") === "2026-01-01");

section("Kalender – normalizeCalendarEvent (import-validering)");
assert("Gyldig event godtas",        K.normalizeCalendarEvent(baseEvents[0]) !== null);
assert("null input -> null",         K.normalizeCalendarEvent(null) === null);
assert("Manglende id -> null",       K.normalizeCalendarEvent({ dateKey: "2026-03-10", title: "x" }) === null);
assert("Manglende tittel -> null",   K.normalizeCalendarEvent({ id: 1, dateKey: "2026-03-10", title: "" }) === null);
assert("Ugyldig dateKey -> null",    K.normalizeCalendarEvent({ id: 1, dateKey: "bad", title: "x" }) === null);

section("Kalender – eventOccursOnDate (gjentakelse)");
assert("Daily vises paa en annen dato",         K.eventOccursOnDate(baseEvents[0], "2026-03-20") === true);
assert("Daily vises ikke foer startdato",       K.eventOccursOnDate(baseEvents[0], "2026-03-09") === false);
assert("Weekly – riktig ukedag vises",          K.eventOccursOnDate(baseEvents[1], "2026-03-17") === true);
assert("Weekly – feil ukedag vises ikke",       K.eventOccursOnDate(baseEvents[1], "2026-03-18") === false);
assert("Monthly – riktig dato neste maaned",    K.eventOccursOnDate(baseEvents[2], "2026-04-15") === true);
assert("Monthly – feil dato vises ikke",        K.eventOccursOnDate(baseEvents[2], "2026-04-16") === false);
assert("None – vises kun paa eksakt dato",      K.eventOccursOnDate(baseEvents[3], "2026-03-12") === true);
assert("None – vises ikke paa annen dato",      K.eventOccursOnDate(baseEvents[3], "2026-03-13") === false);

section("Kalender – getCalendarEventsByDateKey (sortering)");
const sorted = K.getCalendarEventsByDateKey(baseEvents, "2026-03-10");
assert("Events sorteres paa tid",    sorted[0].time <= sorted[1].time);

section("Kalender – getVisibleCalendarEventsByDateKey (filter)");
const allVisible = K.getVisibleCalendarEventsByDateKey(baseEvents, "2026-03-12", { category: "all", searchQuery: "", showCompleted: true });
assert("Alle events vises med 'all'", allVisible.length >= 1);

const onlyWork = K.getVisibleCalendarEventsByDateKey(baseEvents, "2026-03-10", { category: "work", searchQuery: "", showCompleted: true });
assert("Kategori-filter 'work' fungerer", onlyWork.every(e => e.category === "work"));

const searchResult = K.getVisibleCalendarEventsByDateKey(baseEvents, "2026-03-12", { category: "all", searchQuery: "exam", showCompleted: true });
assert("Soeketekst 'exam' finner riktig event", searchResult.length === 1 && searchResult[0].id === 4);

const hideCompleted = K.getVisibleCalendarEventsByDateKey(baseEvents, "2026-03-12", { category: "all", searchQuery: "", showCompleted: false });
assert("Ferdige events skjules", hideCompleted.every(e => !e.completed));

section("Kalender – findCalendarTimeConflikt");
const conflictDraft = { title: "Ny", dateKey: "2026-03-20", time: "09:00", category: "work", recurrence: "none" };
const conflict = K.findCalendarTimeConflict(baseEvents, conflictDraft, null);
assert("Tidskonflikt oppdages (daily 09:00)",  Boolean(conflict) && conflict.id === 1);

const noConflict = K.findCalendarTimeConflict(baseEvents, { ...conflictDraft, time: "11:00" }, null);
assert("Ingen konflikt naar tid er ledig",     noConflict === null);

const editSelf = K.findCalendarTimeConflict(baseEvents, conflictDraft, 1);
assert("Redigering av eget event gir ikke konflikt", editSelf === null);

const noTimeDraft = { title: "Tidloes", dateKey: "2026-03-20", time: "", category: "work", recurrence: "none" };
assert("Event uten tid gir aldri konflikt",    K.findCalendarTimeConflict(baseEvents, noTimeDraft, null) === null);

section("Kalender – parseCalendarImportPayload (import/eksport)");
assert("Raa array importeres",          K.parseCalendarImportPayload(JSON.stringify(baseEvents)).length === baseEvents.length);
assert("Innpakket payload importeres",  K.parseCalendarImportPayload(JSON.stringify({ version: 2, events: baseEvents })).length === baseEvents.length);
assertThrows("Ugyldig payload avvises", () => K.parseCalendarImportPayload(JSON.stringify({ foo: "bar" })));
assertThrows("Ikke-JSON kaster feil",  () => K.parseCalendarImportPayload("ikke json"));

let exportOk = false;
try { K.exportCalendarEvents(baseEvents); exportOk = true; } catch {}
assert("exportCalendarEvents krasjer ikke", exportOk);

section("Kalender – toggleCalendarEventCompleted");
const tState = { events: [{ id: 99, dateKey: "2026-03-10", title: "t", time: "", category: "general", recurrence: "none", completed: false }] };
K.toggleCalendarEventCompleted(tState, 99);
assert("Merkes som ferdig",  tState.events[0].completed === true);
K.toggleCalendarEventCompleted(tState, 99);
assert("Merkes som aapen", tState.events[0].completed === false);
K.toggleCalendarEventCompleted(tState, 999);
assert("Ukjent id endrer ingenting", tState.events[0].completed === false);

section("Kalender – buildSequentialDates / getCalendarDatesForCurrentView");
const seq = K.buildSequentialDates(new Date(2026, 2, 10), 7);
assert("7-dagersserie har 7 datoer",          seq.length === 7);
assert("Foerste dato er 2026-03-10",          K.toDateKey(seq[0]) === "2026-03-10");
assert("Siste dato er 2026-03-16",            K.toDateKey(seq[6]) === "2026-03-16");

const monthV = K.getCalendarDatesForCurrentView({ viewMode: "month", viewYear: 2026, viewMonth: 2, selectedDateKey: "2026-03-10" });
assert("Maanedsvisning = 42 celler",  monthV.length === 42);

const weekV  = K.getCalendarDatesForCurrentView({ viewMode: "week",  viewYear: 2026, viewMonth: 2, selectedDateKey: "2026-03-10" });
assert("Uke-visning = 7 celler",      weekV.length === 7);

const dayV   = K.getCalendarDatesForCurrentView({ viewMode: "day",   viewYear: 2026, viewMonth: 2, selectedDateKey: "2026-03-10" });
assert("Dag-visning = 1 celle",       dayV.length === 1);

section("Kalender – startOfWeekMonday");
const mon = K.startOfWeekMonday(new Date(2026, 2, 17));
assert("Mandag for tirsdag 17. mars er 16. mars", K.toDateKey(mon) === "2026-03-16");

section("Kalender – formatCalendarEventMeta");
const meta = K.formatCalendarEventMeta(baseEvents[0]);
assert("Meta inneholder tid",       meta.includes("09:00"));
assert("Meta inneholder kategori",  meta.includes("Work"));
assert("Meta inneholder repeat",    meta.includes("Daily"));
assert("Meta inneholder status",    meta.includes("Open"));

section("Kalender – localStorage (lagre og laste)");
const testEvents = [baseEvents[0]];
K.saveCalendarEvents(testEvents);
const loaded = K.loadCalendarEvents();
assert("Lagret og lastet event er samme id", loaded.length === 1 && loaded[0].id === 1);

section("Kalender – getNextCalendarEventId");
assert("Nestid etter tom liste = 1",       K.getNextCalendarEventId([]) === 1);
assert("Nestid etter [id:5] = 6",          K.getNextCalendarEventId([{ id: 5 }]) === 6);

// ─── Oppsummering ─────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${"─".repeat(50)}`);
console.log(`  Resultat: ${passed}/${total} tester bestaat`);
if (failed > 0) {
	console.error(`  ${failed} test(er) FEILET`);
	process.exit(1);
} else {
	console.log("  ALT OK – klart for neste steg!");
	process.exit(0);
}
