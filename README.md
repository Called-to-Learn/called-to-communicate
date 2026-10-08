# Called to Communicate

Called to Communicate is a responsive, installable web app for Called to Learn Academy. It uses the reference screens as its visual guide and adapts them for phones, tablets, and desktop browsers.

The multi-platform client is a Progressive Web App (PWA), so one interface works in iOS Safari, Android Chrome, and desktop browsers. It is not a native Swift or Android package. The iOS app can be added to the Home Screen from Safari; Android can install it from Chrome.

## Run the preview

From Terminal, run:

```sh
cd /Users/tirzaan/Documents/Codex/2026-10-08/m/outputs
python3 -m http.server 4173
```

Open **http://127.0.0.1:4173**. Choose **Preview the app** on the sign-in screen. Demo conversations, classes, family changes, and messages persist in that browser's local storage.

Stop the server with **Control-C** in Terminal.

## Included screens and interactions

- Messages with search and All, Personal, Groups, Classes, and Announcements filters
- Direct and group chats, class chats, message sending, file and image attachment flows, chat settings, and conversation creation
- Class list, class details, staff class creation, open enrollment, and teacher approval or decline of join requests
- Month calendar with live class links, events, meetings, deadlines, date selection, and staff event creation
- Profiles, notification preferences, role-based settings, family profiles, account switching, and family-member account invitations
- A desktop navigation rail and a mobile bottom tab bar
- A small service worker and web manifest for Home Screen installation

The preview uses sample data. In preview mode, uploaded files are represented by their names and sizes; cloud storage is enabled only after Firebase is configured.

## Connect Firebase

The app uses Firebase Authentication, Cloud Firestore, Cloud Storage, Cloud Functions, and Firebase Hosting. New sign-ups are created as **pending Student** accounts, with the selected role saved as a request. Presidency can approve Parent, Student, Teacher, and Presidency accounts. Only an existing Admin can approve Admin requests or change staff roles. Firestore Security Rules enforce those permissions; the signup form never grants school access by itself.

### Host the web app on Vercel with GitHub

The repository root is the app root. Import the GitHub repository into Vercel with the **Other** framework preset and no build command; Vercel serves the static `index.html`, JavaScript, CSS, and app assets directly. Connect the Vercel project to the repository so pushes to `main` deploy automatically. Firebase remains the backend for authentication, database, storage, and existing functions. Add `called-to-communicate.vercel.app` to Firebase Authentication's authorized domains. The Storage CORS allowlist is in `cors.json`; apply it to the bucket if browser downloads from Vercel are blocked.

1. Create a Firebase project and register a **Web app** in Firebase Console.
2. Enable **Email/Password** under Authentication sign-in providers.
3. Create a Cloud Firestore database and a Storage bucket.
4. Copy the web app configuration into [firebase-config.js](firebase-config.js). Firebase web config is public client configuration; the Security Rules enforce access.
5. Edit [cors.json](cors.json): replace `YOUR_PROJECT_ID` with your Firebase project ID and add any custom Hosting domains.
6. Configure bucket CORS for authenticated in-browser downloads. From Terminal, install Google Cloud CLI if needed, then run:

   ```sh
   gcloud storage buckets update gs://YOUR_STORAGE_BUCKET --cors-file=cors.json
   ```

7. Install the Firebase CLI if needed: `npm install -g firebase-tools`.
8. In Terminal, from this `outputs` directory, sign in and select the project:

   ```sh
   firebase login
   firebase use --add
   ```

9. Deploy the app, rules, index, and trusted functions:

   ```sh
   firebase deploy
   ```

Cloud Functions deployment requires the Firebase **Blaze** plan. The callable functions use the Node.js 22 runtime. A billing account is required by Firebase to deploy Cloud Functions; review Firebase's current pricing and set budget alerts before enabling it.

### Set up the first Admin account

The first Admin must be assigned once by a Firebase project Owner because there is not yet an Admin who can approve the request:

1. Register the person's email from the app and choose **Admin**. The account will remain pending.
2. In Authentication, copy that user's UID. In Firestore, open `users/{uid}` and set `role` to `admin`, `status` to `active`, and `schoolId` to `ctla`.
3. Create or update `directory/{uid}` with `displayName`, `role: "admin"`, `status: "active"`, and `schoolId: "ctla"`.
4. Have them sign out and back in. Admins can approve role requests and assign or remove Presidency and Admin roles from Settings → Admin Controls. The app prevents removing the last active Admin through its role management screen.

After the first Admin is active, Presidency can approve the other role requests. Admin requests remain Admin-only. Keep at least two trusted Admins if the school needs to avoid a manual recovery step.

The school directory exposes only display name and role to approved school accounts. It does not include family details or email addresses. A family owner can invite Parent and Student accounts; the app copies a Firebase password setup link for the parent to share with that member.

## Firebase data model

- `users/{uid}` — verified role, school, profile, and family link
- `directory/{uid}` — limited, searchable school profile
- `conversations/{id}` and `conversations/{id}/messages/{id}` — private, group, class, and announcement messages
- `classes/{id}` and `classes/{id}/joinRequests/{uid}` — classes and enrollment requests
- `events/{id}` — school calendar
- `families/{id}` and `families/{id}/members/{uid}` — family account and individual accounts
- `conversations/{id}/{uid}/{file}` in Storage — attachments limited to conversation members

Firestore and Storage deny access by default. Keep the included rules deployed and assign roles only through trusted school administration. The app does not contain a service-account key.

## Install on a phone or tablet

- **iPhone/iPad:** open the Firebase Hosting HTTPS address in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the Hosting address in Chrome, use the browser menu, then **Install app** or **Add to Home screen**.

The app interface and Firebase data are shared across platforms. Native push notifications, voice/video calling, and app-store packages are not included in this web release.
