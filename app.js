import { connectFirebase, timestampToDate } from "./firebase.js?v=26";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORE_KEY = "ctla-called-to-communicate-v1";
const SCHOOL_ID = "ctla";
const roles = ["Parent", "Student", "Teacher", "Presidency", "Admin"];
const roleIcons = { Parent: "users", Student: "cap", Teacher: "book", Presidency: "shield", Admin: "settings" };
const colorClasses = ["", "purple", "gray", "teal", "orange", "pink", "green", "blue", "coral"];
const now = new Date();
const keyForDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date, count) => { const copy = new Date(date); copy.setDate(copy.getDate() + count); return copy; };
const todayKey = keyForDate(now);
const tomorrowKey = keyForDate(addDays(now, 1));

function seedState() {
  const classes = [
    { id: "math-6a", name: "Math 6A", teacher: "Mrs. Reynolds", color: "purple", icon: "grid", note: "Don’t forget to complete the worksheet for tomorrow’s lesson!", members: 12, joined: true },
    { id: "english", name: "English", teacher: "Ms. Wilson", color: "blue", icon: "book", note: "We’ll be reading Chapter 4 this week.", members: 18, joined: true },
    { id: "history", name: "History", teacher: "Mr. Thompson", color: "green", icon: "globe", note: "Great discussion today! Be ready for the quiz on Friday.", members: 16, joined: true },
    { id: "science", name: "Science", teacher: "Mrs. Lopez", color: "orange", icon: "flask", note: "Lab materials are due next Monday.", members: 14, joined: true },
    { id: "art", name: "Art", teacher: "Mrs. Nguyen", color: "coral", icon: "palette", note: "Bring your sketchbook to class!", members: 15, joined: true },
    { id: "music", name: "Music", teacher: "Mr. Davis", color: "teal", icon: "music", note: "Band practice after school on Thursday.", members: 20, joined: true },
    { id: "physical-ed", name: "Physical Education", teacher: "Coach Taylor", color: "pink", icon: "activity", note: "Great job at the game today!", members: 22, joined: true },
    { id: "drama", name: "Drama Club", teacher: "Mrs. Johnson", color: "purple", icon: "palette", note: "Open enrollment · Rehearsal on Thursday", members: 9, joined: false, openEnrollment: true },
    { id: "robotics", name: "Robotics", teacher: "Mr. Carter", color: "blue", icon: "grid", note: "Open enrollment · Build lab projects together", members: 11, joined: false, openEnrollment: true }
  ];
  const conversations = [
    { id: "announcements", title: "School Announcements", kind: "announcement", color: "blue", preview: "Reminder: School will be closed this Friday for teacher professional development.", time: "9:12 AM", unread: 0, members: ["School Office"], icon: "users" },
    { id: "math-6a", title: "Mrs. Carter (Math)", kind: "class", color: "purple", preview: "Don’t forget to complete the worksheet for tomorrow’s lesson!", time: "8:47 AM", unread: 0, members: ["Mrs. Carter", "Emma"], icon: "cap", classId: "math-6a" },
    { id: "john-miller", title: "John Miller", kind: "direct", color: "gray", preview: "Got it! Thanks!", time: "8:32 AM", unread: 0, members: ["John Miller"] },
    { id: "class-2028", title: "Class of 2028", kind: "group", color: "teal", preview: "Emily: Can someone send the notes from yesterday’s class?", time: "8:21 AM", unread: 2, members: ["Emily", "Jordan", "You"], icon: "users" },
    { id: "parents", title: "Parents", kind: "group", color: "orange", preview: "Mrs. Davis: Just a reminder about the upcoming parent meeting next week.", time: "7:56 AM", unread: 1, members: ["Parents", "Mrs. Davis"], icon: "users" },
    { id: "history-chat", title: "Mr. Thompson (History)", kind: "direct", color: "purple", preview: "Great discussion today! Be ready for the quiz on Friday.", time: "Yesterday", unread: 0, members: ["Mr. Thompson"] },
    { id: "sarah", title: "Sarah", kind: "direct", color: "teal", preview: "Can you send me the file from English class?", time: "Yesterday", unread: 0, members: ["Sarah"] },
    { id: "bible-study", title: "Bible Study Group", kind: "group", color: "pink", preview: "Logan: We’ll meet after school in Room 12.", time: "Yesterday", unread: 0, members: ["Logan", "You"], icon: "users" },
    { id: "emma", title: "Emma", kind: "direct", color: "purple", preview: "See you at practice!", time: "Tuesday", unread: 0, members: ["Emma"] },
    { id: "eagles", title: "Tribe: Eagles", kind: "group", color: "green", preview: "Coach: Great job at the game today! Keep up the hard work!", time: "Tuesday", unread: 0, members: ["Coach Taylor", "Eagles"], icon: "users" }
  ];
  const events = [
    { id: "today-math", date: todayKey, time: "8:00 AM", title: "Math", detail: "CTLA 26-27", kind: "live", color: "purple", link: "https://zoom.us/" },
    { id: "today-english", date: todayKey, time: "9:30 AM", title: "English", detail: "Brother Thom’s Class", kind: "live", color: "blue", link: "https://zoom.us/" },
    { id: "today-history", date: todayKey, time: "11:00 AM", title: "History", detail: "Mrs. Carter Zoom", kind: "live", color: "green", link: "https://zoom.us/" },
    { id: "today-science", date: todayKey, time: "1:00 PM", title: "Science", detail: "Ms. Wilson Zoom", kind: "live", color: "orange", link: "https://zoom.us/" },
    { id: "tomorrow-art", date: tomorrowKey, time: "8:00 AM", title: "Art", detail: "Art Live Session", kind: "live", color: "pink", link: "https://zoom.us/" },
    { id: "meeting", date: keyForDate(addDays(now, 3)), time: "3:30 PM", title: "Parent Meeting", detail: "School library", kind: "meeting", color: "green" },
    { id: "deadline", date: keyForDate(addDays(now, 5)), time: "11:59 PM", title: "Science project due", detail: "Submit your final project", kind: "deadline", color: "orange" }
  ];
  const family = {
    name: "The Smith Family", tribe: "Lamanites", description: "", allowLinkedAccounts: true, requireChildPin: true, members: [
      { id: "jonathan", name: "Jonathan Smith", role: "Parent", note: "Account Holder", accountType: "owner", pinConfigured: false, pinLength: 6, color: "purple" },
      { id: "sarah-smith", name: "Sarah Smith", role: "Parent", note: "", accountType: "managed", pinConfigured: false, pinLength: 4, color: "pink" },
      { id: "emma-smith", name: "Emma Smith", role: "Student", note: "Grade 6", tribe: "Nephites", accountType: "managed", pinConfigured: false, pinLength: 4, color: "blue" },
      { id: "noah-smith", name: "Noah Smith", role: "Student", note: "Grade 4", tribe: "Lamanites", accountType: "managed", pinConfigured: false, pinLength: 4, color: "teal" },
      { id: "ella-smith", name: "Ella Smith", role: "Student", note: "Grade 2", tribe: "Jaredites", accountType: "managed", pinConfigured: false, pinLength: 4, color: "orange" },
      { id: "benjamin-smith", name: "Benjamin Smith", role: "Student", note: "Grade K", tribe: "Mulekites", accountType: "managed", pinConfigured: false, pinLength: 4, color: "purple" }
    ]
  };
  const messages = {
    "math-6a": [
      { sender: "Mrs. Reynolds", senderInitials: "MR", text: "Good morning, everyone! ☀️\nHere is the homework for this week.", time: "8:12 AM", mine: false, color: "purple" },
      { sender: "Mrs. Reynolds", senderInitials: "MR", text: "Week 8 - Homework.pdf", attachmentName: "Week 8 - Homework.pdf", attachmentSize: "2.4 MB", time: "8:12 AM", mine: false, color: "purple" },
      { sender: "Emma Smith", senderInitials: "ES", text: "Thank you, Mrs. Reynolds!", time: "8:15 AM", mine: true },
      { sender: "Mrs. Reynolds", senderInitials: "MR", text: "You’re welcome! Let me know if you have any questions.", time: "8:16 AM", mine: false, color: "purple" },
      { sender: "Emma Smith", senderInitials: "ES", text: "I’m a little confused about question #4. Could you explain it?", time: "9:02 AM", mine: true },
      { sender: "Mrs. Reynolds", senderInitials: "MR", text: "Of course! I’ll go over it in today’s live class. If you still have questions afterward, feel free to message me.", time: "9:10 AM", mine: false, color: "purple" },
      { sender: "Emma Smith", senderInitials: "ES", text: "Sounds good! See you then!", time: "9:11 AM", mine: true }
    ],
    announcements: [{ sender: "School Office", senderInitials: "CT", text: "Reminder: School will be closed this Friday for teacher professional development.", time: "9:12 AM", mine: false, color: "purple" }]
  };
  const people = [
    { id: "math-6a", name: "Math 6A", role: "Class", kind: "class", color: "purple", icon: "users" },
    { id: "mrs-reynolds", name: "Mrs. Reynolds", role: "Teacher", kind: "person", color: "blue", initials: "MR" },
    { id: "smith-family", name: "Smith Family", role: "Group", kind: "group", color: "teal", icon: "users" },
    { id: "lamanites", name: "Lamanites", role: "Tribe", kind: "tribe", color: "green", icon: "users" },
    { id: "mr-carter", name: "Mr. Carter", role: "Teacher", kind: "person", color: "gray", initials: "MC" },
    { id: "mrs-johnson", name: "Mrs. Johnson", role: "Teacher", kind: "person", color: "pink", initials: "SJ" },
    { id: "mrs-peterson", name: "Mrs. Peterson", role: "Teacher", kind: "person", color: "teal", initials: "NP" },
    { id: "emma-smith", name: "Emma Smith", role: "Student · Grade 6", kind: "person", color: "blue", initials: "ES" },
    { id: "noah-smith", name: "Noah Smith", role: "Student · Grade 4", kind: "person", color: "blue", initials: "NS" },
    { id: "ella-smith", name: "Ella Smith", role: "Student · Grade 2", kind: "person", color: "purple", initials: "ES" },
    { id: "benjamin-smith", name: "Benjamin Smith", role: "Student · Grade K", kind: "person", color: "orange", initials: "BL" },
    { id: "class-2028", name: "Class of 2028", role: "Group", kind: "group", color: "purple", icon: "users" },
    { id: "eagles", name: "Tribe: Eagles", role: "Tribe", kind: "tribe", color: "green", icon: "users" }
  ];
  return {
    activeTab: "messages", page: "home", filter: "All", search: "", calendarFilter: "All", monthOffset: 0,
    selectedDate: todayKey, conversations, classes, events, family, messages, people,
    selectedPersonIds: [], activeConversationId: null, activeClassId: null, activeEventId: null,
    currentUser: { name: "Emma Smith", email: "emma.smith@example.com", role: "Student", color: "blue", initials: "ES" },
    activeMemberId: "emma-smith", isDemoSignedIn: false, pinChat: false, notifications: true,
    notificationPrefs: { messages: true, announcements: true, events: true }, joinedRequests: [], pendingUsers: [], pinnedConversationIds: [],
    addingMember: false, addingToConversationId: null, pinManagementMemberId: null, pendingPinMemberId: null,
    classJoinRequests: [], showJoinable: false, newMessageFilter: "All", settingsDetail: "", authMode: "signin", error: ""
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!saved) return seedState();
    return { ...seedState(), ...saved, messages: { ...seedState().messages, ...(saved.messages || {}) }, family: saved.family || seedState().family };
  } catch { return seedState(); }
}

let state = loadState();
let backend = null;
let authUser = null;
let userProfile = null;
let authInitialized = false;
let authAccountReady = false;
let authSessionRevision = 0;
let authLoadForUid = null;
let dataScopeRevision = 0;
let familyLink = null;
let activeFamilyId = null;
let familyOwnerLocked = false;
let promptAccountPickerAfterFamilyLoad = false;
let directory = [];
let remoteMode = false;
let messageUnsubscribe = null;
let conversationUnsubscribe = null;
let classesUnsubscribe = null;
let eventsUnsubscribe = null;
let identityProfileUnsubscribe = null;
let directoryUnsubscribe = null;
let familyUnsubscribe = null;
let familyMembersUnsubscribe = null;
let pendingUsersUnsubscribe = null;
let joinRequestsUnsubscribe = null;
let toastTimer = 0;
let pendingFileKind = "any";
let pendingAuthUser = null;
let authObserverReceived = false;
let isBusy = false;
let familySetupDraft = null;
let familySetupMemberDraft = null;
let familySetupView = "create";
let familySetupEditingIndex = null;
let familySetupLinkOpen = false;
let familySetupNextAfterPin = "members";
let familyAddMemberDraft = null;
let familyAddMemberPinStep = false;
let familyEditor = null;
let familyEditorDraft = null;

const persist = () => {
  // Remote school records stay in Firebase's authenticated client cache, not shared browser storage.
  if (remoteMode) { try { localStorage.removeItem(STORE_KEY); } catch {} return; }
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
};
const icon = (name, extra = "") => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const esc = (text = "") => String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const titleRole = (role = "student") => ({ parent: "Parent", student: "Student", teacher: "Teacher", presidency: "Presidency", admin: "Admin" }[String(role).toLowerCase()] || "Student");
const activeFamilyMember = () => state.family.members.find((member) => member.id === state.activeMemberId) || null;
const canSelectFamilyMember = (member) => !remoteMode || (member?.accountType === "linked"
  ? member.linkedUid === authUser?.uid
  : member?.accountType === "owner"
    ? member.id === authUser?.uid
    : member?.accountType === "managed" && (member.ownerUid === authUser?.uid || member.uid === authUser?.uid));
const canManageFamilyAccount = () => !remoteMode || (familyLink?.accountType === "owner" && activeIdentityId() === authUser?.uid);
const activeIdentityId = () => state.activeMemberId || authUser?.uid || "demo";
const currentRole = () => remoteMode
  ? (activeIdentityId() === authUser?.uid ? titleRole(userProfile?.role) : titleRole(activeFamilyMember()?.role || "student"))
  : state.currentUser.role;
const verifiedRole = () => {
  const role = currentRole();
  // Admin is a school-account role and cannot be inherited by a managed profile.
  return remoteMode && activeIdentityId() !== authUser?.uid && role === "Admin" ? "Student" : role;
};
const canManageSchool = () => ["Teacher", "Presidency", "Admin"].includes(verifiedRole());
const canAdmin = () => ["Presidency", "Admin"].includes(verifiedRole());
const isAdmin = () => verifiedRole() === "Admin";
const isSignedIn = () => remoteMode
  ? Boolean(authUser && authAccountReady && userProfile?.id === authUser.uid && userProfile?.status === "active")
  : state.isDemoSignedIn;

function brand(extra = "") {
  return `<div class="brand ${extra}" aria-label="Called to Communicate, Called to Learn Academy">
    <img class="brand-mark" src="brand-mark-v1.png" alt="" aria-hidden="true">
    <span class="brand-name"><span class="called">CALLED TO</span><span class="communicate">COMMUNICATE</span><span class="school">Called to Learn</span></span>
  </div>`;
}

function avatar(person, size = "") {
  const p = typeof person === "string" ? { name: person } : (person || {});
  const color = colorClasses.includes(p.color) ? p.color : "blue";
  const initials = p.initials || (p.name || "CT").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const symbol = p.icon === "users" || ["group", "announcement", "class", "tribe"].includes(p.kind) ? icon(p.kind === "class" ? "cap" : p.kind === "announcement" ? "users" : "users") : "";
  return `<span class="avatar ${color} ${size}">${symbol || esc(initials || "CT")}</span>`;
}

