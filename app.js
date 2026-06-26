const STORAGE_KEY = "horaire-usi-partage-demo-v4";
const API = window.HoraireApi;
let CURRENT_USER = "";
let currentAccount = null;
const APP_CURRENT_YEAR = new Date().getFullYear();
const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const ANNUAL_TASK_COLUMNS = [
  ["USI AB", "USI A-B"],
  ["USI CD", "USI C-D"],
  ["USI UGB", "UGB"],
  ["USI nuits", "Nuits"],
];
const DOCTOR_NAMES = {
  AV: "Abel Vanderschuren", AT: "Alexis Turgeon", CF: "Charles Francoeur",
  EB: "Eric Brassard", FLAU: "Francois Lauzier", GLEB: "Guillaume Leblanc",
  JFS: "Jean-Francois Shields", JG: "Josee Gagnon", LB: "Laurence Brunet",
  MAL: "Marc-Antoine Lepage", RBEN: "Reda Bensaidane", SDM: "Simon Demers-Marcil",
  SL: "Stephanie Leclerc", VT: "Vincent Trottier",
};
const NOTIFICATION_TEMPLATE_DEFAULTS = [
  { id: "request-received", title: "Demande reçue", channels: "Push + courriel", subject: "Nouvelle demande d'échange", body: "Vous avez reçu une demande d'échange. Consultez l'application pour accepter ou refuser." },
  { id: "request-accepted", title: "Demande acceptée", channels: "Push + courriel", subject: "Demande d'échange acceptée", body: "Votre échange a été accepté et l'horaire a été mis à jour." },
  { id: "reminder-48h", title: "Rappel 48 h", channels: "Push + courriel", subject: "Rappel : demande d'échange en attente", body: "Une demande d'échange attend votre réponse depuis 48 heures." },
  { id: "admin-notice", title: "Avis administrateur", channels: "Courriel", subject: "Échange complété dans l'horaire USI", body: "Un échange a été complété. Le journal d'audit contient les détails." },
  { id: "monthly-pdf", title: "PDF mensuel envoyé", channels: "Courriel", subject: "Listes de garde du mois prochain", body: "Les PDF hebdomadaires du mois prochain sont joints à ce message." },
];
const DUTY_ROWS = [
  { id: "day", label: "Garde de JOUR", detail: "8h à 19h", tone: "day", sources: ["USI AB", "USI CD", "USI AB", "USI CD", "USI AB", "USI CD", "USI AB"] },
  { id: "night", label: "Garde de NUIT", detail: "19h à 8h", tone: "night", sources: ["USI nuits", "USI nuits", "USI nuits", "USI nuits", "USI UGB", "USI UGB", "USI UGB"] },
  { id: "second-night", label: "2e garde de nuit", detail: "", tone: "night-secondary", sources: ["USI AB", "USI CD", "USI AB", "USI CD", "USI AB", "USI CD", "USI AB"] },
  { id: "unit-ab", label: "Unité A-B", detail: "", tone: "unit", sources: Array(7).fill("USI AB") },
  { id: "unit-cd", label: "Unité C-D", detail: "", tone: "unit", sources: Array(7).fill("USI CD") },
  { id: "ugb", label: "UGB", detail: "", tone: "unit", sources: ["USI UGB", "USI UGB", "USI UGB", "USI UGB", "USI UGB", "USI CD", "USI AB"] },
];
const ALEXIS_USI_AB_DUTY_SOURCES = {
  day: ["USI AB", "USI CD", "USI AB", "USI CD", "USI AB", "USI CD", "USI AB"],
  night: ["USI AB", "USI nuits", "USI AB", "USI nuits", "USI UGB", "USI UGB", "USI UGB"],
  "second-night": ["USI CD", "USI CD", "USI CD", "USI CD", "USI AB", "USI CD", "USI AB"],
  "unit-ab": Array(7).fill("USI AB"),
  "unit-cd": Array(7).fill("USI CD"),
  ugb: ["USI UGB", "USI UGB", "USI UGB", "USI UGB", "USI UGB", "USI CD", "USI AB"],
};
const ALEXIS_USI_CD_DUTY_SOURCES = {
  day: ["USI AB", "USI CD", "USI AB", "USI CD", "USI AB", "USI CD", "USI AB"],
  night: ["USI nuits", "USI CD", "USI nuits", "USI CD", "USI UGB", "USI UGB", "USI UGB"],
  "second-night": ["USI AB", "USI AB", "USI AB", "USI AB", "USI AB", "USI CD", "USI AB"],
  "unit-ab": Array(7).fill("USI AB"),
  "unit-cd": Array(7).fill("USI CD"),
  ugb: ["USI UGB", "USI UGB", "USI UGB", "USI UGB", "USI UGB", "USI CD", "USI AB"],
};

const demoSchedule = [
  week(24, "8 juin 2026", [["USI AB", "GLEB"], ["USI CD", "AT"], ["USI UGB", "JFS"], ["USI nuits", "SL"], ["HSFA A", "VT"], ["HSFA B", "JG"]]),
  week(25, "15 juin 2026", [["USI AB", "CF"], ["USI CD", "FLAU"], ["USI UGB", "GLEB"], ["USI nuits", "AT"], ["HSFA A", "LB"], ["HSFA B", "SDM"]]),
  week(26, "22 juin 2026", [["USI AB", "EB"], ["USI CD", "VT"], ["USI UGB", "RBEN"], ["USI nuits", "GLEB"], ["HSFA A", "JG"], ["HSFA B", "SL"]]),
  week(27, "29 juin 2026", [["USI AB", "AT"], ["USI CD", "JFS"], ["USI UGB", "MAL"], ["USI nuits", "CF"], ["HSFA A", "GLEB"], ["HSFA B", "LB"]]),
  week(28, "6 juillet 2026", [["USI AB", "VT"], ["USI CD", "GLEB"], ["USI UGB", "AT"], ["USI nuits", "SDM"], ["HSFA A", "SL"], ["HSFA B", "JG"]]),
];
const demoNextYearSchedule = [
  week(1, "4 janvier 2027", [["USI AB", "SDM"], ["USI CD", "FLAU"], ["USI UGB", "AT"], ["USI nuits", "RBEN"], ["HSFA A", "GLEB"], ["HSFA B", "LB"]]),
  week(2, "11 janvier 2027", [["USI AB", "LB"], ["USI CD", "SDM"], ["USI UGB", "GLEB"], ["USI nuits", "CF"], ["HSFA A", "VT"], ["HSFA B", "JG"]]),
  week(3, "18 janvier 2027", [["USI AB", "AT"], ["USI CD", "JFS"], ["USI UGB", "MAL"], ["USI nuits", "SL"], ["HSFA A", "EB"], ["HSFA B", "FLAU"]]),
  week(4, "25 janvier 2027", [["USI AB", "CF"], ["USI CD", "GLEB"], ["USI UGB", "RBEN"], ["USI nuits", "SDM"], ["HSFA A", "LB"], ["HSFA B", "VT"]]),
  week(5, "1 février 2027", [["USI AB", "EB"], ["USI CD", "AT"], ["USI UGB", "JFS"], ["USI nuits", "GLEB"], ["HSFA A", "SL"], ["HSFA B", "JG"]]),
];
const demoSchedulesByYear = {
  [APP_CURRENT_YEAR]: demoSchedule,
  [APP_CURRENT_YEAR + 1]: demoNextYearSchedule,
};

const demoRequests = [
  {
    id: "swap-1",
    direction: "incoming",
    requester: "AT",
    scope: "weekly",
    offered: { scope: "weekly", year: APP_CURRENT_YEAR, weekNumber: 24, task: "Toutes les tâches de la semaine", code: "AT", cellCount: 14 },
    requested: { scope: "weekly", year: APP_CURRENT_YEAR, weekNumber: 24, task: "Toutes les tâches de la semaine", code: CURRENT_USER, cellCount: 17 },
    message: "Je propose d'échanger toutes nos tâches de la semaine.",
    status: "pending",
    createdAt: "Aujourd'hui",
    notification: demoNotification("Aujourd'hui", "Dans 48 h"),
  },
];

let state = loadState();
let swapFilter = "incoming";
let activeSwapScope = "individual";
let lockedRequestedKey = "";
let lockedOfferedKey = "";
let selectedWeekFilter = "next4";
let userAdminMode = "edit";
let requestedSwapEntries = [];
let offeredSwapEntries = [];
const pdfObjectUrls = new Map();

const scheduleList = document.getElementById("schedule-list");
const annualList = document.getElementById("annual-list");
const annualStatus = document.getElementById("annual-status");
const swapList = document.getElementById("swap-list");
const swapBadge = document.getElementById("swap-badge");
const auditAdmin = document.getElementById("audit-admin");
const auditList = document.getElementById("audit-list");
const swapDialog = document.getElementById("swap-dialog");
const swapForm = document.getElementById("swap-form");
const offeredAssignmentField = document.getElementById("offered-assignment-field");
const offeredWeekField = document.getElementById("offered-week-field");
const offeredWeek = document.getElementById("offered-week");
const offeredTaskField = document.getElementById("offered-task-field");
const offeredAssignment = document.getElementById("offered-assignment");
const offeredAssignmentPreview = document.getElementById("offered-assignment-preview");
const requestedAssignmentField = document.getElementById("requested-assignment-field");
const requestedAssignmentPicker = document.getElementById("requested-assignment-picker");
const requestedDoctor = document.getElementById("requested-doctor");
const requestedWeek = document.getElementById("requested-week");
const requestedAssignment = document.getElementById("requested-assignment");
const requestedAssignmentFixed = document.getElementById("requested-assignment-fixed");
const adminWeeklyOne = document.getElementById("admin-weekly-one");
const adminWeeklyTwo = document.getElementById("admin-weekly-two");
const adminDirectSwap = document.getElementById("admin-direct-swap");
const csvInput = document.getElementById("csv-input");
const importPanel = document.querySelector(".import-panel");
const importStatus = document.getElementById("import-status");
const holidayUploadPanel = document.getElementById("holiday-upload-panel");
const holidayPdfInput = document.getElementById("holiday-pdf-input");
const holidayStatus = document.getElementById("holiday-status");
const holidayPdfViewer = document.getElementById("holiday-pdf-viewer");
const hsfaUploadPanel = document.getElementById("hsfa-upload-panel");
const hsfaPdfInput = document.getElementById("hsfa-pdf-input");
const hsfaStatus = document.getElementById("hsfa-status");
const hsfaPdfViewer = document.getElementById("hsfa-pdf-viewer");
const monthlyPdfAdmin = document.getElementById("monthly-pdf-admin");
const monthlyPdfEnabled = document.getElementById("monthly-pdf-enabled");
const monthlyPdfRecipients = document.getElementById("monthly-pdf-recipients");
const monthlyPdfNextRun = document.getElementById("monthly-pdf-next-run");
const monthlyPdfAttachmentCount = document.getElementById("monthly-pdf-attachment-count");
const monthlyPdfHistory = document.getElementById("monthly-pdf-history");
const adminDashboard = document.getElementById("admin-dashboard");
const adminDashboardGrid = document.getElementById("admin-dashboard-grid");
const notificationTemplateAdmin = document.getElementById("notification-template-admin");
const notificationTemplateList = document.getElementById("notification-template-list");
const userAdmin = document.getElementById("user-admin");
const userAdminModeLabel = document.getElementById("user-admin-mode");
const userAdminSelect = document.getElementById("user-admin-select");
const userAdminCode = document.getElementById("user-admin-code");
const userAdminName = document.getElementById("user-admin-name");
const userAdminEmail = document.getElementById("user-admin-email");
const userAdminPhone = document.getElementById("user-admin-phone");
const userAdminRole = document.getElementById("user-admin-role");
const userAdminPassword = document.getElementById("user-admin-password");
const userAdminPasswordLabel = document.getElementById("user-admin-password-label");
const userAdminActive = document.getElementById("user-admin-active");
const cancelNewUserAdminButton = document.getElementById("cancel-new-user-admin");
const scheduleSearch = document.getElementById("schedule-search");
const annualYearSelect = document.getElementById("annual-year-select");
const yearSelect = document.getElementById("year-select");
const importYearSelect = document.getElementById("import-year-select");
const weekSelect = document.getElementById("week-select");
const exportAnnualPdf = document.getElementById("export-annual-pdf");
const toast = document.getElementById("toast");

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.target));
});

document.querySelectorAll(".subtab").forEach((button) => {
  button.addEventListener("click", () => {
    swapFilter = button.dataset.swapFilter;
    document.querySelectorAll(".subtab").forEach((entry) => entry.classList.toggle("active", entry === button));
    renderSwaps();
  });
});

