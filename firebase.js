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
    const db = firestoreSDK.getFirestore(app);
    const storage = storageSDK.getStorage(app);
    await authSDK.setPersistence(auth, authSDK.browserLocalPersistence);

    const api = {
      enabled: true,
      auth,
      signIn: (email, password) => authSDK.signInWithEmailAndPassword(auth, email, password),
      resetPassword: (email) => authSDK.sendPasswordResetEmail(auth, email),
      signUp: (email, password, displayName, requestedRole) => signUp(email, password, displayName, requestedRole),
      signOut: () => authSDK.signOut(auth),
      subscribeConversations: (uid, identityId, next, error) => {
        const reportQueryError = (queryName) => (cause) => {
          if (!error) return;
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
        if (identityId === uid) {
          const legacyQuery = firestoreSDK.query(
            firestoreSDK.collection(db, "conversations"),
            firestoreSDK.where("schoolId", "==", "ctla"),
            firestoreSDK.where("memberUids", "array-contains", uid)
          );
          legacyUnsubscribe = firestoreSDK.onSnapshot(legacyQuery, (snapshot) => {
            legacyItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => !Array.isArray(item.memberProfileIds)); emit();
          }, reportQueryError("Legacy conversation query"));
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
      approveUser: async (uid, role) => {
        const normalizedRole = String(role).toLowerCase();
        const userRef = firestoreSDK.doc(db, "users", uid);
        const userSnapshot = await firestoreSDK.getDoc(userRef);
        if (!userSnapshot.exists() || userSnapshot.data().status !== "pending") throw new Error("This account is no longer pending approval.");
        const data = userSnapshot.data();
        const identityId = data.familyMemberId || uid;
        const identityRef = firestoreSDK.doc(db, "profiles", identityId);
        const identitySnapshot = await firestoreSDK.getDoc(identityRef);
        const batch = firestoreSDK.writeBatch(db);
        const updatedAt = firestoreSDK.serverTimestamp();
        batch.update(userRef, { role: normalizedRole, status: "active", updatedAt });
        batch.set(firestoreSDK.doc(db, "directory", uid), {
          displayName: data.displayName || "School member", role: normalizedRole, status: "active", schoolId: "ctla"
        }, { merge: true });
        if (identitySnapshot.exists()) batch.update(identityRef, { role: normalizedRole, status: "active", updatedAt });
        const familyId = identitySnapshot.data()?.familyId || data.familyId;
        if (familyId && identitySnapshot.exists()) {
          const memberRef = firestoreSDK.doc(db, "families", familyId, "members", identityId);
          const memberSnapshot = await firestoreSDK.getDoc(memberRef);
          if (memberSnapshot.exists() && memberSnapshot.data().accountType === "linked") batch.update(memberRef, { role: normalizedRole, updatedAt });
        }
        await batch.commit();
      },
      setUserRole: async (uid, role) => {
        const normalizedRole = String(role).toLowerCase();
        const userRef = firestoreSDK.doc(db, "users", uid);
        const userSnapshot = await firestoreSDK.getDoc(userRef);
        if (!userSnapshot.exists() || userSnapshot.data().status !== "active" || userSnapshot.data().schoolId !== "ctla") throw new Error("The active school account was not found.");
        if (userSnapshot.data().role === "admin" && normalizedRole !== "admin") {
          const admins = await firestoreSDK.getDocs(firestoreSDK.query(
            firestoreSDK.collection(db, "users"),
            firestoreSDK.where("schoolId", "==", "ctla"),
            firestoreSDK.where("status", "==", "active"),
            firestoreSDK.where("role", "==", "admin")
          ));
          if (admins.size <= 1) throw new Error("The school must keep at least one active Admin.");
        }
        const data = userSnapshot.data();
        const identityId = data.familyMemberId || uid;
        const identityRef = firestoreSDK.doc(db, "profiles", identityId);
        const identitySnapshot = await firestoreSDK.getDoc(identityRef);
        const batch = firestoreSDK.writeBatch(db);
        const updatedAt = firestoreSDK.serverTimestamp();
        batch.update(userRef, { role: normalizedRole, updatedAt });
        batch.set(firestoreSDK.doc(db, "directory", uid), {
          displayName: data.displayName || "School member", role: normalizedRole, status: "active", schoolId: "ctla"
        }, { merge: true });
        if (identitySnapshot.exists()) batch.update(identityRef, { role: normalizedRole, updatedAt });
        const familyId = identitySnapshot.data()?.familyId || data.familyId;
        if (familyId && identitySnapshot.exists()) {
          const memberRef = firestoreSDK.doc(db, "families", familyId, "members", identityId);
          const memberSnapshot = await firestoreSDK.getDoc(memberRef);
          if (memberSnapshot.exists() && memberSnapshot.data().accountType === "linked") batch.update(memberRef, { role: normalizedRole, updatedAt });
        }
        await batch.commit();
      },
      getUserProfile: async (uid) => {
        const ref = firestoreSDK.doc(db, "users", uid);
        const snap = await firestoreSDK.getDoc(ref);
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
      },
      ensureIdentityProfile: async (uid, profile, familyLink = null) => {
        if (familyLink?.accountType === "linked" && familyLink.memberId && familyLink.memberId !== uid) return;
        const ref = firestoreSDK.doc(db, "profiles", uid);
        const snapshot = await firestoreSDK.getDoc(ref);
        if (!snapshot.exists()) await firestoreSDK.setDoc(ref, {
          displayName: profile.displayName || auth.currentUser?.displayName || "School member",
          role: profile.role || "student", accountType: "personal", ownerUid: uid,
          schoolId: "ctla", status: profile.status || "active", settings: {}
        });
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
        const ref = await firestoreSDK.addDoc(firestoreSDK.collection(db, "conversations"), {
          ...conversation,
          schoolId: "ctla",
          updatedAt: firestoreSDK.serverTimestamp(),
          createdAt: firestoreSDK.serverTimestamp()
        });
        return ref.id;
      },
      updateConversation: async (conversationId, updates) => {
        await firestoreSDK.updateDoc(firestoreSDK.doc(db, "conversations", conversationId), {
          title: updates.title, description: updates.description, updatedAt: firestoreSDK.serverTimestamp()
        });
      },
      leaveConversation: async (conversationId, identityId) => {
        const conversationRef = firestoreSDK.doc(db, "conversations", conversationId);
        const snapshot = await firestoreSDK.getDoc(conversationRef);
        if (!snapshot.exists()) throw new Error("This conversation no longer exists.");
        const conversation = snapshot.data();
        const uid = auth.currentUser?.uid;
        const memberUids = conversation.memberUids || [];
        const memberProfiles = Array.isArray(conversation.memberProfileIds) ? conversation.memberProfileIds : memberUids;
        const profileId = identityId || uid;
        const profileIndex = memberProfiles.indexOf(profileId);
        if (!uid || profileIndex < 0) throw new Error("You are not a member of this conversation.");
        if (memberProfiles.length <= 1) throw new Error("You are the last member. Delete the conversation instead.");
        const nextProfiles = [...memberProfiles]; nextProfiles.splice(profileIndex, 1);
        const nextNames = [...(conversation.memberNames || [])]; if (profileIndex < nextNames.length) nextNames.splice(profileIndex, 1);
        const updates = { memberNames: nextNames, memberCount: nextProfiles.length, updatedAt: firestoreSDK.serverTimestamp() };
        if (Array.isArray(conversation.memberProfileIds)) updates.memberProfileIds = nextProfiles;
        else updates.memberUids = memberUids.filter((memberUid) => memberUid !== uid);
        await firestoreSDK.updateDoc(conversationRef, updates);
      },
      deleteConversation: async (conversationId, identityId) => {
        const conversationRef = firestoreSDK.doc(db, "conversations", conversationId);
        const snapshot = await firestoreSDK.getDoc(conversationRef);
        if (!snapshot.exists()) return;
        const messagesRef = firestoreSDK.collection(conversationRef, "messages");
        while (true) {
          const page = await firestoreSDK.getDocs(firestoreSDK.query(messagesRef, firestoreSDK.limit(400)));
          if (page.empty) break;
          const batch = firestoreSDK.writeBatch(db);
          await Promise.all(page.docs.map(async (messageDoc) => {
            const path = messageDoc.data().attachmentPath;
            if (typeof path === "string" && path.startsWith(`conversations/${conversationId}/`)) {
              try { await storageSDK.deleteObject(storageSDK.ref(storage, path)); }
              catch (error) { if (error.code !== "storage/object-not-found") throw error; }
            }
            batch.delete(messageDoc.ref);
          }));
          await batch.commit();
        }
        await firestoreSDK.deleteDoc(conversationRef);
      },
      addConversationMembers: async (conversationId, identityId, memberUids, suggestedNames = []) => {
        const conversationRef = firestoreSDK.doc(db, "conversations", conversationId);
        const snapshot = await firestoreSDK.getDoc(conversationRef);
        if (!snapshot.exists()) throw new Error("This conversation no longer exists.");
        const conversation = snapshot.data();
        const oldUids = conversation.memberUids || [];
        const currentProfiles = conversation.memberProfileIds || oldUids;
        const additions = [...new Set(memberUids.map(String))].filter((uid) => uid && !oldUids.includes(uid) && !currentProfiles.includes(uid));
        if (!additions.length) return;
        if (oldUids.length + additions.length > 100) throw new Error("This conversation has reached its 100-member limit.");
        const directory = await Promise.all(additions.map(async (uid, index) => {
          const member = await firestoreSDK.getDoc(firestoreSDK.doc(db, "directory", uid));
          if (!member.exists() || member.data().schoolId !== "ctla" || member.data().status !== "active") {
            throw new Error("Only approved Called to Learn Academy accounts can be added.");
          }
          return member.data().displayName || suggestedNames[index] || "School member";
        }));
        const nextUids = [...oldUids, ...additions];
        const nextNames = [...(conversation.memberNames || []), ...directory];
        const nextProfiles = [...currentProfiles, ...additions];
        await firestoreSDK.updateDoc(conversationRef, {
          memberUids: nextUids, memberNames: nextNames, memberCount: nextProfiles.length,
          memberProfileIds: nextProfiles,
          kind: conversation.kind === "direct" && nextProfiles.length > 2 ? "group" : conversation.kind,
          updatedAt: firestoreSDK.serverTimestamp()
        });
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
        const userRef = firestoreSDK.doc(db, "users", uid);
        const userSnapshot = await firestoreSDK.getDoc(userRef);
        if (!userSnapshot.exists() || userSnapshot.data().status !== "active" || !["parent", "admin"].includes(userSnapshot.data().role)) {
          throw new Error("An approved Parent or Admin account is required to create a family account.");
        }
        const familyRef = firestoreSDK.doc(firestoreSDK.collection(db, "families"));
        const memberRef = firestoreSDK.doc(db, "families", familyRef.id, "members", uid);
        const profileRef = firestoreSDK.doc(db, "profiles", uid);
        const familyLinkRef = firestoreSDK.doc(db, "familyLinks", uid);
        const now = firestoreSDK.serverTimestamp();
        const profile = userSnapshot.data();
        const batch = firestoreSDK.writeBatch(db);
        batch.set(familyRef, {
          name: family.name, tribe: family.tribe, ownerUid: uid, managerUids: [uid],
          memberIds: [uid], memberUids: [uid], memberCount: 1, schoolId: "ctla", createdAt: now
        });
        batch.set(memberRef, {
          familyId: familyRef.id, memberId: uid, uid, ownerUid: uid, linkedUid: uid,
          accountType: "owner", status: "active", name: family.ownerName || profile.displayName || "Family Account Holder",
          role: profile.role || "parent", grade: "", tribe: family.tribe, createdAt: now
        });
        batch.set(profileRef, {
          displayName: family.ownerName || profile.displayName || "Family Account Holder", role: profile.role,
          accountType: "personal", ownerUid: uid, familyId: familyRef.id, schoolId: "ctla", status: "active"
        }, { merge: true });
        batch.set(familyLinkRef, { familyId: familyRef.id, memberId: uid, accountType: "owner", ownerUid: uid, status: "active", updatedAt: now });
        await batch.commit();
        return familyRef.id;
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
          name: member.name.trim(), role, grade: member.grade || "", tribe: member.tribe || "", createdAt: now
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
        const familyRef = firestoreSDK.doc(db, "families", familyId);
        const memberRef = firestoreSDK.doc(db, "families", familyId, "members", memberId);
        const memberSnapshot = await firestoreSDK.getDoc(memberRef);
        if (!memberSnapshot.exists() || memberSnapshot.data().accountType === "owner") throw new Error("The family account holder cannot be removed.");
        const member = memberSnapshot.data();
        const batch = firestoreSDK.writeBatch(db);
        if (member.accountType === "linked" && member.linkedUid) {
          batch.delete(firestoreSDK.doc(db, "familyLinks", member.linkedUid));
          batch.update(firestoreSDK.doc(db, "profiles", member.linkedUid), { familyId: null, updatedAt: firestoreSDK.serverTimestamp() });
        }
        if (member.accountType === "managed") {
          const uid = auth.currentUser?.uid;
          const userRef = firestoreSDK.doc(db, "users", uid);
          const userSnapshot = await firestoreSDK.getDoc(userRef);
          if (userSnapshot.data()?.activeMemberId === memberId) batch.update(userRef, { activeMemberId: uid, updatedAt: firestoreSDK.serverTimestamp() });
          batch.update(firestoreSDK.doc(db, "profiles", memberId), { status: "archived", familyId: null, updatedAt: firestoreSDK.serverTimestamp() });
        }
        batch.delete(memberRef);
        if (member.accountType === "managed") batch.update(familyRef, {
          memberIds: firestoreSDK.arrayRemove(memberId), memberCount: firestoreSDK.increment(-1), updatedAt: firestoreSDK.serverTimestamp()
        });
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

    async function signUp(email, password, displayName, requestedRole) {
      const credential = await authSDK.createUserWithEmailAndPassword(auth, email, password);
      await authSDK.updateProfile(credential.user, { displayName });
      await firestoreSDK.setDoc(firestoreSDK.doc(db, "users", credential.user.uid), {
        displayName, email, role: "student", requestedRole, status: "pending", schoolId: "ctla", createdAt: firestoreSDK.serverTimestamp()
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
