import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js?v=5";

const FIREBASE_VERSION = "12.19.0";
const sdk = (service) => import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-${service}.js`);

export async function connectFirebase(onAuthChanged, onError) {
  if (!isFirebaseConfigured) return { enabled: false };
  try {
    const [appSDK, authSDK, firestoreSDK, storageSDK] = await Promise.all([
      sdk("app"), sdk("auth"), sdk("firestore"), sdk("storage")
    ]);
    const app = appSDK.initializeApp(firebaseConfig);
    const auth = authSDK.getAuth(app);
    // Safari and all iOS browsers can interrupt Firestore's streaming transport
    // in the background. Long polling keeps live chat snapshots reliable there.
    const userAgent = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(userAgent) && !/(Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Brave)/.test(userAgent);
    const db = firestoreSDK.initializeFirestore(app, (isIOS || isSafari)
      ? { experimentalForceLongPolling: true }
      : {});
    const storage = storageSDK.getStorage(app);
    await authSDK.setPersistence(auth, authSDK.browserLocalPersistence);

    const api = {
      enabled: true,
      auth,
      signIn: (email, password) => authSDK.signInWithEmailAndPassword(auth, email, password),
      resetPassword: (email) => authSDK.sendPasswordResetEmail(auth, email),
      signUp: (email, password, displayName, requestedRole, requestedFamilyAccount = false) => signUp(email, password, displayName, requestedRole, requestedFamilyAccount),
      signOut: () => authSDK.signOut(auth),
      subscribeConversations: (uid, identityId, next, error, includeLegacy = true) => {
        const reportQueryError = (queryName, { ignorePermissionDenied = false } = {}) => (cause) => {
          if (!error) return;
          if (ignorePermissionDenied && cause?.code === "permission-denied") return;
          const labeled = new Error(`${queryName}: ${cause?.message || "Conversation query failed."}`);
          labeled.code = cause?.code;
          error(labeled);
        };
        let identityItems = [];
        let legacyItems = [];
        const emit = () => {
          const byId = new Map([...legacyItems, ...identityItems].map((item) => [item.id, item]));
          const timestampMillis = (value) => typeof value?.toMillis === "function" ? value.toMillis() : value instanceof Date ? value.getTime() : 0;
          const conversations = [...byId.values()].filter((conversation) =>
            Array.isArray(conversation.memberProfileIds) ? conversation.memberProfileIds.includes(identityId) : identityId === uid
          );
          conversations.sort((left, right) => timestampMillis(right.updatedAt) - timestampMillis(left.updatedAt));
          next(conversations);
        };
        const identityQuery = firestoreSDK.query(
          firestoreSDK.collection(db, "conversations"),
          firestoreSDK.where("schoolId", "==", "ctla"),
          firestoreSDK.where("memberProfileIds", "array-contains", identityId)
        );
        const identityUnsubscribe = firestoreSDK.onSnapshot(identityQuery, (snapshot) => {
          identityItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })); emit();
        }, reportQueryError("Profile conversation query"));
        let legacyUnsubscribe = () => {};
        if (identityId === uid && includeLegacy) {
          const legacyQuery = firestoreSDK.query(
            firestoreSDK.collection(db, "conversations"),
            firestoreSDK.where("schoolId", "==", "ctla"),
            firestoreSDK.where("memberUids", "array-contains", uid)
          );
          legacyUnsubscribe = firestoreSDK.onSnapshot(legacyQuery, (snapshot) => {
            legacyItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => !Array.isArray(item.memberProfileIds)); emit();
          }, reportQueryError("Legacy conversation query", { ignorePermissionDenied: true }));
        }
        return () => { identityUnsubscribe(); legacyUnsubscribe(); };
      },
      subscribeMessages: (conversationId, next, error) => {
        const q = firestoreSDK.query(
          firestoreSDK.collection(db, "conversations", conversationId, "messages"),
          firestoreSDK.orderBy("createdAt", "asc")
        );
        return firestoreSDK.onSnapshot(q, (snapshot) => next(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), error);
      },
      subscribeClasses: (schoolId, next, error) => {
        const q = firestoreSDK.query(firestoreSDK.collection(db, "classes"), firestoreSDK.where("schoolId", "==", schoolId));
        return firestoreSDK.onSnapshot(q, (snapshot) => next(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), error);
      },
      subscribeIdentityProfile: (identityId, next, error) => firestoreSDK.onSnapshot(
        firestoreSDK.doc(db, "profiles", identityId),
        (snapshot) => next(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
        error
      ),
      createClass: async (classRecord) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "createClass")(classRecord);
        return result.data.classId;
      },
      subscribeEvents: (schoolId, identityId, next, error) => {
        let schoolEvents = [];
        let personalEvents = [];
        const emit = () => next([...schoolEvents, ...personalEvents]);
        const schoolQuery = firestoreSDK.query(firestoreSDK.collection(db, "events"), firestoreSDK.where("schoolId", "==", schoolId));
        const schoolUnsubscribe = firestoreSDK.onSnapshot(schoolQuery, (snapshot) => {
          schoolEvents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), calendarScope: "school" })); emit();
        }, error);
        const personalQuery = firestoreSDK.collection(db, "profiles", identityId, "calendarEvents");
        const personalUnsubscribe = firestoreSDK.onSnapshot(personalQuery, (snapshot) => {
          personalEvents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), calendarScope: "personal" })); emit();
        }, error);
        return () => { schoolUnsubscribe(); personalUnsubscribe(); };
      },
      subscribeDirectory: (schoolId, next, error) => {
        const q = firestoreSDK.query(
          firestoreSDK.collection(db, "directory"),
          firestoreSDK.where("schoolId", "==", schoolId),
          firestoreSDK.where("status", "==", "active")
        );
        return firestoreSDK.onSnapshot(q, (snapshot) => next(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), error);
      },
      subscribePendingUsers: (next, error) => {
        const q = firestoreSDK.query(firestoreSDK.collection(db, "users"), firestoreSDK.where("status", "==", "pending"));
        return firestoreSDK.onSnapshot(q, (snapshot) => next(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), error);
      },
      approveUser: async (uid, role, identityId) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "approveSchoolUser")({
          userId: uid, role: String(role).toLowerCase(), identityId: identityId || auth.currentUser?.uid
        });
        return result.data;
      },
      setUserRole: async (uid, role, identityId) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "setSchoolUserRole")({
          userId: uid, role: String(role).toLowerCase(), identityId: identityId || auth.currentUser?.uid
        });
        return result.data;
      },
      getUserProfile: async (uid) => {
        const ref = firestoreSDK.doc(db, "users", uid);
        const snap = await firestoreSDK.getDoc(ref);
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
      },
      getIdentityProfile: async (identityId) => {
        const snap = await firestoreSDK.getDoc(firestoreSDK.doc(db, "profiles", identityId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
      },
      ensureIdentityProfile: async (uid, profile, familyLink = null) => {
        if (familyLink?.accountType === "linked" && familyLink.memberId && familyLink.memberId !== uid) return;
        const ref = firestoreSDK.doc(db, "profiles", uid);
        const snapshot = await firestoreSDK.getDoc(ref);
        if (!snapshot.exists()) {
          await firestoreSDK.setDoc(ref, {
            displayName: profile.displayName || auth.currentUser?.displayName || "School member",
            role: profile.role || "student", accountType: "personal", ownerUid: uid,
            schoolId: "ctla", status: profile.status || "active", settings: {}
          });
          return;
        }
        const existingProfile = snapshot.data();
        if (existingProfile.accountType === "managed") return;
        const repair = {};
        if (typeof existingProfile.ownerUid !== "string") repair.ownerUid = uid;
        if (typeof existingProfile.accountType !== "string") repair.accountType = "personal";
        if (Object.keys(repair).length) await firestoreSDK.updateDoc(ref, repair);
      },
      sendMessage: async (conversationId, message) => {
        const conversationRef = firestoreSDK.doc(db, "conversations", conversationId);
        const messagesRef = firestoreSDK.collection(conversationRef, "messages");
        const batch = firestoreSDK.writeBatch(db);
        const messageRef = firestoreSDK.doc(messagesRef);
        batch.set(messageRef, {
          ...message,
          createdAt: firestoreSDK.serverTimestamp(),
          schoolId: "ctla"
        });
        batch.update(conversationRef, {
          lastMessage: { text: message.text || message.attachmentName || "Attachment", senderName: message.senderName, senderUid: message.senderUid, senderProfileId: message.senderProfileId },
          updatedAt: firestoreSDK.serverTimestamp()
        });
        await batch.commit();
        return messageRef.id;
      },
      uploadAttachment: async (conversationId, uid, file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `conversations/${conversationId}/${uid}/${Date.now()}_${safeName}`;
        const ref = storageSDK.ref(storage, path);
        await storageSDK.uploadBytes(ref, file, { contentType: file.type || "application/octet-stream" });
        return { name: file.name, path, size: file.size, type: file.type };
      },
      downloadAttachment: async (path) => {
        if (!path.startsWith("conversations/")) throw new Error("This attachment path is invalid.");
        const bytes = await storageSDK.getBytes(storageSDK.ref(storage, path), 10 * 1024 * 1024);
        return bytes;
      },
      createConversation: async (conversation) => {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("Sign in before starting a conversation.");
        const identityId = conversation.createdByIdentityId || uid;
        const ownerName = conversation.memberNames?.[0] || conversation.members?.[0] || "School member";
        const ref = await firestoreSDK.addDoc(firestoreSDK.collection(db, "conversations"), {
          title: conversation.title,
          kind: conversation.kind || "direct",
          schoolId: "ctla",
          createdBy: uid,
          createdByIdentityId: identityId,
          createdByRole: conversation.createdByRole || "student",
          memberUids: [uid],
          memberProfileIds: [identityId],
          memberNames: [ownerName],
          members: [ownerName],
          memberCount: 1,
          preview: conversation.preview || "Start a conversation",
          color: conversation.color || "purple",
          createdAt: firestoreSDK.serverTimestamp(),
          updatedAt: firestoreSDK.serverTimestamp()
        });
        try {
          const functionsSDK = await sdk("functions");
          const functions = functionsSDK.getFunctions(app, "us-central1");
          const addMembers = functionsSDK.httpsCallable(functions, "addConversationMembers");
          const targetUids = [...new Set((conversation.memberUids || []).map(String))].filter((memberUid) => memberUid && memberUid !== uid);
          if (!targetUids.length) throw new Error("Choose at least one other school member.");
          for (let index = 0; index < targetUids.length; index += 50) {
            await addMembers({ conversationId: ref.id, identityId, memberUids: targetUids.slice(index, index + 50) });
          }
          const snapshot = await firestoreSDK.getDoc(ref);
          if (!snapshot.exists()) throw new Error("The conversation could not be loaded after it was created.");
          return { conversationId: ref.id, ...snapshot.data() };
        } catch (error) {
          try {
            const functionsSDK = await sdk("functions");
            const functions = functionsSDK.getFunctions(app, "us-central1");
            await functionsSDK.httpsCallable(functions, "deleteConversation")({ conversationId: ref.id, identityId });
          } catch {}
          throw error;
        }
      },
      updateConversation: async (conversationId, updates) => {
        await firestoreSDK.updateDoc(firestoreSDK.doc(db, "conversations", conversationId), {
          title: updates.title, description: updates.description, updatedAt: firestoreSDK.serverTimestamp()
        });
      },
      leaveConversation: async (conversationId, identityId) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        await functionsSDK.httpsCallable(functions, "leaveConversation")({ conversationId, identityId });
      },
      deleteConversation: async (conversationId, identityId) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "deleteConversation")({ conversationId, identityId });
        return result.data;
      },
      addConversationMembers: async (conversationId, identityId, memberUids, suggestedNames = []) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "addConversationMembers")({
          conversationId, identityId, memberUids
        });
        return result.data;
      },
      requestClassJoin: async (classId, user, className, identityId) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "joinClass")({ classId, className, identityId, displayName: user.displayName || "School member" });
        return result.data;
      },
      subscribeJoinRequests: (classId, next, error) => firestoreSDK.onSnapshot(
        firestoreSDK.query(firestoreSDK.collection(db, "classes", classId, "joinRequests"), firestoreSDK.orderBy("createdAt", "asc")),
        (snapshot) => next(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), error
      ),
      respondToClassJoin: async (classId, userId, approve) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        await functionsSDK.httpsCallable(functions, "respondToClassJoin")({ classId, userId, approve });
      },
      createEvent: async (event) => {
        const ref = await firestoreSDK.addDoc(firestoreSDK.collection(db, "events"), {
          ...event, schoolId: "ctla", createdBy: auth.currentUser.uid, createdAt: firestoreSDK.serverTimestamp()
        });
        return ref.id;
      },
      createPersonalEvent: async (identityId, event) => {
        const ref = await firestoreSDK.addDoc(firestoreSDK.collection(db, "profiles", identityId, "calendarEvents"), {
          ...event, ownerUid: auth.currentUser.uid, identityId, createdAt: firestoreSDK.serverTimestamp()
        });
        return ref.id;
      },
      updateIdentitySettings: async (identityId, notificationPrefs) => {
        const profileRef = firestoreSDK.doc(db, "profiles", identityId);
        const profileSnapshot = await firestoreSDK.getDoc(profileRef);
        const batch = firestoreSDK.writeBatch(db);
        if (identityId === auth.currentUser.uid) {
          batch.update(firestoreSDK.doc(db, "users", identityId), { notificationPrefs, updatedAt: firestoreSDK.serverTimestamp() });
        }
        if (profileSnapshot.exists()) batch.update(profileRef, { "settings.notificationPrefs": notificationPrefs, updatedAt: firestoreSDK.serverTimestamp() });
        await batch.commit();
      },
      updateProfile: async (uid, updates) => {
        if (updates.displayName) await authSDK.updateProfile(auth.currentUser, { displayName: updates.displayName });
        const batch = firestoreSDK.writeBatch(db);
        batch.update(firestoreSDK.doc(db, "users", uid), updates);
        if (updates.displayName) {
          batch.update(firestoreSDK.doc(db, "directory", uid), { displayName: updates.displayName });
          const profileRef = firestoreSDK.doc(db, "profiles", uid);
          const profileSnapshot = await firestoreSDK.getDoc(profileRef);
          if (profileSnapshot.exists()) batch.update(profileRef, { displayName: updates.displayName, updatedAt: firestoreSDK.serverTimestamp() });
        }
        await batch.commit();
      },
      getFamilyLink: async (uid) => {
        const snap = await firestoreSDK.getDoc(firestoreSDK.doc(db, "familyLinks", uid));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
      },
      getOwnerFamilyLink: async (uid, familyId) => {
        try {
          const snap = await firestoreSDK.getDoc(firestoreSDK.doc(db, "families", familyId));
          return snap.exists() && snap.data().ownerUid === uid
            ? { familyId, memberId: uid, accountType: "owner", status: "active" }
            : null;
        } catch { return null; }
      },
      createFamily: async (uid, family) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "createFamilyAccount")({
          operation: "create-family", name: family.name, tribe: family.tribe,
          ownerName: family.ownerName, members: family.members || [], identityId: uid
        });
        return result.data;
      },
      setFamilyMemberPin: async (familyId, memberId, pin) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "createFamilyAccount")({
          operation: "set-family-pin", familyId, memberId, pin, identityId: auth.currentUser?.uid
        });
        return result.data;
      },
      selectFamilyMemberWithPin: async (familyId, memberId, pin) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "createFamilyAccount")({
          operation: "select-family-profile", familyId, memberId, pin, identityId: auth.currentUser?.uid
        });
        return result.data;
      },
      setActiveMember: async (uid, memberId) => firestoreSDK.updateDoc(firestoreSDK.doc(db, "users", uid), { activeMemberId: memberId }),
      updateFamily: async (familyId, updates) => firestoreSDK.updateDoc(firestoreSDK.doc(db, "families", familyId), updates),
      addFamilyMember: async (familyId, member) => {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("Sign in to manage this family.");
        const familyRef = firestoreSDK.doc(db, "families", familyId);
        const familySnapshot = await firestoreSDK.getDoc(familyRef);
        if (!familySnapshot.exists() || familySnapshot.data().ownerUid !== uid) throw new Error("Only the family account holder can manage its members.");
        const now = firestoreSDK.serverTimestamp();
        if (member.accountType === "linked") {
          if (!member.email) throw new Error("Enter the email used by the personal account.");
          const inviteRef = firestoreSDK.doc(firestoreSDK.collection(db, "familyInvites"));
          await firestoreSDK.setDoc(inviteRef, {
            familyId, ownerUid: uid, email: member.email.trim().toLowerCase(), name: member.name.trim(),
            role: String(member.role || "student").toLowerCase(), status: "pending", type: "link",
            createdBy: uid, createdAt: now
          });
          return { accountType: "linked", code: inviteRef.id };
        }
        const memberRef = firestoreSDK.doc(firestoreSDK.collection(db, "families", familyId, "members"));
        const memberId = memberRef.id;
        const role = String(member.role || "student").toLowerCase();
        const profileRef = firestoreSDK.doc(db, "profiles", memberId);
        const memberData = {
          familyId, memberId, uid, ownerUid: uid, accountType: "managed", status: "active",
          name: member.name.trim(), role, grade: member.grade || "", tribe: member.tribe || "", pinConfigured: false, createdAt: now
        };
        const batch = firestoreSDK.writeBatch(db);
        batch.set(memberRef, memberData);
        batch.set(profileRef, {
          displayName: memberData.name, role, accountType: "managed", ownerUid: uid, managerUid: uid,
          familyId, grade: memberData.grade, tribe: memberData.tribe, settings: {}, status: "active", schoolId: "ctla"
        });
        batch.update(familyRef, {
          memberIds: firestoreSDK.arrayUnion(memberId), memberCount: firestoreSDK.increment(1), updatedAt: now
        });
        await batch.commit();
        return { accountType: "managed", memberId };
      },
      makeFamilyMemberIndependent: async (familyId, memberId, email) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "createFamilyAccount")({ familyId, memberId, email, identityId: auth.currentUser?.uid });
        return result.data;
      },
      updateFamilyMember: async (familyId, memberId, updates) => {
        const memberRef = firestoreSDK.doc(db, "families", familyId, "members", memberId);
        const profileRef = firestoreSDK.doc(db, "profiles", memberId);
        const memberSnapshot = await firestoreSDK.getDoc(memberRef);
        if (!memberSnapshot.exists()) throw new Error("This family member no longer exists.");
        const member = memberSnapshot.data();
        if (member.accountType !== "managed") throw new Error("A linked personal account manages its own profile.");
        const normalized = {
          name: updates.name,
          role: String(updates.role || member.role).toLowerCase(),
          grade: updates.grade ?? member.grade ?? "",
          tribe: updates.tribe ?? member.tribe ?? "",
          updatedAt: firestoreSDK.serverTimestamp()
        };
        const batch = firestoreSDK.writeBatch(db);
        batch.update(memberRef, normalized);
        batch.update(profileRef, { displayName: normalized.name, role: normalized.role, grade: normalized.grade, tribe: normalized.tribe, updatedAt: normalized.updatedAt });
        await batch.commit();
      },
      removeFamilyMember: async (familyId, memberId) => {
        const memberRef = firestoreSDK.doc(db, "families", familyId, "members", memberId);
        const memberSnapshot = await firestoreSDK.getDoc(memberRef);
        if (!memberSnapshot.exists() || memberSnapshot.data().accountType === "owner") throw new Error("The family account holder cannot be removed.");
        const member = memberSnapshot.data();
        if (member.accountType === "managed") {
          const functionsSDK = await sdk("functions");
          const functions = functionsSDK.getFunctions(app, "us-central1");
          await functionsSDK.httpsCallable(functions, "createFamilyAccount")({
            operation: "remove-managed-member", familyId, memberId, identityId: auth.currentUser?.uid
          });
          return;
        }
        const batch = firestoreSDK.writeBatch(db);
        if (member.accountType === "linked" && member.linkedUid) {
          batch.delete(firestoreSDK.doc(db, "familyLinks", member.linkedUid));
          batch.update(firestoreSDK.doc(db, "profiles", member.linkedUid), { familyId: null, updatedAt: firestoreSDK.serverTimestamp() });
        }
        batch.delete(memberRef);
        await batch.commit();
      },
      clearLegacyMemberSettings: async (familyId, memberId) => {
        await firestoreSDK.updateDoc(firestoreSDK.doc(db, "families", familyId, "members", memberId), {
          settings: firestoreSDK.deleteField()
        });
      },
      acceptFamilyInvite: async (code) => {
        const user = auth.currentUser;
        if (!user?.email) throw new Error("Sign in with the invited personal account first.");
        const inviteRef = firestoreSDK.doc(db, "familyInvites", code.trim());
        const inviteSnapshot = await firestoreSDK.getDoc(inviteRef);
        if (!inviteSnapshot.exists()) throw new Error("That invitation code is not valid.");
        const invite = inviteSnapshot.data();
        if (invite.type !== "link" || invite.status !== "pending" || invite.email !== user.email.toLowerCase()) throw new Error("Sign in with the email address that received this invitation.");
        const userRef = firestoreSDK.doc(db, "users", user.uid);
        const userSnapshot = await firestoreSDK.getDoc(userRef);
        if (!userSnapshot.exists() || userSnapshot.data().status !== "active") throw new Error("Your school account must be approved before linking it to a family.");
        const existingLink = await firestoreSDK.getDoc(firestoreSDK.doc(db, "familyLinks", user.uid));
        if (existingLink.exists() && existingLink.data().status === "active") throw new Error("This account is already linked to a family.");
        const memberRef = firestoreSDK.doc(db, "families", invite.familyId, "members", user.uid);
        const linkRef = firestoreSDK.doc(db, "familyLinks", user.uid);
        const profileRef = firestoreSDK.doc(db, "profiles", user.uid);
        const now = firestoreSDK.serverTimestamp();
        const batch = firestoreSDK.writeBatch(db);
        batch.set(memberRef, {
          familyId: invite.familyId, memberId: user.uid, uid: user.uid, linkedUid: user.uid,
          ownerUid: user.uid, accountType: "linked", status: "active",
          inviteCode: code.trim(),
          name: userSnapshot.data().displayName || user.displayName || invite.name,
          role: userSnapshot.data().role, grade: "", tribe: "", linkedAt: now
        });
        batch.set(profileRef, {
          displayName: userSnapshot.data().displayName || user.displayName || invite.name,
          role: userSnapshot.data().role, accountType: "personal", ownerUid: user.uid,
          familyId: invite.familyId, schoolId: "ctla", status: "active"
        }, { merge: true });
        batch.set(linkRef, { familyId: invite.familyId, memberId: user.uid, accountType: "linked", ownerUid: user.uid, inviteCode: code.trim(), status: "active", updatedAt: now });
        batch.update(inviteRef, { status: "accepted", acceptedBy: user.uid, acceptedAt: now });
        await batch.commit();
        return { familyId: invite.familyId, memberId: user.uid };
      },
      subscribeFamily: (familyId, next, error) => firestoreSDK.onSnapshot(firestoreSDK.doc(db, "families", familyId), (snapshot) => {
        if (!snapshot.exists()) return next(null);
        next({ id: snapshot.id, ...snapshot.data() });
      }, error),
      subscribeFamilyMembers: (familyId, memberId, canList, next, error) => {
        if (canList) {
          return firestoreSDK.onSnapshot(
            firestoreSDK.collection(db, "families", familyId, "members"),
            (snapshot) => next(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), error
          );
        }
        return firestoreSDK.onSnapshot(
          firestoreSDK.doc(db, "families", familyId, "members", memberId),
          (snapshot) => next(snapshot.exists() ? [{ id: snapshot.id, ...snapshot.data() }] : []), error
        );
      }
    };

    async function signUp(email, password, displayName, requestedRole, requestedFamilyAccount = false) {
      const credential = await authSDK.createUserWithEmailAndPassword(auth, email, password);
      await authSDK.updateProfile(credential.user, { displayName });
      const normalizedRole = String(requestedRole || "student").toLowerCase();
      await firestoreSDK.setDoc(firestoreSDK.doc(db, "users", credential.user.uid), {
        displayName, email, role: "student", requestedRole: normalizedRole,
        requestedFamilyAccount: normalizedRole === "parent" && requestedFamilyAccount === true,
        status: "pending", schoolId: "ctla", createdAt: firestoreSDK.serverTimestamp()
      });
      await firestoreSDK.setDoc(firestoreSDK.doc(db, "directory", credential.user.uid), {
        displayName, role: "student", status: "pending", schoolId: "ctla"
      });
      await firestoreSDK.setDoc(firestoreSDK.doc(db, "profiles", credential.user.uid), {
        displayName, role: "student", accountType: "personal", ownerUid: credential.user.uid,
        schoolId: "ctla", status: "pending", settings: {}
      });
      return credential;
    }

    authSDK.onAuthStateChanged(auth, onAuthChanged, onError);
    return api;
  } catch (error) {
    onError?.(error);
    return { enabled: false, error };
  }
}

export function timestampToDate(value) {
  if (!value) return new Date();
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