document.getElementById("profile-button").addEventListener("click", () => showView("profile"));
document.getElementById("open-swap-form").addEventListener("click", () => openSwapDialog());
document.getElementById("close-swap-form").addEventListener("click", () => swapDialog.close());
document.getElementById("login-form").addEventListener("submit", handleLogin);
document.getElementById("logout-button").addEventListener("click", logout);
window.addEventListener("horaire:session-expired", () => {
  CURRENT_USER = "";
  currentAccount = null;
  showLogin("Votre session a expiré. Veuillez vous reconnecter.");
});
window.addEventListener("horaire:api-wakeup", (event) => {
  const submit = document.getElementById("login-submit");
  if (submit.disabled) submit.textContent = event.detail.attempt === 1 ? "Connexion au serveur..." : "Réveil du serveur...";
});
document.getElementById("apply-admin-weekly-swap").addEventListener("click", applyAdminWeeklySwap);
document.getElementById("save-monthly-pdf-settings").addEventListener("click", saveMonthlyPdfSettings);
document.getElementById("simulate-monthly-pdf-send").addEventListener("click", simulateMonthlyPdfSend);
userAdminSelect.addEventListener("change", renderSelectedUserAdmin);
document.getElementById("new-user-admin").addEventListener("click", startNewUserAdmin);
document.getElementById("cancel-new-user-admin").addEventListener("click", cancelNewUserAdmin);
document.getElementById("save-user-admin").addEventListener("click", saveUserAdmin);
exportAnnualPdf.addEventListener("click", exportAnnualToPdf);
csvInput.addEventListener("change", importScheduleFile);
holidayPdfInput.addEventListener("change", importHolidayPdf);
hsfaPdfInput.addEventListener("change", importHsfaPdf);
holidayPdfViewer.addEventListener("click", handlePdfViewerAction);
hsfaPdfViewer.addEventListener("click", handlePdfViewerAction);
requestedDoctor.addEventListener("change", populateRequestedWeekOptions);
requestedWeek.addEventListener("change", populateRequestedTaskOptions);
offeredWeek.addEventListener("change", populateOfferedTaskOptions);
offeredAssignment.addEventListener("change", updateOfferedAssignmentPreview);
scheduleSearch.addEventListener("input", renderSchedule);
annualYearSelect.addEventListener("change", () => {
  state.activeYear = Number(annualYearSelect.value);
  selectedWeekFilter = "next4";
  saveState();
  renderAll();
});
yearSelect.addEventListener("change", () => {
  state.activeYear = Number(yearSelect.value);
  selectedWeekFilter = "next4";
  saveState();
  renderAll();
});
weekSelect.addEventListener("change", () => {
  selectedWeekFilter = weekSelect.value;
  renderSchedule();
});
swapForm.addEventListener("submit", createSwapRequest);
swapForm.addEventListener("invalid", () => showToast("Veuillez compléter tous les champs visibles."), true);
swapList.addEventListener("click", handleSwapAction);
scheduleList.addEventListener("click", handleScheduleAction);
annualList.addEventListener("click", handleScheduleAction);

initializeApplication();

function week(weekNumber, date, entries) {
  const start = parseFrenchDate(date);
  return { year: start?.getFullYear() || APP_CURRENT_YEAR, weekNumber, date, assignments: entries.map(([task, code]) => ({ task, code, doctor: DOCTOR_NAMES[code] || code })) };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.schedule?.length && Array.isArray(saved.requests)) return normalizeState(saved);
    if (saved?.schedulesByYear && Array.isArray(saved.requests)) return normalizeState(saved);
  } catch {}
  return defaultState();
}

function defaultState() {
  return {
    schedulesByYear: structuredClone(demoSchedulesByYear),
    activeYear: APP_CURRENT_YEAR,
    requests: structuredClone(demoRequests),
    cellOverrides: {},
    holidayPdf: null,
    hsfaPdf: null,
    monthlyPdf: defaultMonthlyPdfSettings(),
    auditTrail: [],
    importIssues: [],
    users: defaultUsers(),
    notificationTemplates: structuredClone(NOTIFICATION_TEMPLATE_DEFAULTS),
    sourceByYear: { [APP_CURRENT_YEAR]: "Démonstration", [APP_CURRENT_YEAR + 1]: "Démonstration" },
  };
}

function normalizeState(saved) {
  const schedulesByYear = saved.schedulesByYear || {};
  if (saved.schedule?.length) {
    const inferredYear = inferScheduleYear(saved.schedule) || APP_CURRENT_YEAR;
    schedulesByYear[inferredYear] = saved.schedule;
  }
  Object.entries(demoSchedulesByYear).forEach(([year, schedule]) => {
    if (!Array.isArray(schedulesByYear[year])) schedulesByYear[year] = structuredClone(schedule);
  });
  const activeYear = APP_CURRENT_YEAR;
  return {
    schedulesByYear: Object.fromEntries(Object.entries(schedulesByYear).map(([year, schedule]) => [
      year,
      schedule.map((weekEntry) => ({ ...weekEntry, year: Number(weekEntry.year) || Number(year) })),
    ])),
    activeYear,
    requests: Array.isArray(saved.requests) ? saved.requests : [],
    cellOverrides: saved.cellOverrides || {},
    holidayPdf: saved.holidayPdf || null,
    hsfaPdf: saved.hsfaPdf || null,
    monthlyPdf: normalizeMonthlyPdfSettings(saved.monthlyPdf),
    auditTrail: Array.isArray(saved.auditTrail) ? saved.auditTrail.slice(0, 100) : [],
    importIssues: Array.isArray(saved.importIssues) ? saved.importIssues.slice(0, 25) : [],
    users: normalizeUsers(saved.users),
    notificationTemplates: Array.isArray(saved.notificationTemplates) ? saved.notificationTemplates : structuredClone(NOTIFICATION_TEMPLATE_DEFAULTS),
    sourceByYear: saved.sourceByYear || { [activeYear]: saved.source || "Démonstration" },
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function initializeApplication() {
  if (!API) {
    showLogin("Le client API n'est pas disponible. Rechargez la page.");
    return;
  }
  if (!API.hasSession()) {
    showLogin();
    API.wake().catch(() => {});
    return;
  }
  try {
    currentAccount = await API.me();
    CURRENT_USER = currentAccount.code;
    await loadSharedData();
    showAuthenticatedApplication();
  } catch (error) {
    API.logout();
    showLogin(error.message);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const submit = document.getElementById("login-submit");
  const errorLabel = document.getElementById("login-error");
  submit.disabled = true;
  submit.textContent = "Vérification...";
  errorLabel.hidden = true;
  try {
    currentAccount = await API.login(
      document.getElementById("login-code").value.trim().toUpperCase(),
      document.getElementById("login-password").value,
    );
    CURRENT_USER = currentAccount.code;
    await loadSharedData();
    document.getElementById("login-form").reset();
    showAuthenticatedApplication();
  } catch (error) {
    API.logout();
    errorLabel.textContent = error.message === "Failed to fetch"
      ? "Le serveur est temporairement inaccessible. Attendez quelques instants, puis réessayez."
      : error.message;
    errorLabel.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = "Se connecter";
  }
}

function showLogin(message = "") {
  document.getElementById("login-screen").hidden = false;
  document.getElementById("app-header").hidden = true;
  document.getElementById("app-main").hidden = true;
  document.getElementById("app-nav").hidden = true;
  const errorLabel = document.getElementById("login-error");
  errorLabel.textContent = message;
  errorLabel.hidden = !message;
}

function showAuthenticatedApplication() {
  document.getElementById("login-screen").hidden = true;
  document.getElementById("app-header").hidden = false;
  document.getElementById("app-main").hidden = false;
  document.getElementById("app-nav").hidden = false;
  updateAuthenticatedIdentity();
  renderAll();
}

function logout() {
  API.logout();
  CURRENT_USER = "";
  currentAccount = null;
  state = defaultState();
  showLogin();
}

function updateAuthenticatedIdentity() {
  const name = currentAccount?.full_name || doctorName(CURRENT_USER) || CURRENT_USER;
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  document.getElementById("welcome-user-name").textContent = `Bonjour Dr ${name}`;
  document.getElementById("profile-button").textContent = initials;
  document.getElementById("profile-button").setAttribute("aria-label", `Profil de ${name}`);
  document.getElementById("profile-avatar").textContent = initials;
  document.getElementById("profile-full-name").textContent = name;
  document.getElementById("profile-role").textContent = currentAccount?.role === "admin" ? "Administrateur" : "Intensiviste";
  document.querySelector(".profile-nav-icon").textContent = CURRENT_USER;
}

async function loadSharedData() {
  const previousActiveYear = Number(state.activeYear) || APP_CURRENT_YEAR;
  const years = [APP_CURRENT_YEAR, APP_CURRENT_YEAR + 1];
  const [users, swaps, auditRows, ...schedules] = await Promise.all([
    API.users(),
    API.swaps(),
    isAdmin() ? API.audit().catch(() => []) : Promise.resolve([]),
    ...years.map((year) => API.schedule(year)),
  ]);
  state.users = users.map(apiUserToLocal);
  state.requests = swaps.map(apiSwapToLocal);
  state.schedulesByYear = {};
  state.cellOverrides = {};
  schedules.forEach((payload, index) => applyApiSchedule(years[index], payload));
  state.auditTrail = isAdmin() ? auditRows.map(apiAuditToLocal) : [];
  state.activeYear = [APP_CURRENT_YEAR, APP_CURRENT_YEAR + 1].includes(previousActiveYear) ? previousActiveYear : APP_CURRENT_YEAR;
  saveState();
}

async function refreshSharedData() {
  await loadSharedData();
  renderAll();
}

function apiUserToLocal(user) {
  return { code: user.code, name: user.full_name, email: user.email, phone: user.phone || "", role: user.role, active: user.active !== false };
}

function apiSwapToLocal(request) {
  return {
    ...request,
    requester: request.requester_code,
    direction: request.requester_code === CURRENT_USER ? "outgoing" : "incoming",
    createdAt: request.created_at ? formatNotificationDate(new Date(request.created_at)) : "",
  };
}

function apiAuditToLocal(entry) {
  return {
    id: entry.id,
    at: entry.created_at ? formatNotificationDate(new Date(entry.created_at)) : "",
    by: entry.actor_code,
    admin: true,
    action: entry.action,
    summary: entry.details ? JSON.stringify(entry.details) : "",
  };
}

function applyApiSchedule(year, payload) {
  const weeks = new Map();
  (payload.schedules || []).forEach((row) => {
    if (!weeks.has(row.week_number)) {
      weeks.set(row.week_number, {
        year,
        weekNumber: row.week_number,
        date: formatAnnualDate(new Date(`${row.week_start}T12:00:00`)),
        note: "",
        assignments: [],
      });
    }
    const placeholder = ["HDQ", "VACANT"].includes(row.doctor_code) ? (row.doctor_code === "HDQ" ? "HDQ" : "Vacant") : "";
    weeks.get(row.week_number).assignments.push({
      task: row.task,
      code: placeholder ? "" : row.doctor_code,
      doctor: placeholder ? "" : doctorName(row.doctor_code),
      placeholder,
    });
  });
  state.schedulesByYear[year] = Array.from(weeks.values()).sort((left, right) => left.weekNumber - right.weekNumber);
  (payload.overrides || []).forEach((row) => {
    state.cellOverrides[`${year}|${row.week_number}|${row.duty_id}|${row.day_index}`] = {
      code: row.doctor_code,
      doctor: doctorName(row.doctor_code),
      kind: "partial",
    };
  });
}

function showView(name) {
  document.querySelectorAll(".app-view").forEach((view) => view.classList.toggle("active", view.dataset.view === name));
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.target === name));
}

function renderAll() {
  renderAdminControls();
  renderAnnualYearOptions();
  renderYearOptions();
  renderImportYearOptions();
  renderWeekOptions();
  renderSchedule();
  renderAnnual();
  renderHolidayPdf();
  renderHsfaPdf();
  renderMonthlyPdfAdmin();
  renderAdminDashboard();
  renderNotificationTemplates();
  renderUserAdmin();
  renderNextShift();
  renderSwaps();
  populateSwapOptions();
  populateAdminWeeklyOptions();
}

function isAdmin() {
  return currentAccount?.role === "admin";
}

function renderAdminControls() {
  const admin = isAdmin();
  importPanel.hidden = !admin;
  adminDirectSwap.hidden = !admin;
  holidayUploadPanel.hidden = !admin;
  hsfaUploadPanel.hidden = !admin;
  monthlyPdfAdmin.hidden = !admin;
  auditAdmin.hidden = !admin;
  adminDashboard.hidden = !admin;
  notificationTemplateAdmin.hidden = !admin;
  userAdmin.hidden = !admin;
  importStatus.textContent = admin
    ? "Choisissez d'abord l'année cible, puis importez le fichier Excel ou CSV correspondant."
    : "L'import initial de l'horaire annuel est réservé à l'administrateur.";
}

function defaultMonthlyPdfSettings() {
  return {
    enabled: true,
    recipients: ["direction.usi@hej.ca", "archives.usi@hej.ca"],
    history: [],
  };
}

function normalizeMonthlyPdfSettings(settings = {}) {
  const defaults = defaultMonthlyPdfSettings();
  const recipients = Array.isArray(settings.recipients)
    ? settings.recipients
    : String(settings.recipients || "").split(/[\n,;]/);
  return {
    enabled: typeof settings.enabled === "boolean" ? settings.enabled : defaults.enabled,
    recipients: recipients.map((email) => String(email).trim()).filter(Boolean),
    history: Array.isArray(settings.history) ? settings.history.slice(0, 12) : [],
  };
}

function renderMonthlyPdfAdmin() {
  if (!isAdmin()) return;
  state.monthlyPdf = normalizeMonthlyPdfSettings(state.monthlyPdf);
  monthlyPdfEnabled.checked = state.monthlyPdf.enabled;
  monthlyPdfRecipients.value = state.monthlyPdf.recipients.join("\n");
  const plan = monthlyPdfPlan();
  monthlyPdfNextRun.textContent = `${formatLongDate(plan.sendDate)} · listes de ${plan.targetMonthLabel}`;
  monthlyPdfAttachmentCount.textContent = `${plan.attachments.length} ${plan.attachments.length > 1 ? "fichiers" : "fichier"}`;
  monthlyPdfHistory.innerHTML = state.monthlyPdf.history.length
    ? state.monthlyPdf.history.map(monthlyPdfHistoryItem).join("")
    : emptyCard("Aucun envoi simulé pour le moment.");
}

function renderAdminDashboard() {
  if (!isAdmin()) return;
  const pending = state.requests.filter((request) => request.status === "pending").length;
  const recent = state.requests.filter((request) => request.status !== "pending").slice(0, 5).length;
  const pdfSends = state.monthlyPdf?.history?.length || 0;
  const importErrors = state.importIssues?.length || 0;
  const missingEmail = (state.users || []).filter((user) => user.active !== false && !user.email).length;
  const critical = upcomingCriticalDuties().length;
  const cards = [
    ["Demandes en attente", pending],
    ["Échanges récents", recent],
    ["PDF mensuels", pdfSends],
    ["Erreurs d'import", importErrors],
    ["Utilisateurs sans courriel", missingEmail],
    ["Gardes critiques à venir", critical],
  ];
  adminDashboardGrid.innerHTML = cards.map(([label, value]) => `<div class="dashboard-card"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`).join("");
}

function upcomingCriticalDuties() {
  const today = startOfDay(new Date());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 14);
  return allAssignments().filter((assignment) => {
    const date = parseFrenchDate(assignment.dayDate);
    if (!date || date < today || date > limit) return false;
    return ["day", "night"].includes(assignment.dutyId);
  });
}

