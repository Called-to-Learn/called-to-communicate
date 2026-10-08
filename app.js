import { connectFirebase, timestampToDate } from "./firebase.js?v=11";

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
    name: "The Smith Family", tribe: "Lamanites", members: [
      { id: "jonathan", name: "Jonathan Smith", role: "Parent", note: "Account Holder", color: "purple" },
      { id: "sarah-smith", name: "Sarah Smith", role: "Parent", note: "", color: "pink" },
      { id: "emma-smith", name: "Emma Smith", role: "Student", note: "Grade 6", tribe: "Nephites", color: "blue" },
      { id: "noah-smith", name: "Noah Smith", role: "Student", note: "Grade 4", tribe: "Lamanites", color: "teal" },
      { id: "ella-smith", name: "Ella Smith", role: "Student", note: "Grade 2", tribe: "Jaredites", color: "orange" },
      { id: "benjamin-smith", name: "Benjamin Smith", role: "Student", note: "Grade K", tribe: "Mulekites", color: "purple" }
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
    addingMember: false, addingToConversationId: null, classJoinRequests: [], showJoinable: false, newMessageFilter: "All", settingsDetail: "", authMode: "signin", error: ""
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
let familyLink = null;
let activeFamilyId = null;
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
let isBusy = false;

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
const activeIdentityId = () => state.activeMemberId || authUser?.uid || "demo";
const currentRole = () => remoteMode
  ? (activeIdentityId() === authUser?.uid ? titleRole(userProfile?.role) : titleRole(activeFamilyMember()?.role || "student"))
  : state.currentUser.role;
const verifiedRole = () => remoteMode && activeIdentityId() !== authUser?.uid ? "Student" : currentRole();
const canManageSchool = () => ["Teacher", "Presidency", "Admin"].includes(verifiedRole());
const canAdmin = () => ["Presidency", "Admin"].includes(verifiedRole());
const isAdmin = () => verifiedRole() === "Admin";
const isSignedIn = () => remoteMode ? Boolean(authUser && userProfile?.status === "active") : state.isDemoSignedIn;

function brand(extra = "") {
  return `<div class="brand ${extra}" aria-label="Called to Communicate, Called to Learn Academy">
    <svg class="brand-mark" viewBox="0 0 126 94" role="img" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 73c21-17 39-15 56-2 16-14 35-16 58 0M8 81c20-11 37-10 54 0 19-10 37-11 58 0M22 70c10-14 22-25 32-36 6-7 8-16 7-25-7 6-11 13-12 23M53 53c-4-16-4-29 1-42M65 69c-2-18 3-30 14-39 7-6 13-9 21-9-8 13-17 21-28 28M65 67c4-15 14-25 28-31"/>
        <circle cx="61" cy="7" r="5" fill="currentColor"/><circle cx="75" cy="18" r="4.5" fill="currentColor"/>
        <path d="M61 13c6 7 8 13 8 20M54 26c4 5 7 10 8 17"/>
      </g>
    </svg>
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
function showListenerError(source, error) {
  console.error(`[Firestore] ${source}`, error);
  const code = String(error?.code || "").replace(/^firestore\//, "");
  const detail = code || error?.message || "Unknown error";
  showToast(`${source}: ${detail}`);
}
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
function header({ action = "new-message", title = "" } = {}) {
  return `<header class="mobile-header">${brand()}${title ? `<strong class="mobile-head-title">${esc(title)}</strong>` : ""}<div class="header-actions">
    <button class="round-button primary" aria-label="${action === "new-message" ? "New message" : "Add"}" data-action="${action}">${icon(action === "new-message" ? "compose" : "plus")}</button>
    <button class="profile-button" aria-label="Switch account" data-action="account">${avatar({ ...state.currentUser, color: "blue" })}</button>
  </div></header>`;
}

function render() {
  const app = $("#app");
  if (!app) return;
  document.body.classList.toggle("chat-open", state.page === "chat");
  if (!isSignedIn()) {
    app.innerHTML = remoteMode && authUser && userProfile?.status !== "active" ? renderVerification() : renderAuth();
    return;
  }
  let page = "";
  if (state.page === "chat") page = renderChat();
  else if (state.page === "new-message") page = renderNewMessage();
  else if (state.page === "family") page = renderFamily();
  else if (state.page === "account") page = renderAccount();
  else if (state.page === "account-picker") page = renderAccountPicker();
  else if (state.page === "settings-detail") page = renderSettingsDetail();
  else if (state.page === "class-detail") page = renderClassDetail();
  else if (state.page === "event-detail") page = renderEventDetail();
  else if (state.page === "create-event") page = renderCreateEvent();
  else if (state.page === "create-personal-event") page = renderCreatePersonalEvent();
  else if (state.page === "create-class") page = renderCreateClass();
  else if (state.page === "create-announcement") page = renderCreateAnnouncement();
  else if (state.page === "edit-chat") page = renderEditChat();
  else page = renderHome();
  const hideTabs = ["chat", "account-picker"].includes(state.page);
  app.innerHTML = `<div class="app-layout">${rail()}<main class="main-column">${page}</main></div>${hideTabs ? "" : tabBar()}`;
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
      <button class="button primary wide" type="submit" ${isBusy ? "disabled" : ""}>${isBusy ? "Please wait…" : creating ? "Create account" : "Sign In"}</button>
    </form>
    ${creating ? "" : `<button class="auth-switch mt-12" data-action="reset-password">Forgot password?</button>`}
    <p class="demo-note">${remoteMode ? "Your school Firebase project is connected." : "Preview the screens and interactions using sample school data."}<br><button class="auth-switch" data-action="auth-mode">${creating ? "Already have an account? Sign in" : "Need an account? Create one"}</button></p>
    ${remoteMode ? "" : `<button class="button wide mt-12" data-action="demo-signin">Preview the app</button>`}
  </section></main>`;
}

function renderVerification() {
  const pending = userProfile?.status === "pending";
  return `<main class="verify-state"><section class="card verify-card"><div class="item-icon" style="margin:0 auto 14px;width:56px;height:56px">${icon(pending ? "clock" : "shield")}</div><h1>${pending ? "Account awaiting verification" : "School access required"}</h1><p class="page-subtitle">${pending ? "Your account has been created. Called to Learn Academy staff must verify your role before school information becomes available." : "This account is not currently approved for Called to Learn Academy."}</p><button class="button ghost mt-12" data-action="sign-out">Sign out</button></section></main>`;
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
  const familyRoles = remoteMode ? ["Parent", "Student", "Teacher", "Presidency"] : roles;
  const canManageFamily = !remoteMode || (familyLink?.accountType === "owner" && activeIdentityId() === authUser?.uid);
  const memberForm = state.addingMember && canManageFamily ? `<form id="family-member-form" class="card" style="padding:15px;margin:12px 0">
    <div class="form-field"><label for="member-account-type">Account type</label><select id="member-account-type" name="accountType"><option value="managed">Managed subaccount · shares this login</option><option value="linked">Link a personal account</option></select></div>
    <div class="form-field"><label for="member-name">Full name</label><input id="member-name" name="name" required placeholder="Family member name"></div>
    <div class="form-field"><label for="member-email">Personal account email (linked only)</label><input id="member-email" name="email" type="email" autocomplete="off" placeholder="member@example.com"><span class="item-subtitle">The person signs in to their existing school account and enters the invitation code. No duplicate profile is created.</span></div>
    <div class="form-field"><label for="member-role">Role</label><select id="member-role" name="role">${familyRoles.map((role) => `<option>${role}</option>`).join("")}</select><span class="item-subtitle">Linked accounts keep their verified school role. Staff tools require a separate school-approved login.</span></div>
    <div class="form-field"><label for="member-grade">Grade (optional)</label><input id="member-grade" name="grade" placeholder="e.g. Grade 6"></div>
    <div class="form-field"><label for="member-tribe">Tribe</label><select id="member-tribe" name="tribe"><option>Lamanites</option><option>Nephites</option><option>Jaredites</option><option>Mulekites</option></select></div>
    <div style="display:flex;gap:8px"><button class="button primary" type="submit">Add or Invite</button><button class="button ghost" type="button" data-action="cancel-member">Cancel</button></div></form>` : "";
  const memberRows = family.members.map((member) => `<div class="list-item">
      <button class="member-select family-member-row ${state.activeMemberId === member.id ? "active" : ""}" data-action="switch-member" data-id="${esc(member.id)}" ${canSelectFamilyMember(member) ? "" : "disabled"}>
      <span class="avatar small ${esc(member.color || "purple")}">${esc(member.initials || member.name.split(/\s+/).map((part) => part[0]).slice(0,2).join(""))}</span>
      <span class="item-copy"><span class="item-title">${esc(member.name)}</span><span class="item-subtitle">${esc(roleDetail(member.role, member))} · ${member.accountType === "managed" ? "Shared family login" : member.accountType === "owner" ? "Account holder" : "Linked personal login"}</span>${member.tribe ? `<span class="item-subtitle">${icon("users")} Tribe: ${esc(member.tribe)}</span>` : ""}</span>
    </button>
    ${canManageFamily && member.accountType !== "owner" ? `<span class="family-member-actions">${member.accountType === "managed" ? `<button class="icon-button" aria-label="Edit ${esc(member.name)}" data-action="edit-member" data-id="${esc(member.id)}">${icon("compose")}</button><button class="button ghost" data-action="make-member-independent" data-id="${esc(member.id)}">Create login</button>` : ""}<button class="icon-button danger-text" aria-label="Unlink ${esc(member.name)}" data-action="remove-family-member" data-id="${esc(member.id)}">${icon("back")}</button></span>` : icon(state.activeMemberId === member.id ? "check" : "chevron", "row-chevron")}
  </div>`).join("");
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="tab" data-tab="settings">${icon("back")} Settings</button><div class="page-title-row"><div><h1 class="page-title">Family Account</h1><p class="page-subtitle">Manage family profiles and linked personal accounts.</p></div></div>
    <div class="family-summary card"><span class="item-icon" style="width:64px;height:64px;border-radius:50%">${icon("home")}</span><div class="family-copy"><h2>${esc(family.name)}</h2><p>${family.members.length} members · ${familyLink?.accountType === "linked" ? "linked personal account" : "family login"}</p></div>${canManageFamily ? `<button class="button ghost" data-action="edit-family">${icon("compose")}Edit Family</button>` : ""}</div>
    <div class="section-heading"><h2>Family Members</h2>${canManageFamily ? `<button class="button" data-action="add-member">${icon("plus")}Add Family Member</button>` : ""}</div>${memberForm}
    <div class="card card-list">${memberRows || `<div class="empty-state">No family members have been added yet.</div>`}</div>
    ${canManageFamily ? `<div class="notice-card mt-12"><strong>About family accounts</strong>Managed profiles share the family login and keep their own roles, classes, messages, calendars, and settings. Linked members keep their own Firebase login and school profile.</div>` : `<div class="notice-card mt-12"><strong>Linked personal account</strong>Your login and school profile remain independent. Family membership does not grant access to your private chats or settings.</div>`}</section>`;
}

function renderFamilySetup() {
  const canCreate = ["Parent", "Admin"].includes(verifiedRole());
  return `<section class="page">${header({ action: "account" })}<button class="back-link" data-action="tab" data-tab="settings">${icon("back")} Settings</button><div class="page-title-row"><div><h1 class="page-title">Family Account</h1><p class="page-subtitle">Create a family login or link your existing account to an invitation.</p></div></div>
    ${canCreate ? `<div class="notice-card"><strong>Together at School</strong>Managed subaccounts share this login while keeping individual school roles, classes, chats, calendars, and settings.</div><form id="family-create-form" class="card" style="padding:16px"><div class="form-field"><label>Family name</label><input name="name" required value="The ${(state.currentUser.name.split(/\s+/).slice(-1)[0] || "Family")} Family"></div><div class="form-field"><label>Your tribe</label><select name="tribe"><option>Lamanites</option><option>Nephites</option><option>Jaredites</option><option>Mulekites</option></select></div><button class="button primary wide" type="submit">Create Family Account</button></form>` : ""}
    <div class="section-heading"><h2>Link a personal account</h2></div><p class="page-subtitle">Sign in to your existing school account, then enter the code from your family account holder.</p><form id="family-link-form" class="card" style="padding:16px"><div class="form-field"><label>Family invitation code</label><input name="code" required autocomplete="one-time-code" placeholder="Paste your invitation code"></div><button class="button primary wide" type="submit">Link My Existing Account</button></form></section>`;
}

function renderAccountPicker() {
  const selectable = state.family.members.filter(canSelectFamilyMember);
  return `<section class="page account-picker-page">${brand()}<div class="page-title-row"><div><h1 class="page-title">Who is using Called to Communicate?</h1><p class="page-subtitle">Choose a family profile. Each profile has its own role, classes, messages, calendar, and settings.</p></div></div><div class="card card-list">${selectable.map((member) => `<button class="member-select ${state.activeMemberId === member.id ? "active" : ""}" data-action="switch-member" data-id="${esc(member.id)}">${avatar(member, "small")}<span class="member-copy"><b>${esc(member.name)}</b><span>${esc(roleDetail(member.role, member))}</span></span>${icon("chevron")}</button>`).join("")}</div>${selectable.length === 1 ? `<button class="button primary wide" data-action="continue-account">Continue as ${esc(selectable[0].name)}</button>` : ""}<button class="button ghost wide" data-action="sign-out">Sign out</button></section>`;
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
  const conversation = state.conversations.find((item) => item.id === id);
  if (conversation) conversation.unread = 0;
  if (messageUnsubscribe) messageUnsubscribe();
  if (backend?.enabled && authUser) {
    messageUnsubscribe = backend.subscribeMessages(id, (messages) => {
      state.messages[id] = messages.map((message) => ({
        ...message, sender: message.senderName, mine: (message.senderProfileId || message.senderUid) === activeIdentityId(),
        time: timeLabel(timestampToDate(message.createdAt)), senderInitials: (message.senderName || "CT").split(/\s+/).map((part) => part[0]).slice(0, 2).join("")
      }));
      persist();
      if (state.page === "chat" && state.activeConversationId === id) render();
    }, (error) => showListenerError("Messages", error));
  }
  persist(); render();
}

function stopListeners() {
  [messageUnsubscribe, conversationUnsubscribe, classesUnsubscribe, eventsUnsubscribe, identityProfileUnsubscribe, directoryUnsubscribe, familyUnsubscribe, familyMembersUnsubscribe, pendingUsersUnsubscribe, joinRequestsUnsubscribe].forEach((unsubscribe) => unsubscribe?.());
  messageUnsubscribe = conversationUnsubscribe = classesUnsubscribe = eventsUnsubscribe = identityProfileUnsubscribe = directoryUnsubscribe = familyUnsubscribe = familyMembersUnsubscribe = pendingUsersUnsubscribe = joinRequestsUnsubscribe = null;
}
function connectDataListeners() {
  if (!backend?.enabled || !authUser) return;
  stopListeners();
  state.conversations = [];
  state.messages = {};
  state.activeConversationId = null;
  state.classes = [];
  state.events = [];
  identityProfileUnsubscribe = backend.subscribeIdentityProfile(activeIdentityId(), (profile) => {
    if (!profile) return;
    const memberPrefs = profile.settings?.notificationPrefs || {};
    const accountPrefs = activeIdentityId() === authUser.uid ? userProfile?.notificationPrefs || {} : {};
    state.notificationPrefs = { messages: true, announcements: true, events: true, ...accountPrefs, ...memberPrefs };
    if (state.page === "settings-detail" && state.settingsDetail === "notifications") render();
  }, (error) => showListenerError("Profile settings", error));
  conversationUnsubscribe = backend.subscribeConversations(authUser.uid, activeIdentityId(), (items) => {
    state.conversations = items.map((item) => ({
      ...item,
      title: item.title || item.memberNames?.filter((name) => name !== state.currentUser.name).join(", ") || "Conversation",
      kind: item.kind || "group", preview: item.lastMessage?.text || "Start a conversation",
      time: timeLabel(timestampToDate(item.updatedAt)), unread: 0,
      color: item.color || "purple", members: item.memberNames || []
    }));
    persist(); if (state.page !== "chat") render();
  }, (error) => showListenerError("Conversation list", error));
  classesUnsubscribe = backend.subscribeClasses(SCHOOL_ID, (items) => {
    state.classes = items.map((item) => ({ ...item, joined: Array.isArray(item.memberProfileIds) ? item.memberProfileIds.includes(activeIdentityId()) : item.memberUids?.includes(authUser.uid) || false, color: item.color || "purple", note: item.description || "Class updates and resources" }));
    persist(); if (state.activeTab === "classes" || state.page === "class-detail") render();
  }, (error) => showListenerError("Classes", error));
  eventsUnsubscribe = backend.subscribeEvents(SCHOOL_ID, activeIdentityId(), (items) => {
    state.events = items.map((item) => ({ ...item, date: item.date, time: item.time, color: item.color || "purple" }));
    persist(); if (state.activeTab === "calendar") render();
  }, (error) => showListenerError("Calendar", error));
  directoryUnsubscribe = backend.subscribeDirectory(SCHOOL_ID, (items) => {
    directory = items;
    if (state.page === "new-message" || (state.page === "settings-detail" && state.settingsDetail === "admin")) render();
  }, (error) => showListenerError("School directory", error));
  if (activeFamilyId) {
    familyUnsubscribe = backend.subscribeFamily(activeFamilyId, (family) => {
      if (family) {
        state.family = { ...state.family, name: family.name || "Family Account", tribe: family.tribe || "Lamanites" };
        persist(); if (state.page === "family" || state.page === "account") render();
      }
    }, (error) => showListenerError("Family account", error));
    const canListFamilyMembers = familyLink?.accountType === "owner" && activeIdentityId() === authUser.uid;
    if (familyLink?.accountType === "linked" || canListFamilyMembers) {
      familyMembersUnsubscribe = backend.subscribeFamilyMembers(activeFamilyId, authUser.uid, canListFamilyMembers, (members) => {
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
        promptAccountPickerAfterFamilyLoad = false;
        if (familyLink?.accountType === "owner" && state.family.members.filter(canSelectFamilyMember).length > 1) state.page = "account-picker";
      }
      persist(); if (["family", "account", "account-picker"].includes(state.page)) render();
      }, (error) => showListenerError("Family members", error));
    }
  }
  if (canAdmin()) {
    pendingUsersUnsubscribe = backend.subscribePendingUsers((users) => {
      state.pendingUsers = users.filter((user) => user.schoolId === SCHOOL_ID);
      persist(); if (state.page === "settings-detail" && ["admin", "users"].includes(state.settingsDetail)) render();
    }, (error) => showListenerError("Pending accounts", error));
  }
}

async function handleAuthUser(user) {
  authUser = user;
  if (!user) {
    userProfile = null; familyLink = null; activeFamilyId = null; remoteMode = Boolean(backend?.enabled);
    promptAccountPickerAfterFamilyLoad = false;
    state.family.members = []; state.conversations = []; state.messages = {}; state.activeConversationId = null;
    state.classes = []; state.events = []; render(); return;
  }
  remoteMode = true;
  try {
    userProfile = await backend.getUserProfile(user.uid);
    if (userProfile) {
      familyLink = await backend.getFamilyLink(user.uid);
      if (!familyLink && userProfile.familyId) familyLink = await backend.getOwnerFamilyLink(user.uid, userProfile.familyId);
      if (userProfile.status === "active") await backend.ensureIdentityProfile(user.uid, userProfile, familyLink);
      activeFamilyId = familyLink?.status === "active" ? familyLink.familyId : null;
      promptAccountPickerAfterFamilyLoad = familyLink?.accountType === "owner";
      if (familyLink?.accountType === "owner" && userProfile.activeMemberId && userProfile.activeMemberId !== user.uid) {
        await backend.setActiveMember(user.uid, user.uid);
        userProfile.activeMemberId = user.uid;
      }
      state.conversations = [];
      state.classes = [];
      state.events = [];
      state.messages = {};
      state.pendingUsers = [];
      state.family = { name: "Family Account", tribe: "Lamanites", members: [] };
      state.currentUser = { ...state.currentUser, name: userProfile.displayName || user.displayName || "School member", email: user.email, role: titleRole(userProfile.role), initials: (userProfile.displayName || user.displayName || "CT").split(/\s+/).map((part) => part[0]).slice(0,2).join("") };
      state.notificationPrefs = { ...state.notificationPrefs, ...(userProfile.notificationPrefs || {}) };
      state.activeMemberId = familyLink?.accountType === "linked" ? (familyLink.memberId || user.uid) : (userProfile.activeMemberId || user.uid);
      state.page = "home";
      connectDataListeners();
    }
  } catch (error) { state.error = error.message || "Unable to read this account."; }
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
    catch (error) { showToast(error.message || "Message could not be sent."); input.value = text; }
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
    } catch (error) { showToast(error.message || "Could not add members."); }
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
      conversation.id = await backend.createConversation(conversation);
      state.conversations = [{ ...conversation, unread: 0, time: "Now" }, ...state.conversations.filter((item) => item.id !== conversation.id)];
    }
    else conversation.id = `new-${Date.now()}`;
    if (!backend?.enabled) { state.conversations.unshift({ ...conversation, id: conversation.id, unread: 0, time: "Now" }); state.messages[conversation.id] = []; persist(); }
    state.selectedPersonIds = [];
    openChat(conversation.id);
  } catch (error) { showToast(error.message || "Could not create chat."); }
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

async function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id, tab, filter, key, role, date, value } = target.dataset;
  if (target.tagName.toLowerCase() === "button" && target.type === "submit" && target.form) return;
  switch (action) {
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
        localSwitchToMember(member);
        if (remoteMode && authUser) {
          try { await backend.setActiveMember(authUser.uid, member.id); }
          catch (error) { showToast(error.message || "Profile selection could not be saved."); break; }
          userProfile.activeMemberId = member.id;
          connectDataListeners();
        }
        state.page = "home"; persist(); render(); showToast(`Switched to ${member.name}`);
      }
      break;
    }
    case "continue-account": state.page = "home"; persist(); render(); break;
    case "switch-role":
      if (!remoteMode && roles.includes(role)) { state.currentUser.role = role; persist(); render(); showToast(`Previewing ${role} view`); }
      break;
    case "family": state.page = "family"; render(); break;
    case "settings-detail": state.page = "settings-detail"; state.settingsDetail = key; render(); break;
    case "approve-user": {
      const select = $(`#approve-role-${CSS.escape(id)}`);
      const role = select?.value || "student";
      if (backend?.enabled && canAdmin()) {
        try { await backend.approveUser(id, role); showToast(`Account approved as ${titleRole(role)}.`); }
        catch (error) { showToast(error.message || "Account could not be approved."); }
      }
      break;
    }
    case "change-user-role": {
      if (!backend?.enabled || !isAdmin()) break;
      const select = $(`#staff-role-${CSS.escape(id)}`);
      if (!select) break;
      try {
        await backend.setUserRole(id, select.value);
        showToast(`Role updated to ${titleRole(select.value)}.`);
      } catch (error) { showToast(error.message || "Role could not be changed."); }
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
      } catch (error) { showToast(error.message || "Attachment could not be downloaded."); }
      break;
    }
    case "add-member": state.addingMember = true; render(); break;
    case "cancel-member": state.addingMember = false; render(); break;
    case "edit-family": {
      const name = prompt("Family account name", state.family.name);
      if (name?.trim()) {
        if (backend?.enabled && activeFamilyId) {
          try { await backend.updateFamily(activeFamilyId, { name: name.trim() }); }
          catch (error) { showToast(error.message || "Family name could not be saved."); break; }
        }
        state.family.name = name.trim(); persist(); render();
      }
      break;
    }
    case "edit-member": {
      const member = state.family.members.find((entry) => entry.id === id);
      if (member) {
        const name = prompt("Family member name", member.name);
        if (name?.trim()) {
          const updates = { name: name.trim() };
          if (member.accountType === "managed") {
            const role = prompt("School role: Parent, Student, Teacher, or Presidency", member.role);
            if (role && ["Parent", "Student", "Teacher", "Presidency"].includes(role)) updates.role = role;
            updates.grade = prompt("Grade (leave blank if not applicable)", member.note || "") || "";
            updates.tribe = prompt("Tribe", member.tribe || "") || "";
          }
          try {
            if (backend?.enabled && activeFamilyId) await backend.updateFamilyMember(activeFamilyId, id, updates);
            Object.assign(member, updates, { note: updates.grade ?? member.note });
            persist(); render(); showToast("Family profile updated.");
          } catch (error) { showToast(error.message || "Family profile could not be updated."); }
        }
      }
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
      } catch (error) { showToast(error.message || "Independent login could not be created."); }
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
      } catch (error) { showToast(error.message || "Family member could not be unlinked."); }
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
        catch (error) { showToast(error.message || "Could not request to join."); }
      } else { item.joined = true; item.members++; persist(); showToast(`You joined ${item.name}.`); }
      render(); break;
    }
    case "respond-join": {
      if (!backend?.enabled || !authUser) { showToast("Connect Firebase to review class enrollment requests."); break; }
      try {
        const approved = target.dataset.approve === "true";
        await backend.respondToClassJoin(state.activeClassId, target.dataset.userId, approved);
        showToast(approved ? "Student added to the class." : "Enrollment request declined.");
      } catch (error) { showToast(error.message || "Could not review this request."); }
      break;
    }
    case "demo-signin": state.isDemoSignedIn = true; state.currentUser = { name: "Emma Smith", email: "emma.smith@example.com", role: "Student", color: "blue", initials: "ES" }; state.activeMemberId = "emma-smith"; state.page = "home"; persist(); render(); break;
    case "auth-mode": state.authMode = state.authMode === "signin" ? "signup" : "signin"; state.error = ""; render(); break;
    case "sign-out":
      if (backend?.enabled && authUser) { await backend.signOut(); stopListeners(); }
      state.isDemoSignedIn = false; state.currentUser = { name: "Emma Smith", email: "emma.smith@example.com", role: "Student", color: "blue", initials: "ES" }; state.page = "home"; persist(); render(); break;
    case "delete-chat":
      if (confirm(`Delete “${activeConversation().title}” for all members? This cannot be undone.`)) {
        if (backend?.enabled && authUser) {
          try { await backend.deleteConversation(state.activeConversationId, activeIdentityId()); }
          catch (error) { showToast(error.message || "Conversation could not be deleted."); break; }
        } else { state.conversations = state.conversations.filter((entry) => entry.id !== state.activeConversationId); delete state.messages[state.activeConversationId]; }
        state.pinnedConversationIds = state.pinnedConversationIds.filter((conversationId) => conversationId !== state.activeConversationId);
        state.page = "home"; state.activeTab = "messages"; persist(); render(); showToast("Conversation deleted.");
      }
      break;
    case "leave-chat":
      if (backend?.enabled && authUser) {
        try { await backend.leaveConversation(state.activeConversationId, activeIdentityId()); }
        catch (error) { showToast(error.message || "Could not leave this conversation."); break; }
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

function handleInput(event) {
  const target = event.target;
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
  }
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
        ? await backend.signUp(email, password, String(data.get("displayName") || "").trim(), String(data.get("requestedRole") || "Student").toLowerCase())
        : await backend.signIn(email, password);
      if (credential?.user) await handleAuthUser(credential.user);
    } catch (error) { state.error = authMessage(error); }
    isBusy = false; render(); return;
  }
  if (form.id === "message-form") { await submitMessage(form); return; }
  if (form.id === "profile-form") {
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
        } catch (error) { showToast(error.message || "Profile could not be saved."); return; }
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
    if (backend?.enabled && authUser && activeFamilyId) {
      const email = String(data.get("email") || "").trim();
      if (accountType === "linked" && !email) { showToast("Enter the email address for the existing personal account."); return; }
      try {
        const invitation = await backend.addFamilyMember(activeFamilyId, { name, email, role, grade, tribe, accountType });
        state.addingMember = false;
        if (invitation?.code) {
          try { await navigator.clipboard.writeText(invitation.code); showToast(`Invitation code copied. Send it to ${name}; they must sign in with ${email}.`); }
          catch { prompt(`Send this invitation code to ${name} (${email}):`, invitation.code); }
        } else showToast(`${name}’s managed subaccount was added.`);
        persist(); render(); return;
      } catch (error) { showToast(error.message || "Family member could not be added."); return; }
    }
    state.family.members.push({ id: `member-${Date.now()}`, name, role, note: grade, tribe, accountType: "managed", color: colorClasses[(state.family.members.length % (colorClasses.length - 1)) + 1] }); state.addingMember = false; persist(); render(); showToast(`${name} added to your family.`);
  } else if (form.id === "family-create-form") {
    const name = String(data.get("name") || "").trim();
    const tribe = String(data.get("tribe") || "Lamanites");
    if (!name) return;
    if (backend?.enabled && authUser) {
      try {
        familyLink = null;
        const familyId = await backend.createFamily(authUser.uid, { name, tribe, ownerName: userProfile?.displayName || authUser.displayName || "Family Account Holder" });
        activeFamilyId = familyId;
        familyLink = { familyId, memberId: authUser.uid, accountType: "owner", status: "active" };
        userProfile.activeMemberId = authUser.uid;
        state.family = { name, tribe, members: [{ id: authUser.uid, uid: authUser.uid, email: authUser.email, name: state.currentUser.name, role: "Parent", note: "Account Holder", accountType: "owner", color: "purple" }] };
        connectDataListeners(); state.page = "family"; persist(); render(); showToast("Family account created.");
      } catch (error) { showToast(error.message || "Family account could not be created."); }
    } else {
      state.family.name = name; state.family.tribe = tribe; state.page = "family"; persist(); render();
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
    } catch (error) { showToast(error.message || "This account could not be linked."); }
  } else if (form.id === "event-form") {
    const eventRecord = { id: `event-${Date.now()}`, title: String(data.get("title") || "").trim(), date: String(data.get("date") || todayKey), time: new Date(`2000-01-01T${data.get("time")}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), kind: String(data.get("kind") || "event"), detail: String(data.get("detail") || "").trim(), link: String(data.get("link") || "").trim(), color: "purple" };
    try {
      if (backend?.enabled && authUser) await backend.createEvent(eventRecord);
      else { state.events.push(eventRecord); persist(); }
      state.selectedDate = eventRecord.date; state.activeTab = "calendar"; state.page = "home"; render(); showToast("School event saved.");
    } catch (error) { showToast(error.message || "Event could not be saved."); }
  } else if (form.id === "personal-event-form") {
    const eventRecord = { title: String(data.get("title") || "").trim(), date: String(data.get("date") || todayKey), time: new Date(`2000-01-01T${data.get("time")}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), kind: String(data.get("kind") || "event"), detail: String(data.get("detail") || "").trim(), link: "", color: "purple" };
    try {
      if (backend?.enabled && authUser) await backend.createPersonalEvent(activeIdentityId(), eventRecord);
      else { state.events.push({ ...eventRecord, id: `personal-${Date.now()}`, calendarScope: "personal" }); persist(); }
      state.selectedDate = eventRecord.date; state.activeTab = "calendar"; state.page = "home"; render(); showToast("Added to this profile’s calendar.");
    } catch (error) { showToast(error.message || "Personal calendar item could not be saved."); }
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
    } catch (error) { showToast(error.message || "Class could not be created."); }
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
        const id = await backend.createConversation(conversation);
        await backend.sendMessage(id, { senderName: state.currentUser.name, senderUid: authUser.uid, senderProfileId: activeIdentityId(), senderInitials: state.currentUser.initials, text });
      } else {
        conversation.id = `announcement-${Date.now()}`; conversation.time = "Now"; conversation.unread = 0;
        state.conversations.unshift(conversation); state.messages[conversation.id] = [{ sender: state.currentUser.name, senderName: state.currentUser.name, senderUid: "demo", text, time: "Now", mine: true }]; persist();
      }
      state.activeTab = "messages"; state.page = "home"; state.filter = "Announcements"; render(); showToast("Announcement published.");
    } catch (error) { showToast(error.message || "Announcement could not be published."); }
  } else if (form.id === "edit-chat-form") {
    const conversation = activeConversation();
    const updates = { title: String(data.get("title") || "").trim(), description: String(data.get("description") || "").trim() };
    if (backend?.enabled && authUser) {
      try { await backend.updateConversation(conversation.id, updates); }
      catch (error) { showToast(error.message || "Chat settings could not be saved."); return; }
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
    catch (error) { showToast(error.message || "File upload failed."); event.target.value = ""; return; }
  }
  const senderName = state.currentUser.name;
  const message = { senderName, senderUid: authUser?.uid || "demo", senderProfileId: activeIdentityId(), sender: senderName, senderInitials: state.currentUser.initials, text: "", mine: true, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), attachmentName: attachment.name, attachmentSize: attachment.size, attachmentType: attachment.type, attachmentUrl: attachment.url, attachmentPath: attachment.path };
  if (backend?.enabled && authUser) {
    try { await backend.sendMessage(conversation.id, message); }
    catch (error) { showToast(error.message || "Attachment message could not be sent."); }
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
    } catch (error) { showToast(error.message || "Notification preference could not be saved."); }
  }
}

document.addEventListener("click", (event) => { handleClick(event).catch((error) => showToast(error.message || "Something went wrong.")); });
document.addEventListener("input", handleInput);
document.addEventListener("submit", (event) => { handleSubmit(event).catch((error) => showToast(error.message || "Something went wrong.")); });
document.addEventListener("change", (event) => { if (event.target.id === "file-picker") handleFileChange(event); else handlePreference(event); });

async function boot() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./service-worker.js?v=14").catch(() => {});
  render();
  backend = await connectFirebase((user) => {
    pendingAuthUser = user;
    if (backend?.enabled) handleAuthUser(user).catch((error) => showToast(error.message || "Could not load your account."));
  }, (error) => {
    if (error) showToast(error.message || "Firebase connection failed.");
  });
  remoteMode = Boolean(backend?.enabled);
  if (backend?.enabled) {
    if (pendingAuthUser) await handleAuthUser(pendingAuthUser);
    else render();
  } else render();
}
boot();
