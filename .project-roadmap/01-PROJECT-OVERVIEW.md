# 01 - PROJECT OVERVIEW

## Tech Stack Audit

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| Framework | Next.js (App Router) | 16.2.6 | Current |
| UI Runtime | React | 19.2.4 | Current |
| Language | TypeScript | ^5 | Current |
| CSS Engine | Tailwind CSS (PostCSS v4) | ^4 | Current |
| Animation | Framer Motion | ^12.40.0 | Current |
| Animation (aux) | GSAP | ^3.15.0 | Installed (UNUSED) |
| 3D | React Three Fiber + Drei | ^9.6.1 / ^10.7.7 | Installed (UNUSED) |
| 3D | Three.js | ^0.184.0 | Installed (UNUSED) |
| Backend/Database | Firebase (Auth + Firestore) | ^12.13.0 | Active |
| File Storage | Cloudinary | ^2.10.0 | Active (API Route) |
| Bundler | Turbopack (Next.js 16 built-in) | -- | Active |
| Font | Geist Sans + Geist Mono (next/font) | -- | Active |

### Notable: Heavy unused dependencies
- `@react-three/fiber`, `@react-three/drei`, `three`, `gsap` are all installed in `package.json` but **never imported** in any source file. These significantly bloat `node_modules` and increase build/install time.

---

## Architecture Summary

### Routing Structure (App Router)

```
src/app/
  layout.tsx          -- Root layout: Geist fonts, globals.css, metadata
  page.tsx            -- Main client-side SPA (hero, skills, projects, secret admin login)
  globals.css         -- Tailwind v4 import + CSS custom properties (dark/light theme)
  lib/
    firebase.ts       -- Firebase init singleton (auth, db, storage, googleProvider)
  components/
    HeroScene.tsx     -- Hero section with 3D tilt, spotlight, typewriter, matrix mode toggle
    SkillsTerminal.tsx-- Tech stack grid with 3D perspective, glitch text, Web Audio sounds
    ProjectsSection.tsx-- Projects fetched from Firestore, detail modal, reviews, developer tab
    Navigation.tsx    -- Floating dock nav, contact modal, CV modal, credentials drawer, theme toggle
    SpaceBackground.tsx-- Canvas-based parallax starfield (requestAnimationFrame loop)
    CyberDrawer.tsx   -- Certificates drawer component (UNUSED - replaced by inline drawer in Navigation)
    LoadingOverlay.jsx-- Generic loading overlay (UNUSED - replaced by inline preloaders)
  admin/
    page.tsx          -- Full admin dashboard: auth-gated, CRUD projects, bookings, reviews, logs
  api/
    upload/route.ts   -- Cloudinary file upload API route
    projects/route.ts -- EMPTY FILE (causes build failure)
```

### Key Component Map

```
page.tsx (SPA Shell)
  |-- HeroScene (section id="home")
  |     |-- SpaceBackground (canvas starfield)
  |     |-- GlitchText (name hover effect)
  |     |-- TypewriterText (name reveal)
  |
  |-- SkillsTerminal (section id="skills")
  |     |-- SpaceBackground (canvas starfield - DUPLICATE instance)
  |     |-- SkillCard (memo, 3D tilt, Web Audio)
  |     |-- GlitchText (skill name decode)
  |
  |-- ProjectsSection (section id="projects")
  |     |-- SpaceBackground (canvas starfield - TRIPLE instance)
  |     |-- ProjectCard (memo, 3D tilt)
  |     |-- ReviewForm
  |     |-- ProjectSkeletonCard (loading state)
  |
  |-- Navigation (fixed dock)
  |     |-- Contact Modal (calendar booking + message)
  |     |-- CV Modal (profile + download)
  |     |-- Credentials Drawer (certificates)
  |     |-- Lightbox (certificate image viewer)
  |
  |-- Secret Admin Login (slide-in panel)
        |-- Google Auth / Email Auth (email form commented out)
```

### Data Flow

- **Projects**: Firestore `projects` collection -> fetched in `ProjectsSection` on mount
- **Bookings**: Firestore `bookings` collection -> fetched in `Navigation` (contact modal) and `admin/page.tsx` (realtime via `onSnapshot`)
- **Reviews**: Stored as sub-array inside each project document in Firestore
- **File Uploads**: Admin uploads -> `/api/upload` route -> Cloudinary -> URL stored in Firestore
- **Auth**: Firebase Auth (Google provider) -> redirects to `/admin` on success
- **Analytics**: View/click counters stored as fields on project documents (increment on interaction)

### State Management
- **No global state library** (no Redux, no Zustand, no Context)
- All state is component-local via `useState`/`useRef`
- Firebase acts as the source of truth for projects, bookings, and reviews
- Theme preference stored in `localStorage`

### Theming System
- CSS custom properties defined in `globals.css` (dark default, light via `[data-theme="light"]`)
- Toggle via `Navigation` component -> sets `data-theme` attribute on `<html>`
- Persisted to `localStorage`

---

## File Inventory

| File | Lines | Description |
|------|-------|-------------|
| `page.tsx` | 305 | Main SPA shell with scroll hijacking, secret login |
| `HeroScene.tsx` | 446 | Hero with 3D tilt, spotlight, typewriter, matrix mode |
| `SkillsTerminal.tsx` | 471 | Tech stack grid with glitch, 3D tilt, audio |
| `ProjectsSection.tsx` | 974 | Projects grid, detail modal, reviews, dev tab |
| `Navigation.tsx` | 1548 | Largest file - dock, 4 modals, calendar, forms |
| `SpaceBackground.tsx` | 159 | Canvas starfield animation |
| `CyberDrawer.tsx` | 132 | UNUSED certificates component |
| `LoadingOverlay.jsx` | 24 | UNUSED loading component |
| `admin/page.tsx` | 1088 | Full admin panel with CRUD, analytics, logs |
| `lib/firebase.ts` | 34 | Firebase singleton initialization |
| `api/upload/route.ts` | 46 | Cloudinary upload endpoint |
| `api/projects/route.ts` | 0 | EMPTY - causes build failure |
| `globals.css` | 62 | Tailwind + CSS custom properties |
