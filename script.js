const MAX_HISTORY_ITEMS = 12;
const UNARY_LABELS = {
	square: "sqr",
	sqrt: "sqrt",
	reciprocal: "1/x",
};

// Ett enkelt objekt holder all tilstand, så det er lettere å følge med mens man lærer.
function createInitialState() {
	return {
		expression: "",
		lastAnswer: null,
		memory: 0,
		hasMemory: false,
		history: [],
		nextHistoryId: 1,
		status: "Ready",
		error: "",
	};
}

function initCalculatorPage() {
	const ui = {
		expression: document.getElementById("calc-expression"),
		result: document.getElementById("calc-result"),
		meta: document.getElementById("calc-meta"),
		history: document.getElementById("calc-history"),
		calculatorMain: document.querySelector(".calculator-main"),
	};

	if (!ui.expression || !ui.result || !ui.meta || !ui.history || !ui.calculatorMain) {
		return;
	}

	const state = createInitialState();

	ui.calculatorMain.addEventListener("click", (event) => {
		const button = event.target.closest("button[data-action]");
		if (!button) {
			return;
		}

		runAction(state, ui, button.dataset.action, {
			value: button.dataset.value,
			fn: button.dataset.fn,
			id: button.dataset.id,
		});
	});

	ui.history.addEventListener("click", (event) => {
		const button = event.target.closest("button[data-action]");
		if (!button) {
			return;
		}

		runAction(state, ui, button.dataset.action, {
			id: button.dataset.id,
		});
	});

	document.addEventListener("keydown", (event) => {
		if (event.ctrlKey || event.altKey || event.metaKey) {
			return;
		}

		if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) {
			return;
		}

		const shortcut = getKeyboardAction(event.key);
		if (!shortcut) {
			return;
		}

		event.preventDefault();
		runAction(state, ui, shortcut.action, shortcut);
	});

	render(state, ui);
}

function runAction(state, ui, action, data = {}) {
	state.error = "";

	try {
		const message = handleAction(state, action, data);
		state.status = message || "Ready";
	} catch (error) {
		state.error = error instanceof Error ? error.message : "Calculator error";
		state.status = state.error;
	}

	render(state, ui);
}

// Ett sentralt action-punkt gjør at all knappelogikk ligger på ett sted.
function handleAction(state, action, data) {
	switch (action) {
		case "append":
			state.expression = appendToExpression(state.expression, data.value);
			return "Typing";
		case "clear":
			state.expression = "";
			return "Cleared";
		case "backspace":
			state.expression = state.expression.slice(0, -1);
			return "Deleted last character";
		case "equals": {
			const source = getSourceExpression(state);
			const result = evaluateExpression(source);
			saveResult(state, source, result, source);
			return `Calculated ${formatNumber(result)}`;
		}
		case "percent":
			state.expression = applyPercentToExpression(state.expression);
			return "Percent converted";
		case "negate":
			state.expression = toggleSignOnCurrentNumber(state.expression);
			return "Sign updated";
		case "square":
		case "sqrt":
		case "reciprocal":
			return applyUnaryAction(state, action);
		case "scientific":
			return applyScientificAction(state, data.fn);
		case "constant":
			state.expression = insertConstant(state.expression, data.value);
			return `${data.value} inserted`;
		case "answer":
			state.expression = insertAnswer(state.expression, state.lastAnswer);
			return "Previous answer inserted";
		case "memory-clear":
			state.memory = 0;
			state.hasMemory = false;
			return "Memory cleared";
		case "memory-recall":
			if (!state.hasMemory) {
				throw new Error("Memory is empty");
			}
			state.expression = insertToken(state.expression, formatNumber(state.memory));
			return "Memory recalled";
		case "memory-add": {
			const value = resolveActiveValue(state);
			state.memory += value;
			state.hasMemory = true;
			return "Added to memory";
		}
		case "memory-subtract": {
			const value = resolveActiveValue(state);
			state.memory -= value;
			state.hasMemory = true;
			return "Subtracted from memory";
		}
		case "history-load": {
			const entry = findHistoryEntry(state, data.id);
			if (!entry) {
				throw new Error("History item not found");
			}
			state.expression = entry.reusableExpression;
			return "History item loaded";
		}
		case "history-pin": {
			const entry = findHistoryEntry(state, data.id);
			if (!entry) {
				throw new Error("History item not found");
			}
			entry.pinned = !entry.pinned;
			return entry.pinned ? "History item pinned" : "History item unpinned";
		}
		case "history-clear": {
			const pinned = state.history.filter((entry) => entry.pinned);
			const removedCount = state.history.length - pinned.length;
			state.history = pinned;
			return removedCount ? `Removed ${removedCount} history item(s)` : "No unpinned history to clear";
		}
		default:
			throw new Error("Unknown calculator action");
	}
}

