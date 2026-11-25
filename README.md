# hackaiol

Site for HackaIOL, the Computer Society ITBA hackathon built around
the IOL Inversiones MCP. A landing page plus a sign-up form with
email verification, backed by Firebase (Hosting, Firestore, Cloud
Functions). Same stack and infra as quantum-jam-csitba.

## Getting started

```bash
npm install
cp .env.example .env       # fill in the Firebase web app values
npm run dev
```

The dev server starts on `http://localhost:5173`.

### Running against the emulators

```bash
npm --prefix functions install
npm --prefix functions run build
firebase emulators:start --only functions,firestore
```

Then set `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local` and run
`npm run dev`. Under the emulator, emails are logged to the
emulator output instead of being sent, so the verification code shows
up there.

## Scripts

| Command             | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Vite dev server with HMR                |
| `npm run build`     | `tsc -b` then `vite build` into `dist/` |
| `npm run preview`   | Serve the production build locally      |
| `npm run lint`      | oxlint                                  |
| `npm run typecheck` | `tsc -b` only                           |
| `npm run format`    | prettier                                |

## Firebase

The Firebase project (`webpage-36e40`) is shared with other CS ITBA
apps. This app is isolated from them in three ways.

- **Firestore** uses the `hackaiol` database, not `(default)`.
- **Hosting** deploys to the `csitba-hackaiol` site.
- **Functions** live in the `hackaiol` codebase and every function
  name starts with `hackaiol`. Deploy with
  `firebase deploy --only functions:hackaiol`.

### Functions

| File              | Exports                                      |
| ----------------- | -------------------------------------------- |
| `verification.ts` | `hackaiolRequestCode`, `hackaiolConfirmCode` |
| `signup.ts`       | `hackaiolSubmitSignup`, `hackaiolLookupTeam` |
| `admin.ts`        | Admin SDK bootstrap pinned to `hackaiol`     |
| `lib/otp.ts`      | Code generation, hashing, rate-limit limits  |
| `lib/team.ts`     | `teamIdFrom()`, `MAX_TEAM_SIZE` (3)          |
| `lib/email.ts`    | Email templates and Gmail SMTP sending       |

`hackaiolRequestCode` emails a 6-digit code (30s resend cooldown, 5
requests per hour, 5 wrong attempts max). `hackaiolConfirmCode`
checks it and returns a single-use `verificationToken`, valid for 30
minutes so the rest of the multi-step form can be filled in.
`hackaiolSubmitSignup` requires that token and consumes it in the
same Firestore transaction that writes the `signups/{email}` doc, so
a token cannot be replayed.

Participation is team-only, in teams of 3. Each member signs up on
their own and either creates a team (its name becomes the invite
code) or joins one with that code. Team create/join, the capacity
check and the member count happen in the same transaction.
`hackaiolLookupTeam` lets the form show whether a code exists and has
room before submitting. `teamIdFrom()` is duplicated in
`src/components/signup/team.ts` and must be kept in sync by hand.

Firestore collections (`emailVerifications`, `signups`, `teams`) are written
only by these functions through the Admin SDK. `firestore.rules` is
a deliberate deny-all.

### Email delivery

Emails go out through Gmail SMTP as `computersociety@itba.edu.ar`
using the project-level `GMAIL_APP_PASSWORD` Functions secret, the
same one quantum-jam-csitba uses.

Two emails go out, same as quantum-jam-csitba: the verification code
and, after a successful signup, a confirmation with the event details,
the team name and invite code, a link to the event page, and the
participation rules. Event date, time, venue and page URL are
placeholders at the top of `functions/src/lib/email.ts` (flagged with
`TODO`). Under the Functions emulator, emails are logged instead of
sent.

### Deploying

- Preview: `firebase hosting:channel:deploy preview`
- Hosting: `firebase deploy --only hosting`
- Functions: `firebase deploy --only functions:hackaiol`
- Rules: `firebase deploy --only firestore`

`firebase-hosting-pull-request.yml` (PR preview, `staging`
environment) and `firebase-hosting-merge.yml` (deploy on merge to
`main`, `prod` environment) run format, lint, typecheck, test and
build before deploying. Each GitHub Environment needs the six
`VITE_FIREBASE_*` secrets, and the repo needs the
`FIREBASE_SERVICE_ACCOUNT_WEBPAGE_36E40` secret.

## Contributing

See `AGENTS.md` for repo conventions.
