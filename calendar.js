const CALENDAR_STORAGE_KEY = "freetime-calendar-events-v1";
const CALENDAR_EXPORT_VERSION = 2;
const CALENDAR_MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const CALENDAR_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CALENDAR_CATEGORY_LABELS = {
	general: "General",
	work: "Work",
	personal: "Personal",
	study: "Study",
};
const CALENDAR_RECURRENCE_LABELS = {
	none: "No repeat",
	daily: "Daily",
	weekly: "Weekly",
	monthly: "Monthly",
};

function initCalendarPage() {
	const ui = {
		prevButton: document.getElementById("calendar-prev"),
		nextButton: document.getElementById("calendar-next"),
		monthTitle: document.getElementById("calendar-month-title"),
		viewButtons: Array.from(document.querySelectorAll("button[data-calendar-view]")),
		filterCategory: document.getElementById("calendar-filter-category"),
		searchInput: document.getElementById("calendar-search-text"),
		showCompletedInput: document.getElementById("calendar-show-completed"),
		weekdayRow: document.getElementById("calendar-weekdays"),
		grid: document.getElementById("calendar-grid"),
		selectedDate: document.getElementById("calendar-selected-date"),
		eventForm: document.getElementById("calendar-event-form"),
		eventInput: document.getElementById("calendar-event-input"),
		eventDateInput: document.getElementById("calendar-event-date"),
		eventTimeInput: document.getElementById("calendar-event-time"),
		eventCategoryInput: document.getElementById("calendar-event-category"),
		eventRecurrenceInput: document.getElementById("calendar-event-recurrence"),
		eventSubmitButton: document.getElementById("calendar-event-submit"),
		eventCancelButton: document.getElementById("calendar-event-cancel"),
		formMessage: document.getElementById("calendar-form-message"),
		eventList: document.getElementById("calendar-event-list"),
		exportButton: document.getElementById("calendar-export-events"),
		importButton: document.getElementById("calendar-import-events"),
		importInput: document.getElementById("calendar-import-file"),
		storageMessage: document.getElementById("calendar-storage-message"),
		upcomingList: document.getElementById("calendar-upcoming-list"),
	};

	if (
		!ui.prevButton ||
		!ui.nextButton ||
		!ui.monthTitle ||
		!ui.viewButtons.length ||
		!ui.filterCategory ||
		!ui.searchInput ||
		!ui.showCompletedInput ||
		!ui.weekdayRow ||
		!ui.grid ||
		!ui.selectedDate ||
		!ui.eventForm ||
		!ui.eventInput ||
		!ui.eventDateInput ||
		!ui.eventTimeInput ||
		!ui.eventCategoryInput ||
		!ui.eventRecurrenceInput ||
		!ui.eventSubmitButton ||
		!ui.eventCancelButton ||
		!ui.formMessage ||
		!ui.eventList ||
		!ui.exportButton ||
		!ui.importButton ||
		!ui.importInput ||
		!ui.storageMessage ||
		!ui.upcomingList
	) {
		return;
	}

	const state = createInitialCalendarState();

	// Felles flyt i handlers: oppdater state og tegn visningen pa nytt.
	ui.prevButton.addEventListener("click", () => {
		moveCalendarPeriod(state, -1);
		cancelCalendarEventEdit(state, ui);
		renderCalendarPage(state, ui);
	});

	ui.nextButton.addEventListener("click", () => {
		moveCalendarPeriod(state, 1);
		cancelCalendarEventEdit(state, ui);
		renderCalendarPage(state, ui);
	});

	for (const button of ui.viewButtons) {
		button.addEventListener("click", () => {
			setCalendarViewMode(state, button.dataset.calendarView);
			cancelCalendarEventEdit(state, ui);
			renderCalendarPage(state, ui);
		});
	}

	ui.filterCategory.addEventListener("change", () => {
		state.filterCategory = normalizeCalendarFilterCategory(ui.filterCategory.value);
		cancelCalendarEventEdit(state, ui);
		renderCalendarPage(state, ui);
	});

	ui.searchInput.addEventListener("input", () => {
		state.searchQuery = ui.searchInput.value.trim().toLowerCase();
		cancelCalendarEventEdit(state, ui);
		renderCalendarPage(state, ui);
	});

	ui.showCompletedInput.addEventListener("change", () => {
		state.showCompleted = Boolean(ui.showCompletedInput.checked);
		renderCalendarPage(state, ui);
	});

	ui.grid.addEventListener("click", (event) => {
		const button = event.target.closest("button[data-date-key]");
		if (!button) {
			return;
		}

		selectCalendarDate(state, button.dataset.dateKey);
		cancelCalendarEventEdit(state, ui);
		renderCalendarPage(state, ui);
	});

	ui.eventForm.addEventListener("submit", (event) => {
		event.preventDefault();
		submitCalendarEvent(state, ui);
		renderCalendarPage(state, ui);
	});

	ui.eventForm.addEventListener("input", () => {
		clearCalendarMessage(ui);
	});

	ui.eventCancelButton.addEventListener("click", () => {
		cancelCalendarEventEdit(state, ui);
		clearCalendarMessage(ui);
		renderCalendarPage(state, ui);
	});

	ui.eventList.addEventListener("click", (event) => {
		const button = event.target.closest("button[data-action]");
		if (!button) {
			return;
		}

		const eventId = Number(button.dataset.id);
		if (!eventId) {
			return;
		}

		if (button.dataset.action === "event-edit") {
			startCalendarEventEdit(state, ui, eventId);
			renderCalendarPage(state, ui);
			return;
		}

		if (button.dataset.action === "event-toggle-complete") {
			toggleCalendarEventCompleted(state, eventId);
			if (state.editingEventId === eventId) {
				cancelCalendarEventEdit(state, ui);
			}
			renderCalendarPage(state, ui);
			return;
		}

		if (button.dataset.action === "event-delete") {
			removeCalendarEvent(state, eventId);
			if (state.editingEventId === eventId) {
				cancelCalendarEventEdit(state, ui);
			}
			renderCalendarPage(state, ui);
		}
	});

	ui.exportButton.addEventListener("click", () => {
		try {
			exportCalendarEvents(state.events);
			setCalendarStorageMessage(ui, `Exported ${state.events.length} event(s).`);
		} catch {
			setCalendarStorageMessage(ui, "Could not export events.", true);
		}
	});

	ui.importButton.addEventListener("click", () => {
		ui.importInput.click();
	});

	ui.importInput.addEventListener("change", () => {
		const file = ui.importInput.files ? ui.importInput.files[0] : null;
		if (!file) {
			return;
		}

		importCalendarEventsFromFile(file, (errorMessage, importedEvents) => {
			if (errorMessage) {
				setCalendarStorageMessage(ui, errorMessage, true);
				return;
			}

			state.events = importedEvents;
			state.nextEventId = getNextCalendarEventId(state.events);
			cancelCalendarEventEdit(state, ui);
			clearCalendarMessage(ui);
			setCalendarStorageMessage(ui, `Imported ${importedEvents.length} event(s).`);
			renderCalendarPage(state, ui);
		});

		// Tillat import av samme fil flere ganger ved behov.
		ui.importInput.value = "";
	});

	resetCalendarEventForm(ui, state.selectedDateKey);
	clearCalendarMessage(ui);
	clearCalendarStorageMessage(ui);
	renderCalendarPage(state, ui);
}

