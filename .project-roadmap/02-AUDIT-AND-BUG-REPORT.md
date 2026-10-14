# 02 - AUDIT AND BUG REPORT

## Critical Build Blockers

### CRITICAL: Empty API Route Causes Build Failure
- **File**: `src/app/api/projects/route.ts`
- **Issue**: File is completely empty (0 bytes). Next.js TypeScript type-checking fails with: `File 'route.ts' is not a module.`
- **Impact**: `npm run build` fails. Deployment impossible.
- **Fix**: Delete the file or add a valid default export.

### CRITICAL: Secrets Committed to Repository
- **File**: `.env` (tracked by git, not `.env.local`)
- **Issue**: Firebase API key, Cloudinary API key, and **Cloudinary API secret** are committed in plaintext.
- **Impact**: Anyone with repo access can abuse the Cloudinary account (upload/delete/spam). Firebase client keys are public by design but the `.env` file itself should not be committed.
- **Fix**: Move secrets to `.env.local`, add `.env` to `.gitignore`, rotate the Cloudinary API secret immediately.

---

## Build & Lint Errors

### 71 Lint Errors + 21 Warnings (`npm run lint`)

| Category | Count | Severity |
|----------|-------|----------|
| `react-hooks/set-state-in-effect` | 9 | High - Cascading renders |
| `react/jsx-no-comment-textnodes` | 35+ | High - JSX malformation |
| `react-hooks/purity` (Math.random in render) | 1 | Medium - Unstable renders |
| `@typescript-eslint/no-explicit-any` | 6 | Medium - Type safety |
| `@next/next/no-img-element` | 2 | Low - Unoptimized images |
| `@typescript-eslint/no-unused-vars` | 8 | Low - Dead code |
| `react-hooks/exhaustive-deps` | 2 | Medium - Stale closures |

### `react-hooks/set-state-in-effect` (9 instances)
Calling `setState` synchronously inside `useEffect` causes cascading renders. Found in:
- `HeroScene.tsx:142` - `setStage("title")` on visibility change
- `SkillsTerminal.tsx:246` - `setStage("title")` on visibility change
- `SkillsTerminal.tsx:80` (GlitchText) - `setDisplayText` on triggered change
- `Navigation.tsx:137` - `setTheme(savedTheme)` reading localStorage
- `Navigation.tsx:163` - `setIsMounted(true)` hydration guard
- `ProjectsSection.tsx:121` - `setMyCreatedReviewIds` from localStorage
- `ProjectsSection.tsx:172` - `setShowPreloader` on view intersection

### `react/jsx-no-comment-textnodes` (35+ instances)
Arabic comments inside JSX using `//` syntax render as literal text nodes in the DOM. Found across:
- `HeroScene.tsx` (lines 267, 381, 399, 412, 440)
- `Navigation.tsx` (lines 1080, 1106, 1308, 1323, 1368)
- `ProjectsSection.tsx` (lines 323, 339, 422, 440, 467, 559, 631, 651, 830, 890)
- `SkillsTerminal.tsx` (lines 346, 385)

### `react-hooks/purity` (1 instance)
- `ProjectsSection.tsx:471` - `Math.random()` called directly in render for GitHub contribution grid visualization. This produces different results on each render, violating React's purity rules.

---

## UI/UX Issues

### Hydration Risk: `isMounted` Pattern
- **File**: `Navigation.tsx:163`
- Uses `useEffect(() => { setIsMounted(true) }, [])` to delay rendering until client-side. This causes a blank flash on initial load and is flagged as an anti-pattern by the React 19 linter.

### Scroll Hijacking Conflicts
- **File**: `page.tsx:78-170`
- Custom wheel/touch handlers intercept native scrolling with `e.preventDefault()`. This can conflict with:
  - Browser accessibility features (keyboard scroll)
  - Screen readers
  - The projects section's `overflow-y-auto` (partially handled but fragile)
- The `target.closest(".fixed")` heuristic for blocking scroll inside modals is brittle.

### Triple SpaceBackground Canvas Instances
- **Files**: `HeroScene.tsx:235`, `SkillsTerminal.tsx:332`, `ProjectsSection.tsx:305`
- Three separate `<SpaceBackground />` components each run independent `requestAnimationFrame` loops with 150 stars each = **450 stars rendered simultaneously** even though only one section is visible at a time. This is a significant GPU/CPU drain.

