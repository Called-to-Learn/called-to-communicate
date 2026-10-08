// Paste the web app configuration from Firebase Console > Project settings > Your apps.
// Keep the placeholders until you create the academy's Firebase project.
export const firebaseConfig = {
  apiKey: "AIzaSyBCcH9uZZyehu3kqm96KL3ax9pvnncszTA",
  authDomain: "called-to-communicate-web.firebaseapp.com",
  projectId: "called-to-communicate-web",
  storageBucket: "called-to-communicate-web.firebasestorage.app",
  messagingSenderId: "303686400773",
  appId: "1:303686400773:web:708b55a63649e3d6ad556c",
  measurementId: "G-DEK48QLG0J"
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every((value) =>
  typeof value === "string" && value.length > 0 && !value.startsWith("YOUR_")
);