function createInitialCalendarState() {
	const today = stripTimeFromDate(new Date());
	const events = loadCalendarEvents();

	return {
		viewMode: "month",
		filterCategory: "all",
		searchQuery: "",
		showCompleted: true,
		viewYear: today.getFullYear(),
		viewMonth: today.getMonth(),
		selectedDateKey: toDateKey(today),
		todayKey: toDateKey(today),
		editingEventId: null,
		events,
		nextEventId: getNextCalendarEventId(events),
	};
}

function setCalendarViewMode(state, viewMode) {
	if (viewMode === "month" || viewMode === "week" || viewMode === "day") {
		state.viewMode = viewMode;
	}
}

function moveCalendarPeriod(state, step) {
	const selected = fromDateKey(state.selectedDateKey);
	let nextDate;

	// -1 betyr bakover, +1 betyr fremover. Hoppet styres av visning.
	if (state.viewMode === "month") {
		nextDate = new Date(state.viewYear, state.viewMonth + step, 1);
	} else if (state.viewMode === "week") {
		nextDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + step * 7);
	} else {
		nextDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + step);
	}

	state.viewYear = nextDate.getFullYear();
	state.viewMonth = nextDate.getMonth();
	state.selectedDateKey = toDateKey(nextDate);
}

function selectCalendarDate(state, dateKey) {
	const selectedDate = fromDateKey(dateKey);
	state.selectedDateKey = toDateKey(selectedDate);
	state.viewYear = selectedDate.getFullYear();
	state.viewMonth = selectedDate.getMonth();
}