function render(state, ui) {
	ui.expression.textContent = state.expression || "0";

	const preview = getPreview(state);
	ui.result.textContent = preview.text;
	ui.result.classList.toggle("is-muted", preview.muted);
	ui.result.classList.toggle("has-error", preview.isError);

	const memoryText = state.hasMemory ? formatNumber(state.memory) : "empty";
	ui.meta.textContent = `${state.status}. Memory: ${memoryText}`;
	ui.meta.classList.toggle("is-error", Boolean(state.error));

	renderHistory(state, ui.history);
}

function renderHistory(state, historyElement) {
	historyElement.replaceChildren();

	const orderedHistory = getOrderedHistory(state.history);
	if (!orderedHistory.length) {
		const emptyItem = document.createElement("li");
		emptyItem.className = "history-empty";
		emptyItem.textContent = "No calculations yet.";
		historyElement.append(emptyItem);
		return;
	}

	orderedHistory.forEach((entry) => {
		const item = document.createElement("li");
		item.className = "history-entry";

		const loadButton = document.createElement("button");
		loadButton.type = "button";
		loadButton.className = "history-button";
		loadButton.dataset.action = "history-load";
		loadButton.dataset.id = String(entry.id);

		const expressionText = document.createElement("span");
		expressionText.className = "history-expression";
		expressionText.textContent = entry.label;

		const resultText = document.createElement("strong");
		resultText.className = "history-result";
		resultText.textContent = formatNumber(entry.result);

		loadButton.append(expressionText, resultText);

		const pinButton = document.createElement("button");
		pinButton.type = "button";
		pinButton.className = "history-pin";
		pinButton.dataset.action = "history-pin";
		pinButton.dataset.id = String(entry.id);
		pinButton.dataset.pinned = String(entry.pinned);
		pinButton.textContent = entry.pinned ? "Unpin" : "Pin";

		item.append(loadButton, pinButton);
		historyElement.append(item);
	});
}

function getPreview(state) {
	if (state.error) {
		return { text: "Error", muted: true, isError: true };
	}

	if (!state.expression || state.expression === "-") {
		return {
			text: state.lastAnswer === null ? "0" : formatNumber(state.lastAnswer),
			muted: false,
			isError: false,
		};
	}

	if (endsWithOperatorOrOpenParen(state.expression)) {
		return { text: "...", muted: true, isError: false };
	}

	try {
		const value = evaluateExpression(state.expression);
		return { text: formatNumber(value), muted: false, isError: false };
	} catch {
		return { text: "...", muted: true, isError: false };
	}
}

function getKeyboardAction(key) {
	if (/^\d$/.test(key)) {
		return { action: "append", value: key };
	}

	const map = {
		".": { action: "append", value: "." },
		"(": { action: "append", value: "(" },
		")": { action: "append", value: ")" },
		"+": { action: "append", value: "+" },
		"-": { action: "append", value: "-" },
		"*": { action: "append", value: "*" },
		"/": { action: "append", value: "/" },
		"%": { action: "percent" },
		Enter: { action: "equals" },
		"=": { action: "equals" },
		Backspace: { action: "backspace" },
		Escape: { action: "clear" },
		Delete: { action: "clear" },
		n: { action: "negate" },
		N: { action: "negate" },
	};

	return map[key] || null;
}

function appendToExpression(expression, value) {
	if (!value) {
		return expression;
	}

	if (/^\d$/.test(value)) {
		return appendDigit(expression, value);
	}

	if (value === ".") {
		return appendDecimal(expression);
	}

	if (value === "(" || value === ")") {
		return appendParenthesis(expression, value);
	}

	if (isOperator(value)) {
		return appendOperator(expression, value);
	}

	throw new Error("Unsupported key");
}

