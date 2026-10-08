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

exports.createClass = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before creating a class.");
  const uid = request.auth.uid;
  const user = await requireActiveSchoolUser(uid);
  if (!new Set(["teacher", "presidency", "admin"]).has(user.role)) {
    throw new HttpsError("permission-denied", "Only verified teachers and school administrators can create classes.");
  }
  const name = String(request.data?.name || request.data?.title || "").trim();
  const teacher = String(request.data?.teacher || user.displayName || "Teacher").trim();
  const description = String(request.data?.description || "").trim();
  const openEnrollment = request.data?.openEnrollment === true;
  if (!name || name.length > 100 || teacher.length > 100 || description.length > 400) {
    throw new HttpsError("invalid-argument", "Enter a class name, teacher, and description within the size limits.");
  }

  const classRef = db.collection("classes").doc();
  const conversationRef = db.collection("conversations").doc();
  const displayName = user.displayName || request.auth.token.name || teacher;
  const memberNames = [displayName];
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(classRef, {
    name, title: name, teacher, teacherUid: uid, description, openEnrollment,
    memberUids: [uid], memberCount: 1, members: 1, color: "purple", icon: "cap",
    schoolId: "ctla", chatId: conversationRef.id, createdAt: now, updatedAt: now
  });
  batch.set(conversationRef, {
    title: name, kind: "class", classId: classRef.id, schoolId: "ctla",
    createdBy: uid, createdByRole: user.role, memberUids: [uid], memberNames,
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
  const classId = String(request.data?.classId || "");
  if (!classId || classId.includes("/")) throw new HttpsError("invalid-argument", "Class ID is required.");
  const classRef = db.doc(`classes/${classId}`);
  const classSnapshot = await classRef.get();
  if (!classSnapshot.exists || classSnapshot.data().schoolId !== "ctla") throw new HttpsError("not-found", "Class not found.");
  const classData = classSnapshot.data();
  if ((classData.memberUids || []).includes(uid)) return { joined: true, alreadyMember: true };
  if (!new Set(["parent", "student"]).has(user.role)) throw new HttpsError("permission-denied", "Only Parent and Student accounts can request class enrollment.");

  if (!classData.openEnrollment) {
    const requestRef = classRef.collection("joinRequests").doc(uid);
    await requestRef.set({
      uid, displayName: user.displayName || request.auth.token.name || "School member",
      className: classData.name, status: "pending", createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { joined: false, requested: true };
  }

  const conversationId = classData.chatId;
  if (!conversationId) throw new HttpsError("failed-precondition", "This class does not have a chat yet. Ask the teacher to reopen it.");
  const conversationRef = db.doc(`conversations/${conversationId}`);
  await db.runTransaction(async (transaction) => {
    const [latestClass, latestConversation] = await Promise.all([transaction.get(classRef), transaction.get(conversationRef)]);
    if (!latestClass.exists || !latestConversation.exists) throw new HttpsError("not-found", "Class or class chat not found.");
    const memberUids = [...new Set([...(latestClass.data().memberUids || []), uid])];
    const memberNames = [...new Set([...(latestConversation.data().memberNames || []), user.displayName || request.auth.token.name || "School member"])];
    transaction.update(classRef, { memberUids, memberCount: memberUids.length, members: memberUids.length, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(conversationRef, { memberUids, memberNames, members: memberNames, memberCount: memberUids.length, updatedAt: FieldValue.serverTimestamp() });
    transaction.delete(classRef.collection("joinRequests").doc(uid));
  });
  return { joined: true, requested: false };
});

exports.respondToClassJoin = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before reviewing class requests.");
  const callerUid = request.auth.uid;
  const caller = await requireActiveSchoolUser(callerUid);
  const classId = String(request.data?.classId || "");
  const userId = String(request.data?.userId || "");
  const approve = request.data?.approve === true;
  if (!classId || classId.includes("/") || !userId || userId.includes("/")) throw new HttpsError("invalid-argument", "Class and student IDs are required.");
  const classRef = db.doc(`classes/${classId}`);
  const requestRef = classRef.collection("joinRequests").doc(userId);
  const initialClass = await classRef.get();
  if (!initialClass.exists || initialClass.data().schoolId !== "ctla") throw new HttpsError("not-found", "Class not found.");
  if (caller.role !== "presidency" && caller.role !== "admin" && (caller.role !== "teacher" || initialClass.data().teacherUid !== callerUid)) {
    throw new HttpsError("permission-denied", "Only the class teacher, Presidency, or Admin can review enrollment.");
  }
  const memberSnapshot = await db.doc(`directory/${userId}`).get();
  if (!memberSnapshot.exists || memberSnapshot.data().schoolId !== "ctla" || memberSnapshot.data().status !== "active") {
    throw new HttpsError("failed-precondition", "This account is no longer an approved school member.");
  }
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
      const memberUids = [...new Set([...(classSnapshot.data().memberUids || []), userId])];
      const displayName = memberSnapshot.data().displayName || requestSnapshot.data().displayName || "School member";
      const memberNames = [...new Set([...(chatSnapshot.data().memberNames || []), displayName])];
      transaction.update(classRef, { memberUids, memberCount: memberUids.length, members: memberUids.length, updatedAt: FieldValue.serverTimestamp() });
      transaction.update(conversationRef, { memberUids, memberNames, members: memberNames, memberCount: memberUids.length, updatedAt: FieldValue.serverTimestamp() });
    }
    transaction.delete(requestRef);
  });
  return { approved: approve };
});