function renderNotificationTemplates() {
  if (!isAdmin()) return;
  const templates = state.notificationTemplates || NOTIFICATION_TEMPLATE_DEFAULTS;
  notificationTemplateList.innerHTML = templates.map((template) => `<article class="template-card">
    <div><strong>${escapeHtml(template.title)}</strong><span>${escapeHtml(template.channels)}</span></div>
    <p><b>${escapeHtml(template.subject)}</b></p>
    <p>${escapeHtml(template.body)}</p>
  </article>`).join("");
}

function renderUserAdmin() {
  if (!isAdmin()) return;
  state.users = normalizeUsers(state.users);
  const selected = userAdminSelect.value || CURRENT_USER;
  userAdminSelect.innerHTML = state.users.map((user) => `<option value="${escapeHtml(user.code)}" ${user.code === selected ? "selected" : ""}>${escapeHtml(user.code)} · ${escapeHtml(user.name)}</option>`).join("");
  if (!state.users.some((user) => user.code === userAdminSelect.value)) userAdminSelect.value = state.users[0]?.code || "";
  if (userAdminMode === "new") renderNewUserAdmin();
  else renderSelectedUserAdmin();
}

function renderSelectedUserAdmin() {
  userAdminMode = "edit";
  userAdminSelect.disabled = false;
  cancelNewUserAdminButton.hidden = true;
  userAdminModeLabel.textContent = "Modification d'un utilisateur existant.";
  const user = userByCode(userAdminSelect.value) || state.users?.[0] || {};
  userAdminCode.value = user.code || "";
  userAdminCode.disabled = true;
  userAdminName.value = user.name || "";
  userAdminEmail.value = user.email || "";
  userAdminPhone.value = user.phone || "";
  userAdminRole.value = user.role || "intensiviste";
  userAdminActive.checked = user.active !== false;
  userAdminPassword.value = "";
  userAdminPassword.required = false;
  userAdminPasswordLabel.textContent = "Nouveau mot de passe (facultatif)";
}

function startNewUserAdmin() {
  userAdminMode = "new";
  renderNewUserAdmin();
}

function cancelNewUserAdmin() {
  userAdminMode = "edit";
  renderSelectedUserAdmin();
}

function renderNewUserAdmin() {
  userAdminSelect.disabled = true;
  cancelNewUserAdminButton.hidden = false;
  userAdminModeLabel.textContent = "Ajout d'un nouvel utilisateur : inscrivez son code, ses coordonnées, son rôle et activez son compte.";
  userAdminCode.disabled = false;
  userAdminCode.value = "";
  userAdminName.value = "";
  userAdminEmail.value = "";
  userAdminPhone.value = "";
  userAdminRole.value = "intensiviste";
  userAdminActive.checked = true;
  userAdminPassword.value = "";
  userAdminPassword.required = true;
  userAdminPasswordLabel.textContent = "Mot de passe initial (12 caractères minimum)";
  userAdminCode.focus();
}

async function saveUserAdmin() {
  if (!isAdmin()) {
    showToast("Réservé à l'administrateur.");
    return;
  }
  const wasNew = userAdminMode === "new";
  const code = userAdminCode.value.trim().toUpperCase();
  if (!code || !userAdminName.value.trim()) {
    showToast("Le code et le nom sont requis.");
    return;
  }
  if (!userAdminEmail.value.trim()) {
    showToast("Le courriel est requis.");
    return;
  }
  if (wasNew && userAdminPassword.value.length < 12) {
    showToast("Le mot de passe initial doit contenir au moins 12 caractères.");
    return;
  }
  state.users = normalizeUsers(state.users);
  if (wasNew && state.users.some((user) => user.code === code)) {
    showToast("Ce code existe déjà. Sélectionnez l'utilisateur pour le modifier.");
    return;
  }
  const updated = {
    code,
    full_name: userAdminName.value.trim(),
    email: userAdminEmail.value.trim(),
    phone: userAdminPhone.value.trim(),
    role: userAdminRole.value,
    active: userAdminActive.checked,
    password: userAdminPassword.value || null,
  };
  try {
    await API.saveUser(updated);
    state.users = (await API.users()).map(apiUserToLocal);
    userAdminMode = "edit";
    renderAll();
    userAdminSelect.value = code;
    renderSelectedUserAdmin();
    showToast(wasNew ? "Utilisateur ajouté au serveur." : "Utilisateur enregistré sur le serveur.");
  } catch (error) {
    showToast(error.message);
  }
}

function renderAuditTrail() {
  if (!auditList) return;
  const entries = state.auditTrail || [];
  auditList.innerHTML = entries.length
    ? entries.slice(0, 20).map((entry) => `<article class="audit-item">
        <strong>${escapeHtml(entry.action)}</strong>
        <span>${escapeHtml(entry.at)} · ${escapeHtml(doctorName(entry.by))}${entry.admin ? " · admin" : ""}</span>
        <p>${escapeHtml(entry.summary || "")}</p>
        ${entry.before || entry.after ? `<small>Avant : ${escapeHtml(entry.before || "N/A")}<br>Après : ${escapeHtml(entry.after || "N/A")}</small>` : ""}
      </article>`).join("")
    : emptyCard("Aucune entrée d'audit pour le moment.");
}

function saveMonthlyPdfSettings() {
  if (!isAdmin()) {
    showToast("Réservé à l'administrateur.");
    return;
  }
  state.monthlyPdf = {
    ...normalizeMonthlyPdfSettings(state.monthlyPdf),
    enabled: monthlyPdfEnabled.checked,
    recipients: parseRecipientList(monthlyPdfRecipients.value),
  };
  saveState();
  renderMonthlyPdfAdmin();
  showToast("Paramètres d'envoi mensuel enregistrés.");
}

function simulateMonthlyPdfSend() {
  if (!isAdmin()) {
    showToast("Réservé à l'administrateur.");
    return;
  }
  state.monthlyPdf = {
    ...normalizeMonthlyPdfSettings(state.monthlyPdf),
    enabled: monthlyPdfEnabled.checked,
    recipients: parseRecipientList(monthlyPdfRecipients.value),
  };
  if (!state.monthlyPdf.recipients.length) {
    showToast("Ajoutez au moins un destinataire.");
    renderMonthlyPdfAdmin();
    return;
  }
  const plan = monthlyPdfPlan();
  const sentAt = formatNotificationDate(new Date());
  state.monthlyPdf.history.unshift({
    id: `monthly-pdf-${Date.now()}`,
    sentAt,
    simulated: true,
    sendDate: formatLongDate(plan.sendDate),
    targetMonth: plan.targetMonthLabel,
    recipients: state.monthlyPdf.recipients,
    attachments: plan.attachments,
  });
  state.monthlyPdf.history = state.monthlyPdf.history.slice(0, 12);
  addAudit("PDF mensuel simulé", `${plan.targetMonthLabel} · ${plan.attachments.length} PDF · ${state.monthlyPdf.recipients.length} destinataire(s)`, "", state.monthlyPdf.recipients.join(", "), true);
  saveState();
  renderMonthlyPdfAdmin();
  showToast(`Simulation envoyée à ${state.monthlyPdf.recipients.length} destinataire(s).`);
}

function parseRecipientList(value) {
  return Array.from(new Set(String(value || "").split(/[\n,;]/).map((email) => email.trim()).filter(Boolean)));
}

function monthlyPdfPlan(baseDate = new Date()) {
  const targetMonthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
  const sendDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() - 1, 20);
  const targetYear = targetMonthDate.getFullYear();
  const targetMonth = targetMonthDate.getMonth();
  const attachments = (state.schedulesByYear?.[targetYear] || [])
    .filter((weekEntry) => weekTouchesMonth(weekEntry, targetYear, targetMonth))
    .map((weekEntry) => `Liste garde USI - Semaine ${weekEntry.weekNumber} - ${weekEntry.date}.pdf`);
  return {
    sendDate,
    targetMonthLabel: new Intl.DateTimeFormat("fr-CA", { month: "long", year: "numeric" }).format(targetMonthDate),
    attachments,
  };
}