function appendDigit(expression, digit) {
	if (!expression || expression === "0") {
		return digit;
	}

	if (expression === "-") {
		return `-${digit}`;
	}

	const last = getLastChar(expression);
	if (last === ")") {
		return `${expression}*${digit}`;
	}

	return expression + digit;
}

function appendDecimal(expression) {
	if (!expression) {
		return "0.";
	}

	if (expression === "-") {
		return "-0.";
	}

	const last = getLastChar(expression);
	if (last === ")") {
		return `${expression}*0.`;
	}

	if (isOperator(last) || last === "(") {
		return `${expression}0.`;
	}

	const segment = getNumberSegmentAtEnd(expression);
	if (segment && segment.text.includes(".")) {
		return expression;
	}

	return `${expression}.`;
}

function appendOperator(expression, operator) {
	if (!expression) {
		return operator === "-" ? "-" : "";
	}

	const last = getLastChar(expression);
	if (isOperator(last)) {
		return `${expression.slice(0, -1)}${operator}`;
	}

	if (last === "(" && operator !== "-") {
		return expression;
	}

	return expression + operator;
}

function appendParenthesis(expression, parenthesis) {
	if (parenthesis === "(") {
		if (!expression) {
			return "(";
		}

		const last = getLastChar(expression);
		if (isOperator(last) || last === "(") {
			return `${expression}(`;
		}

		return `${expression}*(`;
	}

	if (!canCloseParenthesis(expression)) {
		return expression;
	}

	const last = getLastChar(expression);
	if (isOperator(last) || last === "(") {
		return expression;
	}

	return `${expression})`;
}

function applyPercentToExpression(expression) {
	// Prosent oppfører seg som på en vanlig kalkulator:
	//   200 + 10%  -> 200 + 20   (10% av 200 = 20)
	//   200 * 10%  -> 200 * 0.1  (10% som ren brøk)
	// Etter + eller - betyr % "prosent av venstre side".
	// Etter * eller / blir tallet bare delt på 100.
	const segment = getNumberSegmentAtEnd(expression);
	if (!segment) {
		throw new Error("Place % after a number");
	}

	const number = Number(segment.text);
	if (Number.isNaN(number)) {
		throw new Error("Invalid number for %");
	}

	const prefix = expression.slice(0, segment.start);
	const operatorInfo = findLastMainOperator(prefix);

	let percentValue;
	if (operatorInfo && (operatorInfo.operator === "+" || operatorInfo.operator === "-")) {
		const leftExpression = prefix.slice(0, operatorInfo.index);
		const leftValue = leftExpression ? evaluateExpression(leftExpression) : 0;
		percentValue = (leftValue * number) / 100;
	} else {
		percentValue = number / 100;
	}

	const replacement = formatNumber(percentValue);
	return `${expression.slice(0, segment.start)}${replacement}${expression.slice(segment.end)}`;
}

function toggleSignOnCurrentNumber(expression) {
	if (!expression) {
		return "-";
	}

	if (expression === "-") {
		return "";
	}

	const segment = getNumberSegmentAtEnd(expression);
	if (segment) {
		const number = Number(segment.text);
		if (Number.isNaN(number)) {
			throw new Error("Invalid number for +/-");
		}

		const replacement = formatNumber(-number);
		return `${expression.slice(0, segment.start)}${replacement}${expression.slice(segment.end)}`;
	}

	if (expression.endsWith(")")) {
		return `-(${expression})`;
	}

	throw new Error("Place +/- after a number");
}

function applyUnaryAction(state, action) {
	const source = getSourceExpression(state);
	const value = evaluateExpression(source);
	let result;

	switch (action) {
		case "square":
			result = value * value;
			break;
		case "sqrt":
			if (value < 0) {
				throw new Error("Square root needs a non-negative value");
			}
			result = Math.sqrt(value);
			break;
		case "reciprocal":
			if (value === 0) {
				throw new Error("Cannot divide by zero");
			}
			result = 1 / value;
			break;
		default:
			throw new Error("Unsupported unary action");
	}

	const label = `${UNARY_LABELS[action]}(${source})`;
	saveResult(state, label, result, formatNumber(result));
	return `Calculated ${formatNumber(result)}`;
}

