# Agent instructions

Read this before making changes. Its purpose is to keep the repo
consistent across contributors, human or AI.

## Project

hackaiol is the site for HackaIOL, a hackathon by Computer Society
ITBA to build solutions on top of the IOL Inversiones MCP. It is a
React + TypeScript SPA with two screens: a landing page and a sign-up
form with email verification. The backend is Firebase (Functions,
Firestore, Hosting). The infra mirrors the quantum-jam-csitba repo.

## Stack

- Vite 8 + React 19 + TypeScript 6
- Tailwind CSS v4 via `@tailwindcss/vite`
- shadcn/ui (New York style, CSS-variable tokens)
- react-i18next + `i18next-browser-languagedetector` (es / en)
- Firebase Hosting, Firestore, Functions (sign-up backend)
- Gmail SMTP via `nodemailer` for verification and confirmation emails
- oxlint for linting, husky + lint-staged for the pre-commit gate

## Layout

```
src/
  components/ui/       shadcn primitives (`npx shadcn@latest add <name>`)
  components/signup/   sign-up form, fields, code input
  components/landing/  landing pieces (footer)
  i18n/                i18next bootstrap + locale JSON
  lib/                 `firebase.ts`, `signupApi.ts`, `retry.ts`, `cn()`
  pages/               one file per route
functions/             Cloud Functions (own lint, own tsconfig)
firebase.json .firebaserc firestore.rules firestore.indexes.json
.github/workflows/     CI (ci.yml) + Firebase Hosting deploy workflows
.agents/skills/        Firebase Agent Skills reference docs (not app code)
```

## Firebase

- Project `webpage-36e40` hosts multiple CS ITBA apps, each with its
  own Firestore database. This app uses `hackaiol`, not `(default)`.
  The Admin SDK must always pass it explicitly:
  `getFirestore(app, 'hackaiol')`.
- Hosting deploys to the `csitba-hackaiol` site, not the project's
  default site.
- Functions live in their own codebase (`hackaiol` in
  `firebase.json`) and every exported function name starts with
  `hackaiol`. Function names are project-wide, so an unprefixed name
  could overwrite another app's function. Deploy with
  `firebase deploy --only functions:hackaiol`, never a bare
  `--only functions`.
- `firestore.rules` is deny-all on purpose. `emailVerifications` and
  `signups` and `teams` are written only by `functions/` via the Admin SDK, which
  bypasses rules.

## Commands

- `npm run dev` Vite dev server
- `npm run build` `tsc -b` + `vite build`
- `npm run lint` oxlint
- `npm run typecheck` `tsc -b`
- `npm run format` prettier

## Conventions

- Import from `src/` with the `@/*` alias, not relative paths.
- User-facing copy goes through `useTranslation()`. Do not hardcode
  strings in components.
- Firebase config values come from `VITE_FIREBASE_*` env vars.
  `src/lib/firebase.ts` is the single init site.
- Prefer editing files over introducing new abstractions.
- Do not add comments that only restate what the code does.
- English for identifiers, comments, docs, and commit messages.

## Visual identity

Taken from the HackaIOL flyer. Barlow is the only typeface (Google
Fonts, loaded in `index.html`). Colors live as tokens in
`src/index.css`: purple field `#160934` with a `#353587` radial glow,
IOL green `#00D37F` as the accent, orange `#FFAF5C` for "down" and
in-progress states, `#C7CEDB` for secondary text. The page backdrop
(gradient plus grain) is `.brand-backdrop`, and panels use `.glass`.
Logos are in `public/brand/` for the site and `functions/assets/` for
the emails, which attach them inline. The ticker quotes are decorative.
The Claude Code mascot and the Claude spark are traced SVGs in
`src/components/brand/ClaudeIcons.tsx`, used by the animated
`ClaudeCodeWindow` in the hero.

The landing is editorial and left aligned: sections use `Section`
(sticky label column plus content), separated by rules and type
rather than cards. Do not restate what mcp.invertironline.com already
explains; link to it instead.

## Writing rules

- Never use an em dash or a middle dot anywhere (copy, code, docs,
  commits).
- Never use a colon or a semicolon in user-facing text (site copy,
  emails, email subjects).
- No clutter in the UI. Every element on screen has to earn its place.
- Every UI change must be checked in a browser before it is
  considered done.

## Commits

- All commits are authored with `spainpenguincubes@gmail.com`. The
  repo's local `git config user.email` is set to it; check it before
  committing.
- Never add a `Co-Authored-By:` line (or any other trailer) naming an
  AI assistant.
- Never run `git commit` or `git push` on the human's behalf unless
  they ask. Stage changes and let them commit.

Every commit subject starts with a bracketed tag.

| Tag          | Use for                                  |
| ------------ | ---------------------------------------- |
| `[FEATURE]`  | new feature                              |
| `[BUG]`      | fixing a known bug                       |
| `[BEHAVIOR]` | behavior change that isn't a bug fix     |
| `[UI/UX]`    | design or user-flow change               |
| `[BUILD]`    | build / tooling / dependency change      |
| `[CODE]`     | refactor, format, correctness cleanup    |
| `[DOCS]`     | docs or logging strings                  |
| `[TEST]`     | tests                                    |
| `[HACK]`     | intentional hack, explain it in the body |

- Subject in the imperative mood, 50 characters or fewer.
- Blank line between subject and body.
- Body lines wrapped at 72 characters. Explain the what and the why.

## Pre-commit gate

`.husky/pre-commit` runs `npx lint-staged`, which runs `oxlint` on
staged files under `src/` and `vite.config.ts`, and `prettier` on
everything staged. `oxlint` is deliberately not run on `functions/`,
which has its own ESLint setup.

## Do not

- Never commit `.env` files. Only `.env.example` is tracked.
- Do not lint or touch `functions/` from root tooling.