function renderCalendarPage(state, ui) {
	renderCalendarToolbarState(state, ui);
	renderCalendarGrid(state, ui);
	renderCalendarEventPanel(state, ui);
	renderCalendarFormState(state, ui);
	renderCalendarUpcomingPanel(state, ui);
}

function renderCalendarToolbarState(state, ui) {
	for (const button of ui.viewButtons) {
		const buttonMode = button.dataset.calendarView;
		const isActive = buttonMode === state.viewMode;
		button.classList.toggle("is-active", isActive);
		button.setAttribute("aria-pressed", String(isActive));
	}

	ui.filterCategory.value = state.filterCategory;
	ui.searchInput.value = state.searchQuery;
	ui.showCompletedInput.checked = state.showCompleted;
}

// Denne funksjonen bygger alle datocellene basert pa valgt visning:
// month = 42 celler, week = 7 celler, day = 1 celle.
function renderCalendarGrid(state, ui) {
	const dates = getCalendarDatesForCurrentView(state);
	ui.monthTitle.textContent = formatCalendarHeaderTitle(state, dates);

	ui.weekdayRow.classList.toggle("is-hidden", state.viewMode === "day");

	ui.grid.classList.remove("view-month", "view-week", "view-day");
	ui.grid.classList.add(`view-${state.viewMode}`);
	ui.grid.replaceChildren();

	const filters = createCalendarFilters(state);

	for (const date of dates) {
		const dateKey = toDateKey(date);
		const eventCount = getVisibleCalendarEventsByDateKey(state.events, dateKey, filters).length;

		const dayButton = document.createElement("button");
		dayButton.type = "button";
		dayButton.className = "day-cell day-button";
		dayButton.dataset.dateKey = dateKey;

		if (state.viewMode === "month" && date.getMonth() !== state.viewMonth) {
			dayButton.classList.add("muted");
		}

		if (dateKey === state.todayKey) {
			dayButton.classList.add("is-today");
		}

		if (dateKey === state.selectedDateKey) {
			dayButton.classList.add("is-selected");
		}

		if (eventCount > 0) {
			dayButton.classList.add("has-event");
		}

		if (state.viewMode === "day" || state.viewMode === "week") {
			const dayName = document.createElement("small");
			dayName.className = "day-name";
			dayName.textContent = state.viewMode === "week"
				? CALENDAR_DAY_NAMES[date.getDay()].slice(0, 3)
				: CALENDAR_DAY_NAMES[date.getDay()];
			dayButton.append(dayName);
		}

		const dayNumber = document.createElement("p");
		dayNumber.textContent = String(date.getDate());
		dayButton.append(dayNumber);

		if (eventCount > 0) {
			const eventCountLabel = document.createElement("span");
			eventCountLabel.className = "day-event-count";
			eventCountLabel.textContent = eventCount === 1 ? "1 event" : `${eventCount} events`;
			dayButton.append(eventCountLabel);
		}

		ui.grid.append(dayButton);
	}
}