function applyScientificAction(state, fnName) {
	const source = getSourceExpression(state);
	const value = evaluateExpression(source);
	let result;

	switch (fnName) {
		case "sin":
			result = Math.sin(value);
			break;
		case "cos":
			result = Math.cos(value);
			break;
		case "tan":
			result = Math.tan(value);
			break;
		case "log":
			if (value <= 0) {
				throw new Error("log needs a value greater than zero");
			}
			result = Math.log10(value);
			break;
		default:
			throw new Error("Unsupported scientific action");
	}

	const label = `${fnName}(${source})`;
	saveResult(state, label, result, formatNumber(result));
	return `Calculated ${formatNumber(result)} (radians)`;
}

function saveResult(state, label, numericResult, reusableExpression) {
	const formatted = formatNumber(numericResult);
	state.lastAnswer = numericResult;
	state.expression = formatted;

	addHistoryItem(state, {
		label,
		result: numericResult,
		reusableExpression,
		pinned: false,
	});
}

function addHistoryItem(state, entry) {
	const withId = {
		id: state.nextHistoryId,
		...entry,
	};

	state.nextHistoryId += 1;
	state.history.unshift(withId);
	trimHistory(state);
}

function trimHistory(state) {
	while (state.history.length > MAX_HISTORY_ITEMS) {
		let removed = false;
		for (let index = state.history.length - 1; index >= 0; index -= 1) {
			if (!state.history[index].pinned) {
				state.history.splice(index, 1);
				removed = true;
				break;
			}
		}

		if (!removed) {
			state.history.pop();
		}
	}
}

function getOrderedHistory(history) {
	return [...history].sort((first, second) => {
		if (first.pinned !== second.pinned) {
			return first.pinned ? -1 : 1;
		}

		return second.id - first.id;
	});
}

function getSourceExpression(state) {
	if (state.expression && state.expression !== "-") {
		return state.expression;
	}

	if (state.lastAnswer !== null) {
		return formatNumber(state.lastAnswer);
	}

	throw new Error("Type a value first");
}

function resolveActiveValue(state) {
	if (state.expression && state.expression !== "-") {
		return evaluateExpression(state.expression);
	}

	if (state.lastAnswer !== null) {
		return state.lastAnswer;
	}

	throw new Error("Type a value first");
}

function insertAnswer(expression, lastAnswer) {
	if (lastAnswer === null) {
		throw new Error("No previous answer yet");
	}

	return insertToken(expression, formatNumber(lastAnswer));
}

function insertConstant(expression, constantName) {
	const constants = {
		pi: Math.PI,
		e: Math.E,
	};

	const value = constants[constantName];
	if (value === undefined) {
		throw new Error("Unknown constant");
	}

	return insertToken(expression, formatNumber(value));
}

function insertToken(expression, token) {
	if (!expression || expression === "0") {
		return token;
	}

	if (expression === "-") {
		return `-${token}`;
	}

	const last = getLastChar(expression);
	if (/[0-9.)]/.test(last)) {
		return `${expression}*${token}`;
	}

	return expression + token;
}

function evaluateExpression(expression) {
	// Steg 1: fjern mellomrom, så "3 + 4" blir "3+4".
	const compact = expression.replace(/\s+/g, "");
	if (!compact) {
		throw new Error("Type an expression first");
	}

	// Steg 2: sikkerhetssjekk. Bare kalkulator-tegn er lov.
	// Regexen under tillater kun sifre, +, -, *, /, ., (, ).
	if (!/^[0-9+\-*/().]+$/.test(compact)) {
		throw new Error("Only numbers and + - * / ( ) are allowed");
	}

	// Steg 3: lukk åpne parenteser automatisk, f.eks. "(2+3" blir "(2+3)".
	const completed = closeOpenParentheses(compact);
	let result;

	try {
		// Steg 4: regn ut uttrykket. "use strict" strammer inn kjøringen.
		result = Function(`"use strict"; return (${completed});`)();
	} catch {
		throw new Error("Incomplete expression");
	}

	// Steg 5: stopp ugyldige resultater som Infinity eller NaN.
	if (!Number.isFinite(result)) {
		throw new Error("Calculation overflow");
	}

	return Number(result);
}

