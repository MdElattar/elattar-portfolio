# 03 - NEXT STEPS (PRIORITIZED)

## HIGH PRIORITY — Blockers Before Deploy

### 1. Fix Build Failure
- **Action**: Delete or populate `src/app/api/projects/route.ts` (currently empty, causes TypeScript error).
- **Verify**: Run `npm run build` and confirm zero TypeScript errors.

### 2. Rotate & Secure Exposed Secrets
- **Action**: Rotate the Cloudinary API secret immediately (it's committed in `.env`).
- **Action**: Add `.env` to `.gitignore`, migrate all variables to `.env.local`.
- **Action**: Create proper Firestore security rules (currently wide open).
- **Action**: Add authentication check to `/api/upload` route (anyone can upload to your Cloudinary).

### 3. Fix All Lint Errors
- **35+ `react/jsx-no-comment-textnodes`**: Wrap all `// COMMENT` text in JSX with `{/* */}` comment syntax. Found in: `HeroScene.tsx`, `Navigation.tsx`, `ProjectsSection.tsx`, `SkillsTerminal.tsx`.
- **9 `react-hooks/set-state-in-effect`**: Refactor to use derived state or `useMemo`/`useRef` patterns:
  - `Navigation.tsx:137` — Read localStorage in a `useRef` initializer or `useState` lazy initializer.
  - `Navigation.tsx:163` — Replace `isMounted` pattern with `typeof window !== "undefined"` checks.
  - `HeroScene.tsx:142`, `SkillsTerminal.tsx:246` — Derive `stage` from `isVisible` prop instead of effect.
  - `ProjectsSection.tsx:121` — Use `useState(() => JSON.parse(...))` lazy initializer.
- **1 `react-hooks/purity`**: Move `Math.random()` in `ProjectsSection.tsx:471` to a `useMemo` or generate the array once outside render.
- **6 `@typescript-eslint/no-explicit-any`**: Replace `any` with proper types in `firebase.ts`, `page.tsx`, `SkillsTerminal.tsx`.
- **8 `@typescript-eslint/no-unused-vars`**: Remove unused variables (`toggleTheme`, `setEmail`, `setPassword`, `handleEmailLogin`, `rotateX`/`rotateY` in ProjectsSection, `wordIndex`, unused `e` parameters).

### 4. Fix Hydration Mismatches
- Remove `isMounted` anti-pattern in `Navigation.tsx:163`. Use `useState` lazy initializer: `const [isMounted, setIsMounted] = useState(() => typeof window !== "undefined")`.
- Ensure `Time` display in `Navigation.tsx` and `HeroScene.tsx` uses SSR-safe initial value (`"00:00:00"`), which is already handled.

### 5. Mobile Scroll Conflicts
- The `target.closest(".fixed")` check in `page.tsx:111-117` is fragile. Add `data-scroll-guard` attributes to modals and check for those instead.
- Add explicit `touch-action: pan-y` to the main scrollable container.
- Disable the secret drag trigger on mobile viewports (`window.innerWidth < 768`).

---

## MEDIUM PRIORITY — Enhancements

### 6. SEO & Meta Tags
- **Missing**: OpenGraph tags, Twitter card, favicon, `robots.txt`, `sitemap.xml`.
- **Action**: Add comprehensive metadata in `layout.tsx`:
  ```tsx
  export const metadata: Metadata = {
    title: "MOHAMED ELATTAR | Full-Stack Developer Portfolio",
    description: "...",
    openGraph: { title, description, images: [...] },
    twitter: { card: "summary_large_image", ... },
    icons: { icon: "/favicon.ico" },
  };
  ```
- Create `public/robots.txt` and generate `sitemap.xml`.

### 7. Optimize SpaceBackground Usage
- Currently 3 instances run simultaneously (Hero, Skills, Projects).
- **Solution**: Lift `SpaceBackground` to `page.tsx` as a single shared instance with `position: fixed`. Remove it from individual sections.
- This alone saves ~2 render loops and ~300 canvas stars.

### 8. Lazy Load Heavy Components
- Wrap `ProjectsSection` in `next/dynamic` with `ssr: false` (it fetches from Firestore client-side anyway).
- Wrap `admin/page.tsx` content in dynamic imports.
- Use `React.lazy()` for modals that are only opened on interaction (Contact, CV, Drawer).

### 9. Image Optimization
- Replace `<img>` in `HeroScene.tsx:359` with `<Image>` from `next/image`.
- Replace `<img>` in `Navigation.tsx:913` (lightbox) with `<Image>`.
- Remove `unoptimized` prop from all `<Image>` components.
- Add `res.cloudinary.com` to `next.config.ts` remote patterns.
- Convert `/MOHAMED-ELATTAR.PNG` and `/MohamedElattar-Pp.JPG` to WebP and serve through Cloudinary or Next.js Image Optimization.

### 10. Decompose Large Components
- **Navigation.tsx (1548 lines)** → Split into:
  - `FloatingDock.tsx` — Bottom navigation dock
  - `ContactModal.tsx` — Contact form with calendar
  - `CVModal.tsx` — CV/Profile modal
  - `CredentialsDrawer.tsx` — Certificates drawer
  - `CertificateLightbox.tsx` — Image lightbox viewer
  - `ThemeToggle.tsx` — Dark/light theme switcher
- **ProjectsSection.tsx (974 lines)** → Split into:
  - `ProjectGrid.tsx` — Grid with search/filter
  - `ProjectDetailModal.tsx` — Full detail view
  - `ReviewSystem.tsx` — Review form + list
  - `DeveloperTab.tsx` — GitHub/opensource tab

### 11. Firebase SDK Tree-Shaking
- Import only needed Firebase services:
  ```ts
  // Instead of importing the entire SDK
  import { initializeApp } from "firebase/app";
  import { getAuth } from "firebase/auth";
  import { getFirestore } from "firebase/firestore";
  ```
- This is already done correctly in `firebase.ts`, but consider using Firebase modular SDK lazy loading for the main page.

### 12. Add Loading States & Error Boundaries
- Projects section shows skeleton cards but has no error boundary if Firestore fails.
- No React Error Boundary wrapping the app — a crash in any component takes down the whole page.
- Add `error.tsx` files for App Router routes.

---

## LOW PRIORITY — Future Features

### 13. Analytics Integration
- Add Vercel Analytics or Google Analytics (gtag) for visitor tracking.
- The existing Firestore view/click counters are good but lack session deduplication.

### 14. Interactive Sound Triggers
- The Web Audio `playCyberSound()` system exists but creates a new `AudioContext` every call.
- **Improvement**: Create a single shared `AudioContext` and reuse it. Add a global mute toggle.
- Consider adding subtle ambient background sound for the matrix theme.

### 15. PWA Support
- Add `manifest.json` and service worker for installable portfolio.
- Cache static assets for offline viewing.

### 16. Dark/Light Theme Polish
- Theme toggle exists but the cyberpunk aesthetic is primarily dark-themed.
- Audit all components for light theme contrast ratios and accessibility.

### 17. E2E Testing
- No test files exist in the project.
- Add Playwright or Cypress for critical user flows (navigation, project viewing, review submission, admin login).

### 18. Remove Unused Dependencies
- Remove `three`, `@react-three/fiber`, `@react-three/drei`, `gsap` from `package.json`.
- Estimated savings: ~500KB+ from `node_modules`.

### 19. Accessibility Audit
- Review color contrast (many elements use `text-neutral-500` on dark backgrounds).
- Add `aria-label` to icon-only buttons.
- Ensure calendar widget is keyboard-navigable.
- Review star rating display (uses `★` characters — should have `aria-label` for screen readers).