function renderCalendarEventPanel(state, ui) {
	const selectedDate = fromDateKey(state.selectedDateKey);
	ui.selectedDate.textContent = `Selected date: ${formatCalendarLongDate(selectedDate)}`;

	ui.eventList.replaceChildren();

	// Panelet viser events for valgt dato, med kategori/sok og ferdig-filter.
	const visibleEvents = getVisibleCalendarEventsByDateKey(
		state.events,
		state.selectedDateKey,
		createCalendarFilters(state)
	);

	if (!visibleEvents.length) {
		const emptyItem = document.createElement("li");
		emptyItem.className = "event-empty";

		if (state.searchQuery) {
			emptyItem.textContent = "No events match this search for this day.";
		} else if (state.filterCategory !== "all") {
			emptyItem.textContent = "No events in this category for this day.";
		} else if (!state.showCompleted) {
			emptyItem.textContent = "No open events for this day.";
		} else {
			emptyItem.textContent = "No events for this day yet.";
		}

		ui.eventList.append(emptyItem);
		return;
	}

	for (const eventEntry of visibleEvents) {
		const item = document.createElement("li");
		item.className = "calendar-event-item";
		item.classList.toggle("is-completed", eventEntry.completed);

		const main = document.createElement("div");
		main.className = "calendar-event-main";

		const title = document.createElement("span");
		title.className = "calendar-event-title";
		title.textContent = eventEntry.title;

		const meta = document.createElement("small");
		meta.className = "calendar-event-meta";
		meta.textContent = formatCalendarEventMeta(eventEntry);

		main.append(title, meta);

		const actions = document.createElement("div");
		actions.className = "calendar-event-actions";

		const completeButton = document.createElement("button");
		completeButton.type = "button";
		completeButton.className = "calendar-event-toggle";
		completeButton.dataset.action = "event-toggle-complete";
		completeButton.dataset.id = String(eventEntry.id);
		completeButton.textContent = eventEntry.completed ? "Mark open" : "Mark done";

		const editButton = document.createElement("button");
		editButton.type = "button";
		editButton.className = "calendar-event-edit";
		editButton.dataset.action = "event-edit";
		editButton.dataset.id = String(eventEntry.id);
		editButton.textContent = "Edit";

		const removeButton = document.createElement("button");
		removeButton.type = "button";
		removeButton.className = "calendar-event-remove";
		removeButton.dataset.action = "event-delete";
		removeButton.dataset.id = String(eventEntry.id);
		removeButton.textContent = "Remove";

		actions.append(completeButton, editButton, removeButton);
		item.append(main, actions);
		ui.eventList.append(item);
	}
}

function renderCalendarFormState(state, ui) {
	const isEditing = state.editingEventId !== null;
	ui.eventSubmitButton.textContent = isEditing ? "Save changes" : "Add event";
	ui.eventCancelButton.classList.toggle("is-hidden", !isEditing);
}

function renderCalendarUpcomingPanel(state, ui) {
	ui.upcomingList.replaceChildren();

	const filters = createCalendarFilters(state);
	const startDate = fromDateKey(state.selectedDateKey);
	const nextDates = buildSequentialDates(startDate, 7);
	const upcoming = [];

	for (const date of nextDates) {
		const dateKey = toDateKey(date);
		const eventsForDate = getVisibleCalendarEventsByDateKey(state.events, dateKey, filters);
		for (const eventEntry of eventsForDate) {
			upcoming.push({
				date,
				eventEntry,
			});
		}
	}

	if (!upcoming.length) {
		const emptyItem = document.createElement("li");
		emptyItem.className = "event-empty";
		emptyItem.textContent = "No upcoming events in the next 7 days.";
		ui.upcomingList.append(emptyItem);
		return;
	}

	for (const entry of upcoming) {
		const item = document.createElement("li");
		item.className = "calendar-upcoming-item";
		item.classList.toggle("is-completed", entry.eventEntry.completed);

		const title = document.createElement("span");
		title.className = "calendar-upcoming-title";
		title.textContent = entry.eventEntry.title;

		const meta = document.createElement("small");
		meta.className = "calendar-upcoming-meta";
		meta.textContent = `${formatCalendarShortDate(entry.date)} | ${formatCalendarEventMeta(entry.eventEntry)}`;

		item.append(title, meta);
		ui.upcomingList.append(item);
	}
}