function closeOpenParentheses(expression) {
	// Tell hvor mange parenteser som fortsatt er åpne.
	// depth øker med "(" og synker med ")".
	let depth = 0;

	for (const character of expression) {
		if (character === "(") {
			depth += 1;
		}

		if (character === ")") {
			depth -= 1;
			if (depth < 0) {
				throw new Error("Too many closing parentheses");
			}
		}
	}

	// Legg til så mange ")" som mangler.
	return `${expression}${")".repeat(depth)}`;
}

function formatNumber(value) {
	if (!Number.isFinite(value)) {
		throw new Error("Calculation overflow");
	}

	const normalized = Object.is(value, -0) ? 0 : value;
	return Number.parseFloat(normalized.toPrecision(12)).toString();
}

function findHistoryEntry(state, rawId) {
	const id = Number(rawId);
	if (!id) {
		return null;
	}

	return state.history.find((entry) => entry.id === id) || null;
}

function getNumberSegmentAtEnd(expression) {
	// Finn tallet helt bakerst i uttrykket.
	// Eksempel: "50+25" gir segmentet "25".
	// Brukes av % og +/- for å vite hvilket tall som skal endres.

	// Hopp over eventuelle mellomrom bakerst.
	let end = expression.length;
	while (end > 0 && expression[end - 1] === " ") {
		end -= 1;
	}

	if (!end) {
		return null;
	}

	// Hvis siste tegn ikke er siffer eller punktum, finnes det ikke et slutt-tall.
	let index = end - 1;
	if (!/[0-9.]/.test(expression[index])) {
		return null;
	}

	// Gå bakover for å finne starten på tallet.
	while (index >= 0 && /[0-9.]/.test(expression[index])) {
		index -= 1;
	}

	// Ta med ledende minus hvis den betyr negativt tall (ikke subtraksjon).
	let start = index + 1;
	if (index >= 0 && expression[index] === "-" && isUnaryMinus(expression, index)) {
		start = index;
	}

	return {
		start,
		end,
		text: expression.slice(start, end),
	};
}

function findLastMainOperator(expression) {
	// Søk baklengs etter siste operator utenfor parenteser.
	// Brukes for å tolke prosent riktig i uttrykk som "200+10".
	let depth = 0;

	for (let index = expression.length - 1; index >= 0; index -= 1) {
		const character = expression[index];

		if (character === ")") {
			depth += 1;
			continue;
		}

		if (character === "(") {
			depth -= 1;
			continue;
		}

		if (depth === 0 && isOperator(character)) {
			if (character === "-" && isUnaryMinus(expression, index)) {
				continue;
			}

			return {
				index,
				operator: character,
			};
		}
	}

	return null;
}

function canCloseParenthesis(expression) {
	let openCount = 0;
	let closeCount = 0;

	for (const character of expression) {
		if (character === "(") {
			openCount += 1;
		}

		if (character === ")") {
			closeCount += 1;
		}
	}

	return openCount > closeCount;
}

function endsWithOperatorOrOpenParen(expression) {
	const last = getLastChar(expression);
	return isOperator(last) || last === "(";
}

function getLastChar(text) {
	return text[text.length - 1];
}

function isOperator(character) {
	return character === "+" || character === "-" || character === "*" || character === "/";
}

function isUnaryMinus(expression, index) {
	// "Unary minus" betyr negativt fortegn, f.eks. -5.
	// Vanlig minus betyr subtraksjon, f.eks. 10 - 5.
	// Regel: står minuset først, eller etter operator/"(", er det fortegn.
	if (expression[index] !== "-") {
		return false;
	}

	if (index === 0) {
		return true; // Første tegn må være negativt fortegn.
	}

	const previous = expression[index - 1];
	return isOperator(previous) || previous === "(";
}

document.addEventListener("DOMContentLoaded", () => {
	if (document.body.classList.contains("page-calculator")) {
		initCalculatorPage();
	}
});