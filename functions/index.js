const { randomBytes } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

async function requireActiveSchoolUser(uid) {
  const snapshot = await db.doc(`users/${uid}`).get();
  const user = snapshot.data();
  if (!snapshot.exists || user.status !== "active" || user.schoolId !== "ctla") {
    throw new HttpsError("permission-denied", "An approved Called to Learn Academy account is required.");
  }
  return user;
}

async function getOwnedIdentityProfile(uid, identityId, user) {
  if (identityId === uid) {
    const profile = await db.doc(`profiles/${uid}`).get();
    return profile.exists ? profile.data() : { displayName: user.displayName };
  }
  const snapshot = await db.doc(`profiles/${identityId}`).get();
  if (!snapshot.exists) throw new HttpsError("permission-denied", "This family profile is not available to your account.");
  const profile = snapshot.data();
  const isManaged = profile.accountType === "managed" && profile.managerUid === uid;
  const isIndependent = profile.accountType !== "managed";
  if (profile.ownerUid !== uid || profile.status !== "active" || (!isManaged && !isIndependent)) {
    throw new HttpsError("permission-denied", "This family profile is not available to your account.");
  }
  return profile;
}

async function getActiveIdentityProfile(uid, requestedIdentityId, user) {
  const linkSnapshot = await db.doc(`familyLinks/${uid}`).get();
  const linkedIdentityId = linkSnapshot.exists && linkSnapshot.data().status === "active"
    ? linkSnapshot.data().memberId : null;
  const activeIdentityId = user.activeMemberId || linkedIdentityId || uid;
  if (requestedIdentityId && requestedIdentityId !== activeIdentityId) {
    throw new HttpsError("permission-denied", "Switch to this family profile before using it.");
  }
  return { identityId: activeIdentityId, profile: await getOwnedIdentityProfile(uid, activeIdentityId, user) };
}

async function getConversationParticipant(uid) {
  const [user, directorySnapshot, linkSnapshot] = await Promise.all([
    requireActiveSchoolUser(uid),
    db.doc(`directory/${uid}`).get(),
    db.doc(`familyLinks/${uid}`).get()
  ]);
  const directory = directorySnapshot.data();
  if (!directorySnapshot.exists || directory.schoolId !== "ctla" || directory.status !== "active") {
    throw new HttpsError("failed-precondition", "Only approved Called to Learn Academy accounts can join a conversation.");
  }
  const link = linkSnapshot.exists ? linkSnapshot.data() : null;
  const identityId = link?.status === "active" && link.accountType === "linked" ? link.memberId : uid;
  const profile = await getOwnedIdentityProfile(uid, identityId, user);
  return { uid, identityId, name: profile.displayName || directory.displayName || user.displayName || "School member" };
}

exports.createClass = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before creating a class.");
  const uid = request.auth.uid;
  const user = await requireActiveSchoolUser(uid);
  const identityId = String(request.data?.identityId || uid);
  const { profile: identityProfile } = await getActiveIdentityProfile(uid, identityId, user);
  const role = String(identityProfile.role || (identityId === uid ? user.role : "student")).toLowerCase();
  if (!new Set(["teacher", "presidency"]).has(role) && !(identityId === uid && role === "admin")) {
    throw new HttpsError("permission-denied", "Only an approved teacher, Presidency, or Admin can create a class.");
  }
  const name = String(request.data?.name || request.data?.title || "").trim();
  const teacher = String(request.data?.teacher || user.displayName || "Teacher").trim();
  const description = String(request.data?.description || "").trim();
  const openEnrollment = request.data?.openEnrollment === true;
  if (!name || name.length > 100 || teacher.length > 100 || description.length > 400) {
    throw new HttpsError("invalid-argument", "Enter a class name, teacher, and description within the size limits.");
  }

  const displayName = identityProfile.displayName || user.displayName || request.auth.token.name || teacher;

  const classRef = db.collection("classes").doc();
  const conversationRef = db.collection("conversations").doc();
  const memberNames = [displayName];
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(classRef, {
    name, title: name, teacher, teacherUid: uid, teacherProfileId: identityId, description, openEnrollment,
    memberUids: [uid], memberProfileIds: [identityId], memberCount: 1, members: 1, color: "purple", icon: "cap",
    schoolId: "ctla", chatId: conversationRef.id, createdAt: now, updatedAt: now
  });
  batch.set(conversationRef, {
    title: name, kind: "class", classId: classRef.id, schoolId: "ctla",
    createdBy: uid, createdByIdentityId: identityId, createdByRole: role, memberUids: [uid], memberProfileIds: [identityId], memberNames,
    members: memberNames, memberCount: 1, color: "purple", preview: "Class chat is ready",
    createdAt: now, updatedAt: now
  });
  await batch.commit();
  return { classId: classRef.id };
});