exports.createFamilyAccount = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before creating a family account.");
  const uid = request.auth.uid;
  const name = String(request.data?.name || "").trim();
  const tribe = String(request.data?.tribe || "Lamanites").trim();
  const userRef = db.doc(`users/${uid}`);
  const userSnapshot = await userRef.get();
  const user = userSnapshot.data();
  if (!userSnapshot.exists || user.status !== "active" || user.schoolId !== "ctla" || user.role !== "parent") {
    throw new HttpsError("permission-denied", "Only a verified parent can create a family account.");
  }
  if (user.familyId) throw new HttpsError("already-exists", "This account already belongs to a family.");
  if (!name || name.length > 100 || tribe.length > 60) {
    throw new HttpsError("invalid-argument", "Enter a family name and tribe.");
  }

  const familyRef = db.collection("families").doc();
  const family = {
    name, tribe, ownerUid: uid, memberUids: [uid], schoolId: "ctla", createdAt: FieldValue.serverTimestamp()
  };
  const member = {
    uid, name: user.displayName || request.auth.token.name || "Family Account Holder",
    email: user.email || request.auth.token.email || "", role: "parent", grade: "", tribe,
    status: "active", createdAt: FieldValue.serverTimestamp()
  };
  const batch = db.batch();
  batch.set(familyRef, family);
  batch.set(familyRef.collection("members").doc(uid), member);
  batch.update(userRef, { familyId: familyRef.id });
  await batch.commit();
  return { familyId: familyRef.id };
});

exports.inviteFamilyMember = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before inviting a family member.");

  const callerUid = request.auth.uid;
  const { familyId, name, email, role, grade = "", tribe = "" } = request.data || {};
  const normalizedRole = String(role || "").toLowerCase();
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!familyId || !cleanName || cleanName.length > 100 || !cleanEmail || cleanEmail.length > 254) {
    throw new HttpsError("invalid-argument", "Enter a family, full name, and valid email address.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new HttpsError("invalid-argument", "Enter a valid email address for the family member.");
  }
  // Family owners can create Parent or Student accounts. Only school staff can grant staff roles.
  if (!new Set(["parent", "student"]).has(normalizedRole)) {
    throw new HttpsError("permission-denied", "Family accounts can add Parent or Student roles. School staff assign teacher and Presidency roles.");
  }

  const callerRef = db.doc(`users/${callerUid}`);
  const familyRef = db.doc(`families/${familyId}`);
  const [callerSnapshot, familySnapshot] = await Promise.all([callerRef.get(), familyRef.get()]);
  const caller = callerSnapshot.data();
  const family = familySnapshot.data();
  if (!callerSnapshot.exists || caller.status !== "active" || caller.schoolId !== "ctla" || caller.role !== "parent") {
    throw new HttpsError("permission-denied", "Only a verified parent account can add family accounts.");
  }
  if (!familySnapshot.exists || family.ownerUid !== callerUid || !family.memberUids?.includes(callerUid) || caller.familyId !== familyId) {
    throw new HttpsError("permission-denied", "You must own this family account to add a member.");
  }
  if ((family.memberUids || []).length >= 12) {
    throw new HttpsError("resource-exhausted", "Family accounts can contain up to 12 members.");
  }

  let createdUser;
  try {
    createdUser = await auth.createUser({
      email: cleanEmail,
      displayName: cleanName,
      password: randomBytes(32).toString("base64url"),
      emailVerified: false
    });
    const user = {
      displayName: cleanName,
      email: cleanEmail,
      role: normalizedRole,
      requestedRole: normalizedRole,
      status: "active",
      schoolId: "ctla",
      familyId,
      createdBy: callerUid,
      createdAt: FieldValue.serverTimestamp()
    };
    const member = {
      uid: createdUser.uid,
      name: cleanName,
      email: cleanEmail,
      role: normalizedRole,
      grade: String(grade).slice(0, 40),
      tribe: String(tribe).slice(0, 60),
      status: "active",
      createdAt: FieldValue.serverTimestamp()
    };

    // Generate the setup link before committing the account records so a failed link
    // does not leave an unusable family account behind.
    const setupLink = await auth.generatePasswordResetLink(cleanEmail);
    const batch = db.batch();
    batch.set(db.doc(`users/${createdUser.uid}`), user);
    batch.set(db.doc(`directory/${createdUser.uid}`), {
      displayName: cleanName, role: normalizedRole, schoolId: "ctla", status: "active"
    });
    batch.set(db.doc(`families/${familyId}/members/${createdUser.uid}`), member);
    batch.update(familyRef, {
      memberUids: FieldValue.arrayUnion(createdUser.uid),
      updatedAt: FieldValue.serverTimestamp()
    });
    await batch.commit();
    return { uid: createdUser.uid, email: cleanEmail, setupLink };
  } catch (error) {
    if (createdUser) {
      await Promise.allSettled([
        auth.deleteUser(createdUser.uid),
        db.doc(`users/${createdUser.uid}`).delete(),
        db.doc(`directory/${createdUser.uid}`).delete(),
        db.doc(`families/${familyId}/members/${createdUser.uid}`).delete()
      ]);
    }
    if (error instanceof HttpsError) throw error;
    if (error.code === "auth/email-already-exists") throw new HttpsError("already-exists", "That email already has an account. Ask the member to sign in or contact the school office.");
    console.error("Family member provisioning failed", error);
    throw new HttpsError("internal", "The family account could not be created. Please try again.");
  }
});