### z-index Stacking Chaos
- Secret login panel: `z-[10000]`
- Secret panel drag trigger: `z-[9999]`
- SkillsTerminal "title" stage: `z-[9999]`
- HeroScene "title" stage: `z-[99999]`
- Project detail modal: `z-[100]`
- Certificate lightbox: `z-[60]`
- Admin lock screen: `z-[200]`
- Multiple conflicting z-index values make overlap behavior unpredictable.

### AudioContext Warning & Resource Leaks
- **Files**: `HeroScene.tsx:14-51`, `SkillsTerminal.tsx:27-71`
- `playCyberSound()` creates a **new `AudioContext` instance on every single call** (hover, click, filter). Browsers limit AudioContext instances and will emit console warnings.
- The `setTimeout(() => ctx.close(), 100)` cleanup in SkillsTerminal is fragile.
- HeroScene doesn't close contexts at all.
- On mobile, audio is silently blocked but objects still allocate.

### `<img>` Instead of `<Image />`
- **Files**: `HeroScene.tsx:359` (hero profile image), `Navigation.tsx:913` (certificate images)
- Uses raw `<img>` tags instead of Next.js `<Image>`, bypassing automatic optimization, lazy loading, and responsive sizing.

### Mobile Responsiveness Concerns
- The scroll hijacking wheel handler has no mobile guard (only touch handlers are separated).
- The secret drag trigger (`drag="x"` on the right edge) may interfere with mobile back-swipe gestures.
- The SkillsTerminal grid uses `minmax(105px, 1fr)` which can overflow on very narrow screens (<360px).

---

## Console Warnings Expected

| Warning | Source | Cause |
|---------|--------|-------|
| `AudioContext` autoplay policy | `HeroScene.tsx`, `SkillsTerminal.tsx` | Creating AudioContext without user gesture on mobile |
| Firebase Firestore rules | Runtime | Open read/write rules (development only) |
| `[DEP0205] DeprecationWarning` | Node.js build | `module.register()` deprecated in newer Node |

---

## Performance Bottlenecks

### 1. Three Canvas Starfield Instances
- 3x `SpaceBackground` running 150-star `requestAnimationFrame` loops simultaneously.
- Each uses full-screen canvas with DPR scaling.
- Only one is visible at a time (the others are behind `overflow-hidden` sections).
- **Estimated waste**: ~66% of canvas rendering work is invisible.

### 2. No Code Splitting / Dynamic Imports
- All components load eagerly on page load: `HeroScene`, `SkillsTerminal`, `ProjectsSection`, `Navigation`, plus Firebase SDK.
- The admin page loads the entire Firebase Auth + Firestore SDK on the main page even though it's only needed at `/admin`.
- `framer-motion` is imported in every component (~40KB+ gzipped).

### 3. Unoptimized Images
- Hero image (`/MOHAMED-ELATTAR.PNG`) served as raw `<img>` - no WebP conversion, no lazy loading, no responsive srcset.
- Profile image in project cards uses `<Image>` but with `unoptimized` flag, negating all optimization.
- Certificate images are served as PNGs through raw `<img>` in lightbox.
- All project images come from external URLs but `next.config.ts` only whitelists `images.unsplash.com`.

### 4. Firebase SDK Bundle Size
- Full Firebase SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`) imported eagerly.
- ~200KB+ gzipped loaded on every page even when auth/firestore isn't needed (e.g., public visitor browsing skills).

### 5. Massive Component Files
- `Navigation.tsx` is **1548 lines** - contains dock, contact modal with calendar, CV modal, credentials drawer, lightbox, theme toggle. Should be decomposed.
- `ProjectsSection.tsx` is **974 lines** - contains grid, detail modal, review system, developer tab.
- `admin/page.tsx` is **1088 lines** - single-file admin dashboard.

### 6. Unused Dependencies Bloating Build
- `three`, `@react-three/fiber`, `@react-three/drei` (~500KB+ combined) - never imported.
- `gsap` (~60KB) - never imported.

---

## Security Concerns

| Issue | Severity | Detail |
|-------|----------|--------|
| `.env` committed to git | HIGH | Contains Cloudinary API secret |
| Firestore open rules | HIGH | Anyone can read/write projects and bookings |
| No CSRF protection on booking form | MEDIUM | Form submits directly to Firestore client-side |
| No rate limiting on reviews | MEDIUM | Anyone can spam reviews without auth |
| Admin auth is Google-only | LOW | No email/password fallback (form is commented out) |
| Cloudinary upload has no auth check | HIGH | `/api/upload` accepts any POST request |