exports.joinClass = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before joining a class.");
  const uid = request.auth.uid;
  const user = await requireActiveSchoolUser(uid);
  const identityId = String(request.data?.identityId || uid);
  const { profile: identityProfile } = await getActiveIdentityProfile(uid, identityId, user);
  const identityName = identityProfile.displayName || user.displayName || request.auth.token.name || "School member";
  const classId = String(request.data?.classId || "");
  if (!classId || classId.includes("/")) throw new HttpsError("invalid-argument", "Class ID is required.");
  const classRef = db.doc(`classes/${classId}`);
  const classSnapshot = await classRef.get();
  if (!classSnapshot.exists || classSnapshot.data().schoolId !== "ctla") throw new HttpsError("not-found", "Class not found.");
  const classData = classSnapshot.data();
  if ((classData.memberProfileIds || classData.memberUids || []).includes(identityId)) return { joined: true, alreadyMember: true };
  if (!new Set(["parent", "student"]).has(String(identityProfile.role || "student").toLowerCase())) {
    throw new HttpsError("permission-denied", "Only Parent and Student profiles can request class enrollment.");
  }

  if (!classData.openEnrollment) {
    const requestId = `${uid}_${identityId}`;
    const requestRef = classRef.collection("joinRequests").doc(requestId);
    await requestRef.set({
      uid, identityId, displayName: identityName,
      className: classData.name, status: "pending", createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { joined: false, requested: true, requestId };
  }

  const conversationId = classData.chatId;
  if (!conversationId) throw new HttpsError("failed-precondition", "This class does not have a chat yet. Ask the teacher to reopen it.");
  const conversationRef = db.doc(`conversations/${conversationId}`);
  await db.runTransaction(async (transaction) => {
    const [latestClass, latestConversation] = await Promise.all([transaction.get(classRef), transaction.get(conversationRef)]);
    if (!latestClass.exists || !latestConversation.exists) throw new HttpsError("not-found", "Class or class chat not found.");
    const memberUids = [...new Set([...(latestClass.data().memberUids || []), uid])];
    const memberProfileIds = [...new Set([...(latestClass.data().memberProfileIds || latestClass.data().memberUids || []), identityId])];
    const conversationProfileIds = [...new Set([...(latestConversation.data().memberProfileIds || latestConversation.data().memberUids || []), identityId])];
    const memberNames = [...new Set([...(latestConversation.data().memberNames || []), identityName])];
    transaction.update(classRef, { memberUids, memberProfileIds, memberCount: memberProfileIds.length, members: memberProfileIds.length, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(conversationRef, { memberUids, memberProfileIds: conversationProfileIds, memberNames, members: memberNames, memberCount: conversationProfileIds.length, updatedAt: FieldValue.serverTimestamp() });
    transaction.delete(classRef.collection("joinRequests").doc(`${uid}_${identityId}`));
  });
  return { joined: true, requested: false };
});

exports.respondToClassJoin = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before reviewing class requests.");
  const callerUid = request.auth.uid;
  const caller = await requireActiveSchoolUser(callerUid);
  const { identityId: callerIdentityId, profile: callerProfile } = await getActiveIdentityProfile(callerUid, request.data?.identityId, caller);
  const classId = String(request.data?.classId || "");
  const userId = String(request.data?.userId || "");
  const approve = request.data?.approve === true;
  if (!classId || classId.includes("/") || !userId || userId.includes("/")) throw new HttpsError("invalid-argument", "Class and student IDs are required.");
  const classRef = db.doc(`classes/${classId}`);
  const requestRef = classRef.collection("joinRequests").doc(userId);
  const initialClass = await classRef.get();
  if (!initialClass.exists || initialClass.data().schoolId !== "ctla") throw new HttpsError("not-found", "Class not found.");
  const callerRole = String(callerProfile.role || (callerIdentityId === callerUid ? caller.role : "student")).toLowerCase();
  const classData = initialClass.data();
  const classTeacherId = classData.teacherProfileId || classData.teacherUid;
  const isAdmin = callerIdentityId === callerUid && callerRole === "admin";
  if (callerRole !== "presidency" && !isAdmin && (callerRole !== "teacher" || classTeacherId !== callerIdentityId)) {
    throw new HttpsError("permission-denied", "Only the class teacher, Presidency, or Admin can review enrollment.");
  }
  const pendingSnapshot = await requestRef.get();
  if (!pendingSnapshot.exists || pendingSnapshot.data().status !== "pending") throw new HttpsError("not-found", "This enrollment request is no longer pending.");
  const requestUid = pendingSnapshot.data().uid || userId;
  const identityId = pendingSnapshot.data().identityId || requestUid;
  const memberSnapshot = await db.doc(`directory/${requestUid}`).get();
  if (!memberSnapshot.exists || memberSnapshot.data().schoolId !== "ctla" || memberSnapshot.data().status !== "active") {
    throw new HttpsError("failed-precondition", "This account is no longer an approved school member.");
  }
  const profileSnapshot = identityId === requestUid ? null : await db.doc(`profiles/${identityId}`).get();
  const chatId = initialClass.data().chatId;
  if (approve && !chatId) throw new HttpsError("failed-precondition", "The class chat is missing.");
  const conversationRef = chatId ? db.doc(`conversations/${chatId}`) : null;

  await db.runTransaction(async (transaction) => {
    const reads = [transaction.get(classRef), transaction.get(requestRef)];
    if (approve && conversationRef) reads.push(transaction.get(conversationRef));
    const snapshots = await Promise.all(reads);
    const classSnapshot = snapshots[0], requestSnapshot = snapshots[1], chatSnapshot = snapshots[2];
    if (!classSnapshot.exists || !requestSnapshot.exists || requestSnapshot.data().status !== "pending") {
      throw new HttpsError("not-found", "This enrollment request is no longer pending.");
    }
    if (approve) {
      const memberUids = [...new Set([...(classSnapshot.data().memberUids || []), requestUid])];
      const memberProfileIds = [...new Set([...(classSnapshot.data().memberProfileIds || classSnapshot.data().memberUids || []), identityId])];
      const conversationProfileIds = [...new Set([...(chatSnapshot.data().memberProfileIds || chatSnapshot.data().memberUids || []), identityId])];
      const displayName = profileSnapshot?.data()?.displayName || memberSnapshot.data().displayName || requestSnapshot.data().displayName || "School member";
      const memberNames = [...new Set([...(chatSnapshot.data().memberNames || []), displayName])];
      transaction.update(classRef, { memberUids, memberProfileIds, memberCount: memberProfileIds.length, members: memberProfileIds.length, updatedAt: FieldValue.serverTimestamp() });
      transaction.update(conversationRef, { memberUids, memberProfileIds: conversationProfileIds, memberNames, members: memberNames, memberCount: memberProfileIds.length, updatedAt: FieldValue.serverTimestamp() });
    }
    transaction.delete(requestRef);
  });
  return { approved: approve };
});