function submitCalendarEvent(state, ui) {
	const title = ui.eventInput.value.trim();
	if (!title) {
		setCalendarMessage(ui, "Please type a title.", true);
		return;
	}

	// Dato kan redigeres direkte i skjemaet. Ugyldig verdi faller tilbake til valgt dato.
	const draft = sanitizeCalendarEventDraft({
		title,
		dateKey: normalizeCalendarDateKey(ui.eventDateInput.value, state.selectedDateKey),
		time: ui.eventTimeInput.value,
		category: ui.eventCategoryInput.value,
		recurrence: ui.eventRecurrenceInput.value,
	});

	const conflict = findCalendarTimeConflict(state.events, draft, state.editingEventId);
	if (conflict) {
		const conflictDate = formatCalendarLongDate(fromDateKey(draft.dateKey));
		setCalendarMessage(ui, `Time conflict with \"${conflict.title}\" on ${conflictDate}.`, true);
		return;
	}

	clearCalendarMessage(ui);
	const isNew = state.editingEventId === null;

	// Samme skjema brukes bade for nye events og redigering av eksisterende.
	if (isNew) {
		addCalendarEvent(state, draft);
	} else {
		updateCalendarEvent(state, state.editingEventId, draft);
	}

	cancelCalendarEventEdit(state, ui);
	setCalendarMessage(ui, isNew ? "Event added." : "Event updated.");
}

function addCalendarEvent(state, draft) {
	const entry = {
		id: state.nextEventId,
		dateKey: draft.dateKey,
		title: draft.title,
		time: draft.time,
		category: draft.category,
		recurrence: draft.recurrence,
		completed: false,
	};

	state.nextEventId += 1;
	state.events.push(entry);
	saveCalendarEvents(state.events);
}

function updateCalendarEvent(state, eventId, draft) {
	const index = state.events.findIndex((entry) => entry.id === eventId);
	if (index < 0) {
		return;
	}

	state.events[index] = {
		...state.events[index],
		dateKey: draft.dateKey,
		title: draft.title,
		time: draft.time,
		category: draft.category,
		recurrence: draft.recurrence,
	};

	saveCalendarEvents(state.events);
}

function startCalendarEventEdit(state, ui, eventId) {
	const eventEntry = state.events.find((entry) => entry.id === eventId);
	if (!eventEntry) {
		return;
	}

	state.editingEventId = eventEntry.id;
	ui.eventInput.value = eventEntry.title;
	ui.eventDateInput.value = eventEntry.dateKey;
	ui.eventTimeInput.value = eventEntry.time;
	ui.eventCategoryInput.value = eventEntry.category;
	ui.eventRecurrenceInput.value = eventEntry.recurrence;
	ui.eventInput.focus();
}

function cancelCalendarEventEdit(state, ui) {
	state.editingEventId = null;
	resetCalendarEventForm(ui, state.selectedDateKey);
}

function resetCalendarEventForm(ui, selectedDateKey) {
	ui.eventForm.reset();
	ui.eventDateInput.value = selectedDateKey;
	ui.eventCategoryInput.value = "general";
	ui.eventRecurrenceInput.value = "none";
}

function removeCalendarEvent(state, eventId) {
	if (!eventId) {
		return;
	}

	state.events = state.events.filter((entry) => entry.id !== eventId);
	saveCalendarEvents(state.events);
}

