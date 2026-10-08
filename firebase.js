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
      subscribeConversations: (uid, next, error) => {
        const q = firestoreSDK.query(
          firestoreSDK.collection(db, "conversations"),
          firestoreSDK.where("schoolId", "==", "ctla"),
          firestoreSDK.where("memberUids", "array-contains", uid)
        );
        return firestoreSDK.onSnapshot(q, (snapshot) => {
          const timestampMillis = (value) => typeof value?.toMillis === "function" ? value.toMillis() : value instanceof Date ? value.getTime() : 0;
          const conversations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          conversations.sort((left, right) => timestampMillis(right.updatedAt) - timestampMillis(left.updatedAt));
          next(conversations);
        }, error);
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
      createClass: async (classRecord) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "createClass")(classRecord);
        return result.data.classId;
      },
      subscribeEvents: (schoolId, next, error) => {
        const q = firestoreSDK.query(firestoreSDK.collection(db, "events"), firestoreSDK.where("schoolId", "==", schoolId));
        return firestoreSDK.onSnapshot(q, (snapshot) => next(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), error);
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
        const profileRef = firestoreSDK.doc(db, "users", uid);
        const profile = await firestoreSDK.getDoc(profileRef);
        if (!profile.exists() || profile.data().status !== "pending") throw new Error("This account is no longer pending approval.");
        const data = profile.data();
        const batch = firestoreSDK.writeBatch(db);
        batch.update(profileRef, { role: normalizedRole, status: "active", updatedAt: firestoreSDK.serverTimestamp() });
        batch.set(firestoreSDK.doc(db, "directory", uid), {
          displayName: data.displayName || "School member", role: normalizedRole, status: "active", schoolId: "ctla"
        }, { merge: true });
        await batch.commit();
      },
      setUserRole: async (uid, role) => {
        const normalizedRole = String(role).toLowerCase();
        const profileRef = firestoreSDK.doc(db, "users", uid);
        const profile = await firestoreSDK.getDoc(profileRef);
        if (!profile.exists() || profile.data().status !== "active" || profile.data().schoolId !== "ctla") throw new Error("The active school account was not found.");
        if (profile.data().role === "admin" && normalizedRole !== "admin") {
          const admins = await firestoreSDK.getDocs(firestoreSDK.query(
            firestoreSDK.collection(db, "users"),
            firestoreSDK.where("schoolId", "==", "ctla"),
            firestoreSDK.where("status", "==", "active"),
            firestoreSDK.where("role", "==", "admin")
          ));
          if (admins.size <= 1) throw new Error("The school must keep at least one active Admin.");
        }
        const batch = firestoreSDK.writeBatch(db);
        batch.update(profileRef, { role: normalizedRole, updatedAt: firestoreSDK.serverTimestamp() });
        batch.set(firestoreSDK.doc(db, "directory", uid), {
          displayName: profile.data().displayName || "School member", role: normalizedRole, status: "active", schoolId: "ctla"
        }, { merge: true });
        await batch.commit();
      },
      getUserProfile: async (uid) => {
        const ref = firestoreSDK.doc(db, "users", uid);
        const snap = await firestoreSDK.getDoc(ref);
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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
          lastMessage: { text: message.text || message.attachmentName || "Attachment", senderName: message.senderName },
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
      leaveConversation: async (conversationId) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        await functionsSDK.httpsCallable(functions, "leaveConversation")({ conversationId });
      },
      deleteConversation: async (conversationId) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        await functionsSDK.httpsCallable(functions, "deleteConversation")({ conversationId });
      },
      addConversationMembers: async (conversationId, memberUids) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        await functionsSDK.httpsCallable(functions, "addConversationMembers")({ conversationId, memberUids });
      },
      requestClassJoin: async (classId, user, className) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const result = await functionsSDK.httpsCallable(functions, "joinClass")({ classId, className, displayName: user.displayName || "School member" });
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
      updateProfile: async (uid, updates) => {
        if (updates.displayName) await authSDK.updateProfile(auth.currentUser, { displayName: updates.displayName });
        const batch = firestoreSDK.writeBatch(db);
        batch.update(firestoreSDK.doc(db, "users", uid), updates);
        if (updates.displayName) batch.update(firestoreSDK.doc(db, "directory", uid), { displayName: updates.displayName });
        await batch.commit();
      },
      createFamily: async (uid, family) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const create = functionsSDK.httpsCallable(functions, "createFamilyAccount");
        const result = await create({ name: family.name, tribe: family.tribe });
        return result.data.familyId;
      },
      setActiveMember: async (uid, memberId) => firestoreSDK.updateDoc(firestoreSDK.doc(db, "users", uid), { activeMemberId: memberId }),
      updateFamily: async (familyId, updates) => firestoreSDK.updateDoc(firestoreSDK.doc(db, "families", familyId), updates),
      addFamilyMember: async (familyId, member) => {
        const functionsSDK = await sdk("functions");
        const functions = functionsSDK.getFunctions(app, "us-central1");
        const invite = functionsSDK.httpsCallable(functions, "inviteFamilyMember");
        const result = await invite({ ...member, familyId, role: String(member.role).toLowerCase() });
        return result.data;
      },
      subscribeFamily: (familyId, next, error) => firestoreSDK.onSnapshot(firestoreSDK.doc(db, "families", familyId), (snapshot) => {
        if (!snapshot.exists()) return next(null);
        next({ id: snapshot.id, ...snapshot.data() });
      }, error),
      subscribeFamilyMembers: (familyId, next, error) => firestoreSDK.onSnapshot(
        firestoreSDK.collection(db, "families", familyId, "members"),
        (snapshot) => next(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))), error
      )
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