exports.approveSchoolUser = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before approving a school account.");
  const callerUid = request.auth.uid;
  const caller = await requireActiveSchoolUser(callerUid);
  const { identityId: callerIdentityId, profile: callerProfile } = await getActiveIdentityProfile(
    callerUid, request.data?.identityId, caller
  );
  const callerRole = String(callerProfile.role || (callerIdentityId === callerUid ? caller.role : "student")).toLowerCase();
  if (callerRole !== "admin" && callerRole !== "presidency") {
    throw new HttpsError("permission-denied", "Only an Admin or Presidency account can approve school users.");
  }

  const userId = String(request.data?.userId || "");
  const role = String(request.data?.role || "").toLowerCase();
  if (!userId || userId.includes("/") || !["parent", "student", "teacher", "presidency", "admin"].includes(role)) {
    throw new HttpsError("invalid-argument", "Choose a valid account and school role.");
  }
  if (callerRole === "presidency" && role === "admin") {
    throw new HttpsError("permission-denied", "Only an Admin can approve an Admin account.");
  }

  const userRef = db.doc(`users/${userId}`);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists || userSnapshot.data().status !== "pending" || userSnapshot.data().schoolId !== "ctla") {
    throw new HttpsError("failed-precondition", "This account is no longer pending approval.");
  }
  const user = userSnapshot.data();
  const identityId = user.familyMemberId || userId;
  const identityRef = db.doc(`profiles/${identityId}`);
  const identitySnapshot = await identityRef.get();
  const identityProfile = identitySnapshot.exists ? identitySnapshot.data() : null;
  if (!identitySnapshot.exists && identityId !== userId) {
    throw new HttpsError("failed-precondition", "The account's family profile is missing. Restore the family profile before approving this account.");
  }

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.update(userRef, { role, status: "active", updatedAt: now });
  batch.set(db.doc(`directory/${userId}`), {
    displayName: user.displayName || "School member", role, status: "active", schoolId: "ctla"
  }, { merge: true });
  if (identitySnapshot.exists) {
    batch.update(identityRef, { role, status: "active", updatedAt: now });
  } else {
    batch.set(identityRef, {
      displayName: user.displayName || "School member", role, accountType: "personal", ownerUid: userId,
      schoolId: "ctla", status: "active", settings: {}, createdAt: now
    });
  }

  const familyId = identityProfile?.familyId || user.familyId;
  if (familyId && identitySnapshot.exists) {
    const memberRef = db.doc(`families/${familyId}/members/${identityId}`);
    const memberSnapshot = await memberRef.get();
    if (memberSnapshot.exists && memberSnapshot.data().accountType === "linked") {
      batch.update(memberRef, { role, updatedAt: now });
    }
  }
  await batch.commit();
  return { approved: true, userId, role };
});