function toggleCalendarEventCompleted(state, eventId) {
	const eventEntry = state.events.find((entry) => entry.id === eventId);
	if (!eventEntry) {
		return;
	}

	eventEntry.completed = !eventEntry.completed;
	saveCalendarEvents(state.events);
}

function createCalendarFilters(state) {
	return {
		category: normalizeCalendarFilterCategory(state.filterCategory),
		searchQuery: typeof state.searchQuery === "string" ? state.searchQuery.trim().toLowerCase() : "",
		showCompleted: Boolean(state.showCompleted),
	};
}

function getVisibleCalendarEventsByDateKey(events, dateKey, filters) {
	const activeFilters = {
		category: filters && filters.category ? filters.category : "all",
		searchQuery: filters && typeof filters.searchQuery === "string"
			? filters.searchQuery.trim().toLowerCase()
			: "",
		showCompleted: !filters || filters.showCompleted !== false,
	};

	let result = getCalendarEventsByDateKey(events, dateKey);

	if (activeFilters.category !== "all") {
		result = result.filter((entry) => entry.category === activeFilters.category);
	}

	if (activeFilters.searchQuery) {
		result = result.filter((entry) => entry.title.toLowerCase().includes(activeFilters.searchQuery));
	}

	if (!activeFilters.showCompleted) {
		result = result.filter((entry) => !entry.completed);
	}

	return result;
}

function getCalendarEventsByDateKey(events, dateKey) {
	return events
		.filter((entry) => eventOccursOnDate(entry, dateKey))
		.sort((first, second) => {
			// Sorter pa tid, hold apne events foran ferdige, og bruk id for stabil rekkefolge.
			if (first.time && second.time && first.time !== second.time) {
				return first.time.localeCompare(second.time);
			}

			if (first.time && !second.time) {
				return -1;
			}

			if (!first.time && second.time) {
				return 1;
			}

			if (first.completed !== second.completed) {
				return first.completed ? 1 : -1;
			}

			return first.id - second.id;
		});
}

function eventOccursOnDate(entry, dateKey) {
	if (typeof entry !== "object" || typeof entry.dateKey !== "string") {
		return false;
	}

	if (dateKey < entry.dateKey) {
		return false;
	}

	if (entry.recurrence === "daily") {
		return true;
	}

	if (entry.recurrence === "weekly") {
		const startDate = fromDateKey(entry.dateKey);
		const targetDate = fromDateKey(dateKey);
		return startDate.getDay() === targetDate.getDay();
	}

	if (entry.recurrence === "monthly") {
		const startDate = fromDateKey(entry.dateKey);
		const targetDate = fromDateKey(dateKey);
		return startDate.getDate() === targetDate.getDate();
	}

	return entry.dateKey === dateKey;
}

// Ved lasting normaliseres data slik at gamle lagrede events fortsatt virker.
function loadCalendarEvents() {
	try {
		const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
		if (!raw) {
			return [];
		}

		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.map(normalizeCalendarEvent).filter(Boolean);
	} catch {
		return [];
	}
}

function saveCalendarEvents(events) {
	try {
		localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
	} catch {
		// Nettleseren kan blokkere localStorage i private/strenge modus.
	}
}

function normalizeCalendarEvent(entry) {
	// Beskytter mot ugyldige eller gamle localStorage-verdier.
	if (!entry || typeof entry !== "object") {
		return null;
	}

	const id = Number(entry.id);
	if (!Number.isFinite(id) || id <= 0) {
		return null;
	}

	if (typeof entry.dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.dateKey)) {
		return null;
	}

	const title = typeof entry.title === "string" ? entry.title.trim() : "";
	if (!title) {
		return null;
	}

	return {
		id,
		dateKey: normalizeCalendarDateKey(entry.dateKey, toDateKey(stripTimeFromDate(new Date()))),
		title,
		time: normalizeCalendarTime(entry.time),
		category: normalizeCalendarCategory(entry.category),
		recurrence: normalizeCalendarRecurrence(entry.recurrence),
		completed: Boolean(entry.completed),
	};
}