function weekTouchesMonth(weekEntry, year, month) {
  const start = weekStartDate(weekEntry);
  if (!start) return false;
  return Array.from({ length: 7 }).some((_, offset) => {
    const date = new Date(start);
    date.setDate(date.getDate() + offset);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function monthlyPdfHistoryItem(item) {
  return `<article class="monthly-pdf-history-item">
    <strong>${escapeHtml(item.targetMonth || "")}</strong>
    <span>Simulation envoyée le ${escapeHtml(item.sentAt || item.sendDate || "")}</span>
    <span>${(item.attachments || []).length} PDF · ${(item.recipients || []).length} destinataire(s)</span>
    <small>${escapeHtml((item.recipients || []).join(", "))}</small>
  </article>`;
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function renderHsfaPdf() {
  const pdf = state.hsfaPdf;
  if (!pdf?.dataUrl) {
    hsfaStatus.textContent = isAdmin()
      ? "Aucun horaire HSFA téléchargé. Téléversez un PDF pour le rendre visible à tous."
      : "Aucun horaire HSFA n'est disponible pour le moment.";
    hsfaPdfViewer.innerHTML = emptyCard("Aucun PDF disponible.");
    return;
  }
  hsfaStatus.textContent = `PDF disponible : ${pdf.name} · Téléchargé ${pdf.uploadedAt}.`;
  hsfaPdfViewer.innerHTML = pdfViewerMarkup(pdf, "Horaire HSFA");
}

function renderHolidayPdf() {
  const pdf = state.holidayPdf;
  if (!pdf?.dataUrl) {
    holidayStatus.textContent = isAdmin()
      ? "Aucun horaire des fêtes téléchargé. Téléversez un PDF pour le rendre visible à tous."
      : "Aucun horaire des fêtes n'est disponible pour le moment.";
    holidayPdfViewer.innerHTML = emptyCard("Aucun PDF disponible.");
    return;
  }
  holidayStatus.textContent = `PDF disponible : ${pdf.name} · Téléchargé ${pdf.uploadedAt}.`;
  holidayPdfViewer.innerHTML = pdfViewerMarkup(pdf, "Horaire des fêtes");
}

function pdfViewerMarkup(pdf, title) {
  const displayUrl = pdfObjectUrl(pdf);
  return `<div class="pdf-viewer-toolbar">
    <strong>${escapeHtml(pdf.name)}</strong>
    <div class="pdf-viewer-actions">
      <button class="secondary-button compact" data-pdf-zoom="-25" type="button" aria-label="Réduire le PDF">−</button>
      <span class="pdf-zoom-label">175 %</span>
      <button class="secondary-button compact" data-pdf-zoom="25" type="button" aria-label="Agrandir le PDF">+</button>
      <button class="secondary-button compact" data-pdf-fullscreen type="button">Lire en plein écran</button>
      <a class="primary-button compact" href="${displayUrl}#zoom=175" target="_blank" rel="noopener">Ouvrir en grand</a>
    </div>
  </div>
  <div class="pdf-mobile-launch">
    <strong>${escapeHtml(title)}</strong>
    <p>Ouvrez le document dans le lecteur PDF du téléphone pour le lire et le zoomer.</p>
    <a class="primary-button" href="${displayUrl}" target="_blank" rel="noopener">Afficher le PDF en plein écran</a>
  </div>
  <iframe title="${escapeHtml(title)}" src="${displayUrl}#zoom=175" data-pdf-zoom-level="175" allowfullscreen></iframe>`;
}

function pdfObjectUrl(pdf) {
  const key = `${pdf.name}|${pdf.uploadedAt}|${pdf.dataUrl.length}`;
  if (pdfObjectUrls.has(key)) return pdfObjectUrls.get(key);
  try {
    const [header, payload] = pdf.dataUrl.split(",", 2);
    if (!header.includes(";base64") || !payload) return pdf.dataUrl;
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    pdfObjectUrls.set(key, url);
    return url;
  } catch {
    return pdf.dataUrl;
  }
}

function handlePdfViewerAction(event) {
  const zoomButton = event.target.closest("[data-pdf-zoom]");
  if (zoomButton) {
    const viewer = zoomButton.closest(".pdf-viewer");
    const frame = viewer?.querySelector("iframe");
    if (!frame) return;
    const currentZoom = Number(frame.dataset.pdfZoomLevel || 175);
    const nextZoom = Math.min(250, Math.max(100, currentZoom + Number(zoomButton.dataset.pdfZoom)));
    const baseUrl = frame.src.split("#")[0];
    frame.dataset.pdfZoomLevel = String(nextZoom);
    frame.src = `${baseUrl}#zoom=${nextZoom}`;
    viewer.querySelector(".pdf-zoom-label").textContent = `${nextZoom} %`;
    return;
  }
  const button = event.target.closest("[data-pdf-fullscreen]");
  if (!button) return;
  const viewer = button.closest(".pdf-viewer");
  if (viewer?.requestFullscreen) {
    viewer.requestFullscreen();
    return;
  }
  viewer?.querySelector("a[target='_blank']")?.click();
}

function currentSchedule() {
  return state.schedulesByYear?.[state.activeYear] || [];
}

function setCurrentSchedule(schedule) {
  state.schedulesByYear ||= {};
  state.schedulesByYear[state.activeYear] = schedule.map((item) => ({ ...item, year: Number(state.activeYear) }));
}

function availableYears() {
  return Array.from(new Set([
    APP_CURRENT_YEAR,
    APP_CURRENT_YEAR + 1,
    APP_CURRENT_YEAR + 2,
    ...Object.keys(state.schedulesByYear || {}).map(Number).filter(Boolean),
  ])).sort((a, b) => a - b);
}

function sourceLabelForActiveYear() {
  return state.sourceByYear?.[state.activeYear] || "Aucun fichier importé";
}

function renderSchedule() {
  const query = normalizeSearch(scheduleSearch.value);
  const schedule = currentSchedule();
  const visibleWeeks = visibleScheduleWeeks(schedule, query);
  if (isAdmin()) {
    importStatus.textContent = `${sourceLabelForActiveYear()} · ${schedule.length} semaines disponibles pour ${state.activeYear}.`;
  }

  scheduleList.innerHTML = visibleWeeks.map((item) => {
    const cells = buildDutyCells(item);
    const mine = cells.some((assignment) => assignment.code === CURRENT_USER);
    return `
      <article class="weekly-roster-card" data-week-card="${item.year || state.activeYear}|${item.weekNumber}">
        <div class="weekly-table-heading">
          <div><div class="week-label" data-print-date="${escapeHtml(item.date || "")}">Liste de garde USI · Semaine ${item.weekNumber}</div><div class="date-label">Semaine du ${escapeHtml(item.date || "")}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</div></div>
          <div class="weekly-heading-badges">${weeklyPdfButton(item)}${mine ? '<span class="status-badge accepted">Vous travaillez</span>' : ""}</div>
        </div>
        <div class="weekly-exchange-bar">
          <div class="weekly-exchange-actions">${weeklyExchangeButtons(item, cells)}</div>
        </div>
        <div class="roster-scroll"><table class="roster-table">
          <thead><tr><th class="duty-heading">Garde</th>${buildDayHeaders(item).join("")}</tr></thead>
          <tbody>${DUTY_ROWS.map((duty) => rosterDutyRow(duty, cells)).join("")}</tbody>
        </table></div>
      </article>`;
  }).join("") || emptyCard("Aucune semaine ne correspond à cette recherche.");
}

function weeklyPdfButton(weekEntry) {
  if (!isAdmin()) return "";
  return `<button class="weekly-pdf-button" data-export-week="${weekEntry.year || state.activeYear}|${weekEntry.weekNumber}" type="button">Exporter PDF</button>`;
}

function renderAnnual() {
  const schedule = fullAnnualSchedule(Number(state.activeYear));
  document.getElementById("annual-year-heading").textContent = `Horaire USI ${state.activeYear}`;
  annualStatus.textContent = `${sourceLabelForActiveYear()} · Horaire annuel complet ${state.activeYear} · ${schedule.length} semaines. * = tâche modifiée par échange partiel.`;
  const rows = schedule.map((weekEntry) => {
    const byTask = Object.fromEntries(weekEntry.assignments.map((assignment) => [assignment.task, assignment]));
    return `<tr>
      <th>${weekEntry.weekNumber}</th>
      <td>${escapeHtml(weekEntry.date || "")}</td>
      <td>${escapeHtml(weekEntry.note || "")}</td>
      ${ANNUAL_TASK_COLUMNS.map(([task]) => annualTaskCell(byTask[task], task, weekEntry)).join("")}
    </tr>`;
  }).join("") || `<tr><td colspan="7">Aucun horaire annuel disponible pour ${escapeHtml(state.activeYear)}.</td></tr>`;
  annualList.innerHTML = rows;
}

function annualTaskCell(assignment = {}, task = "", weekEntry = {}) {
  const label = assignment.placeholder || assignment.code || doctorCodeFromName(assignment.doctor) || "";
  const modified = annualTaskHasPartialOverride(weekEntry, task);
  const marker = modified ? '<span class="annual-modified-marker" title="Tâche modifiée par échange partiel">*</span>' : "";
  const code = assignment.code || doctorCodeFromName(assignment.doctor);
  if (!code) return `<td class="${annualTaskClass(task)}${modified ? " annual-modified" : ""}">${escapeHtml(label)}${marker}</td>`;
  const entry = buildWeeklyBundle(weekEntry.year || state.activeYear, weekEntry.weekNumber, code);
  const mine = code === CURRENT_USER;
  const locked = !canExchangeEntry(entry);
  return `<td class="${annualTaskClass(task)}${modified ? " annual-modified" : ""}">
    <button class="annual-exchange-button ${mine ? "mine" : ""}" data-exchange-action="${mine ? "offer" : "request"}" data-exchange-scope="weekly" data-assignment-key="${escapeHtml(assignmentKey(entry))}" type="button" ${locked ? "disabled" : ""} title="${locked ? "Semaine passée : échange réservé à l'administrateur" : `${mine ? "Offrir" : "Demander"} toutes les tâches de ${escapeHtml(entry.doctor)} pour la semaine ${weekEntry.weekNumber}`}">
      ${escapeHtml(label)}${marker}
      ${locked ? '<small>Semaine passée</small>' : ""}
    </button>
  </td>`;
}

function annualTaskClass(task) {
  return ({
    "USI AB": "annual-ab",
    "USI CD": "annual-cd",
    "USI UGB": "annual-ugb",
    "USI nuits": "annual-nights",
  })[task] || "";
}

function annualTaskHasPartialOverride(weekEntry, task) {
  if (!weekEntry?.assignments?.length) return false;
  const byTask = Object.fromEntries(weekEntry.assignments.map((assignment) => [assignment.task, assignment]));
  return DUTY_ROWS.some((duty) => {
    const sources = getDutySources(weekEntry, duty, byTask);
    return sources.some((sourceTask, dayIndex) => {
      if (sourceTask !== task) return false;
      const override = state.cellOverrides?.[`${weekEntry.year || state.activeYear}|${weekEntry.weekNumber}|${duty.id}|${dayIndex}`];
      return override?.kind === "partial" || (!!override && !override.kind);
    });
  });
}

function fullAnnualSchedule(year) {
  const existingByWeek = new Map(currentSchedule().map((weekEntry) => [Number(weekEntry.weekNumber), weekEntry]));
  return annualWeekSkeleton(year).map((blankWeek) => {
    const existing = existingByWeek.get(blankWeek.weekNumber);
    if (!existing) return blankWeek;
    return {
      ...blankWeek,
      ...existing,
      year,
      date: existing.date || blankWeek.date,
      note: existing.note || "",
      assignments: existing.assignments || [],
    };
  });
}

function annualWeekSkeleton(year) {
  const weeks = [];
  const date = firstMondayOfYear(year);
  while (date.getFullYear() === year) {
    weeks.push({
      year,
      weekNumber: weeks.length + 1,
      date: formatAnnualDate(date),
      note: "",
      assignments: [],
    });
    date.setDate(date.getDate() + 7);
  }
  return weeks;
}

function firstMondayOfYear(year) {
  const date = new Date(year, 0, 1);
  const offset = (8 - date.getDay()) % 7;
  date.setDate(date.getDate() + offset);
  return date;
}

function formatAnnualDate(date) {
  return new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function doctorCodeFromName(name) {
  return Object.entries(DOCTOR_NAMES).find(([, doctor]) => normalizeSearch(doctor) === normalizeSearch(name))?.[0] || "";
}

function exportAnnualToPdf() {
  showView("annual");
  document.body.classList.add("printing-annual");
  const previousTitle = document.title;
  document.title = `Horaire USI ${state.activeYear}`;
  window.setTimeout(() => window.print(), 50);
  window.setTimeout(() => {
    document.title = previousTitle;
    document.body.classList.remove("printing-annual");
  }, 1000);
}

function exportWeeklyToPdf(value) {
  if (!isAdmin()) {
    showToast("Export PDF réservé à l'administrateur.");
    return;
  }
  const [year, weekNumber] = String(value || "").split("|");
  document.body.dataset.printWeek = `${year}|${weekNumber}`;
  document.querySelectorAll(".weekly-roster-card").forEach((card) => {
    card.classList.toggle("print-selected-week", card.dataset.weekCard === `${year}|${weekNumber}`);
  });
  showView("schedule");
  document.body.classList.add("printing-weekly");
  const previousTitle = document.title;
  document.title = `Liste garde USI semaine ${weekNumber} ${year}`;
  window.setTimeout(() => window.print(), 50);
  window.setTimeout(() => {
    document.title = previousTitle;
    document.body.classList.remove("printing-weekly");
    document.body.removeAttribute("data-print-week");
    document.querySelectorAll(".weekly-roster-card").forEach((card) => card.classList.remove("print-selected-week"));
  }, 1000);
}

function renderYearOptions() {
  const years = availableYears();
  if (!years.includes(Number(state.activeYear))) state.activeYear = years[0] || APP_CURRENT_YEAR;
  yearSelect.innerHTML = years.map((year) => `<option value="${year}" ${Number(state.activeYear) === year ? "selected" : ""}>${year}</option>`).join("");
}

function renderAnnualYearOptions() {
  const years = [APP_CURRENT_YEAR, APP_CURRENT_YEAR + 1];
  if (!years.includes(Number(state.activeYear))) state.activeYear = APP_CURRENT_YEAR;
  annualYearSelect.innerHTML = years.map((year) => `<option value="${year}" ${Number(state.activeYear) === year ? "selected" : ""}>${year}</option>`).join("");
}

function renderImportYearOptions() {
  const years = availableYears();
  const selectedYear = Number(importYearSelect.value) || Number(state.activeYear);
  importYearSelect.innerHTML = years.map((year) => `<option value="${year}" ${selectedYear === year ? "selected" : ""}>${year}</option>`).join("");
}

function renderWeekOptions() {
  const schedule = currentSchedule();
  const options = [
    `<option value="next4" ${selectedWeekFilter === "next4" ? "selected" : ""}>4 prochaines semaines</option>`,
    `<option value="all" ${selectedWeekFilter === "all" ? "selected" : ""}>Toutes les semaines</option>`,
    ...schedule.map((item) => {
      const value = `week:${item.weekNumber}`;
      return `<option value="${value}" ${selectedWeekFilter === value ? "selected" : ""}>S${String(item.weekNumber).padStart(2, "0")} · ${escapeHtml(item.date || "")}</option>`;
    }),
  ];
  weekSelect.innerHTML = options.join("");
}

function visibleScheduleWeeks(schedule, query) {
  if (query) return schedule.filter((item) => weekMatchesSearch(item, query));
  if (selectedWeekFilter === "all") return schedule;
  if (selectedWeekFilter.startsWith("week:")) {
    const weekNumber = Number(selectedWeekFilter.split(":")[1]);
    return schedule.filter((item) => item.weekNumber === weekNumber);
  }
  return nextFourWeeks(schedule);
}

function nextFourWeeks(schedule) {
  const today = startOfDay(new Date());
  const dated = schedule
    .map((item, index) => ({ item, index, start: weekStartDate(item) }))
    .sort((left, right) => (left.start?.getTime() ?? Number.MAX_SAFE_INTEGER) - (right.start?.getTime() ?? Number.MAX_SAFE_INTEGER) || left.index - right.index);
  const upcoming = dated.filter((entry) => {
    if (!entry.start) return false;
    const weekEnd = new Date(entry.start);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekEnd >= today;
  });
  return (upcoming.length ? upcoming : dated).slice(0, 4).map((entry) => entry.item);
}

function weeklyExchangeButtons(weekEntry, cells) {
  const codes = Array.from(new Set(cells.map((cell) => cell.code).filter(Boolean)));
  return codes.map((code) => {
    const mine = code === CURRENT_USER;
    const entry = buildWeeklyBundle(weekEntry.year || state.activeYear, weekEntry.weekNumber, code);
    const locked = !canExchangeEntry(entry);
    return `<button class="weekly-exchange-button ${mine ? "mine" : ""}" data-exchange-action="${mine ? "offer" : "request"}" data-exchange-scope="weekly" data-assignment-key="${escapeHtml(assignmentKey(entry))}" type="button" ${locked ? "disabled" : ""} title="${locked ? "Semaine passée : échange réservé à l'administrateur" : ""}">
      ${locked ? "Semaine passée" : mine ? `Offrir toutes les tâches de ${escapeHtml(entry.doctor)}` : `Demander toutes les tâches de ${escapeHtml(entry.doctor)}`}
    </button>`;
  }).join("");
}

function buildDayHeaders(weekEntry) {
  const dates = getWeekDates(weekEntry.date);
  return DAY_NAMES.map((day, index) => `<th><span>${day}</span><strong>${escapeHtml(dates[index])}</strong></th>`);
}

function rosterDutyRow(duty, cells) {
  return `<tr class="roster-row ${duty.tone}">
    <th class="duty-label"><strong>${escapeHtml(duty.label)}</strong>${duty.detail ? `<span>${escapeHtml(duty.detail)}</span>` : ""}</th>
    ${cells.filter((cell) => cell.dutyId === duty.id).map(rosterCell).join("")}
  </tr>`;
}

function rosterCell(cell) {
  if (!cell.code) return `<td class="roster-cell vacant-cell"><span>${escapeHtml(cell.placeholder || "Vacant")}</span></td>`;
  const mine = cell.code === CURRENT_USER;
  const locked = !canExchangeEntry(cell);
  return `<td class="roster-cell ${mine ? "current-user" : ""}">
    <button class="roster-exchange-cell" data-exchange-action="${mine ? "offer" : "request"}" data-assignment-key="${escapeHtml(assignmentKey(cell))}" type="button" ${locked ? "disabled" : ""} title="${locked ? "Garde passée : échange réservé à l'administrateur" : ""}">
      <strong>${escapeHtml(cell.doctor || cell.code)}</strong>
      <small>${locked ? "Garde passée" : mine ? "Offrir cette garde" : "Demander cette garde"}</small>
    </button>
  </td>`;
}

function renderNextShift() {
  const today = startOfDay(new Date());
  const mine = allAssignments()
    .filter((assignment) => assignment.code === CURRENT_USER)
    .map((assignment) => ({ ...assignment, sortDate: parseFrenchDate(assignment.dayDate) }))
    .filter((assignment) => assignment.sortDate && assignment.sortDate >= today)
    .sort((left, right) => {
      return left.sortDate.getTime() - right.sortDate.getTime() || left.weekNumber - right.weekNumber || left.dayIndex - right.dayIndex;
    });
  const next = mine[0];
  document.getElementById("next-shift-label").textContent = next ? `${next.dayDate} · ${next.sourceTask || next.task}` : "Aucune affectation";
}

function renderSwaps() {
  const visible = state.requests.filter((request) => {
    if (!isAdmin() && !requestInvolvesCurrentUser(request)) return false;
    if (swapFilter === "history") return request.status !== "pending";
    if (swapFilter === "incoming") return request.status === "pending" && canApproveRequest(request);
    if (swapFilter === "outgoing") return request.status === "pending" && request.requester === CURRENT_USER;
    return false;
  });
  swapList.innerHTML = visible.length ? visible.map(swapCard).join("") : emptyCard("Aucune demande dans cette section.");
  const incomingCount = state.requests.filter((request) => request.status === "pending" && canApproveRequest(request)).length;
  swapBadge.textContent = incomingCount;
  swapBadge.hidden = incomingCount === 0;
  renderAuditTrail();
}

function swapCard(request) {
  const actions = canApproveRequest(request) && request.status === "pending"
    ? `<div class="swap-actions"><button class="secondary-button" data-action="decline" data-id="${request.id}" type="button">Refuser</button><button class="primary-button" data-action="accept" data-id="${request.id}" type="button">Accepter</button></div>`
    : "";
  const title = request.direction === "admin"
    ? "Échange administratif"
    : request.direction === "incoming"
      ? `Demande de ${escapeHtml(doctorName(request.requester))}`
      : `Demande à ${escapeHtml(doctorName(request.requested.code))}`;
  return `<article class="swap-card">
    <div class="schedule-top"><strong>${title}</strong><span class="status-badge ${request.status}">${statusLabel(request.status)}</span></div>
    <div class="swap-summary"><div class="swap-side">Offre<strong>${swapEntryLabel(request.offered)}</strong></div><div class="swap-arrow">⇄</div><div class="swap-side">Demande<strong>${swapEntryLabel(request.requested)}</strong></div></div>
    <p class="swap-meta">${escapeHtml(request.message || "Aucun message")} · ${escapeHtml(request.createdAt)}</p>
    ${notificationTimeline(request)}${actions}
  </article>`;
}

function requestInvolvesCurrentUser(request) {
  return request.requester === CURRENT_USER || request.offered?.code === CURRENT_USER || request.requested?.code === CURRENT_USER;
}

function canApproveRequest(request) {
  if (!request || request.status !== "pending") return false;
  if (isAdmin()) return true;
  if (request.requester === CURRENT_USER) return false;
  return request.requested?.code === CURRENT_USER;
}

function populateSwapOptions(selectedKey = "", scope = activeSwapScope, requestedLockKey = "", offeredFirst = false) {
  activeSwapScope = scope;
  lockedRequestedKey = requestedLockKey;
  lockedOfferedKey = selectedKey;
  setSwapFieldOrder(offeredFirst);
  document.getElementById("swap-dialog-title").textContent = scope === "weekly" ? "Échanger toutes les tâches" : "Échanger une garde";
  document.getElementById("offered-field-label").textContent = scope === "weekly" ? "Ma semaine offerte" : "Ma garde offerte";
  document.getElementById("requested-field-label").textContent = scope === "weekly" ? "Semaine complète demandée" : "Garde demandée";
  const all = scope === "weekly" ? allWeeklyBundles() : allAssignments();
  const mine = all.filter((entry) => entry.code === CURRENT_USER);
  const others = all.filter((entry) => entry.code && entry.code !== CURRENT_USER);
  offeredAssignment.required = false;
  offeredSwapEntries = mine;
  configureOfferedAssignmentPicker(scope, selectedKey, mine);
  updateOfferedAssignmentPreview();
  requestedSwapEntries = others;
  const lockedEntry = requestedLockKey ? all.find((entry) => assignmentKey(entry) === requestedLockKey) || findAssignment(requestedLockKey) : null;
  requestedAssignmentPicker.hidden = Boolean(lockedEntry);
  requestedAssignmentFixed.hidden = !lockedEntry;
  requestedAssignmentFixed.textContent = lockedEntry ? assignmentLabel(lockedEntry) : "";
  document.getElementById("requested-task-label").textContent = scope === "weekly" ? "3. Semaine complète" : "3. Tâche journalière";
  populateRequestedDoctorOptions();
  requestedDoctor.disabled = Boolean(lockedEntry);
  requestedWeek.disabled = Boolean(lockedEntry);
  requestedAssignment.disabled = Boolean(lockedEntry);
}

function configureOfferedAssignmentPicker(scope, selectedKey, mine) {
  const lockedOffer = Boolean(selectedKey);
  offeredWeekField.hidden = scope !== "individual" || lockedOffer;
  offeredTaskField.hidden = lockedOffer;
  offeredAssignment.disabled = false;
  if (lockedOffer) {
    offeredAssignment.innerHTML = mine.map((entry) => option(entry, assignmentKey(entry) === selectedKey)).join("");
    return;
  }
  if (scope === "weekly") {
    document.getElementById("offered-task-label").textContent = "Semaine complète offerte";
    offeredAssignment.innerHTML = noOfferOption(true) + mine.map((entry) => option(entry, false)).join("");
    return;
  }
  document.getElementById("offered-task-label").textContent = "2. Date et tâche";
  populateOfferedWeekOptions();
  offeredAssignment.innerHTML = noOfferOption(true);
  offeredAssignment.disabled = true;
}

function populateOfferedWeekOptions() {
  const weeks = new Map();
  offeredSwapEntries.forEach((entry) => {
    const key = `${entry.year || state.activeYear}|${entry.weekNumber}`;
    weeks.set(key, entry);
  });
  const sortedWeeks = Array.from(weeks, ([key, entry]) => ({ key, entry }))
    .sort((left, right) => Number(left.entry.year || state.activeYear) - Number(right.entry.year || state.activeYear) || Number(left.entry.weekNumber) - Number(right.entry.weekNumber));
  offeredWeek.innerHTML = `<option value="">Aucune garde offerte</option>${sortedWeeks.map(({ key, entry }) =>
    `<option value="${escapeHtml(key)}">${entry.year || state.activeYear} · Semaine ${entry.weekNumber} · semaine du ${escapeHtml(entry.weekDate || entry.date || "")}</option>`
  ).join("")}`;
}

function populateOfferedTaskOptions() {
  const [year, weekNumber] = offeredWeek.value.split("|");
  const entries = offeredSwapEntries.filter((entry) => Number(entry.year || state.activeYear) === Number(year)
    && Number(entry.weekNumber) === Number(weekNumber));
  offeredAssignment.innerHTML = noOfferOption(true) + entries.map((entry) =>
    `<option value="${escapeHtml(assignmentKey(entry))}">${escapeHtml(requestedTaskLabel(entry))}</option>`
  ).join("");
  offeredAssignment.disabled = !offeredWeek.value;
  updateOfferedAssignmentPreview();
}

function updateOfferedAssignmentPreview() {
  const selectedLabel = offeredAssignment.options[offeredAssignment.selectedIndex]?.textContent || "Aucune";
  offeredAssignmentPreview.textContent = selectedLabel === "Aucune" ? "Aucune garde offerte" : selectedLabel;
}

function populateRequestedDoctorOptions() {
  const doctors = new Map();
  requestedSwapEntries.forEach((entry) => doctors.set(entry.code, entry.doctor || doctorName(entry.code)));
  const sortedDoctors = Array.from(doctors, ([code, name]) => ({ code, name }))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));
  requestedDoctor.innerHTML = `<option value="">Choisir un intensiviste</option>${sortedDoctors
    .map(({ code, name }) => `<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`)
    .join("")}`;
  requestedWeek.innerHTML = `<option value="">Choisir d'abord un intensiviste</option>`;
  requestedAssignment.innerHTML = `<option value="">Choisir d'abord une semaine</option>`;
  requestedWeek.disabled = true;
  requestedAssignment.disabled = true;
}

function populateRequestedWeekOptions() {
  const code = requestedDoctor.value;
  const weeks = new Map();
  requestedSwapEntries.filter((entry) => entry.code === code).forEach((entry) => {
    const key = `${entry.year || state.activeYear}|${entry.weekNumber}`;
    weeks.set(key, entry);
  });
  const sortedWeeks = Array.from(weeks, ([key, entry]) => ({ key, entry }))
    .sort((left, right) => Number(left.entry.year || state.activeYear) - Number(right.entry.year || state.activeYear) || Number(left.entry.weekNumber) - Number(right.entry.weekNumber));
  const noReturnOption = lockedOfferedKey ? '<option value="__none__">Aucun · rien demandé en retour</option>' : "";
  requestedWeek.innerHTML = `<option value="">Choisir une semaine</option>${noReturnOption}${sortedWeeks.map(({ key, entry }) =>
    `<option value="${escapeHtml(key)}">${entry.year || state.activeYear} · Semaine ${entry.weekNumber} · semaine du ${escapeHtml(entry.weekDate || entry.date || "")}</option>`
  ).join("")}`;
  requestedWeek.disabled = !code;
  requestedAssignment.innerHTML = `<option value="">Choisir d'abord une semaine</option>`;
  requestedAssignment.disabled = true;
}

function populateRequestedTaskOptions() {
  if (requestedWeek.value === "__none__") {
    requestedAssignment.innerHTML = '<option value="__none__">Aucun</option>';
    requestedAssignment.disabled = true;
    return;
  }
  const [year, weekNumber] = requestedWeek.value.split("|");
  const entries = requestedSwapEntries.filter((entry) => entry.code === requestedDoctor.value
    && Number(entry.year || state.activeYear) === Number(year)
    && Number(entry.weekNumber) === Number(weekNumber));
  requestedAssignment.innerHTML = `<option value="">Choisir une tâche</option>${entries.map((entry) =>
    `<option value="${escapeHtml(assignmentKey(entry))}">${escapeHtml(requestedTaskLabel(entry))}</option>`
  ).join("")}`;
  requestedAssignment.disabled = !requestedWeek.value;
}

function requestedTaskLabel(entry) {
  if (entry.scope === "weekly") return `${weeklyTaskSummary(entry)} · Toutes les tâches · ${entry.doctor || doctorName(entry.code)}`;
  return `${individualDutyDateLabel(entry)} · ${entry.task}${entry.sourceTask ? ` · fonction ${entry.sourceTask}` : ""}`;
}

function setSwapFieldOrder(offeredFirst = false) {
  if (offeredFirst) {
    swapForm.insertBefore(offeredAssignmentField, requestedAssignmentField);
  } else {
    swapForm.insertBefore(requestedAssignmentField, offeredAssignmentField);
  }
}

function populateAdminWeeklyOptions() {
  const entries = allWeeklyBundles();
  const options = entries.map((entry) => option(entry, false)).join("");
  adminWeeklyOne.innerHTML = options;
  adminWeeklyTwo.innerHTML = options;
  if (adminWeeklyTwo.options.length > 1) adminWeeklyTwo.selectedIndex = 1;
}

function noOfferOption(selected) {
  return `<option value="" ${selected ? "selected" : ""}>Aucune</option>`;
}

function option(entry, selected) {
  return `<option value="${assignmentKey(entry)}" ${selected ? "selected" : ""}>${escapeHtml(assignmentLabel(entry))}</option>`;
}

function assignmentLabel(entry) {
  if (entry.scope === "weekly") {
    return `${entry.year || state.activeYear} · Semaine ${entry.weekNumber} · semaine du ${entry.weekDate || ""} · ${weeklyTaskSummary(entry)} · Toutes les tâches · ${entry.doctor || doctorName(entry.code)}`;
  }
  return `${entry.year || state.activeYear} · Semaine ${entry.weekNumber} · semaine du ${entry.weekDate || entry.date || ""} · Date de la garde : ${individualDutyDateLabel(entry)} · ${entry.sourceTask || entry.task} · ${entry.doctor || doctorName(entry.code)}`;
}

function individualDutyDateLabel(entry) {
  const dayName = DAY_NAMES[entry.dayIndex] || "";
  const date = entry.dayDate || "";
  return [dayName, date].filter(Boolean).join(" ");
}

function openSwapDialog(selectedKey = "") {
  populateSwapOptions(selectedKey, "individual");
  if (!requestedSwapEntries.length) {
    showToast("Il faut au moins deux affectations pour proposer un échange.");
    return;
  }
  swapDialog.showModal();
}
window.openSwapDialog = openSwapDialog;

function handleScheduleAction(event) {
  const exportButton = event.target.closest("[data-export-week]");
  if (exportButton) {
    exportWeeklyToPdf(exportButton.dataset.exportWeek);
    return;
  }
  const button = event.target.closest("[data-exchange-action]");
  if (!button) return;
  const selectedKey = button.dataset.assignmentKey;
  const action = button.dataset.exchangeAction;
  const scope = button.dataset.exchangeScope || "individual";
  const selectedEntry = findAssignment(selectedKey);
  if (!canExchangeEntry(selectedEntry)) {
    showToast("Les échanges de semaines ou gardes passées sont réservés à l'administrateur.");
    return;
  }
  populateSwapOptions(action === "offer" ? selectedKey : "", scope, action === "request" ? selectedKey : "", action === "offer");
  swapDialog.showModal();
}

async function createSwapRequest(event) {
  event.preventDefault();
  const submitButton = event.submitter || swapForm.querySelector('button[type="submit"]');
  const offered = offeredAssignment.value ? findAssignment(offeredAssignment.value) : null;
  const giveAwayWithoutReturn = Boolean(lockedOfferedKey && requestedDoctor.value && requestedWeek.value === "__none__");
  const requested = giveAwayWithoutReturn ? null : findAssignment(lockedRequestedKey || requestedAssignment.value);
  if (!requested && !giveAwayWithoutReturn) {
    showToast("Sélectionnez la garde demandée ou le choix Aucun.");
    return;
  }
  if ((requested && !canExchangeEntry(requested)) || (offered && !canExchangeEntry(offered))) {
    showToast("Les échanges de semaines ou gardes passées sont réservés à l'administrateur.");
    return;
  }
  if (offered && offered.code !== CURRENT_USER) {
    showToast("Vous ne pouvez offrir que vos propres gardes.");
    return;
  }
  if (requested?.code === CURRENT_USER && !offered) {
    showToast("Cette garde vous appartient déjà.");
    return;
  }
  const offeredPicked = offered ? pickAssignment(offered) : noOfferAssignment(activeSwapScope);
  const requestedPicked = giveAwayWithoutReturn
    ? noRequestedAssignment(activeSwapScope, requestedDoctor.value, offeredPicked)
    : pickAssignment(requested);
  if (!confirm(swapConfirmationText(offeredPicked, requestedPicked))) return;
  submitButton.disabled = true;
  submitButton.textContent = "Envoi en cours...";
  const request = {
    scope: activeSwapScope,
    offered: isNoOffer(offeredPicked) ? null : offeredPicked,
    requested: requestedPicked,
    message: document.getElementById("swap-message").value.trim(),
  };
  try {
    await API.createSwap(request);
    await refreshSharedData();
    swapDialog.close();
    swapForm.reset();
    showView("swaps");
    showToast("Demande d'échange transmise au serveur.");
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Envoyer la demande";
  }
}

async function applyAdminWeeklySwap() {
  if (!isAdmin()) {
    showToast("Échange administratif réservé à l'administrateur.");
    return;
  }
  const first = findAssignment(adminWeeklyOne.value);
  const second = findAssignment(adminWeeklyTwo.value);
  if (!first || !second) {
    showToast("Sélectionnez deux semaines complètes à échanger.");
    return;
  }
  if (assignmentKey(first) === assignmentKey(second)) {
    showToast("Choisissez deux semaines différentes.");
    return;
  }
  const adminRequestPreview = {
    requester: CURRENT_USER,
    offered: pickAssignment(first),
    requested: pickAssignment(second),
  };
  if (!confirm(`Confirmer l'échange administratif?\n\n${requestAuditSummary(adminRequestPreview)}`)) return;
  const request = {
    scope: "weekly",
    offered: pickAssignment(first),
    requested: pickAssignment(second),
    message: "Échange administratif appliqué sans approbation.",
  };
  try {
    await API.directSwap(request);
    await refreshSharedData();
    swapFilter = "history";
    document.querySelectorAll(".subtab").forEach((entry) => entry.classList.toggle("active", entry.dataset.swapFilter === "history"));
    renderSwaps();
    showToast("Échange administratif appliqué sur le serveur.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleSwapAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const request = state.requests.find((entry) => entry.id === button.dataset.id);
  if (!request) return;
  if (!canApproveRequest(request)) {
    showToast("Vous n'êtes pas autorisé à approuver ou refuser cette demande.");
    return;
  }
  if (button.dataset.action === "accept") {
    if (!confirm(`Accepter cette demande?\n\n${requestAuditSummary(request)}`)) return;
  } else {
    if (!confirm(`Refuser cette demande?\n\n${requestAuditSummary(request)}`)) return;
  }
  try {
    const decision = button.dataset.action === "accept" ? "accepted" : "declined";
    await API.decideSwap(request.id, decision);
    await refreshSharedData();
    showToast(decision === "accepted" ? "Échange accepté et appliqué sur le serveur." : "Demande refusée.");
  } catch (error) {
    showToast(error.message);
  }
}

function applySwap(request) {
  if (request.scope === "weekly" || request.offered?.scope === "weekly" || request.requested.scope === "weekly") {
    applyWeeklySwap(request);
    return;
  }
  if (isNoOffer(request.offered)) {
    applyNoOfferAssignment(request);
    return;
  }
  const offered = findAssignment(assignmentKey(request.offered));
  const requested = findAssignment(assignmentKey(request.requested));
  if (!offered || !requested) return;
  state.cellOverrides ||= {};
  state.cellOverrides[cellOverrideKey(offered)] = { code: requested.code, doctor: requested.doctor, kind: "partial" };
  state.cellOverrides[cellOverrideKey(requested)] = { code: offered.code, doctor: offered.doctor, kind: "partial" };
}

async function importScheduleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!isAdmin()) {
    importStatus.textContent = "Import refusé : seul l'administrateur peut téléverser l'horaire annuel initial.";
    showToast("Import réservé à l'administrateur.");
    event.target.value = "";
    return;
  }
  try {
    const targetYear = Number(importYearSelect.value) || Number(state.activeYear);
    const extension = file.name.split(".").pop()?.toLowerCase();
    const rows = extension === "csv" ? parseCsv(await file.text()) : await readExcelRows(file);
    const schedule = scheduleFromRows(rows).map((item) => ({ ...item, year: targetYear }));
    if (!schedule.length) throw new Error("Aucune semaine reconnue dans le fichier");
    await API.replaceSchedule(targetYear, schedule.map((weekEntry) => ({
      weekNumber: weekEntry.weekNumber,
      weekStart: frenchDateToIso(weekEntry.date),
      assignments: weekEntry.assignments.map((assignment) => ({
        task: assignment.task,
        code: assignment.code || (assignment.placeholder === "HDQ" ? "HDQ" : "VACANT"),
      })),
    })));
    state.activeYear = targetYear;
    await refreshSharedData();
    state.sourceByYear ||= {};
    state.sourceByYear[targetYear] = file.name;
    selectedWeekFilter = "next4";
    saveState();
    renderAll();
    const issues = findScheduleImportIssues(currentSchedule());
    state.importIssues = issues.map((issue) => ({ at: formatNotificationDate(new Date()), year: targetYear, file: file.name, issue }));
    addAudit("Horaire importé", `Horaire annuel ${targetYear} depuis ${file.name}`, "", `${currentSchedule().length} semaines importées`, true);
    saveState();
    importStatus.textContent = issues.length
      ? `${currentSchedule().length} semaines importées dans l'horaire annuel ${targetYear} depuis ${file.name}. Attention : ${issues.join(" ")}`
      : `${currentSchedule().length} semaines importées dans l'horaire annuel ${targetYear} depuis ${file.name}. Toutes les semaines contiennent les quatre affectations USI principales.`;
    showToast(issues.length ? `Horaire ${targetYear} importé avec avertissements.` : `Horaire annuel ${targetYear} importé avec succès.`);
  } catch (error) {
    state.importIssues ||= [];
    state.importIssues.unshift({ at: formatNotificationDate(new Date()), year: importYearSelect.value || state.activeYear, file: file.name, issue: error.message });
    saveState();
    importStatus.textContent = `Impossible d'importer ce fichier dans l'horaire annuel ${importYearSelect.value || state.activeYear}. Vérifiez qu'il contient les semaines et les colonnes de tâches.`;
    showToast(error.message);
  } finally {
    event.target.value = "";
  }
}

async function importHolidayPdf(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!isAdmin()) {
    holidayStatus.textContent = "Import refusé : seul l'administrateur peut remplacer l'horaire des fêtes.";
    showToast("PDF réservé à l'administrateur.");
    event.target.value = "";
    return;
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    holidayStatus.textContent = "Le fichier doit être un PDF.";
    showToast("Veuillez choisir un fichier PDF.");
    event.target.value = "";
    return;
  }
  try {
    state.holidayPdf = {
      name: file.name,
      dataUrl: await fileToDataUrl(file),
      uploadedAt: formatNotificationDate(new Date()),
      uploadedBy: CURRENT_USER,
    };
    saveState();
    renderHolidayPdf();
    showToast("Horaire des fêtes PDF mis à jour.");
  } catch {
    holidayStatus.textContent = "Impossible de lire ce fichier PDF.";
    showToast("Erreur lors du téléchargement du PDF.");
  } finally {
    event.target.value = "";
  }
}

async function importHsfaPdf(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!isAdmin()) {
    hsfaStatus.textContent = "Import refusé : seul l'administrateur peut remplacer l'horaire HSFA.";
    showToast("PDF réservé à l'administrateur.");
    event.target.value = "";
    return;
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    hsfaStatus.textContent = "Le fichier doit être un PDF.";
    showToast("Veuillez choisir un fichier PDF.");
    event.target.value = "";
    return;
  }
  try {
    state.hsfaPdf = {
      name: file.name,
      dataUrl: await fileToDataUrl(file),
      uploadedAt: formatNotificationDate(new Date()),
      uploadedBy: CURRENT_USER,
    };
    saveState();
    renderHsfaPdf();
    showToast("Horaire HSFA PDF mis à jour.");
  } catch {
    hsfaStatus.textContent = "Impossible de lire ce fichier PDF.";
    showToast("Erreur lors du téléchargement du PDF.");
  } finally {
    event.target.value = "";
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readExcelRows(file) {
  if (typeof XLSX === "undefined") throw new Error("Le lecteur Excel n'est pas disponible");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const candidates = [];
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
    const headerIndex = findHeaderRow(rows);
    if (headerIndex >= 0) candidates.push({ rows, dataRows: rows.length - headerIndex - 1 });
  }
  candidates.sort((left, right) => right.dataRows - left.dataRows);
  if (candidates.length) return candidates[0].rows;
  throw new Error("Aucune feuille d'horaire reconnue");
}

function scheduleFromRows(rows) {
  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) throw new Error("En-têtes de l'horaire non reconnus");
  const header = rows[headerIndex].map(normalizeHeader);
  return header.includes("tache") ? scheduleFromDetailedRows(rows.slice(headerIndex + 1), header) : scheduleFromWideRows(rows.slice(headerIndex + 1), header);
}

function findHeaderRow(rows) {
  return rows.slice(0, 30).findIndex((row) => {
    const header = row.map(normalizeHeader);
    const detailed = header.includes("semaine") && header.includes("tache") && (header.includes("code") || header.includes("medecin"));
    const wide = header.includes("semaine") && ["usi ab", "usi cd", "usi ugb", "usi nuits"].filter((task) => header.includes(task)).length >= 3;
    return detailed || wide;
  });
}

function scheduleFromDetailedRows(rows, header) {
  const indexes = indexHeaders(header);
  const weeks = new Map();
  rows.forEach((row) => {
    const weekNumber = parseWeekNumber(row[indexes.semaine]);
    if (!weekNumber) return;
    const weekEntry = getOrCreateWeek(weeks, weekNumber, row[indexes.date], indexes.notes === undefined ? "" : row[indexes.notes]);
    const identity = parseDoctorCell(row[indexes.code] || row[indexes.medecin], row[indexes.medecin]);
    weekEntry.assignments.push({ task: canonicalTask(row[indexes.tache]), ...identity });
  });
  return Array.from(weeks.values()).sort((a, b) => a.weekNumber - b.weekNumber);
}

function scheduleFromWideRows(rows, header) {
  const indexes = indexHeaders(header);
  const taskColumns = ["usi ab", "usi cd", "usi ugb", "usi nuits", "hsfa a", "hsfa b"].filter((task) => indexes[task] !== undefined);
  const weeks = new Map();
  rows.forEach((row) => {
    const weekNumber = parseWeekNumber(row[indexes.semaine]);
    if (!weekNumber) return;
    const weekEntry = getOrCreateWeek(weeks, weekNumber, row[indexes.date], indexes.notes === undefined ? "" : row[indexes.notes]);
    taskColumns.forEach((task) => weekEntry.assignments.push({ task: canonicalTask(task), ...parseDoctorCell(row[indexes[task]]) }));
  });
  return Array.from(weeks.values()).sort((a, b) => a.weekNumber - b.weekNumber);
}

function indexHeaders(header) {
  return Object.fromEntries(header.map((name, index) => [name, index]));
}

function getOrCreateWeek(weeks, weekNumber, date, note) {
  if (!weeks.has(weekNumber)) weeks.set(weekNumber, { weekNumber, date: formatImportedDate(date), note: String(note || ""), assignments: [] });
  return weeks.get(weekNumber);
}

function normalizeHeader(value) {
  const normalized = normalizeSearch(value).replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  if (normalized === "sem" || normalized === "semaine" || normalized === "week") return "semaine";
  if (normalized === "notes" || normalized === "note") return "notes";
  if (normalized === "tache" || normalized === "task") return "tache";
  if (normalized === "medecin" || normalized === "intensiviste" || normalized === "doctor") return "medecin";
  if (normalized === "code") return "code";
  if (normalized.includes("horaire usi") || normalized === "date") return "date";
  if (normalized === "usi a b" || normalized === "usi ab") return "usi ab";
  if (normalized === "usi c d" || normalized === "usi cd") return "usi cd";
  if (normalized === "ugb" || normalized === "usi ugb") return "usi ugb";
  if (normalized === "nuits" || normalized === "nuit" || normalized === "usi nuits") return "usi nuits";
  if (normalized === "hsfa a") return "hsfa a";
  if (normalized === "hsfa b") return "hsfa b";
  return normalized;
}

function canonicalTask(value) {
  return ({ "usi ab": "USI AB", "usi cd": "USI CD", "usi ugb": "USI UGB", "usi nuits": "USI nuits", "hsfa a": "HSFA A", "hsfa b": "HSFA B" })[normalizeHeader(value)] || String(value || "");
}

function parseWeekNumber(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parseDoctorCell(value, separateName = "") {
  const raw = String(value || "").trim();
  const explicitName = String(separateName || "").trim();
  const normalized = normalizeSearch(raw);
  if (!raw || normalized === "vacant" || normalized === "hdq") {
    return { code: "", doctor: "", placeholder: normalized === "hdq" ? "HDQ" : "Vacant" };
  }
  const parts = raw.split(/\s+-\s+/);
  if (parts.length >= 2) return { code: parts[0].trim(), doctor: parts.slice(1).join(" - ").trim() };
  const prefixedCode = Object.keys(DOCTOR_NAMES)
    .sort((left, right) => right.length - left.length)
    .find((code) => normalizeSearch(raw).startsWith(normalizeSearch(code)) && normalizeSearch(raw) !== normalizeSearch(code));
  if (prefixedCode) return { code: prefixedCode, doctor: explicitName || raw.slice(prefixedCode.length).trim() || DOCTOR_NAMES[prefixedCode] };
  const knownCode = Object.keys(DOCTOR_NAMES).find((code) => normalizeSearch(code) === normalizeSearch(raw));
  if (knownCode) return { code: knownCode, doctor: explicitName || DOCTOR_NAMES[knownCode] };
  const knownName = Object.entries(DOCTOR_NAMES).find(([, name]) => normalizeSearch(name) === normalizeSearch(explicitName || raw));
  if (knownName) return { code: knownName[0], doctor: explicitName || knownName[1] };
  return { code: raw, doctor: explicitName || raw };
}

function findScheduleImportIssues(schedule) {
  const requiredTasks = ["USI AB", "USI CD", "USI UGB", "USI nuits"];
  return schedule.flatMap((weekEntry) => {
    const byTask = Object.fromEntries(weekEntry.assignments.map((assignment) => [assignment.task, assignment]));
    const missing = requiredTasks.filter((task) => !byTask[task]?.code && byTask[task]?.placeholder !== "HDQ");
    return missing.length ? [`S${weekEntry.weekNumber} sans ${missing.join(", ")}.`] : [];
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index], next = text[index + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value); if (row.some((cell) => cell !== "")) rows.push(row); row = []; value = "";
    } else value += char;
  }
  row.push(value); if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

function allAssignments() {
  return currentSchedule().flatMap((item) => buildDutyCells(item));
}
function allWeeklyBundles() {
  return currentSchedule().flatMap((item) => {
    const codes = Array.from(new Set(buildDutyCells(item).map((cell) => cell.code).filter(Boolean)));
    return codes.map((code) => buildWeeklyBundle(item.year || state.activeYear, item.weekNumber, code));
  });
}
function weekMatchesSearch(item, query) {
  if (!query) return true;
  const values = [
    `s${item.weekNumber}`,
    String(item.weekNumber),
    item.date,
    item.note,
    ...item.assignments.flatMap((assignment) => [assignment.task, assignment.code, assignment.doctor]),
  ];
  return values.some((value) => normalizeSearch(value).includes(query));
}
function normalizeSearch(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function assignmentKey(entry) {
  return entry.scope === "weekly"
    ? `weekly|${entry.year || state.activeYear}|${entry.weekNumber}|${entry.code}`
    : `${entry.year || state.activeYear}|${entry.weekNumber}|${entry.dutyId}|${entry.dayIndex}|${entry.code}`;
}
function findAssignment(key) {
  if (key.startsWith("weekly|")) {
    const parts = key.split("|");
    const year = parts.length === 4 ? Number(parts[1]) : state.activeYear;
    const weekNumber = parts.length === 4 ? Number(parts[2]) : Number(parts[1]);
    const code = parts.length === 4 ? parts[3] : parts[2];
    return buildWeeklyBundle(year, weekNumber, code);
  }
  const parts = key.split("|");
  if (parts.length === 5) {
    const [year, weekNumber, dutyId, dayIndex, code] = parts;
    return allAssignments().find((entry) => Number(entry.year) === Number(year) && Number(entry.weekNumber) === Number(weekNumber) && entry.dutyId === dutyId && Number(entry.dayIndex) === Number(dayIndex) && entry.code === code);
  }
  return allAssignments().find((entry) => assignmentKey(entry) === key);
}
function pickAssignment(entry) {
  if (entry.scope === "weekly") {
    return { scope: "weekly", year: entry.year || state.activeYear, weekNumber: entry.weekNumber, weekDate: entry.weekDate || entry.date, task: entry.task, tasks: entry.tasks || [], code: entry.code, cellCount: entry.cellCount };
  }
  return { scope: "individual", year: entry.year || state.activeYear, weekNumber: entry.weekNumber, date: entry.date, weekDate: entry.weekDate || entry.date, dayDate: entry.dayDate, dayIndex: entry.dayIndex, dutyId: entry.dutyId, task: entry.task, sourceTask: entry.sourceTask, code: entry.code };
}
function noOfferAssignment(scope = activeSwapScope) { return { scope, none: true, task: "Aucune garde offerte" }; }
function noRequestedAssignment(scope, targetCode, offered) {
  return {
    scope,
    none: true,
    task: "Aucune garde demandée",
    code: targetCode,
    year: offered.year || state.activeYear,
    weekNumber: offered.weekNumber,
    weekDate: offered.weekDate || offered.date || "",
  };
}
function isNoOffer(entry) { return !entry || entry.none === true; }
function statusLabel(status) { return ({ pending: "Demandée", accepted: "Acceptée", declined: "Refusée" })[status] || status; }
function emptyCard(message) { return `<div class="empty-card">${escapeHtml(message)}</div>`; }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function showToast(message) { toast.textContent = message; toast.classList.add("visible"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("visible"), 2600); }
function defaultUsers() {
  return Object.entries(DOCTOR_NAMES).map(([code, name]) => ({
    code,
    name,
    email: "",
    phone: "",
    role: "intensiviste",
    active: true,
  }));
}

function normalizeUsers(users) {
  const byCode = new Map(defaultUsers().map((user) => [user.code, user]));
  (Array.isArray(users) ? users : []).forEach((user) => {
    if (!user?.code) return;
    byCode.set(String(user.code).toUpperCase(), {
      code: String(user.code).toUpperCase(),
      name: user.name || DOCTOR_NAMES[user.code] || user.code,
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "intensiviste",
      active: user.active !== false,
    });
  });
  return Array.from(byCode.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function userByCode(code) {
  return (state.users || []).find((user) => user.code === code);
}

function swapConfirmationText(offered, requested) {
  return `Confirmer l'envoi de cette demande?\n\nVous demandez : ${plainSwapEntryLabel(requested)}\nOffre : ${plainSwapEntryLabel(offered)}`;
}

function requestAuditSummary(request) {
  return `Demande : ${plainSwapEntryLabel(request.requested)} · Offre : ${plainSwapEntryLabel(request.offered)}`;
}

function requestAuditBefore(request) {
  return `Offre : ${plainSwapEntryLabel(request.offered)} | Demande : ${plainSwapEntryLabel(request.requested)}`;
}

function requestAuditAfter(request) {
  if (isNoOffer(request.offered)) {
    return `Attribué à ${doctorName(request.requester || CURRENT_USER)} : ${plainSwapEntryLabel(request.requested)}`;
  }
  if (isNoOffer(request.requested)) {
    return `Attribué à ${doctorName(request.requested.code)} : ${plainSwapEntryLabel(request.offered)}`;
  }
  return `Échange appliqué : ${doctorName(request.offered.code)} ⇄ ${doctorName(request.requested.code)}`;
}

function addAudit(action, summary = "", before = "", after = "", admin = isAdmin()) {
  state.auditTrail ||= [];
  state.auditTrail.unshift({
    id: `audit-${Date.now()}`,
    at: formatNotificationDate(new Date()),
    by: CURRENT_USER,
    admin,
    action,
    summary,
    before,
    after,
  });
  state.auditTrail = state.auditTrail.slice(0, 100);
}

function buildDutyCells(weekEntry) {
  const byTask = Object.fromEntries(weekEntry.assignments.map((assignment) => [assignment.task, assignment]));
  const dates = getWeekDates(weekEntry.date);
  return DUTY_ROWS.flatMap((duty) => duty.sources.map((_, dayIndex) => {
    const dutySources = getDutySources(weekEntry, duty, byTask);
    const sourceTask = dutySources[dayIndex];
    const source = byTask[sourceTask] || {};
    const override = state.cellOverrides?.[`${weekEntry.year || state.activeYear}|${weekEntry.weekNumber}|${duty.id}|${dayIndex}`];
    return {
      year: weekEntry.year || state.activeYear,
      weekNumber: weekEntry.weekNumber,
      date: weekEntry.date,
      weekDate: weekEntry.date,
      dayDate: dates[dayIndex],
      dayIndex,
      dutyId: duty.id,
      task: duty.label,
      sourceTask,
      code: override?.code ?? source.code ?? "",
      doctor: override?.doctor ?? doctorName(source.code) ?? source.doctor ?? source.code ?? "",
      placeholder: source.placeholder || "",
    };
  }));
}

function getDutySources(weekEntry, duty, byTask = null) {
  const assignments = byTask || Object.fromEntries((weekEntry.assignments || []).map((assignment) => [assignment.task, assignment]));
  if (assignments["USI AB"]?.code === "AT") {
    return ALEXIS_USI_AB_DUTY_SOURCES[duty.id] || duty.sources;
  }
  if (assignments["USI CD"]?.code === "AT") {
    return ALEXIS_USI_CD_DUTY_SOURCES[duty.id] || duty.sources;
  }
  return duty.sources;
}

function buildWeeklyBundle(year, weekNumber, code) {
  const schedule = state.schedulesByYear?.[year] || currentSchedule();
  const cells = buildDutyCells(schedule.find((item) => item.weekNumber === Number(weekNumber)) || { year, assignments: [] })
    .filter((cell) => cell.code === code);
  const tasks = ANNUAL_TASK_COLUMNS.map(([task]) => task)
    .filter((task) => cells.some((cell) => cell.sourceTask === task));
  return {
    scope: "weekly",
    year: Number(year),
    weekNumber: Number(weekNumber),
    task: "Toutes les tâches de la semaine",
    code,
    doctor: cells[0]?.doctor || DOCTOR_NAMES[code] || code,
    weekDate: cells[0]?.weekDate || cells[0]?.date || "",
    tasks,
    cellCount: cells.length,
  };
}

function weeklyTaskSummary(entry) {
  let tasks = Array.isArray(entry.tasks) ? entry.tasks : [];
  if (!tasks.length && entry.code && entry.weekNumber) {
    tasks = buildWeeklyBundle(entry.year || state.activeYear, entry.weekNumber, entry.code).tasks;
  }
  return `${tasks.length > 1 ? "Fonctions" : "Fonction"} : ${tasks.join(" + ") || "non précisée"}`;
}

function applyWeeklySwap(request) {
  if (isNoOffer(request.offered)) {
    applyNoOfferAssignment(request);
    return;
  }
  const offered = findAssignment(assignmentKey(request.offered));
  const requested = findAssignment(assignmentKey(request.requested));
  if (!offered || !requested) return;
  swapAnnualAssignments(offered, requested);
  clearWeeklyOverrides(offered);
  clearWeeklyOverrides(requested);
}

function swapAnnualAssignments(offered, requested) {
  const offeredWeek = findScheduleWeek(offered.year, offered.weekNumber);
  const requestedWeek = findScheduleWeek(requested.year, requested.weekNumber);
  if (!offeredWeek || !requestedWeek) return;
  if (offered.year === requested.year && offered.weekNumber === requested.weekNumber) {
    offeredWeek.assignments.forEach((assignment) => {
      if (assignment.code === offered.code) setAssignmentDoctor(assignment, requested.code);
      else if (assignment.code === requested.code) setAssignmentDoctor(assignment, offered.code);
    });
    return;
  }
  offeredWeek.assignments.forEach((assignment) => {
    if (assignment.code === offered.code) setAssignmentDoctor(assignment, requested.code);
  });
  requestedWeek.assignments.forEach((assignment) => {
    if (assignment.code === requested.code) setAssignmentDoctor(assignment, offered.code);
  });
}

function setAssignmentDoctor(assignment, code) {
  assignment.code = code;
  assignment.doctor = doctorName(code);
  assignment.placeholder = "";
}

function applyNoOfferAssignment(request) {
  const requested = findAssignment(assignmentKey(request.requested));
  if (!requested) return;
  const requesterCode = request.requester || CURRENT_USER;
  if (request.requested.scope === "weekly") {
    const requestedWeek = findScheduleWeek(requested.year, requested.weekNumber);
    if (!requestedWeek) return;
    requestedWeek.assignments.forEach((assignment) => {
      if (assignment.code === requested.code) setAssignmentDoctor(assignment, requesterCode);
    });
    clearWeeklyOverrides(requested);
    return;
  }
  state.cellOverrides ||= {};
  state.cellOverrides[cellOverrideKey(requested)] = { code: requesterCode, doctor: doctorName(requesterCode), kind: "partial" };
}

function findScheduleWeek(year, weekNumber) {
  return (state.schedulesByYear?.[year] || []).find((item) => Number(item.weekNumber) === Number(weekNumber));
}

function clearWeeklyOverrides(entry) {
  const weekEntry = findScheduleWeek(entry.year, entry.weekNumber);
  if (!weekEntry || !state.cellOverrides) return;
  buildDutyCells(weekEntry)
    .filter((cell) => cell.code === entry.code)
    .forEach((cell) => {
      delete state.cellOverrides[cellOverrideKey(cell)];
    });
}

function swapEntryLabel(entry) {
  if (isNoOffer(entry)) return escapeHtml(entry?.task || "Aucune garde offerte");
  if (entry.scope === "weekly") {
    return `${entry.year || state.activeYear} · Semaine ${entry.weekNumber} · semaine du ${escapeHtml(entry.weekDate || "")} · ${escapeHtml(weeklyTaskSummary(entry))} · Toutes les tâches de ${escapeHtml(entry.doctor || doctorName(entry.code))} (${entry.cellCount || 0})`;
  }
  return `${entry.year || state.activeYear} · Semaine ${entry.weekNumber} · semaine du ${escapeHtml(entry.weekDate || entry.date || "")} · Date de la garde : ${escapeHtml(individualDutyDateLabel(entry))} · ${escapeHtml(entry.sourceTask || entry.task)} · ${escapeHtml(entry.doctor || doctorName(entry.code))}`;
}

function plainSwapEntryLabel(entry) {
  if (isNoOffer(entry)) return entry?.task || "Aucune garde offerte";
  if (entry.scope === "weekly") {
    return `${entry.year || state.activeYear} · Semaine ${entry.weekNumber} · semaine du ${entry.weekDate || ""} · ${weeklyTaskSummary(entry)} · ${doctorName(entry.code)}`;
  }
  return `${entry.year || state.activeYear} · Semaine ${entry.weekNumber} · ${entry.dayDate || ""} · ${entry.sourceTask || entry.task} · ${doctorName(entry.code)}`;
}

function doctorName(code) {
  return userByCode(code)?.name || DOCTOR_NAMES[code] || code || "";
}

function createNotificationState() {
  const now = new Date();
  const reminder = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  return demoNotification(formatNotificationDate(now), formatNotificationDate(reminder));
}

function createCompletedSwapNotification(reason = "accepted") {
  const now = formatNotificationDate(new Date());
  return {
    ...demoNotification(now, "Annulé"),
    adminEmail: { status: "sent", sentAt: now, recipient: doctorName(CURRENT_USER), reason },
  };
}

function markAdminEmailSent(request, reason = "accepted") {
  request.notification ||= {};
  request.notification.adminEmail = {
    status: "sent",
    sentAt: formatNotificationDate(new Date()),
    recipient: doctorName(CURRENT_USER),
    reason,
  };
}

function demoNotification(sentAt, reminderAt) {
  return {
    push: { status: "sent", sentAt },
    email: { status: "sent", sentAt },
    reminder: { status: "scheduled", scheduledAt: reminderAt, delayHours: 48 },
  };
}

function notificationTimeline(request) {
  if (!request.notification) {
    return `<div class="notification-timeline"><span><strong>Serveur</strong>Demande synchronisée</span></div>`;
  }
  const notification = request.notification;
  const reminderDone = request.status !== "pending";
  const adminEmail = notification.adminEmail;
  return `<div class="notification-timeline">
    <span><strong>Poussée</strong>${escapeHtml(notification.push?.sentAt || "Envoyée")}</span>
    <span><strong>Courriel</strong>${escapeHtml(notification.email?.sentAt || "Envoyé")}</span>
    <span><strong>Admin</strong>${adminEmail ? `Courriel admin · ${escapeHtml(adminEmail.sentAt)}` : "Avis à l'acceptation"}</span>
    <span class="${reminderDone ? "cancelled" : ""}"><strong>Rappel 48 h</strong>${reminderDone ? "Annulé, demande traitée" : escapeHtml(notification.reminder?.scheduledAt || "Planifié")}</span>
  </div>`;
}

function formatNotificationDate(date) {
  return new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function cellOverrideKey(entry) {
  return `${entry.year || state.activeYear}|${entry.weekNumber}|${entry.dutyId}|${entry.dayIndex}`;
}

function getWeekDates(startDate) {
  const date = parseFrenchDate(startDate);
  if (!date) return DAY_NAMES.map((_, index) => index === 0 ? startDate : "");
  return DAY_NAMES.map((_, index) => {
    const day = new Date(date);
    day.setDate(day.getDate() + index);
    return new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long", year: "numeric" }).format(day);
  });
}

function canExchangeEntry(entry) {
  if (!entry || isAdmin()) return true;
  return !isPastExchangeEntry(entry);
}

function isPastExchangeEntry(entry) {
  if (entry.scope === "weekly") {
    const start = weekStartDate(findScheduleWeek(entry.year || state.activeYear, entry.weekNumber) || entry);
    if (!start) return false;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end < startOfDay(new Date());
  }
  const date = parseFrenchDate(entry.dayDate || entry.date);
  if (!date) return false;
  return date < startOfDay(new Date());
}

function weekStartDate(weekEntry) {
  return parseFrenchDate(weekEntry?.date);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function inferScheduleYear(schedule) {
  const dated = (schedule || []).map((item) => weekStartDate(item)).find(Boolean);
  return dated?.getFullYear() || 0;
}

function parseFrenchDate(value) {
  const months = { janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11 };
  const match = normalizeSearch(value).match(/(\d{1,2})(?:er)?\s+([a-z]+)\s+(\d{4})/);
  if (!match || months[match[2]] === undefined) return null;
  return new Date(Number(match[3]), months[match[2]], Number(match[1]));
}

function frenchDateToIso(value) {
  const parsed = parseFrenchDate(value);
  if (!parsed) throw new Error(`Date de semaine invalide : ${value}`);
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

function formatImportedDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long", year: "numeric" }).format(value);
  }
  return String(value || "");
}