exports.setSchoolUserRole = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before changing a school role.");
  const callerUid = request.auth.uid;
  const caller = await requireActiveSchoolUser(callerUid);
  const { identityId: callerIdentityId, profile: callerProfile } = await getActiveIdentityProfile(
    callerUid, request.data?.identityId, caller
  );
  const callerRole = String(callerProfile.role || (callerIdentityId === callerUid ? caller.role : "student")).toLowerCase();
  if (callerRole !== "admin") throw new HttpsError("permission-denied", "Only an Admin can change school roles.");

  const userId = String(request.data?.userId || "");
  const role = String(request.data?.role || "").toLowerCase();
  if (!userId || userId.includes("/") || !["parent", "student", "teacher", "presidency", "admin"].includes(role)) {
    throw new HttpsError("invalid-argument", "Choose a valid account and school role.");
  }

  const userRef = db.doc(`users/${userId}`);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists || userSnapshot.data().status !== "active" || userSnapshot.data().schoolId !== "ctla") {
    throw new HttpsError("failed-precondition", "The active school account was not found.");
  }
  const user = userSnapshot.data();
  if (user.role === "admin" && role !== "admin") {
    const admins = await db.collection("users")
      .where("schoolId", "==", "ctla")
      .where("status", "==", "active")
      .where("role", "==", "admin")
      .get();
    if (admins.size <= 1) throw new HttpsError("failed-precondition", "The school must keep at least one active Admin.");
  }

  const identityId = user.familyMemberId || userId;
  const identityRef = db.doc(`profiles/${identityId}`);
  const identitySnapshot = await identityRef.get();
  const familyId = identitySnapshot.data()?.familyId || user.familyId;
  let memberRef = null;
  let memberSnapshot = null;
  if (familyId && identitySnapshot.exists) {
    memberRef = db.doc(`families/${familyId}/members/${identityId}`);
    memberSnapshot = await memberRef.get();
  }

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.update(userRef, { role, updatedAt: now });
  batch.set(db.doc(`directory/${userId}`), {
    displayName: user.displayName || "School member", role, status: "active", schoolId: "ctla"
  }, { merge: true });
  if (identitySnapshot.exists) batch.update(identityRef, { role, updatedAt: now });
  if (memberSnapshot?.exists && memberSnapshot.data().accountType === "linked") {
    batch.update(memberRef, { role, updatedAt: now });
  }
  await batch.commit();
  return { updated: true, userId, role };
});