function sanitizeCalendarEventDraft(draft) {
	return {
		title: draft.title,
		dateKey: draft.dateKey,
		time: normalizeCalendarTime(draft.time),
		category: normalizeCalendarCategory(draft.category),
		recurrence: normalizeCalendarRecurrence(draft.recurrence),
	};
}

function normalizeCalendarDateKey(value, fallbackDateKey) {
	if (typeof value !== "string") {
		return fallbackDateKey;
	}

	const candidate = value.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
		return fallbackDateKey;
	}

	// Normaliser via Date for konsekvent YYYY-MM-DD format.
	const parsed = fromDateKey(candidate);
	return toDateKey(parsed);
}

function normalizeCalendarTime(value) {
	// Tillat kun 24-timers klokkeslett i format HH:mm.
	if (typeof value !== "string" || !value.trim()) {
		return "";
	}

	if (!/^\d{2}:\d{2}$/.test(value)) {
		return "";
	}

	const [rawHour, rawMinute] = value.split(":");
	const hour = Number(rawHour);
	const minute = Number(rawMinute);

	if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
		return "";
	}

	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		return "";
	}

	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeCalendarCategory(value) {
	if (typeof value !== "string") {
		return "general";
	}

	const key = value.toLowerCase();
	if (!CALENDAR_CATEGORY_LABELS[key]) {
		return "general";
	}

	return key;
}

function normalizeCalendarRecurrence(value) {
	if (typeof value !== "string") {
		return "none";
	}

	const key = value.toLowerCase();
	if (!CALENDAR_RECURRENCE_LABELS[key]) {
		return "none";
	}

	return key;
}

function normalizeCalendarFilterCategory(value) {
	if (value === "all") {
		return "all";
	}

	return normalizeCalendarCategory(value);
}

function findCalendarTimeConflict(events, draft, editingEventId) {
	if (!draft.time) {
		return null;
	}

	for (const entry of events) {
		if (entry.id === editingEventId) {
			continue;
		}

		if (!entry.time || entry.time !== draft.time) {
			continue;
		}

		if (eventOccursOnDate(entry, draft.dateKey)) {
			return entry;
		}
	}

	return null;
}

function exportCalendarEvents(events) {
	const payload = {
		version: CALENDAR_EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		events,
	};

	const json = JSON.stringify(payload, null, 2);
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const todayKey = toDateKey(stripTimeFromDate(new Date()));

	const link = document.createElement("a");
	link.href = url;
	link.download = `calendar-backup-${todayKey}.json`;
	document.body.append(link);
	link.click();
	link.remove();

	setTimeout(() => {
		URL.revokeObjectURL(url);
	}, 0);
}

function importCalendarEventsFromFile(file, onDone) {
	const reader = new FileReader();

	reader.addEventListener("load", () => {
		try {
			const importedEvents = parseCalendarImportPayload(reader.result);
			saveCalendarEvents(importedEvents);
			onDone("", importedEvents);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Could not parse import file.";
			onDone(message, []);
		}
	});

	reader.addEventListener("error", () => {
		onDone("Could not read import file.", []);
	});

	reader.readAsText(file);
}

function parseCalendarImportPayload(raw) {
	if (typeof raw !== "string") {
		throw new Error("Import file is empty.");
	}

	const parsed = JSON.parse(raw);
	let source = null;

	if (Array.isArray(parsed)) {
		source = parsed;
	} else if (parsed && typeof parsed === "object" && Array.isArray(parsed.events)) {
		source = parsed.events;
	}

	if (!source) {
		throw new Error("Import must be a JSON array or an object with an events array.");
	}

	const importedEvents = source.map(normalizeCalendarEvent).filter(Boolean);
	return importedEvents;
}

function setCalendarMessage(ui, message, isError = false) {
	if (!message) {
		clearCalendarMessage(ui);
		return;
	}

	ui.formMessage.textContent = message;
	ui.formMessage.classList.remove("is-hidden");
	ui.formMessage.classList.toggle("is-error", isError);
}