function timeLabel(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Now";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === addDays(today, -1).toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short" });
}
function formatDate(dateKey, options = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString([], options);
}
function safeExternalURL(value) {
  try {
    const url = new URL(value, location.href);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
function showToast(message) {
  const node = $("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2600);
}
function showFirebaseError(source, error) {
  console.error(`[Firebase] ${source}`, error);
  const code = String(error?.code || "").replace(/^firestore\//, "");
  const message = String(error?.message || "").trim();
  const detail = code ? `${code}${message && !message.includes(code) ? `: ${message}` : ""}` : message || "Unknown error";
  showToast(`${source}: ${detail}`);
}
function showListenerError(source, error) { showFirebaseError(`${source} read`, error); }
function roleDetail(role, item = {}) {
  if (item.note) return `${role} · ${item.note}`;
  if (item.tribe) return `${role} · ${item.tribe}`;
  return role;
}
function navButton(tab) {
  const details = { messages: ["message", "Messages"], classes: ["cap", "Classes"], calendar: ["calendar", "Calendar"], settings: ["settings", "Settings"] };
  return `<button class="tab-item ${state.activeTab === tab ? "active" : ""}" data-action="tab" data-tab="${tab}">${icon(details[tab][0])}<span>${details[tab][1]}</span></button>`;
}
function tabBar() { return `<nav class="tab-bar" aria-label="Main navigation">${["messages", "classes", "calendar", "settings"].map(navButton).join("")}</nav>`; }
function rail() {
  return `<aside class="desktop-rail">${brand()}<nav class="rail-nav" aria-label="Main navigation">${["messages", "classes", "calendar", "settings"].map(navButton).join("")}</nav>
    <div class="rail-bottom"><div class="section-label">Signed in as</div><button class="member-select" data-action="account"><span class="avatar small ${esc(state.currentUser.color || "blue")}">${esc(state.currentUser.initials || "ES")}</span><span class="member-copy"><b>${esc(state.currentUser.name)}</b><span>${esc(currentRole())}</span></span>${icon("chevron")}</button></div>
  </aside>`;
}
function header({ action = "new-message", title = "", actionLabel = "", showAction = true } = {}) {
  return `<header class="mobile-header">${brand()}${title ? `<strong class="mobile-head-title">${esc(title)}</strong>` : ""}<div class="header-actions">
    ${showAction ? `<button class="round-button primary" aria-label="${esc(actionLabel || (action === "new-message" ? "New message" : "Add"))}" data-action="${action}">${icon(action === "new-message" ? "compose" : "plus")}</button>` : ""}
    <button class="profile-button" aria-label="Switch account" data-action="account">${avatar({ ...state.currentUser, color: "blue" })}</button>
  </div></header>`;
}

function render() {
  if (familyOwnerLocked && state.page !== "family-owner-pin") state.page = "family-owner-pin";
  const app = $("#app");
  if (!app) return;
  document.body.classList.toggle("chat-open", state.page === "chat");
  if (!authInitialized) {
    app.innerHTML = `<main class="auth-screen"><section class="auth-card card">${brand("auth-brand")}<div class="auth-copy"><h1>Loading your account</h1><p>Checking your secure school sign-in…</p></div></section></main>`;
    return;
  }
  if (!isSignedIn()) {
    app.innerHTML = remoteMode && authUser ? renderVerification() : renderAuth();
    return;
  }
  let page = "";
  if (state.page === "chat") page = renderChat();
  else if (state.page === "new-message") page = renderNewMessage();
  else if (state.page === "family") page = renderFamily();
  else if (state.page === "account") page = renderAccount();
  else if (state.page === "account-picker") page = renderAccountPicker();
  else if (state.page === "subaccount-pin") page = renderSubaccountPin();
  else if (state.page === "family-owner-pin") page = renderFamilyOwnerPin();
  else if (state.page === "settings-detail") page = renderSettingsDetail();
  else if (state.page === "class-detail") page = renderClassDetail();
  else if (state.page === "event-detail") page = renderEventDetail();
  else if (state.page === "create-event") page = renderCreateEvent();
  else if (state.page === "create-personal-event") page = renderCreatePersonalEvent();
  else if (state.page === "create-class") page = renderCreateClass();
  else if (state.page === "create-announcement") page = renderCreateAnnouncement();
  else if (state.page === "edit-chat") page = renderEditChat();
  else page = renderHome();
  const familySetupActive = state.page === "family" && remoteMode && !activeFamilyId;
  const hideTabs = familySetupActive || ["chat", "account-picker", "subaccount-pin", "family-owner-pin"].includes(state.page);
  const hideRail = familySetupActive || ["account-picker", "subaccount-pin", "family-owner-pin"].includes(state.page);
  app.innerHTML = `<div class="app-layout">${hideRail ? "" : rail()}<main class="main-column">${page}</main></div>${hideTabs ? "" : tabBar()}`;
  if (state.page === "chat") requestAnimationFrame(() => { const messages = $("#chat-messages"); if (messages) messages.scrollTop = messages.scrollHeight; });
}

function renderAuth() {
  const creating = state.authMode === "signup";
  const error = state.error ? `<div class="notice-card" role="alert">${esc(state.error)}</div>` : "";
  return `<main class="auth-screen"><section class="auth-card card">${brand("auth-brand")}<div class="auth-copy"><h1>${creating ? "Create your account" : "Welcome back"}</h1><p>${creating ? "Join your Called to Learn Academy community." : "Sign in to stay connected with your school."}</p></div>${error}
    <form id="auth-form">
      ${creating ? `<div class="form-field"><label for="auth-name">Full name</label><input id="auth-name" name="displayName" autocomplete="name" required placeholder="Your full name"></div>` : ""}
      <div class="form-field"><label for="auth-email">School email</label><input id="auth-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>
      <div class="form-field"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" autocomplete="${creating ? "new-password" : "current-password"}" minlength="6" required placeholder="At least 6 characters"></div>
      ${creating ? `<div class="form-field"><label for="requested-role">Request a role</label><select id="requested-role" name="requestedRole">${roles.map((role) => `<option>${role}</option>`).join("")}</select><span class="item-subtitle">Your selected role stays pending until approved. Only an existing Admin can approve an Admin request.</span></div>` : ""}
      ${creating ? `<div id="signup-family-choice" class="signup-family-choice"><label><input id="create-family-account" name="createFamilyAccount" type="checkbox" value="yes"> <span>Would you like to create a family account?</span></label><span class="item-subtitle">We’ll open family setup after your Parent role is approved.</span></div>` : ""}
      <button class="button primary wide" type="submit" ${isBusy ? "disabled" : ""}>${isBusy ? "Please wait…" : creating ? "Create account" : "Sign In"}</button>
    </form>
    ${creating ? "" : `<button class="auth-switch mt-12" data-action="reset-password">Forgot password?</button>`}
    <p class="demo-note">${remoteMode ? "Your school Firebase project is connected." : "Preview the screens and interactions using sample school data."}<br><button class="auth-switch" data-action="auth-mode">${creating ? "Already have an account? Sign in" : "Need an account? Create one"}</button></p>
    ${remoteMode ? "" : `<button class="button wide mt-12" data-action="demo-signin">Preview the app</button>`}
  </section></main>`;
}

function renderVerification() {
  const pending = userProfile?.status === "pending";
  const failed = Boolean(state.error && !authAccountReady);
  return `<main class="verify-state"><section class="card verify-card"><div class="item-icon" style="margin:0 auto 14px;width:56px;height:56px">${icon(failed ? "shield" : pending ? "clock" : "shield")}</div><h1>${failed ? "Couldn’t load this account" : pending ? "Account awaiting verification" : "School access required"}</h1><p class="page-subtitle">${failed ? esc(state.error) : pending ? "Your account has been created. Called to Learn Academy staff must verify your role before school information becomes available." : "This account is not currently approved for Called to Learn Academy."}</p>${failed ? `<button class="button primary mt-12" data-action="retry-account-load">Try again</button>` : ""}<button class="button ghost mt-12" data-action="sign-out">Sign out</button></section></main>`;
}

function renderHome() {
  if (state.activeTab === "classes") return renderClasses();
  if (state.activeTab === "calendar") return renderCalendar();
  if (state.activeTab === "settings") return renderSettings();
  return renderMessages();
}

function renderMessages() {
  const filters = [["All", "message"], ["Personal", "user"], ["Groups", "users"], ["Classes", "cap"], ["Announcements", "speaker"]];
  const conversations = filterConversations(state.search);
  return `<section class="page messages-page">${header()}<label class="search-field">${icon("search")}<input id="message-search" type="search" value="${esc(state.search)}" placeholder="Search" aria-label="Search conversations"></label>
    <div class="filter-row" role="tablist" aria-label="Conversation filters">${filters.map(([name, ico]) => `<button class="filter-chip ${state.filter === name ? "active" : ""}" data-action="filter" data-filter="${name}">${icon(ico)}${name}</button>`).join("")}</div>
    <div class="page-body conversation-list" id="conversation-list">${conversations.length ? conversations.map(conversationRow).join("") : `<div class="empty-state">${icon("message")}<h3>No conversations found</h3><p>Try a different search or start a new conversation.</p></div>`}</div>
  </section>`;
}
function filterConversations(search = "") {
  const query = search.trim().toLowerCase();
  return state.conversations.filter((conversation) => {
    const matchesFilter = state.filter === "All" || (state.filter === "Personal" && conversation.kind === "direct") || (state.filter === "Groups" && conversation.kind === "group") || (state.filter === "Classes" && conversation.kind === "class") || (state.filter === "Announcements" && conversation.kind === "announcement");
    return matchesFilter && (!query || `${conversation.title} ${conversation.preview} ${conversation.kind}`.toLowerCase().includes(query));
  }).sort((a, b) => Number(state.pinnedConversationIds?.includes(b.id)) - Number(state.pinnedConversationIds?.includes(a.id)));
}
function conversationRow(conversation) {
  return `<button class="conversation-row" data-action="open-chat" data-id="${esc(conversation.id)}"><span class="avatar-wrap">${conversation.unread ? `<i class="unread-dot"></i>` : ""}${avatar(conversation, "")}</span><span class="conversation-copy"><span class="conversation-title-line"><b class="conversation-title">${esc(conversation.title)}</b><span class="conversation-time">${esc(conversation.time || timeLabel(conversation.updatedAt))}</span></span><span class="conversation-preview">${esc(conversation.preview || conversation.lastMessage?.text || "Start a conversation")}</span></span>${icon("chevron", "row-chevron")}</button>`;
}

function renderClasses() {
  const query = (state.search || "").toLowerCase();
  const list = state.classes.filter((item) => (state.showJoinable ? !item.joined : item.joined) && (!query || `${item.name} ${item.teacher}`.toLowerCase().includes(query)));
  const canCreate = canManageSchool() && !state.showJoinable;
  return `<section class="page">${header({ action: canCreate ? "create-class" : "join-class" })}<label class="search-field">${icon("search")}<input id="class-search" type="search" value="${esc(state.search)}" placeholder="Search classes" aria-label="Search classes"></label>
    <div class="page-title-row"><div><h1 class="page-title">${state.showJoinable ? "Join a Class" : "My Classes"}</h1><p class="page-subtitle">${state.showJoinable ? "Explore courses open to new students" : "Your courses and teacher updates"}</p></div><button class="button ghost" data-action="${canCreate ? "create-class" : "join-class"}">${canCreate ? `${icon("plus")}New Class` : state.showJoinable ? "My Classes" : `${icon("plus")}Join`}</button></div>
    <div class="page-body class-grid">${list.map((item) => `<article class="card class-card" data-action="class-detail" data-id="${esc(item.id)}"><span class="avatar square ${esc(item.color)}">${icon(item.icon === "cap" ? "cap" : item.icon === "book" ? "book" : "users")}</span><span class="class-copy"><h2>${esc(item.name)}</h2><p class="teacher">${esc(item.teacher)}</p><span class="last-note">${icon("message")} ${esc(item.note)}</span></span><span class="class-time">${esc(item.time || "Today")}</span></article>`).join("")}${list.length ? "" : `<div class="empty-state">No classes match that search.</div>`}</div>
  </section>`;
}

function renderCalendar() {
  const base = new Date(now.getFullYear(), now.getMonth() + state.monthOffset, 1);
  const year = base.getFullYear(), month = base.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let index = 0; index < 42; index++) {
    let day, date, outside = false;
    if (index < firstWeekday) { day = prevDays - firstWeekday + index + 1; date = new Date(year, month - 1, day); outside = true; }
    else if (index >= firstWeekday + daysInMonth) { day = index - firstWeekday - daysInMonth + 1; date = new Date(year, month + 1, day); outside = true; }
    else { day = index - firstWeekday + 1; date = new Date(year, month, day); }
    const dateKey = keyForDate(date);
    const marks = state.events.filter((event) => event.date === dateKey).slice(0, 3).map((event) => `<i class="event-dot ${event.color || ""}"></i>`).join("");
    const selected = state.selectedDate === dateKey;
    const today = dateKey === todayKey;
    cells.push(`<button class="calendar-day ${outside ? "outside" : ""} ${today ? "today" : ""} ${selected ? "selected" : ""}" data-action="select-date" data-date="${dateKey}"><span>${day}</span><span class="event-dots">${marks}</span></button>`);
  }
  const filterKinds = ["All", "Live Classes", "Meetings", "Events", "Deadlines"];
  const kinds = { "Live Classes": "live", Meetings: "meeting", Events: "event", Deadlines: "deadline" };
  const events = state.events.filter((event) => event.date === state.selectedDate && (state.calendarFilter === "All" || event.kind === kinds[state.calendarFilter])).sort((a, b) => a.time.localeCompare(b.time));
  const canCreate = canManageSchool();
  return `<section class="page">${header({ action: canCreate ? "create-event" : "account" })}<label class="search-field">${icon("search")}<input id="calendar-search" type="search" placeholder="Search events" aria-label="Search events"></label>
    <button class="button ghost wide" data-action="create-personal-event">${icon("plus")}Add to ${esc(state.currentUser.name)}’s calendar</button>
    <div class="filter-row">${filterKinds.map((kind) => `<button class="filter-chip ${state.calendarFilter === kind ? "active" : ""}" data-action="calendar-filter" data-filter="${kind}">${icon(kind === "Live Classes" ? "video" : kind === "Meetings" ? "users" : kind === "Events" ? "calendar" : kind === "Deadlines" ? "book" : "check")} ${kind}</button>`).join("")}</div>
    <div class="calendar-toolbar"><h2>${base.toLocaleDateString([], { month: "long", year: "numeric" })}</h2><div class="calendar-controls"><button class="round-button" data-action="month-prev" aria-label="Previous month">${icon("back")}</button><button class="round-button" data-action="month-next" aria-label="Next month">${icon("chevron")}</button><button class="button ghost" data-action="month-today">Today</button></div></div>
    <div class="calendar-grid"><div class="weekday">Sun</div><div class="weekday">Mon</div><div class="weekday">Tue</div><div class="weekday">Wed</div><div class="weekday">Thu</div><div class="weekday">Fri</div><div class="weekday">Sat</div>${cells.join("")}</div>
    <div class="section-heading"><h2>${state.selectedDate === todayKey ? "Today" : formatDate(state.selectedDate, { weekday: "long" })}</h2><span class="muted">${esc(formatDate(state.selectedDate))}</span></div>
    <div class="page-body" id="event-list">${events.length ? events.map((event) => `<button class="event-row" data-action="event-detail" data-id="${esc(event.id)}"><span class="event-time ${esc(event.color || "")}">${esc(event.time)}</span><span class="event-details"><span class="event-copy"><h3>${esc(event.title)}</h3><p>${event.kind === "live" ? `${icon("camera")} ` : ""}${esc(event.detail)}</p></span>${icon("chevron", "row-chevron")}</span></button>`).join("") : `<div class="empty-state">${icon("calendar")}<h3>No events for this day</h3><p>Check another date or calendar filter.</p></div>`}</div>
  </section>`;
}

function renderSettings() {
  const settingGroups = [
    ["Account", [["Profile", "View and edit your profile", "user", "profile"], ["Family Account", "Manage family members", "users", "family"], ["Account & Security", "Email, password, and verification", "shield", "security"], ["Notifications", "Choose what you want to be notified about", "bell", "notifications"]]],
    ["School", [["School Information", "Details, calendar, and contacts", "home", "school"], ["Tribe", "View your tribe", "users", "tribe"], ["Classes", "Manage your classes and preferences", "book", "classes"]]],
    ...(canAdmin() ? [["Admin", [["Admin Controls", "Manage school settings, users, and content", "settings", "admin"], ["Reports", "View activity and usage reports", "calendar", "reports"], ["User Management", "Manage families, teachers, and students", "users", "users"], ["App Settings", "Configure school-wide settings", "settings", "app"]]]] : []),
    ["Preferences", [["Appearance", "Light, dark, or system", "activity", "appearance"], ["Language", "Choose your language", "globe", "language"], ["Accessibility", "Text size and accessibility options", "user", "accessibility"]]],
    ["Support", [["Help & Support", "Get help or contact support", "message", "help"], ["About", "App version and information", "shield", "about"]]]
  ];
  const groups = settingGroups.map(([name, items]) => `<section class="settings-group"><p class="section-label">${esc(name)}</p><div class="card card-list">${items.map(([title, subtitle, ico, key]) => `<button class="list-item settings-item" data-action="settings-detail" data-key="${key}"><span class="item-icon">${icon(ico)}</span><span class="item-copy"><span class="item-title">${esc(title)}</span><span class="item-subtitle">${esc(subtitle)}</span></span>${icon("chevron", "row-chevron")}</button>`).join("")}</div></section>`).join("");
  return `<section class="page">${header({ action: "account" })}<div class="page-title-row"><div><h1 class="page-title">Settings</h1><p class="page-subtitle">${esc(state.currentUser.name)} · ${esc(currentRole())}</p></div></div>${groups}<button class="button danger" data-action="sign-out">${icon("back")}Log Out</button></section>`;
}

function renderFamily() {
  if (remoteMode && !activeFamilyId) return renderFamilySetup();
  const family = state.family;
  const familyRoles = remoteMode ? (isAdmin() ? ["Parent", "Student", "Teacher", "Presidency"] : ["Parent", "Student"]) : roles;
  const canManageFamily = canManageFamilyAccount();
  if (familyEditor) return renderFamilyEditor(familyRoles, canManageFamily);
  const memberRows = family.members.map((member, index) => {
    const selected = state.activeMemberId === member.id;
    const owner = member.accountType === "owner" || member.note === "Account Holder";
    const detail = [member.role, owner ? "Account Holder" : (member.grade || member.note)].filter(Boolean).join(" · ");
    const glyph = "user";
    return `<article class="family-managed-member card"><button class="family-member-select ${selected ? "active" : ""}" data-action="switch-member" data-id="${esc(member.id)}" aria-label="${selected ? "Current profile: " : "Switch to "}${esc(member.name)}" ${canSelectFamilyMember(member) ? "" : "disabled"}>
      <span class="family-person-avatar tone-${index % 6}">${icon(glyph)}</span><span class="item-copy"><span class="item-title">${esc(member.name)}</span><span class="family-member-role">${esc(detail || member.role)}</span>${member.tribe ? `<span class="family-member-tribe">${icon("users")} Tribe: ${esc(member.tribe)}</span>` : ""}</span><span class="family-member-indicator">${icon("chevron")}</span>
    </button></article>`;
  }).join("");
  const editButton = canManageFamily ? `<button class="button ghost family-edit-title" data-action="edit-family">${icon("compose")} Edit Family</button>` : "";
  const summaryEditButton = canManageFamily ? `<button class="button ghost family-edit-summary" data-action="edit-family">${icon("compose")}<span>Edit Family</span></button>` : "";
  return `<section class="page family-page">${header({ action: "account", showAction: false })}<button class="back-link" data-action="tab" data-tab="settings">${icon("back")} Settings</button>
    <div class="page-title-row family-title-row"><div><h1 class="page-title">Family Account</h1><p class="page-subtitle">Manage your family members and their accounts.</p></div>${editButton}</div>
    <div class="family-summary card"><span class="item-icon family-summary-icon">${icon("home")}</span><div class="family-copy"><h2>${esc(family.name)}</h2><p>${family.members.length} ${family.members.length === 1 ? "member" : "members"}</p></div>${summaryEditButton}</div>
    <div class="family-section-heading"><h2>Family Members</h2>${canManageFamily ? `<button class="button lavender family-add-button" data-action="add-member">${icon("plus")} Add Family Member</button>` : ""}</div>
    <div class="family-managed-list">${memberRows || `<div class="empty-state card">No family members have been added yet.</div>`}</div>
    <div class="notice-card family-about"><span class="family-about-icon">${icon("users")}</span><div><strong>About Family Accounts</strong><span>A family account lets you manage multiple family members under one account. Each member has their own role, classes, and settings.</span></div>${icon("chevron", "row-chevron")}</div></section>`;
}

function renderFamilyEditor(familyRoles, canManageFamily) {
  if (!canManageFamily) { familyEditor = null; return renderFamily(); }
  if (familyEditor.type === "family-members") return renderFamilyMembersManager(familyRoles);
  const editingMember = familyEditor.type === "member" ? state.family.members.find((member) => member.id === familyEditor.memberId) : null;
  if (familyEditor.type === "member" && (!editingMember || editingMember.accountType !== "managed")) { familyEditor = null; return renderFamily(); }
  const isMember = Boolean(editingMember);
  const title = isMember ? "Edit Family Member" : "Edit Family";
  const form = isMember ? `<form id="family-member-edit-form" class="card family-editor-form" data-member-id="${esc(editingMember.id)}">
      <div class="family-editor-person"><span class="avatar small ${esc(editingMember.color || "purple")}">${esc(editingMember.initials || editingMember.name.split(/\s+/).map((part) => part[0]).slice(0,2).join(""))}</span><div><strong>${esc(editingMember.name)}</strong><span>Managed family profile</span></div></div>
      <div class="form-field"><label for="edit-member-name">Full name</label><input id="edit-member-name" name="name" maxlength="80" value="${esc(editingMember.name)}" required autocomplete="name"></div>
      <div class="form-field"><label for="edit-member-role">School role</label><select id="edit-member-role" name="role">${familyRoles.map((role) => `<option value="${esc(role)}" ${editingMember.role === role ? "selected" : ""}>${esc(role)}</option>`).join("")}</select><span class="item-subtitle">Staff roles are assigned by a school Admin.</span></div>
      <div class="form-field"><label for="edit-member-grade">Grade <span class="family-optional">Optional</span></label><select id="edit-member-grade" name="grade"><option value="">No grade selected</option>${["Kindergarten", ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)].map((grade) => `<option value="${esc(grade)}" ${(editingMember.grade || editingMember.note || "") === grade ? "selected" : ""}>${esc(grade)}</option>`).join("")}</select></div>
      <div class="form-field"><label for="edit-member-tribe">Tribe</label><select id="edit-member-tribe" name="tribe"><option value="">No tribe selected</option>${familyTribes.map((tribe) => `<option value="${esc(tribe)}" ${(editingMember.tribe || "") === tribe ? "selected" : ""}>${esc(tribe)}</option>`).join("")}</select></div>
      <div class="family-editor-actions"><button class="button primary" type="submit">Save changes</button><button class="button ghost" type="button" data-action="cancel-family-edit">Cancel</button></div>
    </form>` : `<form id="family-edit-form" class="family-edit-content">
      <section class="card family-information-card"><h2>Family Information</h2><div class="family-information-grid"><span class="family-information-icon">${icon("users")}</span><div class="family-information-fields">
        <div class="family-edit-field"><label for="edit-family-name">Family Name</label><input id="edit-family-name" name="name" maxlength="100" value="${esc(familyEditorDraft?.name ?? state.family.name)}" required autocomplete="organization"></div>
        <div class="family-edit-field family-description-field"><label for="edit-family-description">Family Description</label><textarea id="edit-family-description" name="description" maxlength="400" rows="2" placeholder="Tell your family’s story">${esc(familyEditorDraft?.description ?? state.family.description ?? "")}</textarea></div>
        <div class="family-edit-field"><label for="edit-family-holder">Primary Account Holder</label><select id="edit-family-holder" disabled aria-label="Primary account holder can only be changed through account transfer">${(() => { const owner = state.family.members.find((member) => member.accountType === "owner" || member.id === authUser?.uid || member.note === "Account Holder"); return `<option>${esc(owner?.name || state.currentUser.name)}</option>`; })()}</select></div>
        <div class="family-edit-field"><label for="edit-family-type">Family Type</label><input id="edit-family-type" value="Family Account" disabled></div>
      </div></div></section>
      <h2 class="family-subheading">Manage Members</h2><button class="card family-manage-members-link" type="button" data-action="family-manage-members"><span class="family-about-icon">${icon("users")}</span><span><strong>${state.family.members.length} family ${state.family.members.length === 1 ? "member" : "members"}</strong><small>Add or remove family members, manage roles, and view their accounts.</small></span>${icon("chevron", "row-chevron")}</button>
      <section class="card family-permissions"><h2>Permissions</h2>
        <label class="family-permission-row"><span class="family-permission-icon">${icon("link")}</span><span class="family-permission-copy"><strong>Allow linked personal accounts</strong><small>Let family members link their personal accounts to this family.</small></span><input type="checkbox" name="allowLinkedAccounts" ${familyEditorDraft?.allowLinkedAccounts !== false ? "checked" : ""}></label>
        <label class="family-permission-row"><span class="family-permission-icon">${icon("shield")}</span><span class="family-permission-copy"><strong>Require PIN for child subaccounts</strong><small>Require a PIN to access child accounts and restricted content.</small></span><input type="checkbox" name="requireChildPin" ${familyEditorDraft?.requireChildPin !== false ? "checked" : ""}></label>
      </section>
      <div class="family-editor-actions"><button class="button outline" type="button" data-action="cancel-family-edit">Cancel</button><button class="button primary" type="submit">Save Changes</button></div>
    </form>`;
  return `<section class="page family-page family-editor-page">${header({ showAction: false })}<button class="back-link" data-action="cancel-family-edit">${icon("back")} Family Account</button><div class="page-title-row"><div><h1 class="page-title">${title}</h1><p class="page-subtitle">${isMember ? "Update this profile’s name, school role, grade, and tribe." : "Update your family details and account settings."}</p></div></div>${form}</section>`;
}

function renderFamilyMembersManager(familyRoles) {
  const addDraft = familyAddMemberDraft || {};
  const owner = state.family.members.find((member) => member.accountType === "owner" || member.id === authUser?.uid);
  const pinFormMember = state.family.members.find((member) => member.id === state.pinManagementMemberId);
  const pinLength = pinFormMember ? Number(pinFormMember.pinLength || (pinFormMember.accountType === "owner" ? 6 : 4)) : 4;
  const pinManagementForm = ["managed", "owner"].includes(pinFormMember?.accountType) ? `<form id="family-pin-form" data-member-id="${esc(pinFormMember.id)}" data-pin-length="${pinLength}" class="card pin-form family-pin-management-form"><h3>${pinFormMember.accountType === "owner" ? "Family account holder" : esc(pinFormMember.name)} · ${pinFormMember.pinConfigured ? "Change" : "Set"} PIN</h3><p class="item-subtitle">Use a ${pinLength}-digit number. Five incorrect attempts temporarily lock PIN entry.</p><div class="form-field"><label for="family-pin">New ${pinLength}-digit PIN</label><input id="family-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{${pinLength}}" minlength="${pinLength}" maxlength="${pinLength}" autocomplete="new-password" required placeholder="${pinLength}-digit PIN"></div><div class="form-field"><label for="family-pin-confirm">Confirm PIN</label><input id="family-pin-confirm" name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{${pinLength}}" minlength="${pinLength}" maxlength="${pinLength}" autocomplete="new-password" required placeholder="Enter it again"></div><div class="pin-form-actions"><button class="button primary" type="submit">Save PIN</button><button class="button ghost" type="button" data-action="cancel-member-pin">Cancel</button></div></form>` : "";
  const memberForm = state.addingMember ? familyAddMemberPinStep ? `<form id="family-member-pin-form" class="card family-member-form family-member-pin-step"><h3>Set PIN for ${esc(addDraft.name || "this profile")}</h3><p class="item-subtitle">Choose a four-digit PIN. It will be required when opening this family member’s profile.</p><div class="form-field"><label for="member-pin">Four-digit PIN</label><input id="member-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" required placeholder="Enter 4 digits"></div><div class="form-field"><label for="member-pin-confirm">Confirm PIN</label><input id="member-pin-confirm" name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" required placeholder="Enter it again"></div><div class="family-member-form-actions"><button class="button primary" type="submit">Set PIN</button><button class="button ghost" type="button" data-action="back-member-pin-step">Back</button><button class="button ghost" type="button" data-action="cancel-member">Cancel</button></div></form>` : `<form id="family-member-form" class="card family-member-form"><div class="form-field"><label for="member-account-type">Account type</label><select id="member-account-type" name="accountType"><option value="managed" ${addDraft.accountType !== "linked" ? "selected" : ""}>Managed subaccount · shares this login</option><option value="linked" ${addDraft.accountType === "linked" ? "selected" : ""} ${state.family.allowLinkedAccounts === false ? "disabled" : ""}>Link a personal account</option></select>${state.family.allowLinkedAccounts === false ? `<span class="item-subtitle">Linked accounts are turned off in family permissions.</span>` : ""}</div><div class="form-field"><label for="member-name">Full name</label><input id="member-name" name="name" value="${esc(addDraft.name || "")}" required placeholder="Family member name"></div><div class="form-field ${addDraft.accountType === "linked" ? "" : "hide"}" id="member-email-field"><label for="member-email">Personal account email</label><input id="member-email" name="email" value="${esc(addDraft.email || "")}" type="email" autocomplete="off" ${addDraft.accountType === "linked" ? "required" : ""} placeholder="member@example.com"><span class="item-subtitle">They sign in with their own account. Linking does not create a duplicate profile.</span></div><div class="form-field"><label for="member-role">Role</label><select id="member-role" name="role">${familyRoles.map((role) => `<option ${addDraft.role === role || (!addDraft.role && role === "Student") ? "selected" : ""}>${role}</option>`).join("")}</select></div><div class="form-field"><label for="member-grade">Grade (optional)</label><input id="member-grade" name="grade" value="${esc(addDraft.grade || "")}" placeholder="e.g. Grade 6"></div><div class="form-field"><label for="member-tribe">Tribe</label><select id="member-tribe" name="tribe">${familyTribes.map((tribe) => `<option ${addDraft.tribe === tribe || (!addDraft.tribe && tribe === "Lamanites") ? "selected" : ""}>${tribe}</option>`).join("")}</select></div><div class="family-member-form-actions"><button class="button primary" type="submit">${addDraft.accountType === "linked" ? "Add or Invite" : "Set PIN"}</button><button class="button ghost" type="button" data-action="cancel-member">Cancel</button></div></form>` : "";
  const managementRows = state.family.members.map((member, index) => {
    const ownerMember = member.accountType === "owner" || member.id === authUser?.uid || member.note === "Account Holder";
    const detail = [member.role, ownerMember ? "Account Holder" : (member.grade || member.note), member.tribe ? `Tribe: ${member.tribe}` : ""].filter(Boolean).join(" · ");
    const controls = member.accountType === "managed"
      ? `<button class="button ghost" data-action="edit-member" data-id="${esc(member.id)}">Edit</button><button class="button ghost" data-action="manage-member-pin" data-id="${esc(member.id)}">${member.pinConfigured ? "Change PIN" : "Set PIN"}</button><button class="button ghost" data-action="make-member-independent" data-id="${esc(member.id)}">Create login</button><button class="button ghost danger-text" data-action="remove-family-member" data-id="${esc(member.id)}">Remove</button>`
      : member.accountType === "linked" ? `<button class="button ghost danger-text" data-action="remove-family-member" data-id="${esc(member.id)}">Unlink account</button>`
        : `<button class="button ghost" data-action="manage-member-pin" data-id="${esc(member.id)}">${member.pinConfigured ? "Change PIN" : "Set PIN"}</button>`;
    return `<article class="family-managed-member card"><div class="family-manager-row"><span class="family-person-avatar tone-${index % 6}">${icon("user")}</span><span class="item-copy"><span class="item-title">${esc(member.name)}</span><span class="family-member-role">${esc(detail)}</span>${member.accountType === "linked" ? `<span class="family-member-badge linked">${icon("link")}Linked account</span>` : ""}</span><span class="family-member-indicator">${icon("chevron")}</span></div><div class="family-member-actions">${controls}</div></article>`;
  }).join("");
  const holderPin = owner ? `<div class="card family-holder-pin"><span class="family-permission-icon">${icon("shield")}</span><span class="family-permission-copy"><strong>Family account holder PIN</strong><small>${owner.pinConfigured ? "The holder profile is protected by a PIN." : "Set a PIN before switching into the account holder profile."}</small></span><button class="button ghost" data-action="manage-member-pin" data-id="${esc(owner.id)}">${owner.pinConfigured ? "Change PIN" : "Set PIN"}</button></div>` : "";
  return `<section class="page family-page family-manager-page">${header({ showAction: false })}<button class="back-link" data-action="family-manager-back">${icon("back")} Edit Family</button><div class="page-title-row"><div><h1 class="page-title">Manage Members</h1><p class="page-subtitle">Add or remove family members, manage roles, and view their accounts.</p></div></div><div class="family-summary card"><span class="item-icon family-summary-icon">${icon("home")}</span><div class="family-copy"><h2>${esc(state.family.name)}</h2><p>${state.family.members.length} family ${state.family.members.length === 1 ? "member" : "members"}</p></div><button class="button ghost" data-action="edit-family-details">Edit</button></div>${holderPin}${pinManagementForm}${memberForm}<div class="family-section-heading"><h2>Family Members</h2><button class="button lavender family-add-button" data-action="add-member">${icon("plus")} Add Family Member</button></div><div class="family-managed-list">${managementRows}</div></section>`;
}

const familyTribes = ["Lamanites", "Nephites", "Jaredites", "Mulekites"];
const familySetupRoles = ["Parent", "Student", "Teacher", "Presidency"];

function ensureFamilySetupDraft() {
  if (familySetupDraft) return familySetupDraft;
  const lastName = state.currentUser.name.split(/\s+/).filter(Boolean).slice(-1)[0] || "Family";
  familySetupDraft = { name: `The ${lastName} Family`, tribe: "Lamanites", ownerRole: "Parent", members: [] };
  familySetupView = "create";
  return familySetupDraft;
}

function familySetupProgress(active) {
  const labels = ["Create Family", "Add Members", "Finish"];
  return `<div class="family-setup-progress" aria-label="Step ${active} of 3">${labels.map((label, index) => {
    const step = index + 1;
    const stateClass = step < active ? "complete" : step === active ? "current" : "";
    return `${step > 1 ? `<span class="family-progress-line ${step <= active ? "complete" : ""}"></span>` : ""}<div class="family-progress-step ${stateClass}"><span class="family-progress-dot">${step < active ? "✓" : step}</span><span>${label}</span></div>`;
  }).join("")}</div>`;
}

function familySetupSummary(draft, editAction = "family-setup-edit-family") {
  return `<div class="family-setup-summary"><span class="family-setup-summary-icon">${icon("users")}</span><div><strong>${esc(draft.name || "Your Family")}</strong><span>${draft.members.length + 1} ${draft.members.length ? "members" : "account holder"}${draft.tribe ? ` · ${esc(draft.tribe)} Tribe` : ""}</span></div><button type="button" class="button lavender" data-action="${editAction}">Edit</button></div>`;
}

function familySetupRoleCards(selected, scope, disabled = false) {
  return `<div class="family-role-grid">${familySetupRoles.map((role) => {
    const restricted = scope === "member" && ["Teacher", "Presidency"].includes(role) && !isAdmin();
    return `<button type="button" class="family-role-card ${selected === role ? "selected" : ""}" data-action="family-setup-role" data-scope="${scope}" data-role="${role}" ${disabled || restricted ? "disabled" : ""}>${icon(roleIcons[role])}<span>${role}</span><span class="family-role-radio" aria-hidden="true"></span></button>`;
  }).join("")}</div>`;
}

function familySetupTop(title, subtitle, step, showSkip = false) {
  const backAction = familySetupView === "create" ? "family-setup-exit" : "family-setup-back";
  return `<div class="family-setup-top"><button type="button" class="family-setup-back" data-action="${backAction}">${icon("back")}<span>Back</span></button>${showSkip ? `<button type="button" class="family-setup-skip" data-action="family-setup-skip">Skip for now</button>` : ""}${step > 1 ? familySetupProgress(step) : ""}<div class="family-setup-heading"><h1>${title}</h1><p>${subtitle}</p></div></div>`;
}

function familySetupMemberDetail(member) {
  const bits = [member.role, member.grade || "", member.role === "Student" && member.tribe ? `Tribe: ${member.tribe}` : "",
    member.accountType === "linked" ? "Linked account" : member.role === "Student" ? "Subaccount" : ""].filter(Boolean);
  return bits.join("  ·  ");
}

function renderFamilySetupCreate(draft) {
  const ownerName = state.currentUser.name || "Family Account Holder";
  return `${familySetupTop("Create Family", "Set up your family account", 1)}
    <form id="family-create-form" class="family-setup-content">
      <div class="family-together-card"><div class="family-together-art"><span class="family-heart">♥</span>${icon("users")}</div><div><h2>Together at School</h2><p>Keep your family connected. Add family members, manage their accounts, and stay informed all in one place.</p></div></div>
      <section class="family-field-section"><label for="setup-family-name">Family Name</label><p>Choose a name for your family account.</p><div class="family-select-field"><span class="family-field-icon">${icon("home")}</span><input id="setup-family-name" name="name" value="${esc(draft.name)}" maxlength="100" required><button type="button" class="family-clear-field" data-action="family-setup-clear-name" aria-label="Clear family name">×</button></div></section>
      <section class="family-field-section"><h2>Choose Your Role</h2><p>Select your role in the family.</p>${familySetupRoleCards("Parent", "owner", true)}<span class="family-field-note">${esc(ownerName)} is the family account holder. School roles remain verified by Called to Learn Academy.</span></section>
      <section class="family-field-section"><h2>Choose Your Tribe</h2><p>Select your tribe. You can change this later.</p><label class="family-select-field"><span class="family-field-icon">${icon("users")}</span><select name="tribe">${familyTribes.map((tribe) => `<option ${draft.tribe === tribe ? "selected" : ""}>${tribe}</option>`).join("")}</select><span class="family-select-chevron">⌄</span></label></section>
      <div class="family-next-card"><span class="family-next-icon">i</span><div><strong>What’s Next?</strong><p>After creating your family, you’ll be able to add family members and set up their individual accounts with their own roles, classes, and settings.</p></div></div>
      <button class="button primary wide family-create-next" type="submit">Create Family</button>
    </form>
    <button class="family-link-toggle" type="button" data-action="family-setup-toggle-link">Already have a family invitation? Link an existing account</button>
    ${familySetupLinkOpen ? `<div class="family-link-panel"><p>Sign in to your personal school account, then paste the code from your family account holder.</p><form id="family-link-form"><label for="setup-family-code">Family invitation code</label><input id="setup-family-code" name="code" required autocomplete="one-time-code" placeholder="Paste your invitation code"><button class="button lavender wide" type="submit">Link My Existing Account</button></form></div>` : ""}`;
}

function renderFamilySetupMembers(draft) {
  const owner = `<article class="family-setup-member"><span class="family-setup-member-avatar owner">${icon("user")}</span><div class="family-setup-member-copy"><strong>${esc(state.currentUser.name || "Family Account Holder")}</strong><span>${esc(titleRole(userProfile?.role || "parent"))}  ·  Account Holder</span></div><span class="family-setup-row-chevron">${icon("chevron")}</span></article>`;
  const rows = draft.members.map((member, index) => `<article class="family-setup-member"><span class="family-setup-member-avatar tone-${index % 4}">${icon(member.role === "Student" ? "user" : roleIcons[member.role] || "user")}</span><div class="family-setup-member-copy"><strong>${esc(member.name)}</strong><span>${esc(familySetupMemberDetail(member))}</span></div><button type="button" class="family-setup-row-chevron" data-action="family-setup-edit-member" data-index="${index}" aria-label="Edit ${esc(member.name)}">${icon("chevron")}</button></article>`).join("");
  return `${familySetupTop("Add Family Members", "Review your family members and add anyone else before finishing.", 2, true)}
    <div class="family-setup-content">${familySetupSummary(draft)}<h2 class="family-setup-section-title">Family Members</h2><div class="family-setup-member-list">${owner}${rows || `<div class="family-setup-empty">Add profiles for the people who will use this family account.</div>`}</div>
    <button type="button" class="button lavender wide family-add-member" data-action="family-setup-add-member">${icon("plus")}Add Family Member</button>
    <div class="family-setup-footer"><button type="button" class="button outline" data-action="family-setup-back">Back</button><button type="button" class="button primary" data-action="family-setup-review">Finish</button></div></div>`;
}

function syncFamilySetupMemberDraft() {
  const form = $("#family-setup-member-form");
  if (!form) return;
  const data = new FormData(form);
  const previous = familySetupMemberDraft || {};
  familySetupMemberDraft = {
    ...previous, name: String(data.get("name") || ""), role: String(data.get("role") || "Student"),
    grade: String(data.get("grade") || ""), tribe: String(data.get("tribe") || "Lamanites"),
    accountType: String(data.get("accountType") || "managed"), email: String(data.get("email") || ""),
    pin: previous.pin || "", confirmPin: previous.confirmPin || ""
  };
}

function renderFamilySetupMember(draft) {
  const member = familySetupMemberDraft || { name: "", role: "Student", grade: "", tribe: draft.tribe, accountType: "managed", email: "", pin: "", confirmPin: "" };
  const editing = Number.isInteger(familySetupEditingIndex);
  const managed = member.accountType === "managed";
  return `${familySetupTop(editing ? "Edit Family Member" : "Add Family Member", "Create a profile for this family member before finishing setup.", 2, true)}
    <form id="family-setup-member-form" class="family-setup-content">
      ${familySetupSummary(draft)}
      <div class="family-field-section"><label for="setup-member-name">Full Name</label><div class="family-select-field"><span class="family-field-icon">${icon("user")}</span><input id="setup-member-name" name="name" value="${esc(member.name)}" required maxlength="100" placeholder="Enter full name"></div></div>
      <div class="family-field-section"><h2>Role</h2><p>Select the role for this family member.</p><input type="hidden" name="role" value="${esc(member.role)}">${familySetupRoleCards(member.role, "member")}${!isAdmin() ? `<span class="family-field-note">Teacher and Presidency roles are assigned by a school Admin.</span>` : ""}</div>
      <div class="family-field-section"><label for="setup-member-grade">Grade <span>(Optional)</span></label><label class="family-select-field"><span class="family-field-icon">${icon("calendar")}</span><select id="setup-member-grade" name="grade"><option value="">Select grade</option>${["Kindergarten", ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)].map((grade) => `<option ${member.grade === grade ? "selected" : ""}>${grade}</option>`).join("")}</select><span class="family-select-chevron">⌄</span></label></div>
      <div class="family-field-section"><label for="setup-member-tribe">Tribe</label><p>Assign a tribe for this family member.</p><label class="family-select-field"><span class="family-field-icon">${icon("users")}</span><select id="setup-member-tribe" name="tribe">${familyTribes.map((tribe) => `<option ${member.tribe === tribe ? "selected" : ""}>${tribe}</option>`).join("")}</select><span class="family-select-chevron">⌄</span></label></div>
      <div class="family-field-section"><h2>Account Type</h2><div class="family-account-type"><button type="button" class="${member.accountType === "managed" ? "selected" : ""}" data-action="family-setup-account-type" data-type="managed">Subaccount</button><button type="button" class="${member.accountType === "linked" ? "selected" : ""}" data-action="family-setup-account-type" data-type="linked">Link existing account</button></div></div>
      ${member.accountType === "linked" ? `<div class="family-field-section"><label for="setup-member-email">Personal Account Email</label><div class="family-select-field"><span class="family-field-icon">@</span><input id="setup-member-email" name="email" value="${esc(member.email)}" type="email" required placeholder="member@example.com"></div><span class="family-field-note">They will sign in with their existing account. No duplicate profile is created.</span></div>` : ""}
      <div class="family-setup-member-actions"><button type="submit" class="button primary wide" name="next" value="${managed ? "set-pin" : "list"}">${managed ? "Set PIN" : (editing ? "Save Family Member" : "Add Family Member")}</button></div>
      <div class="family-setup-footer"><button type="button" class="button outline" data-action="family-setup-back">Back</button><button type="submit" class="button primary" name="next" value="review">Finish</button></div>
    </form>`;
}

function renderFamilySetupPin(draft) {
  const member = familySetupMemberDraft || {};
  return `${familySetupTop("Set PIN", `Choose a PIN to protect ${member.name ? esc(member.name) + "’s" : "this member’s"} profile.`, 2, true)}
    <form id="family-setup-pin-form" class="family-setup-content">
      ${familySetupSummary(draft)}
      <div class="family-next-card family-pin-step-card"><span class="family-next-icon">${icon("shield")}</span><div><strong>Keep this profile private</strong><p>Choose a 4-digit PIN. It will be required when opening this family member’s profile.</p></div></div>
      <div class="family-field-section"><label for="setup-member-pin">4-digit PIN</label><div class="family-select-field"><span class="family-field-icon">${icon("shield")}</span><input id="setup-member-pin" name="pin" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{4}" minlength="4" maxlength="4" value="${esc(member.pin || "")}" required placeholder="Enter 4 digits"></div></div>
      <div class="family-field-section"><label for="setup-member-pin-confirm">Confirm PIN</label><div class="family-select-field"><span class="family-field-icon">${icon("shield")}</span><input id="setup-member-pin-confirm" name="confirmPin" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{4}" minlength="4" maxlength="4" value="${esc(member.confirmPin || "")}" required placeholder="Enter it again"></div></div>
      <div class="family-setup-footer"><button type="button" class="button outline" data-action="family-setup-back">Back</button><button type="submit" class="button primary">Set PIN</button></div>
    </form>`;
}

function renderFamilySetupReview(draft) {
  const owner = `<article class="family-setup-member"><span class="family-setup-member-avatar owner">${icon("users")}</span><div class="family-setup-member-copy"><strong>${esc(state.currentUser.name || "Family Account Holder")}</strong><span>${esc(titleRole(userProfile?.role || "parent"))}  ·  Account Holder</span></div><span class="family-setup-row-chevron">${icon("chevron")}</span></article>`;
  const rows = draft.members.map((member, index) => `<article class="family-setup-member"><span class="family-setup-member-avatar tone-${index % 4}">${icon(member.role === "Student" ? "cap" : roleIcons[member.role] || "user")}</span><div class="family-setup-member-copy"><strong>${esc(member.name)}</strong><span>${esc(familySetupMemberDetail(member))}</span></div><button type="button" class="button lavender family-review-edit" data-action="family-setup-edit-member" data-index="${index}">Edit</button></article>`).join("");
  return `${familySetupTop("Review Family", "Make sure everything looks right before creating your family account.", 3)}
    <div class="family-setup-content">${familySetupSummary(draft)}<h2 class="family-setup-section-title">Family Members</h2><div class="family-setup-member-list review">${owner}${rows}</div>
    <div class="family-setup-footer"><button type="button" class="button outline" data-action="family-setup-back">Back</button><button type="button" class="button primary" data-action="family-setup-create" ${isBusy ? "disabled" : ""}>${isBusy ? "Creating…" : "Create Family"}</button></div></div>`;
}

function renderFamilySetup() {
  const draft = ensureFamilySetupDraft();
  const canCreate = ["Parent", "Admin"].includes(verifiedRole());
  if (!canCreate) return `<section class="page family-setup-page"><div class="family-setup-top"><button class="family-setup-back" data-action="family-setup-exit">${icon("back")}<span>Back</span></button><div class="family-setup-heading"><h1>Link a Family Account</h1><p>Sign in with your independent school account and enter the invitation code from your family account holder.</p></div></div><form id="family-link-form" class="family-setup-content family-link-panel"><label for="setup-family-code">Family invitation code</label><input id="setup-family-code" name="code" required autocomplete="one-time-code" placeholder="Paste your invitation code"><button class="button primary wide" type="submit">Link My Existing Account</button></form></section>`;
  let content = familySetupView === "members" ? renderFamilySetupMembers(draft)
    : familySetupView === "member" ? renderFamilySetupMember(draft)
      : familySetupView === "pin" ? renderFamilySetupPin(draft)
      : familySetupView === "review" ? renderFamilySetupReview(draft)
        : renderFamilySetupCreate(draft);
  return `<section class="page family-setup-page ${familySetupView === "create" ? "first-step" : ""}">${content}</section>`;
}

function renderAccountPicker() {
  const selectable = state.family.members.filter(canSelectFamilyMember);
  return `<section class="page account-picker-page">${brand()}<div class="page-title-row"><div><h1 class="page-title">Who is using Called to Communicate?</h1><p class="page-subtitle">Choose a family profile. Each profile has its own role, classes, messages, calendar, and settings.</p></div></div><div class="card card-list">${selectable.map((member) => `<button class="member-select ${state.activeMemberId === member.id ? "active" : ""}" data-action="switch-member" data-id="${esc(member.id)}">${avatar(member, "small")}<span class="member-copy"><b>${esc(member.name)}</b><span>${esc(roleDetail(member.role, member))}${["managed", "owner"].includes(member.accountType) ? ` · ${member.pinConfigured ? "PIN protected" : "PIN setup needed"}` : ""}</span></span>${icon(["managed", "owner"].includes(member.accountType) ? "shield" : "chevron")}</button>`).join("")}</div>${selectable.length === 1 ? `<button class="button primary wide" data-action="continue-account">Continue as ${esc(selectable[0].name)}</button>` : ""}<button class="button ghost wide" data-action="sign-out">Sign out</button></section>`;
}

function renderFamilyOwnerPin() {
  const owner = state.family.members.find((entry) => entry.id === authUser?.uid && entry.accountType === "owner");
  if (!owner) return `<section class="page account-picker-page pin-page">${brand()}<h1 class="page-title">Family account locked</h1><p class="page-subtitle">Loading the family account holder profile…</p><button class="button ghost wide" data-action="sign-out">Sign out</button></section>`;
  if (!owner.pinConfigured) return `<section class="page account-picker-page pin-page">${brand()}<div class="page-title-row"><div><h1 class="page-title">Set a family holder PIN</h1><p class="page-subtitle">Set a six-digit PIN to protect ${esc(owner.name)}’s family account profile. You’ll enter it when opening this profile.</p></div></div><form id="family-owner-pin-setup-form" data-member-id="${esc(owner.id)}" class="card pin-form"><div class="form-field"><label for="owner-pin-new">Six-digit PIN</label><input id="owner-pin-new" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required placeholder="Enter six digits"></div><div class="form-field"><label for="owner-pin-confirm">Confirm PIN</label><input id="owner-pin-confirm" name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required placeholder="Enter it again"></div><button class="button primary wide" type="submit">Save PIN and continue</button></form><button class="button ghost wide" data-action="sign-out">Sign out</button></section>`;
  return `<section class="page account-picker-page pin-page">${brand()}<div class="page-title-row"><div><h1 class="page-title">Enter ${esc(owner.name)}’s PIN</h1><p class="page-subtitle">Enter the six-digit family holder PIN to unlock this profile.</p></div></div><form id="family-owner-pin-form" data-member-id="${esc(owner.id)}" class="card pin-form pin-pad-card"><div class="pin-indicators" id="pin-indicators" role="status" aria-live="polite" aria-label="0 of 6 digits entered">${Array.from({ length: 6 }, (_, i) => `<span class="pin-indicator" data-pin-slot="${i}" aria-hidden="true"></span>`).join("")}</div><label class="pin-entry-label" for="subaccount-pin">Type your PIN or tap the numbers</label><input id="subaccount-pin" name="pin" class="pin-code-input" type="password" inputmode="none" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code" required placeholder="Six-digit PIN" aria-label="Six-digit PIN"><div class="number-pad" aria-label="PIN number pad">${[1,2,3,4,5,6,7,8,9].map((digit) => `<button class="number-pad-key" type="button" data-action="pin-key" data-value="${digit}" aria-label="${digit}">${digit}</button>`).join("")}<span class="number-pad-spacer" aria-hidden="true"></span><button class="number-pad-key" type="button" data-action="pin-key" data-value="0" aria-label="0">0</button><button class="number-pad-key number-pad-delete" type="button" data-action="pin-delete" aria-label="Delete last digit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 3 12l6 7h12V5H9Z"></path><path d="m13 9 5 6m0-6-5 6"></path></svg></button></div><button class="button primary wide pin-continue" type="submit" disabled>Unlock ${esc(owner.name)}’s profile</button></form><button class="button ghost wide" data-action="sign-out">Sign out</button></section>`;
}

function renderSubaccountPin() {
  const member = state.family.members.find((entry) => entry.id === state.pendingPinMemberId && entry.accountType === "managed");
  if (!member) return `<section class="page account-picker-page">${brand()}<h1 class="page-title">Subaccount unavailable</h1><button class="button primary wide" data-action="back-to-account-picker">Back to profiles</button></section>`;
  const pinLength = Number(member.pinLength) === 4 ? 4 : 6;
  return `<section class="page account-picker-page pin-page">${brand()}<button class="back-link" data-action="back-to-account-picker">${icon("back")} All profiles</button><div class="page-title-row"><div><h1 class="page-title">Enter ${esc(member.name)}’s PIN</h1><p class="page-subtitle">Enter their ${pinLength}-digit PIN to open this profile.</p></div></div><form id="subaccount-pin-form" data-member-id="${esc(member.id)}" data-pin-length="${pinLength}" class="card pin-form pin-pad-card"><div class="pin-indicators" id="pin-indicators" role="status" aria-live="polite" aria-label="0 of ${pinLength} digits entered">${Array.from({ length: pinLength }, (_, i) => `<span class="pin-indicator" data-pin-slot="${i}" aria-hidden="true"></span>`).join("")}</div><label class="pin-entry-label" for="subaccount-pin">Type your PIN or tap the numbers</label><input id="subaccount-pin" name="pin" class="pin-code-input" type="password" inputmode="none" pattern="[0-9]{${pinLength}}" minlength="${pinLength}" maxlength="${pinLength}" autocomplete="one-time-code" required placeholder="${pinLength}-digit PIN" aria-label="${pinLength}-digit PIN"><div class="number-pad" aria-label="PIN number pad">${[1,2,3,4,5,6,7,8,9].map((digit) => `<button class="number-pad-key" type="button" data-action="pin-key" data-value="${digit}" aria-label="${digit}">${digit}</button>`).join("")}<span class="number-pad-spacer" aria-hidden="true"></span><button class="number-pad-key" type="button" data-action="pin-key" data-value="0" aria-label="0">0</button><button class="number-pad-key number-pad-delete" type="button" data-action="pin-delete" aria-label="Delete last digit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 3 12l6 7h12V5H9Z"></path><path d="m13 9 5 6m0-6-5 6"></path></svg></button></div><button class="button primary wide pin-continue" type="submit" disabled>Continue as ${esc(member.name)}</button></form><button class="button ghost wide" data-action="sign-out">Sign out</button></section>`;
}

function renderAccount() {
  const members = state.family.members.filter((member) => member.accountType !== "linked" || member.linkedUid === authUser?.uid);
  return `<section class="page">${header({ action: "account" })}<div class="page-title-row"><div><h1 class="page-title">Account</h1><p class="page-subtitle">Switch family profile or role</p></div></div>
    <div class="card card-list">${members.map((member) => `<button class="member-select ${state.activeMemberId === member.id ? "active" : ""}" data-action="switch-member" data-id="${esc(member.id)}">${avatar(member, "small")}<span class="member-copy"><b>${esc(member.name)}</b><span>${esc(roleDetail(member.role, member))}</span></span>${state.activeMemberId === member.id ? icon("check") : icon("chevron")}</button>`).join("")}</div>
    ${!remoteMode ? `<p class="section-label">Preview another role</p><div class="role-cards">${roles.map((role) => `<button class="role-choice ${currentRole() === role ? "selected" : ""}" data-action="switch-role" data-role="${role}">${icon(roleIcons[role])}<span>${role}</span></button>`).join("")}</div>` : `<div class="notice-card"><strong>Family profile switching</strong>Managed profiles share the family login. Linked personal accounts keep their own credentials and private school data.</div>`}
    <button class="button ghost wide" data-action="tab" data-tab="settings">Back to Settings</button></section>`;
}

function detailSettings(key) {
  const titles = { profile: "Profile", security: "Account & Security", notifications: "Notifications", school: "School Information", tribe: "Tribe", classes: "Classes", admin: "Admin Controls", reports: "Reports", users: "User Management", app: "App Settings", appearance: "Appearance", language: "Language", accessibility: "Accessibility", help: "Help & Support", about: "About" };
  const title = titles[key] || "Settings";
  if (key === "profile") return `<form id="profile-form"><div class="form-field"><label>Full name</label><input name="name" value="${esc(state.currentUser.name)}" required></div><div class="form-field"><label>Email</label><input type="email" value="${esc(state.currentUser.email || "")}" disabled></div><div class="form-field"><label>Role</label><input value="${esc(currentRole())}" disabled></div><button class="button primary wide" type="submit">Save Profile</button></form>`;
  if (key === "notifications") return `<div class="card">${[["messages", "Messages", "Direct and group chat notifications"], ["announcements", "Announcements", "Important school updates"], ["events", "Calendar events", "Reminders about school events"]].map(([id, title, subtitle]) => `<label class="toggle-row"><span class="toggle-copy"><b>${title}</b><span>${subtitle}</span></span><input class="switch" type="checkbox" data-pref="${id}" ${state.notificationPrefs[id] ? "checked" : ""}></label>`).join("")}</div>`;
  if (key === "security") return `<div class="card card-list"><div class="list-item"><span class="item-icon">${icon("shield")}</span><span class="item-copy"><span class="item-title">Verified school access</span><span class="item-subtitle">${remoteMode ? esc(userProfile?.status || "Pending") : "Preview account"}</span></span></div><button class="list-item" data-action="change-password"><span class="item-icon">${icon("user")}</span><span class="item-copy"><span class="item-title">Password</span><span class="item-subtitle">Use account recovery to change your password</span></span>${icon("chevron", "row-chevron")}</button></div>`;
  if (key === "admin" || key === "users" || key === "reports" || key === "app") {
    const approvableRoles = isAdmin() ? roles : roles.filter((role) => role !== "Admin");
    const pending = state.pendingUsers.length ? state.pendingUsers.map((user) => {
      const requestedAdmin = String(user.requestedRole || "").toLowerCase() === "admin";
      const canApproveRequest = !requestedAdmin || isAdmin();
      return `<div class="list-item"><span class="item-icon">${icon("user")}</span><span class="item-copy"><span class="item-title">${esc(user.displayName || user.email || "New account")}</span><span class="item-subtitle">${esc(user.email || "No email")} · Requested ${esc(titleRole(user.requestedRole || "student"))}</span><span class="item-subtitle">${canApproveRequest ? "Assign role before approving access" : "Only an Admin can approve this request"}</span></span>${canApproveRequest ? `<select id="approve-role-${esc(user.id)}" class="compact-select" aria-label="Role for ${esc(user.displayName || "new account")}">${approvableRoles.map((role) => `<option value="${role.toLowerCase()}" ${role.toLowerCase() === String(user.requestedRole).toLowerCase() ? "selected" : ""}>${role}</option>`).join("")}</select><button class="button" data-action="approve-user" data-id="${esc(user.id)}">Approve</button>` : `<span class="item-subtitle">Pending Admin</span>`}</div>`;
    }).join("") : `<div class="empty-state">${icon("check")}<h3>No pending accounts</h3><p>New sign-ups will appear here for verification.</p></div>`;
    const staff = directory.filter((person) => ["teacher", "presidency", "admin"].includes(String(person.role || "").toLowerCase()));
    const staffControls = isAdmin() ? `<div class="section-heading"><h2>Staff roles</h2><span class="muted">Admin only</span></div><div class="card card-list">${staff.length ? staff.map((person) => `<div class="list-item"><span class="item-icon">${icon("user")}</span><span class="item-copy"><span class="item-title">${esc(person.displayName || "School member")}</span><span class="item-subtitle">Current role: ${esc(titleRole(person.role))}</span></span><select id="staff-role-${esc(person.id)}" class="compact-select" aria-label="New role for ${esc(person.displayName || "school member")}">${roles.map((role) => `<option value="${role.toLowerCase()}" ${role.toLowerCase() === String(person.role).toLowerCase() ? "selected" : ""}>${role}</option>`).join("")}</select><button class="button" data-action="change-user-role" data-id="${esc(person.id)}">Save</button></div>`).join("") : `<div class="empty-state"><h3>No staff accounts</h3><p>Approved teachers and administrators will appear here.</p></div>`}</div><div class="notice-card mt-12"><strong>Admin has the highest school role</strong>Admins can assign or remove Presidency and Admin access. Only another Admin can approve a new Admin request.</div>` : "";
    return `<div class="notice-card"><strong>${canAdmin() ? (isAdmin() ? "Admin controls" : "Presidency controls") : "Admin access required"}</strong>${canAdmin() ? (isAdmin() ? "Manage school access requests and staff role assignments. Admin is the highest school role." : "Review school access requests and manage school content. An Admin must approve Admin access and controls staff roles.") : "Only verified Presidency and Admin accounts can access school-wide administration."}</div>${canAdmin() ? `<div class="section-heading"><h2>Pending accounts</h2><span class="muted">${state.pendingUsers.length}</span></div><div class="card card-list">${pending}</div>${staffControls}<div class="card card-list mt-12"><button class="list-item" data-action="new-announcement">${icon("speaker")}<span class="item-copy"><span class="item-title">Create announcement</span><span class="item-subtitle">Send a message to the school community</span></span>${icon("chevron", "row-chevron")}</button><button class="list-item" data-action="create-event">${icon("calendar")}<span class="item-copy"><span class="item-title">Create school event</span><span class="item-subtitle">Add a deadline, meeting, or live class</span></span>${icon("chevron", "row-chevron")}</button></div>` : ""}`;
  }
  if (key === "school") return `<div class="card card-list"><div class="list-item"><span class="item-icon">${icon("home")}</span><span class="item-copy"><span class="item-title">Called to Learn Academy</span><span class="item-subtitle">School community</span></span></div><div class="list-item"><span class="item-icon">${icon("calendar")}</span><span class="item-copy"><span class="item-title">School calendar</span><span class="item-subtitle">Classes, meetings, and deadlines</span></span></div><div class="list-item"><span class="item-icon">${icon("message")}</span><span class="item-copy"><span class="item-title">School announcements</span><span class="item-subtitle">Shared with verified school accounts</span></span></div></div>`;
  if (key === "tribe") return `<div class="notice-card"><strong>${esc(state.family.tribe || "Lamanites")} Tribe</strong>Your tribe connects family members, classes, and school activities.</div>`;
  if (key === "classes") return `<p class="page-subtitle">Your class preferences and joined courses.</p><div class="card card-list">${state.classes.filter((item) => item.joined).map((item) => `<div class="list-item">${avatar(item, "small")}<span class="item-copy"><span class="item-title">${esc(item.name)}</span><span class="item-subtitle">${esc(item.teacher)}</span></span>${icon("check")}</div>`).join("")}</div>`;
  if (key === "appearance") return `<div class="card card-list"><button class="list-item" data-action="appearance" data-value="light">Light appearance ${state.appearance !== "dark" ? icon("check") : ""}</button><button class="list-item" data-action="appearance" data-value="dark">System default</button></div>`;
  if (key === "language") return `<div class="card list-item">English</div>`;
  if (key === "accessibility") return `<div class="card card-list"><label class="toggle-row"><span class="toggle-copy"><b>Reduce motion</b><span>Use calmer transitions</span></span><input class="switch" type="checkbox" data-pref="reduceMotion"></label><label class="toggle-row"><span class="toggle-copy"><b>High contrast</b><span>Increase text and control contrast</span></span><input class="switch" type="checkbox" data-pref="highContrast"></label></div>`;
  if (key === "help") return `<div class="notice-card"><strong>Need help?</strong>Contact the school office for account, class, or calendar support.</div><a class="button wide" href="mailto:schooloffice@calledtolearn.org">Email School Office</a>`;
  return `<div class="notice-card"><strong>Called to Communicate</strong>For Called to Learn Academy<br>Version 1.0 · Preview build</div>`;
}
function renderSettingsDetail() {
  const titleMap = { profile: "Profile", security: "Account & Security", notifications: "Notifications", school: "School Information", tribe: "Tribe", classes: "Classes", admin: "Admin Controls", reports: "Reports", users: "User Management", app: "App Settings", appearance: "Appearance", language: "Language", accessibility: "Accessibility", help: "Help & Support", about: "About" };
  const key = state.settingsDetail;
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="tab" data-tab="settings">${icon("back")} Settings</button><div class="page-title-row"><div><h1 class="page-title">${esc(titleMap[key] || "Settings")}</h1></div></div>${detailSettings(key)}</section>`;
}

function renderNewMessage() {
  const query = (state.search || "").toLowerCase();
  const recipients = directory.length ? directory.map((person) => ({ ...person, id: person.id, name: person.displayName || person.name || "School member", role: titleRole(person.role || "student"), kind: person.kind || "person", color: person.color || "blue" })) : state.people;
  const typeFilter = state.newMessageFilter;
  const existingConversation = state.addingToConversationId ? state.conversations.find((item) => item.id === state.addingToConversationId) : null;
  const existingUids = new Set(existingConversation?.memberUids || []);
  const existingNames = new Set((existingConversation?.members || existingConversation?.memberNames || []).map((name) => String(name).toLowerCase()));
  const filtered = recipients.filter((person) => (!state.addingToConversationId || (!existingUids.has(person.id) && !existingNames.has(String(person.name).toLowerCase()))) && (!query || `${person.name} ${person.role}`.toLowerCase().includes(query)) && (typeFilter === "All" || (typeFilter === "People" && ["person", undefined].includes(person.kind)) || (typeFilter === "Classes" && person.kind === "class") || (typeFilter === "Groups" && person.kind === "group") || (typeFilter === "Tribes" && person.kind === "tribe")));
  const selected = new Set(state.selectedPersonIds);
  const suggested = filtered.slice(0, 4);
  const addingMembers = Boolean(state.addingToConversationId);
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="back">${icon("back")} Back</button><div class="page-title-row"><div><h1 class="page-title">${addingMembers ? "Add Members" : "New Message"}</h1><p class="page-subtitle">${addingMembers ? `Choose people to add to ${esc(activeConversation().title)}.` : "Start a new conversation"}</p></div></div>
    <label class="search-field">${icon("search")}<input id="new-search" type="search" value="${esc(state.search)}" placeholder="Search people, classes, or groups…" aria-label="Search recipients"></label>
    <div class="filter-row">${["All", "People", "Classes", "Groups", "Tribes"].map((filter) => `<button class="filter-chip ${typeFilter === filter ? "active" : ""}" data-action="new-filter" data-filter="${filter}">${filter}</button>`).join("")}</div>
    <div class="section-heading"><h2>Suggested</h2><button class="button" data-action="new-filter" data-filter="All">See All</button></div><div class="suggested-grid">${suggested.map((person) => `<button class="suggested-card" data-action="select-person" data-id="${esc(person.id)}">${avatar(person, "") }<b>${esc(person.name)}</b><span>${esc(person.role || "School member")}</span></button>`).join("")}</div>
    <div class="section-heading"><h2>${typeFilter === "All" ? "People" : typeFilter}</h2><span class="muted">${filtered.length} results</span></div><div class="card card-list">${filtered.length ? filtered.map((person) => `<div class="person-row ${selected.has(person.id) ? "selected" : ""}" data-action="select-person" data-id="${esc(person.id)}">${avatar(person, "small")}<span class="person-copy"><b>${esc(person.name)}</b><span>${esc(person.role || "School member")}</span></span><span class="select-circle"></span></div>`).join("") : `<div class="empty-state">No school contacts found.</div>`}</div>
    <div class="sticky-action"><button class="button primary wide" data-action="start-chat" ${selected.size === 0 ? "disabled" : ""}>${icon(addingMembers ? "users" : "message")}${addingMembers ? "Add Members" : "Start Chat"}${selected.size ? ` · ${selected.size}` : ""}</button></div></section>`;
}

function activeConversation() { return state.conversations.find((item) => item.id === state.activeConversationId) || { id: state.activeConversationId, title: "Conversation", kind: "direct", members: [] }; }
function canAddConversationMembers(conversation) {
  if (!remoteMode) return true;
  const memberProfiles = Array.isArray(conversation.memberProfileIds) ? conversation.memberProfileIds : conversation.memberUids || [];
  if (!authUser || !memberProfiles.includes(activeIdentityId())) return false;
  if (conversation.kind === "announcement") return canAdmin();
  if (conversation.kind === "class") {
    const classRecord = state.classes.find((item) => item.id === conversation.classId);
    return canAdmin() || (verifiedRole() === "Teacher" && classRecord?.teacherUid === authUser.uid);
  }
  return true;
}
function renderChat() {
  const conversation = activeConversation();
  const messages = state.messages[conversation.id] || [];
  const memberCount = conversation.memberCount || conversation.members?.length || 2;
  return `<section class="page chat-page"><header class="chat-header"><button class="round-button" data-action="back" aria-label="Back">${icon("back")}</button>${avatar(conversation, "") }<div class="chat-ident"><h1>${esc(conversation.title)}</h1><p>${conversation.kind === "class" ? `${icon("users")} ${memberCount} members` : conversation.kind === "group" ? `${memberCount} members` : conversation.kind === "announcement" ? "Called to Learn Academy" : "Active now"}</p></div><button class="round-button" data-action="call" aria-label="Call">${icon("phone")}</button><button class="round-button" data-action="edit-chat" aria-label="Chat options">${icon("more")}</button></header>
    <div class="chat-messages" id="chat-messages"><div class="date-pill">${formatDate(todayKey)}</div>${messages.map(messageBubble).join("")}</div>
    <form class="chat-compose" id="message-form"><button class="send-button" type="button" data-action="attach" aria-label="Add attachment">${icon("plus")}</button><div class="compose-input"><input name="text" id="message-text" autocomplete="off" placeholder="Type a message…" aria-label="Type a message"><button class="compose-action" type="button" data-action="choose-image" aria-label="Choose image">${icon("image")}</button><button class="compose-action" type="button" data-action="attach" aria-label="Attach file">${icon("paperclip")}</button></div><button class="send-button" type="submit" aria-label="Send message">${icon("send")}</button></form>
  </section>`;
}
function messageBubble(message) {
  const mine = message.mine || (authUser && message.senderUid === authUser.uid);
  const name = message.senderName || message.sender || "School member";
  const at = message.createdAt ? timeLabel(timestampToDate(message.createdAt)) : (message.time || "Now");
  const initials = message.senderInitials || name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
  const safeAttachmentURL = safeExternalURL(message.attachmentUrl || "");
  const attachmentAction = message.attachmentPath ? `<button class="compose-action" data-action="download-attachment" data-path="${esc(message.attachmentPath)}" data-name="${esc(message.attachmentName)}" data-type="${esc(message.attachmentType || "application/octet-stream")}" aria-label="Download attachment">${icon("download")}</button>` : safeAttachmentURL ? `<a class="compose-action" href="${esc(safeAttachmentURL)}" target="_blank" rel="noopener" aria-label="Download attachment">${icon("download")}</a>` : `<span class="compose-action muted" aria-label="Preview attachment">${icon("download")}</span>`;
  const attachment = message.attachmentName ? `<div class="file-pill"><span class="pdf">${message.attachmentType?.startsWith("image/") ? "IMG" : "FILE"}</span><span style="flex:1;min-width:0"><b>${esc(message.attachmentName)}</b><br><span class="muted">${esc(message.attachmentSize || "Attachment")}</span></span>${attachmentAction}</div>` : "";
  return `<article class="message-group ${mine ? "mine" : ""}">${!mine ? avatar({ name, initials, color: message.color || "purple" }, "small") : ""}<div class="message-content">${!mine ? `<span class="sender-name">${esc(name)}</span>` : ""}<div class="message-bubble">${esc(message.text || "")}${attachment}</div><div class="message-meta">${esc(at)}${mine ? `<span class="read-check">✓✓</span>` : ""}</div></div></article>`;
}

function renderClassDetail() {
  const item = state.classes.find((entry) => entry.id === state.activeClassId) || state.classes[0];
  const joined = Boolean(item.joined);
  const requested = state.joinedRequests.includes(item.id);
  const canReview = remoteMode ? canAdmin() || (verifiedRole() === "Teacher" && item.teacherUid === authUser?.uid) : canManageSchool();
  const requests = canReview ? `<div class="section-heading"><h2>Join Requests (${state.classJoinRequests.length})</h2></div><div class="card card-list">${state.classJoinRequests.length ? state.classJoinRequests.map((joinRequest) => `<div class="list-item">${avatar({ name: joinRequest.displayName, color: "blue" }, "small")}<span class="item-copy"><span class="item-title">${esc(joinRequest.displayName || "School member")}</span><span class="item-subtitle">Enrollment request</span></span><button class="button" data-action="respond-join" data-user-id="${esc(joinRequest.id)}" data-approve="true">Approve</button><button class="button ghost" data-action="respond-join" data-user-id="${esc(joinRequest.id)}" data-approve="false">Decline</button></div>`).join("") : `<div class="empty-state">No pending requests.</div>`}</div>` : "";
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="tab" data-tab="classes">${icon("back")} Classes</button><div class="card" style="padding:18px;margin-top:12px">${avatar(item, "square")}<h1 class="page-title" style="margin-top:15px">${esc(item.name)}</h1><p class="page-subtitle">${esc(item.teacher)} · ${item.memberCount || item.members || 1} members</p><p class="page-subtitle">${esc(item.note || item.description || "Class updates and resources")}</p><button class="button ${joined ? "ghost" : "primary"} wide mt-12" data-action="join-class-action" data-id="${esc(item.id)}" ${requested ? "disabled" : ""}>${joined ? "Open Class Chat" : requested ? "Request Sent" : item.openEnrollment ? "Join Class" : "Request to Join"}</button></div>${requests}<div class="section-heading"><h2>Class resources</h2></div><div class="card card-list"><div class="list-item">${icon("book")}<span class="item-copy"><span class="item-title">Course materials</span><span class="item-subtitle">Assignments and class documents</span></span>${icon("chevron")}</div><div class="list-item">${icon("calendar")}<span class="item-copy"><span class="item-title">Upcoming class</span><span class="item-subtitle">See the calendar for live lessons</span></span>${icon("chevron")}</div></div></section>`;
}

function openClassDetail(id) {
  state.activeClassId = id;
  state.classJoinRequests = [];
  joinRequestsUnsubscribe?.();
  joinRequestsUnsubscribe = null;
  const item = state.classes.find((entry) => entry.id === id);
  const canReview = remoteMode ? canAdmin() || (verifiedRole() === "Teacher" && item?.teacherUid === authUser?.uid) : canManageSchool();
  if (backend?.enabled && authUser && canReview) {
    joinRequestsUnsubscribe = backend.subscribeJoinRequests(id, (requests) => {
      state.classJoinRequests = requests;
      if (state.page === "class-detail" && state.activeClassId === id) render();
    }, (error) => showListenerError("Class join requests", error));
  }
  state.page = "class-detail";
  render();
}

function renderEventDetail() {
  const event = state.events.find((entry) => entry.id === state.activeEventId) || state.events[0];
  const external = safeExternalURL(event.link || "");
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="tab" data-tab="calendar">${icon("back")} Calendar</button><div class="card" style="padding:18px;margin-top:12px"><span class="section-label">${esc(event.kind === "live" ? "Live Class" : event.kind === "meeting" ? "Meeting" : event.kind === "deadline" ? "Deadline" : "School Event")}</span><h1 class="page-title">${esc(event.title)}</h1><p class="page-subtitle">${esc(formatDate(event.date))} · ${esc(event.time)}</p><p class="page-subtitle">${esc(event.detail)}</p>${external ? `<a class="button primary wide mt-12" href="${esc(external)}" target="_blank" rel="noopener">${icon("camera")}Join live class</a>` : ""}</div></section>`;
}

function renderCreateEvent() {
  if (!canManageSchool()) return `<section class="page">${header({ action: "account" })}<div class="notice-card"><strong>School staff access only</strong>Teachers, Presidency, and Admin can create school calendar events.</div></section>`;
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="tab" data-tab="calendar">${icon("back")} Calendar</button><div class="page-title-row"><div><h1 class="page-title">New School Event</h1><p class="page-subtitle">Add a class, meeting, deadline, or event.</p></div></div><form id="event-form" class="card" style="padding:16px"><div class="form-field"><label>Event title</label><input name="title" required placeholder="Event title"></div><div class="form-field"><label>Date</label><input name="date" type="date" value="${esc(state.selectedDate)}" required></div><div class="form-field"><label>Time</label><input name="time" type="time" value="09:00" required></div><div class="form-field"><label>Type</label><select name="kind"><option value="live">Live Class</option><option value="meeting">Meeting</option><option value="event">Event</option><option value="deadline">Deadline</option></select></div><div class="form-field"><label>Details or Zoom link</label><input name="detail" placeholder="Room, class, or meeting info"><input name="link" type="url" placeholder="https://zoom.us/…"></div><button class="button primary wide" type="submit">Save Event</button></form></section>`;
}

function renderCreatePersonalEvent() {
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="tab" data-tab="calendar">${icon("back")} Calendar</button><div class="page-title-row"><div><h1 class="page-title">Personal Calendar Item</h1><p class="page-subtitle">Only ${esc(state.currentUser.name)}’s profile and its family manager can view this item.</p></div></div><form id="personal-event-form" class="card" style="padding:16px"><div class="form-field"><label>Title</label><input name="title" required maxlength="120" placeholder="Homework, appointment, reminder"></div><div class="form-field"><label>Date</label><input name="date" type="date" value="${esc(state.selectedDate)}" required></div><div class="form-field"><label>Time</label><input name="time" type="time" value="09:00" required></div><div class="form-field"><label>Type</label><select name="kind"><option value="event">Event</option><option value="deadline">Deadline</option><option value="meeting">Meeting</option></select></div><div class="form-field"><label>Details</label><input name="detail" maxlength="400" placeholder="Optional notes"></div><button class="button primary wide" type="submit">Save to This Profile</button></form></section>`;
}

function renderCreateClass() {
  if (!canManageSchool()) return `<section class="page">${header({ action: "account" })}<div class="notice-card"><strong>Teacher access required</strong>Verified teachers, Presidency, and Admin can create classes.</div></section>`;
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="tab" data-tab="classes">${icon("back")} Classes</button><div class="page-title-row"><div><h1 class="page-title">Create Class</h1><p class="page-subtitle">Set up a course and its enrollment.</p></div></div><form id="class-form" class="card" style="padding:16px"><div class="form-field"><label>Class name</label><input name="name" required placeholder="e.g. Math 6A"></div><div class="form-field"><label>Teacher</label><input name="teacher" required value="${esc(state.currentUser.name)}"></div><div class="form-field"><label>Description</label><textarea name="description" maxlength="400" placeholder="Share what students will learn"></textarea></div><div class="form-field"><label>Enrollment</label><select name="openEnrollment"><option value="false">Approval required</option><option value="true">Open enrollment</option></select></div><button class="button primary wide" type="submit">Create Class</button></form></section>`;
}

function renderCreateAnnouncement() {
  if (!canAdmin()) return `<section class="page">${header({ action: "account" })}<div class="notice-card"><strong>School administrator access required</strong>Only verified Presidency or Admin accounts can publish a school-wide announcement.</div></section>`;
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="settings-detail" data-key="admin">${icon("back")} Admin Controls</button><div class="page-title-row"><div><h1 class="page-title">New Announcement</h1><p class="page-subtitle">Share an update with the school.</p></div></div><form id="announcement-form" class="card" style="padding:16px"><div class="form-field"><label>Announcement title</label><input name="title" required maxlength="100" placeholder="School announcement"></div><div class="form-field"><label>Message</label><textarea name="text" required maxlength="5000" placeholder="Write your announcement"></textarea></div><div class="notice-card">This announcement will be visible to approved Called to Learn Academy accounts.</div><button class="button primary wide" type="submit">Publish Announcement</button></form></section>`;
}

function renderEditChat() {
  const conversation = activeConversation();
  const authoredByIdentity = conversation.createdByIdentityId
    ? conversation.createdByIdentityId === activeIdentityId()
    : conversation.createdBy === authUser?.uid && activeIdentityId() === authUser?.uid;
  const canEdit = !remoteMode || authoredByIdentity || canManageSchool();
  const canDelete = !remoteMode || authoredByIdentity || canAdmin();
  const canAddMembers = canAddConversationMembers(conversation);
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="back">${icon("back")} Back</button><div class="page-title-row"><div><h1 class="page-title">Edit Chat</h1></div></div>
    <form id="edit-chat-form" class="card" style="padding:16px"><div class="form-field"><label>Chat name</label><input name="title" value="${esc(conversation.title)}" required maxlength="60" ${canEdit ? "" : "disabled"}></div><div class="form-field"><label>Description (optional)</label><textarea name="description" maxlength="100" ${canEdit ? "" : "disabled"}>${esc(conversation.description || "")}</textarea><span class="item-subtitle">${canEdit ? "100 character maximum" : "Only the conversation creator or school staff can edit chat details."}</span></div>${canEdit ? `<button class="button primary wide" type="submit">Save Changes</button>` : ""}</form>
    <div class="section-heading"><h2>Members (${conversation.memberCount || conversation.members?.length || 1})</h2></div><div class="card card-list">${(conversation.members || []).map((name) => `<div class="list-item">${avatar({ name, color: "blue" }, "small")}<span class="item-copy"><span class="item-title">${esc(name)}</span></span></div>`).join("")}${canAddMembers ? `<button class="list-item" data-action="add-members">${icon("plus")}<span class="item-title">Add Members</span>${icon("chevron")}</button>` : ""}</div>
    <div class="section-heading"><h2>Chat Settings</h2></div><div class="card"><label class="toggle-row"><span class="item-icon">${icon("bell")}</span><span class="toggle-copy"><b>Notifications</b><span>All messages</span></span><input class="switch" type="checkbox" data-pref="chatNotifications" ${state.notifications ? "checked" : ""}></label><label class="toggle-row"><span class="item-icon">${icon("message")}</span><span class="toggle-copy"><b>Pin Chat</b><span>Keep this chat at the top</span></span><input class="switch" type="checkbox" data-pref="pinChat" ${state.pinnedConversationIds?.includes(conversation.id) ? "checked" : ""}></label><button class="list-item" data-action="leave-chat">${icon("back")}<span class="item-title">Leave Chat</span>${icon("chevron")}</button></div>
    ${canDelete ? `<button class="button danger mt-12" data-action="delete-chat">${icon("back")}Delete Chat</button>` : ""}</section>`;
}

function renderLoginPage() { render(); }

function openChat(id) {
  state.activeConversationId = id;
  state.page = "chat";
  state.search = "";
  const sessionRevision = authSessionRevision;
  const uid = authUser?.uid;
  const identityId = activeIdentityId();
  const conversation = state.conversations.find((item) => item.id === id);
  if (conversation) conversation.unread = 0;
  if (messageUnsubscribe) messageUnsubscribe();
  if (backend?.enabled && authUser) {
    messageUnsubscribe = backend.subscribeMessages(id, (messages) => {
      if (sessionRevision !== authSessionRevision || authUser?.uid !== uid || activeIdentityId() !== identityId) return;
      state.messages[id] = messages.map((message) => ({
        ...message, sender: message.senderName, mine: (message.senderProfileId || message.senderUid) === identityId,
        time: timeLabel(timestampToDate(message.createdAt)), senderInitials: (message.senderName || "CT").split(/\s+/).map((part) => part[0]).slice(0, 2).join("")
      }));
      persist();
      if (state.page === "chat" && state.activeConversationId === id) render();
    }, (error) => { if (sessionRevision === authSessionRevision && authUser?.uid === uid && activeIdentityId() === identityId) showListenerError("Messages", error); });
  }
  persist(); render();
}

function stopListeners() {
  [messageUnsubscribe, conversationUnsubscribe, classesUnsubscribe, eventsUnsubscribe, identityProfileUnsubscribe, directoryUnsubscribe, familyUnsubscribe, familyMembersUnsubscribe, pendingUsersUnsubscribe, joinRequestsUnsubscribe].forEach((unsubscribe) => unsubscribe?.());
  messageUnsubscribe = conversationUnsubscribe = classesUnsubscribe = eventsUnsubscribe = identityProfileUnsubscribe = directoryUnsubscribe = familyUnsubscribe = familyMembersUnsubscribe = pendingUsersUnsubscribe = joinRequestsUnsubscribe = null;
}
function connectDataListeners(sessionRevision = authSessionRevision) {
  if (!backend?.enabled || !authUser) return;
  const uid = authUser.uid;
  const identityId = activeIdentityId();
  const scopeRevision = ++dataScopeRevision;
  const isCurrentScope = () => sessionRevision === authSessionRevision
    && scopeRevision === dataScopeRevision
    && authUser?.uid === uid
    && activeIdentityId() === identityId;
  stopListeners();
  state.conversations = [];
  state.messages = {};
  state.activeConversationId = null;
  state.classes = [];
  state.events = [];
  if (!familyOwnerLocked) {
  identityProfileUnsubscribe = backend.subscribeIdentityProfile(identityId, (profile) => {
    if (!isCurrentScope()) return;
    if (!profile) return;
    const memberPrefs = profile.settings?.notificationPrefs || {};
    const accountPrefs = identityId === uid ? userProfile?.notificationPrefs || {} : {};
    state.notificationPrefs = { messages: true, announcements: true, events: true, ...accountPrefs, ...memberPrefs };
    if (state.page === "settings-detail" && state.settingsDetail === "notifications") render();
  }, (error) => { if (isCurrentScope()) showListenerError("Profile settings", error); });
  const allowLegacyConversationLookup = !familyLink && !userProfile?.familyId;
  conversationUnsubscribe = backend.subscribeConversations(uid, identityId, (items) => {
    if (!isCurrentScope()) return;
    state.conversations = items.map((item) => ({
      ...item,
      title: item.title || item.memberNames?.filter((name) => name !== state.currentUser.name).join(", ") || "Conversation",
      kind: item.kind || "group", preview: item.lastMessage?.text || "Start a conversation",
      time: timeLabel(timestampToDate(item.updatedAt)), unread: 0,
      color: item.color || "purple", members: item.memberNames || []
    }));
    persist(); if (state.page !== "chat") render();
  }, (error) => { if (isCurrentScope()) showListenerError("Conversation list", error); }, allowLegacyConversationLookup);
  classesUnsubscribe = backend.subscribeClasses(SCHOOL_ID, (items) => {
    if (!isCurrentScope()) return;
    state.classes = items.map((item) => ({ ...item, joined: Array.isArray(item.memberProfileIds) ? item.memberProfileIds.includes(identityId) : item.memberUids?.includes(uid) || false, color: item.color || "purple", note: item.description || "Class updates and resources" }));
    persist(); if (state.activeTab === "classes" || state.page === "class-detail") render();
  }, (error) => { if (isCurrentScope()) showListenerError("Classes", error); });
  eventsUnsubscribe = backend.subscribeEvents(SCHOOL_ID, identityId, (items) => {
    if (!isCurrentScope()) return;
    state.events = items.map((item) => ({ ...item, date: item.date, time: item.time, color: item.color || "purple" }));
    persist(); if (state.activeTab === "calendar") render();
  }, (error) => { if (isCurrentScope()) showListenerError("Calendar", error); });
  directoryUnsubscribe = backend.subscribeDirectory(SCHOOL_ID, (items) => {
    if (!isCurrentScope()) return;
    directory = items;
    if (state.page === "new-message" || (state.page === "settings-detail" && state.settingsDetail === "admin")) render();
  }, (error) => { if (isCurrentScope()) showListenerError("School directory", error); });
  }
  if (activeFamilyId) {
    familyUnsubscribe = backend.subscribeFamily(activeFamilyId, (family) => {
      if (!isCurrentScope()) return;
      if (family) {
        state.family = {
          ...state.family,
          name: family.name || "Family Account",
          tribe: family.tribe || "Lamanites",
          description: family.description || "",
          allowLinkedAccounts: family.allowLinkedAccounts !== false,
          requireChildPin: family.requireChildPin !== false
        };
        persist(); if (["family", "account", "family-owner-pin"].includes(state.page)) render();
      }
    }, (error) => { if (isCurrentScope()) showListenerError("Family account", error); });
    const canListFamilyMembers = familyLink?.accountType === "owner" && identityId === uid;
    if (familyLink?.accountType === "linked" || canListFamilyMembers) {
      familyMembersUnsubscribe = backend.subscribeFamilyMembers(activeFamilyId, uid, canListFamilyMembers, (members) => {
      if (!isCurrentScope()) return;
      if (canListFamilyMembers) {
        members.filter((member) => member.settings && Object.keys(member.settings).length)
          .forEach((member) => backend.clearLegacyMemberSettings(activeFamilyId, member.memberId || member.id).catch(() => {}));
      }
      state.family.members = members.filter((member) => member.status !== "archived").map((member) => {
        const { settings, ...publicMember } = member;
        return {
        ...publicMember, id: member.memberId || member.uid || member.id, role: titleRole(member.role), note: member.grade || "",
        color: member.color || "blue", accountType: member.accountType || (member.uid === authUser.uid ? "owner" : "linked"),
        linkedUid: member.linkedUid || ((member.accountType || (member.uid === authUser.uid ? "owner" : "linked")) === "linked" ? member.uid : null),
        initials: (member.name || "CT").split(/\s+/).map((word) => word[0]).slice(0, 2).join("")
      };});
      if (!state.family.members.some((member) => member.id === state.activeMemberId)) {
        state.activeMemberId = familyLink?.accountType === "linked" ? authUser.uid : (userProfile?.activeMemberId || authUser.uid);
      }
      applyActiveMember();
      if (promptAccountPickerAfterFamilyLoad) {
        if (!familyOwnerLocked) {
          promptAccountPickerAfterFamilyLoad = false;
          if (familyLink?.accountType === "owner" && state.family.members.filter(canSelectFamilyMember).length > 1) state.page = "account-picker";
        }
      }
      if (familyOwnerLocked) state.page = "family-owner-pin";
      persist(); if (["family", "account", "account-picker", "family-owner-pin"].includes(state.page)) render();
      }, (error) => { if (isCurrentScope()) showListenerError("Family members", error); });
    }
  }
  if (!familyOwnerLocked && canAdmin()) {
    pendingUsersUnsubscribe = backend.subscribePendingUsers((users) => {
      if (!isCurrentScope()) return;
      state.pendingUsers = users.filter((user) => user.schoolId === SCHOOL_ID);
      persist(); if (state.page === "settings-detail" && ["admin", "users"].includes(state.settingsDetail)) render();
    }, (error) => { if (isCurrentScope()) showListenerError("Pending accounts", error); });
  }
}

async function handleAuthUser(user, revision = null, force = false) {
  const uid = user?.uid || null;
  const loadKey = uid || "__signed-out__";
  if (revision === null) {
    if (!force && authInitialized && authUser?.uid === uid) return;
    if (!force && !authInitialized && authLoadForUid === loadKey) return;
    revision = ++authSessionRevision;
  }
  if (!backend?.enabled || revision !== authSessionRevision) return;
  if (!force && authInitialized && authUser?.uid === uid) return;
  if (!force && !authInitialized && authLoadForUid === loadKey) return;

  authLoadForUid = loadKey;
  authInitialized = false;
  authAccountReady = false;
  remoteMode = true;
  authUser = user || null;
  userProfile = null;
  familyLink = null;
  activeFamilyId = null;
  familyOwnerLocked = false;
  directory = [];
  promptAccountPickerAfterFamilyLoad = false;
  stopListeners();
  state.isDemoSignedIn = false;
  state.error = "";
  state.family = { name: "Family Account", tribe: "Lamanites", description: "", allowLinkedAccounts: true, requireChildPin: true, members: [] };
  state.conversations = []; state.messages = {}; state.activeConversationId = null;
  state.classes = []; state.events = []; state.pendingUsers = [];
  state.joinedRequests = []; state.classJoinRequests = []; state.selectedPersonIds = []; state.pinnedConversationIds = [];
  state.notificationPrefs = { messages: true, announcements: true, events: true };
  state.currentUser = {
    name: user?.displayName || "School member", email: user?.email || "",
    role: "Student", color: "blue",
    initials: (user?.displayName || "CT").split(/\s+/).map((part) => part[0]).slice(0, 2).join("")
  };
  state.activeMemberId = uid || "";
  state.page = "home";
  if (!user) {
    authInitialized = true;
    authLoadForUid = null;
    persist(); render(); return;
  }
  const isCurrentLoad = () => revision === authSessionRevision && authUser?.uid === uid;
  render();
  try {
    const profile = await backend.getUserProfile(uid);
    if (!isCurrentLoad()) return;
    userProfile = profile;
    if (!profile) {
      state.error = "This Firebase sign-in has no school account profile. Sign out and create an account, or ask a school Admin to review it.";
    } else if (profile.status === "active") {
      familyLink = await backend.getFamilyLink(uid);
      if (!isCurrentLoad()) return;
      if (!familyLink && profile.familyId) familyLink = await backend.getOwnerFamilyLink(uid, profile.familyId);
      if (!isCurrentLoad()) return;

      await backend.ensureIdentityProfile(uid, profile, familyLink);
      if (!isCurrentLoad()) return;
      let restoredIdentityId = familyLink?.accountType === "linked" ? (familyLink.memberId || uid) : uid;
      if (familyLink?.accountType !== "linked" && profile.activeMemberId !== uid) {
        // A family login always returns to the account holder. Managed profiles must
        // enter their PIN again after a fresh sign-in or page reload.
        await backend.setActiveMember(uid, uid);
        if (!isCurrentLoad()) return;
        profile.activeMemberId = uid;
      }
      activeFamilyId = familyLink?.status === "active" ? familyLink.familyId : null;
      promptAccountPickerAfterFamilyLoad = familyLink?.accountType === "owner";
      familyOwnerLocked = familyLink?.accountType === "owner";
      state.currentUser = {
        name: profile.displayName || user.displayName || "School member", email: user.email || "",
        role: titleRole(profile.role), color: "blue",
        initials: (profile.displayName || user.displayName || "CT").split(/\s+/).map((part) => part[0]).slice(0, 2).join("")
      };
      state.notificationPrefs = { messages: true, announcements: true, events: true, ...(profile.notificationPrefs || {}) };
      state.activeMemberId = restoredIdentityId;
      state.page = familyOwnerLocked ? "family-owner-pin"
        : !familyLink && profile.requestedFamilyAccount === true && String(profile.role).toLowerCase() === "parent"
          ? "family" : "home";
      authAccountReady = true;
      connectDataListeners(revision);
    }
  } catch (error) {
    if (!isCurrentLoad()) return;
    userProfile = null;
    authAccountReady = false;
    state.error = authMessage(error);
  }
  if (!isCurrentLoad()) return;
  authInitialized = true;
  authLoadForUid = null;
  persist(); render();
}

function localSwitchToMember(member) {
  state.activeMemberId = member.id;
  state.currentUser = { ...state.currentUser, name: member.name, email: member.id === authUser?.uid ? authUser.email : state.currentUser.email, role: titleRole(member.role), color: member.color || "blue", initials: member.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("") };
  state.notificationPrefs = { messages: true, announcements: true, events: true };
}

function applyActiveMember() {
  const member = activeFamilyMember();
  if (!member) return;
  state.currentUser = { ...state.currentUser, name: member.name || state.currentUser.name, role: titleRole(member.role), color: member.color || "blue", initials: member.initials || member.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("") };
  state.notificationPrefs = { messages: true, announcements: true, events: true };
}

async function submitMessage(form) {
  const input = $("[name=text]", form);
  const text = input.value.trim();
  if (!text || isBusy) return;
  const conversation = activeConversation();
  const message = {
    senderName: state.currentUser.name, senderUid: authUser?.uid || "demo", senderProfileId: activeIdentityId(), text,
    mine: true, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    senderInitials: state.currentUser.initials || "ES"
  };
  input.value = "";
  if (backend?.enabled && authUser) {
    try { await backend.sendMessage(conversation.id, message); }
    catch (error) { showFirebaseError("Send message", error); input.value = text; }
  } else {
    (state.messages[conversation.id] ||= []).push(message);
    conversation.preview = text; conversation.time = "Now";
    state.conversations = [conversation, ...state.conversations.filter((entry) => entry.id !== conversation.id)];
    persist(); render();
  }
}

async function createConversation() {
  const people = (directory.length ? directory : state.people)
    .filter((person) => state.selectedPersonIds.includes(person.id))
    .map((person) => ({
      ...person,
      name: person.displayName || person.name || "School member",
      color: person.color || "blue"
    }));
  if (!people.length) return;
  if (state.addingToConversationId) {
    const conversationId = state.addingToConversationId;
    const conversation = state.conversations.find((item) => item.id === conversationId) || activeConversation();
    if (!canAddConversationMembers(conversation)) {
      showToast("You do not have permission to add members to this conversation.");
      return;
    }
    try {
      if (backend?.enabled && authUser) await backend.addConversationMembers(conversationId, activeIdentityId(), people.map((person) => person.id), people.map((person) => person.name));
      else {
        const existingNames = (conversation.members || conversation.memberNames || []).map((name) => name === "You" ? state.currentUser.name : name);
        conversation.members = [...new Set([...existingNames, state.currentUser.name, ...people.map((person) => person.name)])];
        conversation.memberNames = conversation.members;
        conversation.memberUids = [...new Set([...(conversation.memberUids || []), state.activeMemberId, ...people.map((person) => person.id)].filter(Boolean))];
        conversation.memberCount = conversation.members.length;
        if (conversation.kind === "direct" && conversation.memberCount > 2) conversation.kind = "group";
        persist();
      }
      state.selectedPersonIds = [];
      state.addingToConversationId = null;
      openChat(conversationId);
      showToast(`${people.length} ${people.length === 1 ? "member" : "members"} added.`);
    } catch (error) { showFirebaseError("Add chat members", error); }
    return;
  }
  const names = people.map((person) => person.name);
  const one = people.length === 1;
  const classChat = one && people[0].kind === "class";
  if (classChat && backend?.enabled) {
    const existing = state.conversations.find((conversation) => conversation.classId === people[0].id || conversation.id === people[0].id);
    if (existing) openChat(existing.id);
    else showToast("Your teacher will create the class chat when the class is ready.");
    return;
  }
  const conversation = {
    title: classChat ? people[0].name : names.join(", "),
    kind: classChat ? "class" : one ? "direct" : "group",
    memberUids: [...new Set([authUser?.uid, ...people.map((person) => person.id)].filter(Boolean))],
    memberProfileIds: [...new Set([activeIdentityId(), ...people.map((person) => person.id)].filter(Boolean))],
    memberNames: [...new Set([state.currentUser.name, ...names])],
    createdBy: authUser?.uid || "demo", createdByIdentityId: activeIdentityId(), createdByRole: currentRole(),
    memberCount: people.length + 1, preview: "Start a conversation", color: one ? people[0].color : "purple", members: [...new Set([state.currentUser.name, ...names])]
  };
  try {
    if (backend?.enabled && authUser) {
      const created = await backend.createConversation(conversation);
      conversation.id = created.conversationId;
      Object.assign(conversation, created);
      state.conversations = [{ ...conversation, unread: 0, time: "Now" }, ...state.conversations.filter((item) => item.id !== conversation.id)];
    }
    else conversation.id = `new-${Date.now()}`;
    if (!backend?.enabled) { state.conversations.unshift({ ...conversation, id: conversation.id, unread: 0, time: "Now" }); state.messages[conversation.id] = []; persist(); }
    state.selectedPersonIds = [];
    openChat(conversation.id);
  } catch (error) { showFirebaseError("Create chat", error); }
}

function setTab(tab) { state.activeTab = tab; state.page = "home"; state.search = ""; state.filter = "All"; persist(); render(); }
function goBack() {
  if (state.page === "chat") { if (messageUnsubscribe) messageUnsubscribe(); messageUnsubscribe = null; state.page = "home"; state.activeTab = "messages"; }
  else if (state.page === "edit-chat") state.page = "chat";
  else if (state.page === "new-message") {
    if (state.addingToConversationId) { state.page = "chat"; state.activeConversationId = state.addingToConversationId; state.addingToConversationId = null; }
    else { state.page = "home"; state.activeTab = "messages"; }
    state.selectedPersonIds = [];
  }
  else if (state.page === "class-detail") { state.page = "home"; state.activeTab = "classes"; }
  else if (state.page === "event-detail" || state.page === "create-event" || state.page === "create-personal-event") { state.page = "home"; state.activeTab = "calendar"; }
  else if (state.page === "settings-detail" || state.page === "family") { state.page = "home"; state.activeTab = "settings"; }
  else state.page = "home";
  persist(); render();
}

async function finishFamilySetup() {
  const draft = ensureFamilySetupDraft();
  if (!draft.name.trim()) { familySetupView = "create"; render(); showToast("Enter a family name to continue."); return; }
  if (!backend?.enabled || !authUser) { showToast("Sign in with your school account before creating a family."); return; }
  isBusy = true; render();
  try {
    const payloadMembers = draft.members.map(({ name, role, grade, tribe, accountType, email }) => ({
      name, role, grade, tribe, accountType, ...(accountType === "linked" ? { email } : {})
    }));
    const result = await backend.createFamily(authUser.uid, {
      name: draft.name.trim(), tribe: draft.tribe,
      ownerName: userProfile?.displayName || authUser.displayName || "Family Account Holder",
      members: payloadMembers
    });
    const familyId = result?.familyId || result;
    if (!familyId) throw new Error("Firebase did not return the family ID. Please try again.");
    const returnedManaged = (result.members || []).filter((member) => member.accountType === "managed");
    const owner = {
      id: authUser.uid, uid: authUser.uid, email: authUser.email,
      name: state.currentUser.name || userProfile?.displayName || "Family Account Holder",
      role: titleRole(userProfile?.role || "parent"), note: "Account Holder", accountType: "owner",
      color: "purple", pinConfigured: false, pinLength: 6
    };
    const managedMembers = returnedManaged.map((member, index) => ({
      id: member.memberId, uid: authUser.uid, ownerUid: authUser.uid,
      name: member.name, role: titleRole(member.role), note: member.grade || "", grade: member.grade || "",
      tribe: member.tribe, accountType: "managed", color: colorClasses[(index % (colorClasses.length - 1)) + 1],
      pinConfigured: false, pinLength: 4
    }));
    familyLink = { familyId, memberId: authUser.uid, accountType: "owner", status: "active" };
    activeFamilyId = familyId;
    state.family = { name: draft.name.trim(), tribe: draft.tribe, description: "", allowLinkedAccounts: true, requireChildPin: true, members: [owner, ...managedMembers] };
    state.activeMemberId = authUser.uid;
    if (userProfile) {
      userProfile.activeMemberId = authUser.uid;
      userProfile.requestedFamilyAccount = false;
    }
    familyOwnerLocked = true;
    promptAccountPickerAfterFamilyLoad = false;
    state.pendingPinMemberId = null;
    let pinFailures = 0;
    for (let index = 0; index < managedMembers.length; index++) {
      const member = managedMembers[index];
      const pin = draft.members.filter((entry) => entry.accountType === "managed")[index]?.pin || "";
      try {
        await backend.setFamilyMemberPin(familyId, member.id, pin);
        member.pinConfigured = true;
      } catch (error) {
        console.error("Could not save a new family member PIN", error);
        pinFailures++;
      }
    }
    familySetupDraft = null; familySetupMemberDraft = null; familySetupEditingIndex = null;
    familySetupView = "create"; familySetupLinkOpen = false;
    state.page = "family-owner-pin";
    connectDataListeners(); persist(); render();
    const linkedInvites = (result.members || []).filter((member) => member.accountType === "linked" && member.code);
    let invitationCopied = false;
    if (linkedInvites.length) {
      const invitationText = linkedInvites.map((member) => `${member.name}: ${member.code}`).join("\n");
      try {
        await navigator.clipboard.writeText(invitationText);
        invitationCopied = true;
      } catch {
        prompt("Share these invitation codes with the matching accounts:", invitationText);
      }
    }
    const setupMessage = pinFailures
      ? `Family created. ${pinFailures} member PIN${pinFailures === 1 ? "" : "s"} could not be saved; set them from Family Members.`
      : "Family created. Set a PIN for the account holder to continue.";
    showToast(linkedInvites.length && invitationCopied ? `${setupMessage} Invitation code${linkedInvites.length === 1 ? "" : "s"} copied.` : setupMessage);
  } catch (error) {
    showFirebaseError("Create family account", error);
  } finally {
    isBusy = false;
    if (state.page === "family" && familySetupView === "review") render();
  }
}

async function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id, tab, filter, key, role, date, value } = target.dataset;
  if (target.tagName.toLowerCase() === "button" && target.type === "submit" && target.form) return;
  switch (action) {
    case "pin-key": {
      const input = $("#subaccount-pin");
      if (!input || input.value.length >= Number(input.maxLength || 6) || !/^\d$/.test(value || "")) break;
      input.value += value;
      updatePinPad();
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) input.focus({ preventScroll: true });
      break;
    }
    case "pin-delete": {
      const input = $("#subaccount-pin");
      if (!input) break;
      input.value = input.value.slice(0, -1);
      updatePinPad();
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) input.focus({ preventScroll: true });
      break;
    }
    case "tab": setTab(tab); break;
    case "filter": state.filter = filter; state.search = ""; persist(); render(); break;
    case "calendar-filter": state.calendarFilter = filter; render(); break;
    case "new-filter": state.newMessageFilter = filter; state.search = ""; render(); break;
    case "open-chat": openChat(id); break;
    case "new-message": state.page = "new-message"; state.search = ""; state.selectedPersonIds = []; state.newMessageFilter = "All"; render(); break;
    case "start-chat": await createConversation(); break;
    case "select-person": {
      const current = new Set(state.selectedPersonIds);
      current.has(id) ? current.delete(id) : current.add(id);
      state.selectedPersonIds = [...current]; render(); break;
    }
    case "back": goBack(); break;
    case "account": state.page = familyLink?.accountType === "owner" && state.family.members.filter(canSelectFamilyMember).length > 1 ? "account-picker" : "account"; render(); break;
    case "switch-member": {
      const member = state.family.members.find((entry) => entry.id === id);
      if (member && !canSelectFamilyMember(member)) {
        showToast("This family profile uses a separate login or belongs to another account holder.");
      } else if (member) {
        if (remoteMode && authUser && member.accountType === "owner" && member.id === authUser.uid) {
          if (state.activeMemberId === authUser.uid && !familyOwnerLocked) {
            localSwitchToMember(member);
            state.page = "home";
            persist(); render();
            break;
          }
          familyOwnerLocked = true;
          state.pendingPinMemberId = member.id;
          state.page = "family-owner-pin";
          stopListeners();
          dataScopeRevision++;
          state.conversations = []; state.messages = {}; state.activeConversationId = null;
          state.classes = []; state.events = [];
          render();
          break;
        }
        if (remoteMode && authUser && member.accountType === "managed") {
          const pinRequired = String(member.role || "").toLowerCase() !== "student" || state.family.requireChildPin !== false;
          if (!pinRequired) {
            try {
              if (state.activeMemberId !== authUser.uid) {
                const owner = state.family.members.find((entry) => entry.id === authUser.uid);
                await backend.setActiveMember(authUser.uid, authUser.uid);
                userProfile.activeMemberId = authUser.uid;
                if (owner) localSwitchToMember(owner);
                connectDataListeners();
              }
              await backend.selectFamilyMemberWithoutPin(activeFamilyId, member.id);
              userProfile.activeMemberId = member.id;
              localSwitchToMember(member);
              state.page = "home"; persist(); connectDataListeners(); render();
              showToast(`Switched to ${member.name}.`);
            } catch (error) { showFirebaseError("Switch to family profile", error); }
            break;
          }
          if (!member.pinConfigured) {
            try {
              if (state.activeMemberId !== authUser.uid) {
                const owner = state.family.members.find((entry) => entry.id === authUser.uid);
                await backend.setActiveMember(authUser.uid, authUser.uid);
                userProfile.activeMemberId = authUser.uid;
                if (owner) localSwitchToMember(owner);
                connectDataListeners();
              }
              state.pinManagementMemberId = member.id;
              state.page = "family";
              render();
              showToast(`Set a PIN for ${member.name} before using this profile.`);
            } catch (error) { showFirebaseError("Open family profile", error); }
            break;
          }
          try {
            if (state.activeMemberId !== authUser.uid) {
              const owner = state.family.members.find((entry) => entry.id === authUser.uid);
              await backend.setActiveMember(authUser.uid, authUser.uid);
              userProfile.activeMemberId = authUser.uid;
              if (owner) localSwitchToMember(owner);
              connectDataListeners();
            }
          } catch (error) { showFirebaseError("Open family profile", error); break; }
          state.pendingPinMemberId = member.id;
          state.page = "subaccount-pin";
          render();
          requestAnimationFrame(() => {
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) $("#subaccount-pin")?.focus();
          });
          break;
        }
        localSwitchToMember(member);
        if (remoteMode && authUser) {
          try { await backend.setActiveMember(authUser.uid, member.id); }
          catch (error) { showFirebaseError("Switch account", error); break; }
          userProfile.activeMemberId = member.id;
          connectDataListeners();
        }
        state.page = "home"; persist(); render(); showToast(`Switched to ${member.name}`);
      }
      break;
    }
    case "continue-account": state.page = "home"; persist(); render(); break;
    case "back-to-account-picker": state.pendingPinMemberId = null; state.page = "account-picker"; render(); break;
    case "switch-role":
      if (!remoteMode && roles.includes(role)) { state.currentUser.role = role; persist(); render(); showToast(`Previewing ${role} view`); }
      break;
    case "family": state.page = "family"; render(); break;
    case "cancel-family-edit":
      if (familyEditor?.type === "member" && familyEditor.returnTo === "family-members") familyEditor = { type: "family-members" };
      else { familyEditor = null; familyEditorDraft = null; }
      render(); break;
    case "family-manage-members":
      if (!familyEditorDraft) familyEditorDraft = {
        name: state.family.name || "", description: state.family.description || "",
        allowLinkedAccounts: state.family.allowLinkedAccounts !== false, requireChildPin: state.family.requireChildPin !== false
      };
      if (familyEditor?.type === "family") familyEditor = { type: "family-members" };
      state.addingMember = false; state.pinManagementMemberId = null; render(); break;
    case "family-manager-back":
      if (!familyEditorDraft) familyEditorDraft = {
        name: state.family.name || "", description: state.family.description || "",
        allowLinkedAccounts: state.family.allowLinkedAccounts !== false, requireChildPin: state.family.requireChildPin !== false
      };
      familyEditor = { type: "family" }; state.addingMember = false; state.pinManagementMemberId = null; render(); break;
    case "edit-family-details":
      if (!familyEditorDraft) familyEditorDraft = {
        name: state.family.name || "", description: state.family.description || "",
        allowLinkedAccounts: state.family.allowLinkedAccounts !== false, requireChildPin: state.family.requireChildPin !== false
      };
      familyEditor = { type: "family" }; state.addingMember = false; state.pinManagementMemberId = null; render(); break;
    case "family-setup-exit":
      familySetupDraft = null; familySetupMemberDraft = null; familySetupEditingIndex = null; familySetupView = "create"; familySetupNextAfterPin = "members";
      state.page = "home"; state.activeTab = "settings"; render(); break;
    case "family-setup-back":
      if (familySetupView === "pin") {
        const form = $("#family-setup-pin-form");
        if (form) {
          const data = new FormData(form);
          familySetupMemberDraft = { ...(familySetupMemberDraft || {}), pin: String(data.get("pin") || ""), confirmPin: String(data.get("confirmPin") || "") };
        }
        familySetupView = "member";
      }
      else if (familySetupView === "member") { syncFamilySetupMemberDraft(); familySetupView = "members"; familySetupEditingIndex = null; }
      else if (familySetupView === "review") familySetupView = "members";
      else if (familySetupView === "members") familySetupView = "create";
      render(); break;
    case "family-setup-skip": familySetupView = "members"; familySetupMemberDraft = null; render(); break;
    case "family-setup-review": familySetupView = "review"; render(); break;
    case "family-setup-add-member":
      familySetupMemberDraft = { name: "", role: "Student", grade: "", tribe: ensureFamilySetupDraft().tribe, accountType: "managed", email: "", pin: "", confirmPin: "" };
      familySetupEditingIndex = null; familySetupNextAfterPin = "members"; familySetupView = "member"; render(); requestAnimationFrame(() => $("#setup-member-name")?.focus()); break;
    case "family-setup-edit-family": familySetupView = "create"; render(); break;
    case "family-setup-edit-member": {
      const index = Number(target.dataset.index);
      const member = ensureFamilySetupDraft().members[index];
      if (!member) break;
      familySetupEditingIndex = index;
      familySetupMemberDraft = { ...member, pin: "", confirmPin: "" };
      familySetupView = "member"; render(); break;
    }
    case "family-setup-remove-member": {
      const index = Number(target.dataset.index);
      ensureFamilySetupDraft().members.splice(index, 1);
      familySetupView = "members"; render(); break;
    }
    case "family-setup-role":
      if (!familySetupRoles.includes(role)) break;
      if (target.dataset.scope === "member") {
        syncFamilySetupMemberDraft();
        familySetupMemberDraft = { ...(familySetupMemberDraft || {}), role };
        render();
      }
      break;
    case "family-setup-account-type":
      syncFamilySetupMemberDraft();
      familySetupMemberDraft = { ...(familySetupMemberDraft || {}), accountType: target.dataset.type, pin: "", confirmPin: "" };
      render(); break;
    case "family-setup-toggle-link": familySetupLinkOpen = !familySetupLinkOpen; render(); break;
    case "family-setup-clear-name": {
      const input = $("#setup-family-name");
      if (input) { input.value = ""; input.focus(); }
      break;
    }
    case "family-setup-create": await finishFamilySetup(); break;
    case "settings-detail":
      if (key === "family") {
        state.page = "family";
        state.settingsDetail = "";
      } else {
        state.page = "settings-detail";
        state.settingsDetail = key;
      }
      render();
      break;
    case "manage-member-pin": {
      const member = state.family.members.find((entry) => entry.id === id);
      if (["managed", "owner"].includes(member?.accountType) && familyLink?.accountType === "owner" && activeIdentityId() === authUser?.uid) {
        state.pinManagementMemberId = member.id;
        state.addingMember = false;
        state.page = "family";
        render();
        requestAnimationFrame(() => $("#family-pin")?.focus());
      }
      break;
    }
    case "cancel-member-pin": state.pinManagementMemberId = null; render(); break;
    case "approve-user": {
      const select = $(`#approve-role-${CSS.escape(id)}`);
      const role = select?.value || "student";
      if (backend?.enabled && canAdmin()) {
        try { await backend.approveUser(id, role, activeIdentityId()); showToast(`Account approved as ${titleRole(role)}.`); }
        catch (error) { showFirebaseError("Approve account", error); }
      }
      break;
    }
    case "change-user-role": {
      if (!backend?.enabled || !isAdmin()) break;
      const select = $(`#staff-role-${CSS.escape(id)}`);
      if (!select) break;
      try {
        await backend.setUserRole(id, select.value, activeIdentityId());
        showToast(`Role updated to ${titleRole(select.value)}.`);
      } catch (error) { showFirebaseError("Change user role", error); }
      break;
    }
    case "class-detail": openClassDetail(id); break;
    case "event-detail": state.activeEventId = id; state.page = "event-detail"; render(); break;
    case "month-prev": state.monthOffset--; render(); break;
    case "month-next": state.monthOffset++; render(); break;
    case "month-today": state.monthOffset = 0; state.selectedDate = todayKey; render(); break;
    case "select-date": state.selectedDate = date; render(); break;
    case "create-event": state.page = "create-event"; render(); break;
    case "create-personal-event": state.page = "create-personal-event"; render(); break;
    case "create-class": state.page = "create-class"; render(); break;
    case "new-announcement": state.page = "create-announcement"; render(); break;
    case "edit-chat": state.page = "edit-chat"; render(); break;
    case "call": showToast("Voice calling will be available when school calling is enabled."); break;
    case "attach": pendingFileKind = "any"; $("#file-picker").click(); break;
    case "choose-image": pendingFileKind = "image"; $("#file-picker").click(); break;
    case "download-attachment": {
      if (!backend?.enabled || !authUser) { showToast("Demo attachments are shown as previews only."); break; }
      try {
        const bytes = await backend.downloadAttachment(target.dataset.path);
        const blob = new Blob([bytes], { type: target.dataset.type || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.download = target.dataset.name || "attachment"; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) { showFirebaseError("Download attachment", error); }
      break;
    }
    case "add-member":
      if (!canManageFamilyAccount()) break;
      familyEditor = { type: "family-members" };
      familyAddMemberDraft = { name: "", role: "Student", grade: "", tribe: "Lamanites", accountType: "managed", email: "" };
      familyAddMemberPinStep = false; state.addingMember = true; render(); break;
    case "cancel-member":
      familyAddMemberDraft = null; familyAddMemberPinStep = false; state.addingMember = false; render(); break;
    case "back-member-pin-step": familyAddMemberPinStep = false; state.addingMember = true; render(); break;
    case "edit-family":
      if (canManageFamilyAccount()) {
        familyEditorDraft = {
          name: state.family.name || "",
          description: state.family.description || "",
          allowLinkedAccounts: state.family.allowLinkedAccounts !== false,
          requireChildPin: state.family.requireChildPin !== false
        };
        familyEditor = { type: "family" }; state.addingMember = false; state.pinManagementMemberId = null; render();
      }
      break;
    case "edit-member": {
      const member = state.family.members.find((entry) => entry.id === id);
      if (member?.accountType === "managed" && canManageFamilyAccount()) { familyEditor = { type: "member", memberId: id, returnTo: familyEditor?.type === "family-members" ? "family-members" : null }; state.addingMember = false; state.pinManagementMemberId = null; render(); }
      break;
    }
    case "make-member-independent": {
      const member = state.family.members.find((entry) => entry.id === id);
      if (!member || member.accountType !== "managed" || !activeFamilyId || familyLink?.accountType !== "owner" || activeIdentityId() !== authUser?.uid) break;
      const email = prompt(`Email address for ${member.name}'s new independent login`, "");
      if (!email?.trim()) break;
      if (!confirm(`Create a separate Firebase login for ${member.name}? Their profile ID, classes, calendar, and messages will stay with the account.`)) break;
      try {
        const result = await backend.makeFamilyMemberIndependent(activeFamilyId, id, email.trim());
        const privilegeNote = ["teacher", "presidency"].includes(String(member.role).toLowerCase()) && result.role === "student" ? " The login starts as Student; an Admin can assign staff access." : "";
        try { await navigator.clipboard.writeText(result.setupLink); showToast(`Login setup link copied. Send it to ${member.name} at ${result.email}.${privilegeNote}`); }
        catch { prompt(`Send this login setup link to ${member.name} (${result.email})${privilegeNote}:`, result.setupLink); }
        state.activeMemberId = authUser.uid;
        await backend.setActiveMember(authUser.uid, authUser.uid);
        userProfile.activeMemberId = authUser.uid;
        applyActiveMember(); connectDataListeners();
        state.page = "family"; persist(); render();
      } catch (error) { showFirebaseError("Create independent login", error); }
      break;
    }
    case "remove-family-member": {
      const member = state.family.members.find((entry) => entry.id === id);
      if (!member || !confirm(`Unlink ${member.name} from this family? Their account and stored data will remain.`)) break;
      try {
        if (backend?.enabled && activeFamilyId) await backend.removeFamilyMember(activeFamilyId, id);
        state.family.members = state.family.members.filter((entry) => entry.id !== id);
        if (state.activeMemberId === id) {
          state.activeMemberId = authUser?.uid;
          if (userProfile) userProfile.activeMemberId = authUser.uid;
          state.page = "account-picker";
          connectDataListeners();
        }
        persist(); render(); showToast(`${member.name} was unlinked. Their account and data were kept.`);
      } catch (error) { showFirebaseError("Unlink family member", error); }
      break;
    }
    case "join-class": state.showJoinable = !state.showJoinable; state.search = ""; state.page = "home"; state.activeTab = "classes"; render(); break;
    case "join-class-action": {
      const item = state.classes.find((entry) => entry.id === id);
      if (!item) break;
      if (item.joined) { const chat = state.conversations.find((entry) => entry.classId === id || entry.id === id); chat ? openChat(chat.id) : showToast("Your class chat will appear when the teacher creates it."); }
      else if (backend?.enabled && authUser) {
        try {
          const result = await backend.requestClassJoin(id, authUser, item.name, activeIdentityId());
          if (result.joined) { item.joined = true; state.joinedRequests = state.joinedRequests.filter((classId) => classId !== id); showToast(`You joined ${item.name}.`); }
          else { state.joinedRequests = [...new Set([...state.joinedRequests, id])]; showToast("Join request sent to your teacher."); }
        }
        catch (error) { showFirebaseError("Join class", error); }
      } else { item.joined = true; item.members++; persist(); showToast(`You joined ${item.name}.`); }
      render(); break;
    }
    case "respond-join": {
      if (!backend?.enabled || !authUser) { showToast("Connect Firebase to review class enrollment requests."); break; }
      try {
        const approved = target.dataset.approve === "true";
        await backend.respondToClassJoin(state.activeClassId, target.dataset.userId, approved);
        showToast(approved ? "Student added to the class." : "Enrollment request declined.");
      } catch (error) { showFirebaseError("Review class request", error); }
      break;
    }
    case "demo-signin": state.isDemoSignedIn = true; state.currentUser = { name: "Emma Smith", email: "emma.smith@example.com", role: "Student", color: "blue", initials: "ES" }; state.activeMemberId = "emma-smith"; state.page = "home"; persist(); render(); break;
    case "auth-mode": state.authMode = state.authMode === "signin" ? "signup" : "signin"; state.error = ""; render(); break;
    case "retry-account-load":
      if (authUser && backend?.enabled) await handleAuthUser(authUser, null, true);
      break;
    case "sign-out":
      if (backend?.enabled && authUser) {
        await backend.signOut();
        await handleAuthUser(null, null, true);
      } else {
        state.isDemoSignedIn = false;
        state.currentUser = { name: "School member", email: "", role: "Student", color: "blue", initials: "CT" };
        state.activeMemberId = ""; state.page = "home"; persist(); render();
      }
      break;
    case "delete-chat":
      if (confirm(`Delete “${activeConversation().title}” for all members? This cannot be undone.`)) {
        let deletionResult = null;
        if (backend?.enabled && authUser) {
          try { deletionResult = await backend.deleteConversation(state.activeConversationId, activeIdentityId()); }
          catch (error) { showFirebaseError("Delete chat", error); break; }
        } else { state.conversations = state.conversations.filter((entry) => entry.id !== state.activeConversationId); delete state.messages[state.activeConversationId]; }
        state.pinnedConversationIds = state.pinnedConversationIds.filter((conversationId) => conversationId !== state.activeConversationId);
        state.page = "home"; state.activeTab = "messages"; persist(); render();
        showToast(deletionResult?.attachmentsDeleted === false
          ? "Chat deleted. Some attachments need administrator cleanup."
          : "Conversation deleted.");
      }
      break;
    case "leave-chat":
      if (backend?.enabled && authUser) {
        try { await backend.leaveConversation(state.activeConversationId, activeIdentityId()); }
        catch (error) { showFirebaseError("Leave chat", error); break; }
      } else state.conversations = state.conversations.filter((entry) => entry.id !== state.activeConversationId);
      state.pinnedConversationIds = state.pinnedConversationIds.filter((conversationId) => conversationId !== state.activeConversationId);
      state.page = "home"; state.activeTab = "messages"; persist(); render(); showToast("You left this chat."); break;
    case "add-members": state.addingToConversationId = state.activeConversationId; state.page = "new-message"; state.search = ""; state.selectedPersonIds = []; state.newMessageFilter = "All"; render(); break;
    case "change-password":
      if (backend?.enabled && authUser?.email) {
        try { await backend.resetPassword(authUser.email); showToast("Password reset instructions were sent to your account email."); }
        catch (error) { showToast(authMessage(error)); }
      } else showToast("Connect Firebase before changing account passwords.");
      break;
    case "reset-password": {
      const email = $("#auth-email")?.value.trim() || prompt("Enter the email address for your account", "");
      if (!email) break;
      if (!backend?.enabled) { showToast("Connect Firebase before sending password reset emails."); break; }
      try { await backend.resetPassword(email); showToast("Password reset instructions were sent to that email."); }
      catch (error) { showToast(authMessage(error)); }
      break;
    }
    case "appearance": state.appearance = value; document.documentElement.dataset.appearance = value; persist(); showToast(`${value} appearance selected.`); break;
    default: break;
  }
}

function updatePinPad() {
  const input = $("#subaccount-pin");
  const indicators = $("#pin-indicators");
  if (!input || !indicators) return;
  const pinLength = Number(input.maxLength || 6);
  input.value = input.value.replace(/\D/g, "").slice(0, pinLength);
  const count = input.value.length;
  indicators.setAttribute("aria-label", `${count} of ${pinLength} digits entered`);
  $$("[data-pin-slot]", indicators).forEach((slot, index) => {
    slot.classList.toggle("filled", index < count);
    slot.classList.toggle("current", index === count && count < pinLength);
  });
  const submit = $(".pin-continue");
  if (submit) submit.disabled = count !== pinLength;
}

function syncFamilyEditDraft(target) {
  if (target?.form?.id !== "family-edit-form" || !familyEditorDraft) return false;
  if (target.name === "name") familyEditorDraft.name = target.value;
  else if (target.name === "description") familyEditorDraft.description = target.value;
  else if (target.name === "allowLinkedAccounts" || target.name === "requireChildPin") familyEditorDraft[target.name] = target.checked;
  return true;
}

function handleInput(event) {
  const target = event.target;
  if (syncFamilyEditDraft(target)) return;
  if (target.id === "message-search") {
    state.search = target.value;
    const list = $("#conversation-list");
    const rows = filterConversations(state.search);
    if (list) list.innerHTML = rows.length ? rows.map(conversationRow).join("") : `<div class="empty-state">${icon("message")}<h3>No conversations found</h3><p>Try a different search or start a new conversation.</p></div>`;
  } else if (target.id === "class-search") {
    state.search = target.value;
    const grid = $(".class-grid");
    const rows = state.classes.filter((item) => (state.showJoinable ? !item.joined : item.joined) && `${item.name} ${item.teacher}`.toLowerCase().includes(state.search.toLowerCase()));
    if (grid) grid.innerHTML = rows.map((item) => `<article class="card class-card" data-action="class-detail" data-id="${esc(item.id)}">${avatar(item, "square")}<span class="class-copy"><h2>${esc(item.name)}</h2><p class="teacher">${esc(item.teacher)}</p><span class="last-note">${esc(item.note)}</span></span><span class="class-time">Today</span></article>`).join("");
  } else if (target.id === "calendar-search") {
    const q = target.value.toLowerCase();
    $$(".event-row").forEach((row) => { row.classList.toggle("hide", !row.textContent.toLowerCase().includes(q)); });
  } else if (target.id === "new-search") {
    state.search = target.value;
    const cursor = target.selectionStart;
    render(); const input = $("#new-search"); input?.focus(); input?.setSelectionRange(cursor, cursor);
  } else if (target.form?.id === "family-setup-member-form") {
    if (target.name === "pin" || target.name === "confirmPin") target.value = target.value.replace(/\D/g, "").slice(0, 4);
    syncFamilySetupMemberDraft();
    if (target.name === "pin") $$(".family-pin-dot").forEach((dot, index) => dot.classList.toggle("filled", index < target.value.length));
  } else if (target.form?.id === "family-member-pin-form") {
    if (target.name === "pin" || target.name === "confirmPin") target.value = target.value.replace(/\D/g, "").slice(0, 4);
  } else if (target.id === "subaccount-pin") updatePinPad();
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const data = new FormData(form);
  if (form.id === "auth-form") {
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    state.error = ""; isBusy = true; render();
    try {
      if (!backend?.enabled) throw new Error("Connect the school Firebase project first, or use Preview the app.");
      const credential = state.authMode === "signup"
        ? await backend.signUp(email, password, String(data.get("displayName") || "").trim(), String(data.get("requestedRole") || "Student").toLowerCase(), String(data.get("requestedRole") || "").toLowerCase() === "parent" && data.get("createFamilyAccount") === "yes")
        : await backend.signIn(email, password);
      if (credential?.user) await handleAuthUser(credential.user, null, state.authMode === "signup");
    } catch (error) { state.error = authMessage(error); }
    isBusy = false; render(); return;
  }
  if (form.id === "message-form") { await submitMessage(form); return; }
  if (form.id === "family-edit-form") {
    const name = String(data.get("name") || "").trim();
    if (!name) { showToast("Enter a family name."); return; }
    const updates = {
      name,
      description: String(data.get("description") || "").trim(),
      allowLinkedAccounts: data.get("allowLinkedAccounts") === "on",
      requireChildPin: data.get("requireChildPin") === "on"
    };
    if (backend?.enabled && activeFamilyId) {
      try { await backend.updateFamily(activeFamilyId, updates); }
      catch (error) { showFirebaseError("Save family settings", error); return; }
    }
    Object.assign(state.family, updates);
    familyEditor = null;
    familyEditorDraft = null;
    persist(); render(); showToast("Family settings updated.");
  } else if (form.id === "family-member-edit-form") {
    const memberId = form.dataset.memberId;
    const member = state.family.members.find((entry) => entry.id === memberId);
    if (!member || member.accountType !== "managed") { showToast("This family profile can no longer be edited here."); familyEditor = null; render(); return; }
    const name = String(data.get("name") || "").trim();
    const role = String(data.get("role") || "Student");
    const grade = String(data.get("grade") || "");
    const tribe = String(data.get("tribe") || "");
    const allowedRoles = remoteMode ? (isAdmin() ? ["Parent", "Student", "Teacher", "Presidency"] : ["Parent", "Student"]) : roles;
    if (!name) { showToast("Enter the family member’s name."); return; }
    if (!allowedRoles.includes(role)) { showToast("Choose a role available for this account."); return; }
    try {
      if (backend?.enabled && activeFamilyId) await backend.updateFamilyMember(activeFamilyId, memberId, { name, role, grade, tribe });
      Object.assign(member, { name, role, grade, note: grade, tribe, initials: name.split(/\s+/).map((part) => part[0]).slice(0,2).join("") });
      familyEditor = familyEditor?.returnTo === "family-members" ? { type: "family-members" } : null; persist(); render(); showToast("Family profile updated.");
    } catch (error) { showFirebaseError("Update family profile", error); }
  } else if (form.id === "profile-form") {
    const name = String(data.get("name") || "").trim();
    if (name) {
      if (backend?.enabled && authUser) {
        try {
          const activeMember = activeFamilyMember();
          if (activeMember?.accountType === "managed" && activeMember.id === activeIdentityId() && activeFamilyId) {
            await backend.updateFamilyMember(activeFamilyId, activeMember.id, { name });
            activeMember.name = name;
          } else {
            await backend.updateProfile(authUser.uid, { displayName: name });
          }
        } catch (error) { showFirebaseError("Save profile", error); return; }
      }
      state.currentUser.name = name;
      state.currentUser.initials = name.split(/\s+/).map((part) => part[0]).slice(0,2).join("");
      persist(); showToast("Profile saved."); render();
    }
      } else if (form.id === "family-member-form") {
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const role = String(data.get("role") || "Student");
    const grade = String(data.get("grade") || "").trim();
    const tribe = String(data.get("tribe") || "");
    const accountType = String(data.get("accountType") || "managed");
    const email = String(data.get("email") || "").trim();
    const allowedRoles = remoteMode ? (isAdmin() ? ["Parent", "Student", "Teacher", "Presidency"] : ["Parent", "Student"]) : roles;
    if (!allowedRoles.includes(role)) { showToast("Choose a role available for this account."); return; }
    if (["Teacher", "Presidency"].includes(role) && !isAdmin()) { showToast("Only a school Admin can assign Teacher or Presidency roles."); return; }
    familyAddMemberDraft = { name, role, grade, tribe, accountType, email };
    if (accountType === "managed") { familyAddMemberPinStep = true; render(); return; }
    if (!email) { showToast("Enter the email address for the existing personal account."); return; }
    if (backend?.enabled && authUser && activeFamilyId) {
      try {
        const invitation = await backend.addFamilyMember(activeFamilyId, { name, email, role, grade, tribe, accountType });
        state.addingMember = false; familyAddMemberDraft = null; familyAddMemberPinStep = false;
        if (invitation?.code) {
          try { await navigator.clipboard.writeText(invitation.code); showToast(`Invitation code copied. Send it to ${name}; they must sign in with ${email}.`); }
          catch { prompt(`Send this invitation code to ${name} (${email}):`, invitation.code); }
        }
        persist(); render(); return;
      } catch (error) { showFirebaseError("Add family member", error); return; }
    }
    state.family.members.push({ id: `member-${Date.now()}`, name, role, note: grade, grade, tribe, accountType: "linked", color: colorClasses[(state.family.members.length % (colorClasses.length - 1)) + 1] });
    state.addingMember = false; familyAddMemberDraft = null; familyAddMemberPinStep = false; persist(); render(); showToast(`${name} added to your family.`);
  } else if (form.id === "family-member-pin-form") {
    const pin = String(data.get("pin") || "");
    const confirmPin = String(data.get("confirmPin") || "");
    if (!/^\d{4}$/.test(pin)) { showToast("Enter a four-digit PIN."); return; }
    if (pin !== confirmPin) { showToast("The PINs do not match."); return; }
    const draft = familyAddMemberDraft;
    if (!draft?.name) { showToast("Enter the family member’s name first."); familyAddMemberPinStep = false; render(); return; }
    let memberId = `member-${Date.now()}`;
    if (backend?.enabled && authUser && activeFamilyId) {
      try {
        const result = await backend.addFamilyMember(activeFamilyId, { ...draft, accountType: "managed" });
        memberId = result?.memberId;
        if (!memberId) throw new Error("Firebase did not return the new family member ID.");
      } catch (error) { showFirebaseError("Add family member", error); return; }
    }
    if (!state.family.members.some((entry) => entry.id === memberId)) {
      state.family.members.push({
        id: memberId, uid: authUser?.uid, ownerUid: authUser?.uid, name: draft.name, role: draft.role,
        note: draft.grade, grade: draft.grade, tribe: draft.tribe, accountType: "managed",
        pinConfigured: false, pinLength: 4, color: colorClasses[(state.family.members.length % (colorClasses.length - 1)) + 1]
      });
    }
    state.addingMember = false; familyAddMemberDraft = null; familyAddMemberPinStep = false;
    if (backend?.enabled && authUser && activeFamilyId) {
      try {
        await backend.setFamilyMemberPin(activeFamilyId, memberId, pin);
        const addedMember = state.family.members.find((entry) => entry.id === memberId);
        if (addedMember) addedMember.pinConfigured = true;
        showToast(`${draft.name}’s subaccount was added with a PIN.`);
      } catch (error) {
        showFirebaseError("Save subaccount PIN", error);
        showToast(`${draft.name} was added, but the PIN could not be saved. Use Set PIN in Family Members.`);
      }
    } else {
      const addedMember = state.family.members.find((entry) => entry.id === memberId);
      if (addedMember) addedMember.pinConfigured = true;
      showToast(`${draft.name}’s subaccount was added with a PIN.`);
    }
    persist(); render();
  } else if (form.id === "family-create-form") {
    const name = String(data.get("name") || "").trim();
    const tribe = String(data.get("tribe") || "Lamanites");
    if (!name) { showToast("Enter a family name."); return; }
    familySetupDraft = { ...ensureFamilySetupDraft(), name, tribe };
    familySetupView = "members"; familySetupMemberDraft = null; familySetupEditingIndex = null;
    render();
  } else if (form.id === "family-setup-member-form") {
    const name = String(data.get("name") || "").trim();
    const role = String(data.get("role") || "Student");
    const grade = String(data.get("grade") || "").trim();
    const tribe = String(data.get("tribe") || ensureFamilySetupDraft().tribe);
    const accountType = String(data.get("accountType") || familySetupMemberDraft?.accountType || "managed");
    const email = String(data.get("email") || "").trim();
    if (!name) { showToast("Enter the family member’s full name."); return; }
    if (!familySetupRoles.includes(role)) { showToast("Choose a valid school role."); return; }
    if (["Teacher", "Presidency"].includes(role) && !isAdmin()) { showToast("Only a school Admin can assign Teacher or Presidency roles."); return; }
    if (accountType === "linked" && !email) { showToast("Enter the email used by the existing school account."); return; }
    const next = event.submitter?.value || (accountType === "managed" ? "set-pin" : "list");
    familySetupMemberDraft = { ...(familySetupMemberDraft || {}), name, role, grade, tribe, accountType, email };
    if (accountType === "managed") {
      familySetupNextAfterPin = next === "review" ? "review" : "members";
      familySetupView = "pin";
      render(); return;
    }
    const member = { name, role, grade, tribe, accountType, email };
    const index = familySetupEditingIndex;
    if (Number.isInteger(index)) ensureFamilySetupDraft().members[index] = member;
    else ensureFamilySetupDraft().members.push(member);
    familySetupMemberDraft = null; familySetupEditingIndex = null;
    familySetupView = next === "review" ? "review" : "members";
  } else if (form.id === "family-setup-pin-form") {
    const pin = String(data.get("pin") || "");
    const confirmPin = String(data.get("confirmPin") || "");
    if (!/^\d{4}$/.test(pin)) { showToast("Enter a four-digit PIN."); return; }
    if (pin !== confirmPin) { showToast("The PINs do not match."); return; }
    if (!familySetupMemberDraft?.name) { showToast("Complete the family member’s profile first."); familySetupView = "member"; render(); return; }
    const member = { ...familySetupMemberDraft, pin };
    delete member.confirmPin;
    const index = familySetupEditingIndex;
    if (Number.isInteger(index)) ensureFamilySetupDraft().members[index] = member;
    else ensureFamilySetupDraft().members.push(member);
    familySetupMemberDraft = null; familySetupEditingIndex = null;
    familySetupView = familySetupNextAfterPin === "review" ? "review" : "members";
    familySetupNextAfterPin = "members";
    render();
  } else if (form.id === "family-pin-form") {
    const memberId = form.dataset.memberId;
    const pinLength = Number(form.dataset.pinLength || 6);
    const pin = String(data.get("pin") || "");
    if (!/^\d+$/.test(pin) || pin.length !== pinLength) { showToast(`Enter a ${pinLength}-digit PIN.`); return; }
    if (pin !== String(data.get("confirmPin") || "")) { showToast("The PINs do not match."); return; }
    try {
      await backend.setFamilyMemberPin(activeFamilyId, memberId, pin);
      const member = state.family.members.find((entry) => entry.id === memberId);
      if (member) { member.pinConfigured = true; member.pinLength = pin.length; }
      state.pinManagementMemberId = null;
      persist(); render(); showToast(member?.accountType === "owner" ? "Family account holder PIN saved." : "Subaccount PIN saved.");
    } catch (error) { showFirebaseError("Save subaccount PIN", error); }
  } else if (form.id === "family-owner-pin-setup-form") {
    const memberId = form.dataset.memberId;
    const pin = String(data.get("pin") || "");
    if (!/^\d{6}$/.test(pin)) { showToast("Enter a six-digit PIN."); return; }
    if (pin !== String(data.get("confirmPin") || "")) { showToast("The PINs do not match."); return; }
    try {
      await backend.setFamilyMemberPin(activeFamilyId, memberId, pin);
      await backend.selectFamilyMemberWithPin(activeFamilyId, memberId, pin);
      const owner = state.family.members.find((entry) => entry.id === memberId);
      if (!owner) throw new Error("The family account holder profile could not be loaded. Refresh and try again.");
      owner.pinConfigured = true;
      localSwitchToMember(owner);
      if (userProfile) userProfile.activeMemberId = memberId;
      familyOwnerLocked = false;
      state.pendingPinMemberId = null;
      promptAccountPickerAfterFamilyLoad = false;
      state.page = state.family.members.filter(canSelectFamilyMember).length > 1 ? "account-picker" : "home";
      connectDataListeners(); persist(); render();
      showToast("Family account holder PIN saved.");
    } catch (error) { showFirebaseError("Save family holder PIN", error); }
  } else if (form.id === "family-owner-pin-form") {
    const memberId = form.dataset.memberId;
    const pin = String(data.get("pin") || "");
    if (!/^\d{6}$/.test(pin)) { showToast("Enter all six digits on the number pad."); return; }
    try {
      await backend.selectFamilyMemberWithPin(activeFamilyId, memberId, pin);
      const owner = state.family.members.find((entry) => entry.id === memberId);
      if (!owner) throw new Error("The family account holder profile could not be loaded. Refresh and try again.");
      localSwitchToMember(owner);
      if (userProfile) userProfile.activeMemberId = memberId;
      familyOwnerLocked = false;
      state.pendingPinMemberId = null;
      promptAccountPickerAfterFamilyLoad = false;
      state.page = state.family.members.filter(canSelectFamilyMember).length > 1 ? "account-picker" : "home";
      connectDataListeners(); persist(); render();
      showToast(`Signed in as ${owner.name}.`);
    } catch (error) {
      showFirebaseError("Check family holder PIN", error);
      const input = $("#subaccount-pin");
      if (input) input.value = "";
      updatePinPad();
    }
  } else if (form.id === "subaccount-pin-form") {
    const memberId = form.dataset.memberId;
    const pin = String(data.get("pin") || "");
    const pinLength = Number(form.dataset.pinLength || 6);
    if (pin.length !== pinLength || !/^\d+$/.test(pin)) { showToast(`Enter all ${pinLength} digits on the number pad.`); return; }
    try {
      await backend.selectFamilyMemberWithPin(activeFamilyId, memberId, pin);
      const member = state.family.members.find((entry) => entry.id === memberId);
      if (!member) throw new Error("This family profile is no longer available.");
      localSwitchToMember(member);
      if (userProfile) userProfile.activeMemberId = memberId;
      state.pendingPinMemberId = null;
      connectDataListeners(); state.page = "home"; persist(); render();
      showToast(`Signed in as ${member.name}.`);
    } catch (error) {
      showFirebaseError("Check subaccount PIN", error);
      const input = $("#subaccount-pin");
      if (input) input.value = "";
      updatePinPad();
    }
  } else if (form.id === "family-link-form") {
    const code = String(data.get("code") || "").trim();
    if (!backend?.enabled || !authUser) { showToast("Sign in to your existing personal account before linking it."); return; }
    try {
      const linked = await backend.acceptFamilyInvite(code);
      familyLink = { familyId: linked.familyId, memberId: linked.memberId, accountType: "linked", status: "active" };
      activeFamilyId = linked.familyId;
      state.activeMemberId = linked.memberId;
      userProfile.activeMemberId = linked.memberId;
      connectDataListeners(); state.page = "family"; render(); showToast("Your existing account is now linked to the family.");
    } catch (error) { showFirebaseError("Link account to family", error); }
  } else if (form.id === "event-form") {
    const eventRecord = { id: `event-${Date.now()}`, title: String(data.get("title") || "").trim(), date: String(data.get("date") || todayKey), time: new Date(`2000-01-01T${data.get("time")}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), kind: String(data.get("kind") || "event"), detail: String(data.get("detail") || "").trim(), link: String(data.get("link") || "").trim(), color: "purple" };
    try {
      if (backend?.enabled && authUser) await backend.createEvent(eventRecord);
      else { state.events.push(eventRecord); persist(); }
      state.selectedDate = eventRecord.date; state.activeTab = "calendar"; state.page = "home"; render(); showToast("School event saved.");
    } catch (error) { showFirebaseError("Save school event", error); }
  } else if (form.id === "personal-event-form") {
    const eventRecord = { title: String(data.get("title") || "").trim(), date: String(data.get("date") || todayKey), time: new Date(`2000-01-01T${data.get("time")}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), kind: String(data.get("kind") || "event"), detail: String(data.get("detail") || "").trim(), link: "", color: "purple" };
    try {
      if (backend?.enabled && authUser) await backend.createPersonalEvent(activeIdentityId(), eventRecord);
      else { state.events.push({ ...eventRecord, id: `personal-${Date.now()}`, calendarScope: "personal" }); persist(); }
      state.selectedDate = eventRecord.date; state.activeTab = "calendar"; state.page = "home"; render(); showToast("Added to this profile’s calendar.");
    } catch (error) { showFirebaseError("Save personal event", error); }
  } else if (form.id === "class-form") {
    const classRecord = {
      name: String(data.get("name") || "").trim(), title: String(data.get("name") || "").trim(),
      teacher: String(data.get("teacher") || "").trim(), description: String(data.get("description") || "").trim(),
      openEnrollment: data.get("openEnrollment") === "true", memberCount: 1, members: 1, memberProfileIds: [activeIdentityId()], identityId: activeIdentityId(), color: "purple", joined: true
    };
    try {
      if (backend?.enabled && authUser) classRecord.id = await backend.createClass(classRecord);
      else { classRecord.id = `class-${Date.now()}`; state.classes.unshift(classRecord); persist(); }
      state.showJoinable = false; state.activeTab = "classes"; state.page = "home"; render(); showToast("Class created.");
    } catch (error) { showFirebaseError("Create class", error); }
  } else if (form.id === "announcement-form") {
    const title = String(data.get("title") || "").trim();
    const text = String(data.get("text") || "").trim();
    const recipients = directory.length ? directory : state.people;
    const memberUids = [...new Set([authUser?.uid, ...recipients.map((person) => person.id)].filter(Boolean))];
    const conversation = {
      title, kind: "announcement", memberUids, memberNames: recipients.map((person) => person.displayName || person.name).filter(Boolean),
      memberProfileIds: [...new Set([activeIdentityId(), ...recipients.map((person) => person.id)].filter(Boolean))],
      createdBy: authUser?.uid || "demo", createdByIdentityId: activeIdentityId(), createdByRole: currentRole(), memberCount: memberUids.length,
      preview: text, color: "blue", members: ["School Community"]
    };
    try {
      if (backend?.enabled && authUser) {
        const created = await backend.createConversation(conversation);
        const id = created.conversationId;
        await backend.sendMessage(id, { senderName: state.currentUser.name, senderUid: authUser.uid, senderProfileId: activeIdentityId(), senderInitials: state.currentUser.initials, text });
      } else {
        conversation.id = `announcement-${Date.now()}`; conversation.time = "Now"; conversation.unread = 0;
        state.conversations.unshift(conversation); state.messages[conversation.id] = [{ sender: state.currentUser.name, senderName: state.currentUser.name, senderUid: "demo", text, time: "Now", mine: true }]; persist();
      }
      state.activeTab = "messages"; state.page = "home"; state.filter = "Announcements"; render(); showToast("Announcement published.");
    } catch (error) { showFirebaseError("Publish announcement", error); }
  } else if (form.id === "edit-chat-form") {
    const conversation = activeConversation();
    const updates = { title: String(data.get("title") || "").trim(), description: String(data.get("description") || "").trim() };
    if (backend?.enabled && authUser) {
      try { await backend.updateConversation(conversation.id, updates); }
      catch (error) { showFirebaseError("Save chat settings", error); return; }
    }
    conversation.title = updates.title;
    conversation.description = updates.description;
    persist(); state.page = "chat"; render(); showToast("Chat updated.");
  }
}

function authMessage(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "That email or password didn’t work. Check your details and try again.";
  if (code.includes("email-already-in-use")) return "An account already uses that email. Try signing in.";
  if (code.includes("weak-password")) return "Choose a stronger password with at least 6 characters.";
  if (code.includes("network-request-failed")) return "Check your internet connection and try again.";
  return error?.message || "Something went wrong. Please try again.";
}

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (pendingFileKind === "image" && !file.type.startsWith("image/")) { showToast("Choose an image file."); event.target.value = ""; return; }
  if (file.size > 10 * 1024 * 1024) { showToast("Attachments must be 10 MB or smaller."); event.target.value = ""; return; }
  const conversation = activeConversation();
  let attachment = { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, type: file.type, url: "" };
  if (backend?.enabled && authUser) {
    try { attachment = { ...attachment, ...(await backend.uploadAttachment(conversation.id, authUser.uid, file)) }; }
    catch (error) { showFirebaseError("Upload attachment", error); event.target.value = ""; return; }
  }
  const senderName = state.currentUser.name;
  const message = { senderName, senderUid: authUser?.uid || "demo", senderProfileId: activeIdentityId(), sender: senderName, senderInitials: state.currentUser.initials, text: "", mine: true, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), attachmentName: attachment.name, attachmentSize: attachment.size, attachmentType: attachment.type, attachmentUrl: attachment.url, attachmentPath: attachment.path };
  if (backend?.enabled && authUser) {
    try { await backend.sendMessage(conversation.id, message); }
    catch (error) { showFirebaseError("Send attachment", error); }
  } else {
    (state.messages[conversation.id] ||= []).push(message);
    conversation.preview = `Attachment: ${attachment.name}`; conversation.time = "Now"; persist(); render();
  }
  event.target.value = "";
}

async function handlePreference(event) {
  const target = event.target;
  const pref = target.dataset.pref;
  if (!pref || target.type !== "checkbox") return;
  if (pref in state.notificationPrefs) state.notificationPrefs[pref] = target.checked;
  else if (pref === "chatNotifications") state.notifications = target.checked;
  else if (pref === "pinChat") {
    const pinned = new Set(state.pinnedConversationIds || []);
    target.checked ? pinned.add(state.activeConversationId) : pinned.delete(state.activeConversationId);
    state.pinnedConversationIds = [...pinned];
    state.pinChat = target.checked;
  }
  else if (pref === "reduceMotion" || pref === "highContrast") state[pref] = target.checked;
  persist();
  if (["messages", "announcements", "events"].includes(pref) && remoteMode && authUser) {
    try {
      if (activeIdentityId() === authUser.uid) userProfile.notificationPrefs = { ...state.notificationPrefs };
      await backend.updateIdentitySettings(activeIdentityId(), state.notificationPrefs);
    } catch (error) { showFirebaseError("Save notification preference", error); }
  }
}

document.addEventListener("click", (event) => { handleClick(event).catch((error) => showToast(error.message || "Something went wrong.")); });
document.addEventListener("input", handleInput);
document.addEventListener("submit", (event) => { handleSubmit(event).catch((error) => showToast(error.message || "Something went wrong.")); });
document.addEventListener("change", (event) => {
  const target = event.target;
  if (syncFamilyEditDraft(target)) return;
  if (target.id === "file-picker") { handleFileChange(event); return; }
  if (target.id === "requested-role") {
    const familyChoice = $("#signup-family-choice");
    const isParent = target.value.toLowerCase() === "parent";
    familyChoice?.classList.toggle("hide", !isParent);
    if (!isParent) { const checkbox = $("#create-family-account"); if (checkbox) checkbox.checked = false; }
    return;
  }
  if (target.id === "member-account-type") {
    const linked = target.value === "linked";
    $("#member-email-field")?.classList.toggle("hide", !linked);
    const email = $("#member-email");
    if (email) email.required = linked;
    const submit = $("#family-member-form button[type=submit]");
    if (submit) submit.textContent = linked ? "Add or Invite" : "Set PIN";
    return;
  }
  handlePreference(event);
});

async function boot() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./service-worker.js?v=37").catch(() => {});
  render();
  backend = await connectFirebase((user) => {
    pendingAuthUser = user;
    authObserverReceived = true;
    if (backend?.enabled) {
      const uid = user?.uid || null;
      const loadKey = uid || "__signed-out__";
      if ((authInitialized && authUser?.uid === uid) || (!authInitialized && authLoadForUid === loadKey)) return;
      handleAuthUser(user, ++authSessionRevision).catch((error) => showToast(error.message || "Could not load your account."));
    }
  }, (error) => {
    if (error) {
      state.error = authMessage(error);
      if (backend?.enabled) { authInitialized = true; render(); }
      else showToast(error.message || "Firebase connection failed.");
    }
  });
  remoteMode = Boolean(backend?.enabled);
  if (backend?.enabled) {
    if (authObserverReceived) await handleAuthUser(pendingAuthUser, ++authSessionRevision);
  } else {
    // A previous local demo session must never be mistaken for a Firebase login.
    state.isDemoSignedIn = false;
    authInitialized = true;
    render();
  }
}
boot();