exports.leaveConversation = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before leaving a conversation.");
  const uid = request.auth.uid;
  await requireActiveSchoolUser(uid);
  const conversationId = String(request.data?.conversationId || "");
  if (!conversationId || conversationId.includes("/")) throw new HttpsError("invalid-argument", "Conversation ID is required.");
  const conversationRef = db.doc(`conversations/${conversationId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "This conversation no longer exists.");
    const conversation = snapshot.data();
    if (conversation.schoolId !== "ctla" || !conversation.memberUids?.includes(uid)) {
      throw new HttpsError("permission-denied", "You are not a member of this conversation.");
    }
    const memberUids = conversation.memberUids.filter((memberUid) => memberUid !== uid);
    if (memberUids.length === 0) {
      throw new HttpsError("failed-precondition", "Delete the conversation if you are its last member.");
    }
    transaction.update(conversationRef, { memberUids, updatedAt: FieldValue.serverTimestamp() });
  });
  return { success: true };
});

exports.deleteConversation = onCall({ region: "us-central1", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before deleting a conversation.");
  const uid = request.auth.uid;
  const user = await requireActiveSchoolUser(uid);
  const conversationId = String(request.data?.conversationId || "");
  if (!conversationId || conversationId.includes("/")) throw new HttpsError("invalid-argument", "Conversation ID is required.");
  const conversationRef = db.doc(`conversations/${conversationId}`);
  const snapshot = await conversationRef.get();
  if (!snapshot.exists) return { success: true };
  const conversation = snapshot.data();
  if (conversation.schoolId !== "ctla" || (conversation.createdBy !== uid && !["presidency", "admin"].includes(user.role))) {
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
  const conversationId = String(request.data?.conversationId || "");
  const requested = request.data?.memberUids;
  if (!conversationId || conversationId.includes("/") || !Array.isArray(requested) || requested.length < 1 || requested.length > 50) {
    throw new HttpsError("invalid-argument", "Choose one to 50 school members.");
  }
  const newUids = [...new Set(requested.map(String).filter((memberUid) => memberUid && memberUid !== uid))];
  if (newUids.length === 0) throw new HttpsError("invalid-argument", "Choose at least one other school member.");

  const conversationRef = db.doc(`conversations/${conversationId}`);
  const initial = await conversationRef.get();
  if (!initial.exists || initial.data().schoolId !== "ctla") throw new HttpsError("not-found", "Conversation not found.");
  const before = initial.data();
  if (!before.memberUids?.includes(uid)) throw new HttpsError("permission-denied", "You must be a member of this conversation.");
  if ((before.kind === "announcement" && !["presidency", "admin"].includes(user.role)) || (before.kind === "class" && !["teacher", "presidency", "admin"].includes(user.role))) {
    throw new HttpsError("permission-denied", "Only authorized school staff can add people to class or announcement chats.");
  }

  const directorySnapshots = await db.getAll(...newUids.map((memberUid) => db.doc(`directory/${memberUid}`)));
  const directoryByUid = new Map(directorySnapshots.map((snapshot) => [snapshot.id, snapshot.data()]));
  const invalid = newUids.some((memberUid) => {
    const member = directoryByUid.get(memberUid);
    return !member || member.schoolId !== "ctla" || member.status !== "active";
  });
  if (invalid) throw new HttpsError("failed-precondition", "Only approved Called to Learn Academy accounts can be added.");

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Conversation not found.");
    const conversation = snapshot.data();
    if (!conversation.memberUids?.includes(uid)) throw new HttpsError("permission-denied", "You are no longer a member of this conversation.");
    const memberUids = [...new Set([...conversation.memberUids, ...newUids])];
    if (memberUids.length > 5000) throw new HttpsError("resource-exhausted", "This conversation has reached its member limit.");
    const memberNames = [...new Set([...(conversation.memberNames || []), ...newUids.map((memberUid) => directoryByUid.get(memberUid).displayName)])];
    transaction.update(conversationRef, {
      memberUids, memberNames, memberCount: memberUids.length,
      kind: conversation.kind === "direct" && memberUids.length > 2 ? "group" : conversation.kind,
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  return { success: true };
});