function clearCalendarMessage(ui) {
	ui.formMessage.textContent = "";
	ui.formMessage.classList.add("is-hidden");
	ui.formMessage.classList.remove("is-error");
}

function setCalendarStorageMessage(ui, message, isError = false) {
	if (!message) {
		clearCalendarStorageMessage(ui);
		return;
	}

	ui.storageMessage.textContent = message;
	ui.storageMessage.classList.toggle("is-error", isError);
}

function clearCalendarStorageMessage(ui) {
	ui.storageMessage.textContent = "";
	ui.storageMessage.classList.remove("is-error");
}

function getCalendarDatesForCurrentView(state) {
	const selected = fromDateKey(state.selectedDateKey);

	if (state.viewMode === "day") {
		return [selected];
	}

	if (state.viewMode === "week") {
		const weekStart = startOfWeekMonday(selected);
		return buildSequentialDates(weekStart, 7);
	}

	// Maned vises alltid som et 6x7 rutenett for stabil layout.
	const firstOfMonth = new Date(state.viewYear, state.viewMonth, 1);
	const mondayStartOffset = (firstOfMonth.getDay() + 6) % 7;
	const monthGridStart = new Date(state.viewYear, state.viewMonth, 1 - mondayStartOffset);
	return buildSequentialDates(monthGridStart, 42);
}

function buildSequentialDates(startDate, count) {
	const dates = [];

	for (let index = 0; index < count; index += 1) {
		dates.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + index));
	}

	return dates;
}

function startOfWeekMonday(date) {
	const offset = (date.getDay() + 6) % 7;
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

function formatCalendarHeaderTitle(state, dates) {
	if (state.viewMode === "day") {
		return formatCalendarLongDate(dates[0]);
	}

	if (state.viewMode === "week") {
		const start = dates[0];
		const end = dates[dates.length - 1];
		return `Week: ${formatCalendarShortDate(start)} - ${formatCalendarShortDate(end)}`;
	}

	return `${CALENDAR_MONTH_NAMES[state.viewMonth]} ${state.viewYear}`;
}

function formatCalendarShortDate(date) {
	const monthName = CALENDAR_MONTH_NAMES[date.getMonth()].slice(0, 3);
	return `${monthName} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatCalendarEventMeta(eventEntry) {
	const timeLabel = eventEntry.time || "No time";
	const categoryLabel = CALENDAR_CATEGORY_LABELS[eventEntry.category] || CALENDAR_CATEGORY_LABELS.general;
	const recurrenceLabel = CALENDAR_RECURRENCE_LABELS[eventEntry.recurrence] || CALENDAR_RECURRENCE_LABELS.none;
	const statusLabel = eventEntry.completed ? "Done" : "Open";
	return `Time: ${timeLabel} | Category: ${categoryLabel} | Repeat: ${recurrenceLabel} | Status: ${statusLabel}`;
}

function getNextCalendarEventId(events) {
	let maxId = 0;

	for (const entry of events) {
		if (entry.id > maxId) {
			maxId = entry.id;
		}
	}

	return maxId + 1;
}

function formatCalendarLongDate(date) {
	const dayName = CALENDAR_DAY_NAMES[date.getDay()];
	const monthName = CALENDAR_MONTH_NAMES[date.getMonth()];
	return `${dayName}, ${monthName} ${date.getDate()}, ${date.getFullYear()}`;
}

function toDateKey(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
	const parts = dateKey.split("-");
	if (parts.length !== 3) {
		return stripTimeFromDate(new Date());
	}

	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const day = Number(parts[2]);

	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
		return stripTimeFromDate(new Date());
	}

	return new Date(year, month - 1, day);
}

function stripTimeFromDate(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

document.addEventListener("DOMContentLoaded", () => {
	if (document.body.classList.contains("page-calendar")) {
		initCalendarPage();
	}
});
