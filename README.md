# Expense Tracker

A lightweight multi-user expense tracker built with React, Vite, TypeScript and Tailwind on Firebase (Auth, Firestore and Hosting). It runs entirely on the free **Spark** plan and has no backend server: the browser talks to Firebase directly, and **Firestore Security Rules** are the backend.

- Sign in with Google
- Groups such as "Jan 2026"
- **Dashboard** tab: totals for this year, month and week (by due date), plus pending dues and the overdue amount
- **Budgets** tab: groups and their expenses, with title, amount, paid, remaining (derived), type, and due date
- Expense table: title coloured by type; remaining shown red when due/overdue, yellow when pending
- Amounts are whole numbers
- Each user can only read and write their own data, enforced in `firestore.rules`
- Access is invite-only through an email allowlist (this is how the app is capped at about 50 users)

## Project layout

```
firebase.json            Hosting + Firestore + emulator config
firestore.rules          Security rules: ownership, allowlist, validation
firestore.indexes.json   Empty: no composite indexes needed (sorting is client-side)
src/lib/firebase.ts      Firebase init (+ emulator wiring)
src/auth/AuthProvider    Google sign-in + allowlist check
src/data/*.ts            Firestore CRUD + live subscriptions
src/components/*         UI
tests/rules.test.ts      Security rules unit tests (run against the emulator)
```

### Data model

```
allowlist/{email}                  {}   ← you add these by hand
users/{uid}                        { displayName, email, lastLoginAt }
users/{uid}/groups/{groupId}       { name, createdAt, updatedAt }
users/{uid}/expenses/{expenseId}   { title, amount, paidAmount, groupId, type, dueDate, createdAt, updatedAt }
```

## One-time Firebase setup

1. **Create a project** at <https://console.firebase.google.com> and keep it on the free Spark plan.
2. **Authentication**: go to *Build → Authentication → Get started → Sign-in method* and enable **Google**.
3. **Firestore**: go to *Build → Firestore Database → Create database*, choose **production mode**, and pick a nearby region (for example `asia-south1`). The region can't be changed later.
4. **Web app**: go to *Project settings → General → Your apps → Add app → Web (`</>`)*. Copy the config values:
   ```bash
   cp .env.example .env.local   # then fill in the VITE_FIREBASE_* values
   ```
5. **Link the CLI**:
   ```bash
   firebase login
   firebase use --add          # pick your project; this updates .firebaserc
   ```
6. **Deploy the rules and indexes**:
   ```bash
   firebase deploy --only firestore
   ```
7. **Invite users**: in *Firestore → Data*, create a collection named `allowlist`. Add one document per user, using their Gmail address in lowercase as the **document ID**. The document doesn't need any fields. Start by adding yourself.

## Develop

```bash
npm install
npm run dev                  # http://localhost:5173, uses the real Firebase project
```

To use the local emulators instead (requires Java 21+):

```bash
# .env.local → VITE_USE_EMULATORS=true
npm run emulators            # Emulator UI at http://localhost:4000
npm run dev
```

The emulator's Google sign-in popup lets you make up any user. Add that user's email to `allowlist` in the Emulator UI's Firestore tab. Emulator data is saved to `.emulator-data/` when the emulator exits.

## Test the security rules

```bash
npm run test:rules           # starts the Firestore emulator, runs tests/rules.test.ts
```

## Deploy (free)

```bash
npm run deploy               # vite build + firebase deploy (hosting + rules + indexes)
```

The app is served at `https://<project-id>.web.app`. That domain is already authorised for Google sign-in. If you add a custom domain, add it under *Authentication → Settings → Authorized domains*.

## Free tier headroom

Spark limits include 50k Firestore reads, 20k writes, and 1 GiB of storage per day, plus 10 GB/month of Hosting transfer. With 50 users, typical use stays well below these limits.