// Reuse the existing callable name so Firebase updates its deployed invoker instead of creating
// a new Cloud Run service that would need a fresh allUsers IAM grant.
exports.createFamilyAccount = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before creating an independent family login.");
  const uid = request.auth.uid;
  const user = await requireActiveSchoolUser(uid);
  const { identityId: activeIdentityId } = await getActiveIdentityProfile(uid, request.data?.identityId, user);
  if (activeIdentityId !== uid) throw new HttpsError("permission-denied", "Switch to the family account holder profile to change family logins.");
  const familyId = String(request.data?.familyId || "");
  const memberId = String(request.data?.memberId || "");
  const email = String(request.data?.email || "").trim().toLowerCase();
  if (!familyId || familyId.includes("/") || !memberId || memberId.includes("/") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid email for this family member.");
  }

  const familyRef = db.doc(`families/${familyId}`);
  const memberRef = db.doc(`families/${familyId}/members/${memberId}`);
  const profileRef = db.doc(`profiles/${memberId}`);
  const [familySnapshot, memberSnapshot, profileSnapshot] = await Promise.all([familyRef.get(), memberRef.get(), profileRef.get()]);
  if (!familySnapshot.exists || familySnapshot.data().ownerUid !== uid || !memberSnapshot.exists || !profileSnapshot.exists) {
    throw new HttpsError("permission-denied", "Only the family account holder can change this member's login.");
  }
  const member = memberSnapshot.data();
  const profile = profileSnapshot.data();
  if (member.accountType !== "managed" || member.status !== "active"
      || profile.accountType !== "managed" || profile.ownerUid !== uid || profile.managerUid !== uid || profile.status !== "active") {
    throw new HttpsError("failed-precondition", "Only an active managed subaccount can become independent.");
  }

  let createdUser;
  try {
    try { await auth.getUserByEmail(email); throw new HttpsError("already-exists", "That email already has a sign-in. Use the link existing account option instead."); }
    catch (error) { if (error instanceof HttpsError) throw error; if (error.code !== "auth/user-not-found") throw error; }
    try { await auth.getUser(memberId); throw new HttpsError("already-exists", "This profile ID is already in use by a sign-in. Contact school support."); }
    catch (error) { if (error instanceof HttpsError) throw error; if (error.code !== "auth/user-not-found") throw error; }
    const role = ["parent", "student"].includes(profile.role) ? profile.role : "student";
    createdUser = await auth.createUser({
      uid: memberId,
      email, displayName: profile.displayName || member.name || "School member",
      password: randomBytes(32).toString("base64url"), emailVerified: false
    });
    const setupLink = await auth.generatePasswordResetLink(email);
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.update(db.doc(`users/${uid}`), { activeMemberId: uid, updatedAt: now });
    batch.set(db.doc(`users/${createdUser.uid}`), {
      displayName: profile.displayName || member.name || "School member", email, role,
      requestedRole: profile.role || role, status: "active", schoolId: "ctla",
      createdBy: uid, createdAt: now
    });
    batch.set(db.doc(`directory/${createdUser.uid}`), {
      displayName: profile.displayName || member.name || "School member", role, status: "active", schoolId: "ctla"
    });
    batch.update(profileRef, {
      ownerUid: createdUser.uid, linkedUid: createdUser.uid, accountType: "linked",
      role, updatedAt: now, managerUid: FieldValue.delete()
    });
    batch.update(memberRef, {
      uid: createdUser.uid, ownerUid: createdUser.uid, linkedUid: createdUser.uid,
      accountType: "linked", role, linkedAt: now, updatedAt: now
    });
    batch.set(db.doc(`familyLinks/${createdUser.uid}`), {
      familyId, memberId, accountType: "linked", ownerUid: createdUser.uid, status: "active", updatedAt: now
    });
    await batch.commit();
    return { uid: createdUser.uid, email, setupLink, memberId, role };
  } catch (error) {
    if (createdUser) await auth.deleteUser(createdUser.uid).catch(() => {});
    if (error instanceof HttpsError) throw error;
    console.error("Independent family login setup failed", error);
    throw new HttpsError("internal", "Could not create this family member's login. Please try again.");
  }
});

exports.leaveConversation = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before leaving a conversation.");
  const uid = request.auth.uid;
  const user = await requireActiveSchoolUser(uid);
  const { identityId } = await getActiveIdentityProfile(uid, request.data?.identityId, user);
  const conversationId = String(request.data?.conversationId || "");
  if (!conversationId || conversationId.includes("/")) throw new HttpsError("invalid-argument", "Conversation ID is required.");
  const conversationRef = db.doc(`conversations/${conversationId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "This conversation no longer exists.");
    const conversation = snapshot.data();
    const memberProfileIds = Array.isArray(conversation.memberProfileIds) ? conversation.memberProfileIds : conversation.memberUids || [];
    if (conversation.schoolId !== "ctla" || !memberProfileIds.includes(identityId)) {
      throw new HttpsError("permission-denied", "You are not a member of this conversation.");
    }
    if (memberProfileIds.length <= 1) {
      throw new HttpsError("failed-precondition", "Delete the conversation if you are its last member.");
    }
    const nextProfileIds = [...memberProfileIds];
    const profileIndex = nextProfileIds.indexOf(identityId);
    nextProfileIds.splice(profileIndex, 1);
    const memberNames = [...(conversation.memberNames || [])];
    if (profileIndex < memberNames.length) memberNames.splice(profileIndex, 1);
    const updates = { memberNames, memberCount: nextProfileIds.length, updatedAt: FieldValue.serverTimestamp() };
    if (Array.isArray(conversation.memberProfileIds)) updates.memberProfileIds = nextProfileIds;
    else updates.memberUids = (conversation.memberUids || []).filter((memberUid) => memberUid !== uid);
    transaction.update(conversationRef, updates);
  });
  return { success: true };
});

exports.deleteConversation = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before deleting a conversation.");
  const uid = request.auth.uid;
  const user = await requireActiveSchoolUser(uid);
  const { identityId, profile: identityProfile } = await getActiveIdentityProfile(uid, request.data?.identityId, user);
  const conversationId = String(request.data?.conversationId || "");
  if (!conversationId || conversationId.includes("/")) throw new HttpsError("invalid-argument", "Conversation ID is required.");
  const conversationRef = db.doc(`conversations/${conversationId}`);
  const snapshot = await conversationRef.get();
  if (!snapshot.exists) return { success: true };
  const conversation = snapshot.data();
  const isCreator = Array.isArray(conversation.memberProfileIds)
    ? conversation.createdByIdentityId === identityId && conversation.memberProfileIds.includes(identityId)
    : conversation.createdBy === uid && identityId === uid;
  const role = String(identityProfile.role || (identityId === uid ? user.role : "student")).toLowerCase();
  const isSchoolAdmin = role === "presidency" || (identityId === uid && role === "admin");
  if (conversation.schoolId !== "ctla" || (!isCreator && !isSchoolAdmin)) {
    throw new HttpsError("permission-denied", "Only the conversation creator, Presidency, or Admin can delete this conversation.");
  }
  await Promise.all([
    db.recursiveDelete(conversationRef),
    storage.bucket().deleteFiles({ prefix: `conversations/${conversationId}/` })
  ]);
  return { success: true };
});

exports.addConversationMembers = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before adding members.");
  const uid = request.auth.uid;
  const user = await requireActiveSchoolUser(uid);
  const { identityId, profile: identityProfile } = await getActiveIdentityProfile(uid, request.data?.identityId, user);
  const conversationId = String(request.data?.conversationId || "");
  const requested = request.data?.memberUids;
  if (!conversationId || conversationId.includes("/") || !Array.isArray(requested) || requested.length < 1 || requested.length > 50) {
    throw new HttpsError("invalid-argument", "Choose one to 50 school members.");
  }
  let newUids = [...new Set(requested.map(String).filter((memberUid) => memberUid && memberUid !== uid))];
  if (newUids.length === 0) throw new HttpsError("invalid-argument", "Choose at least one other school member.");

  const conversationRef = db.doc(`conversations/${conversationId}`);
  const initial = await conversationRef.get();
  if (!initial.exists || initial.data().schoolId !== "ctla") throw new HttpsError("not-found", "Conversation not found.");
  const before = initial.data();
  const initialProfiles = Array.isArray(before.memberProfileIds) ? before.memberProfileIds : before.memberUids || [];
  if (!initialProfiles.includes(identityId)) throw new HttpsError("permission-denied", "You must be a member of this conversation.");
  newUids = newUids.filter((memberUid) => !(before.memberUids || []).includes(memberUid));
  if (newUids.length === 0) return { success: true, alreadyMembers: true };
  const role = String(identityProfile.role || (identityId === uid ? user.role : "student")).toLowerCase();
  const isSchoolAdmin = role === "presidency" || (identityId === uid && role === "admin");
  if (before.kind === "announcement" && !isSchoolAdmin) {
    throw new HttpsError("permission-denied", "Only authorized school staff can add people to class or announcement chats.");
  }
  if (before.kind === "class" && !isSchoolAdmin) {
    const classSnapshot = before.classId ? await db.doc(`classes/${before.classId}`).get() : null;
    const classData = classSnapshot?.exists ? classSnapshot.data() : null;
    const classTeacherId = classData?.teacherProfileId || classData?.teacherUid;
    if (role !== "teacher" || classTeacherId !== identityId) {
      throw new HttpsError("permission-denied", "Only the class teacher, Presidency, or Admin can add members to this class chat.");
    }
  }

  const participants = await Promise.all(newUids.map(getConversationParticipant));
  const participantByUid = new Map(participants.map((participant) => [participant.uid, participant]));

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Conversation not found.");
    const conversation = snapshot.data();
    const currentProfiles = Array.isArray(conversation.memberProfileIds) ? conversation.memberProfileIds : conversation.memberUids || [];
    if (!currentProfiles.includes(identityId)) throw new HttpsError("permission-denied", "You are no longer a member of this conversation.");
    const currentUids = new Set(conversation.memberUids || []);
    const currentProfileSet = new Set(currentProfiles);
    const additions = newUids.filter((memberUid) => {
      const participant = participantByUid.get(memberUid);
      return !currentUids.has(memberUid) && participant && !currentProfileSet.has(participant.identityId);
    });
    if (additions.length === 0) return;
    const memberUids = [...new Set([...(conversation.memberUids || []), ...additions])];
    const memberProfileIds = [...currentProfiles, ...additions.map((memberUid) => participantByUid.get(memberUid).identityId)];
    if (memberProfileIds.length > 100) throw new HttpsError("resource-exhausted", "This conversation has reached its 100-member limit.");
    const memberNames = [...(conversation.memberNames || []), ...additions.map((memberUid) => participantByUid.get(memberUid).name)];
    transaction.update(conversationRef, {
      memberUids, memberProfileIds, memberNames, members: memberNames, memberCount: memberProfileIds.length,
      kind: conversation.kind === "direct" && memberProfileIds.length > 2 ? "group" : conversation.kind,
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  return { success: true };
});
