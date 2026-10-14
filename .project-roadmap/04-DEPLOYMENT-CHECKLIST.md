# 04 - DEPLOYMENT CHECKLIST

## Pre-Deployment Pre-Flight

### Build Verification

- [ ] **Fix empty route file**: Delete or populate `src/app/api/projects/route.ts`
- [ ] **Run `npm run build`**: Must complete with zero TypeScript errors
- [ ] **Run `npm run lint`**: Must pass with zero errors (currently 71 errors)
- [ ] **Verify `npm run start`**: Test production build locally with `npm run start`

### Secrets & Environment Variables

- [ ] **Rotate Cloudinary API secret** (was committed in `.env`)
- [ ] **Move `.env` to `.env.local`**: `.env` should NOT be committed to git
- [ ] **Add `.env` to `.gitignore`** (verify it's already there)
- [ ] **Verify `.env.local` is in `.gitignore`**

#### Required Environment Variables (Vercel/Netlify)

**Client-side (NEXT_PUBLIC_ prefix — exposed to browser):**
| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSy...` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `elattar-me-portf.firebaseapp.com` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `elattar-me-portf` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `elattar-me-portf.firebasestorage.app` | Firebase storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `677539737992` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:677539737992:web:...` | Firebase app ID |

**Server-side (API routes — NEVER exposed to browser):**
| Variable | Value | Notes |
|----------|-------|-------|
| `CLOUDINARY_CLOUD_NAME` | `dutmc0rf6` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | `267969433942627` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `[ROTATE THIS]` | Cloudinary API secret — set in hosting dashboard only |

> **IMPORTANT**: `CLOUDINARY_*` variables must NOT have the `NEXT_PUBLIC_` prefix. They should only be available server-side.

### Firebase Configuration

- [ ] **Firestore Security Rules**: Deploy proper rules (currently default open read/write)
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /projects/{projectId} {
        allow read: if true;
        allow write: if request.auth != null;
        match /reviews { allow read: if true; }
      }
      match /bookings/{bookingId} {
        allow create: if true;
        allow read, delete: if request.auth != null;
      }
    }
  }
  ```
- [ ] **Firebase Auth**: Ensure Google provider is enabled in Firebase Console > Authentication > Sign-in method
- [ ] **Firebase Storage**: Initialize if using (imported in `firebase.ts` but unused)
- [ ] **Firestore Indexes**: Check if any composite indexes are needed (the `where("type", "==", "CALL_RESERVATION")` query may need one)

### Image & Asset Optimization

- [ ] **Add Cloudinary to `next.config.ts` remote patterns**:
  ```ts
  { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' }
  ```
- [ ] **Convert local images to optimized formats**: `MOHAMED-ELATTAR.PNG` and `MohamedElattar-Pp.JPG`
- [ ] **Add `sizes` prop** to all `<Image>` components for responsive sizing
- [ ] **Verify `public/cv.pdf`** downloads correctly in production
- [ ] **Verify all certificate images** load in `/public/certificates/`

### SEO & Metadata

- [ ] **Add OpenGraph metadata** in `layout.tsx` (title, description, image, URL)
- [ ] **Add Twitter card metadata** in `layout.tsx`
- [ ] **Create `public/robots.txt`**:
  ```
  User-agent: *
  Allow: /
  Disallow: /admin
  Sitemap: https://your-domain.com/sitemap.xml
  ```
- [ ] **Add favicon** (currently using default Next.js favicon)
- [ ] **Verify `<html lang="en">`** is set (already done)

---

## Deployment Platform: Vercel

### Vercel Setup

- [ ] **Connect GitHub repository** to Vercel dashboard
- [ ] **Framework Preset**: Next.js (auto-detected)
- [ ] **Build Command**: `npm run build` (default)
- [ ] **Output Directory**: `.next` (default)
- [ ] **Node.js Version**: 18+ (required for Next.js 16)

### Vercel Environment Variables

- [ ] Add all environment variables above in Vercel Dashboard > Settings > Environment Variables
- [ ] Set `CLOUDINARY_*` variables for **Production** scope only (not Preview/Development)
- [ ] Set `NEXT_PUBLIC_FIREBASE_*` for **All Environments** (they're the same across dev/prod)
- [ ] **Never** commit `.env.local` — set these via the Vercel dashboard

### Vercel Build Settings

- [ ] **Turbopack**: Enabled by default in Next.js 16
- [ ] **Build caching**: Vercel auto-caches `node_modules` and `.next`
- [ ] **Function regions**: Default is fine (auto-selects nearest)

---

## Deployment Platform: Netlify (Alternative)

### Netlify Setup

- [ ] `netlify.toml` or dashboard config:
  ```toml
  [build]
    command = "npm run build"
    publish = ".next"

  [[plugins]]
    package = "@netlify/plugin-nextjs"
  ```
- [ ] Install `@netlify/plugin-nextjs` if using Netlify
- [ ] Add environment variables in Netlify Dashboard > Site Settings > Environment

---

## Post-Deployment Verification

### Functional Testing

- [ ] **Home section loads**: Hero name, typewriter effect, spotlight, mode toggle
- [ ] **Skills section loads**: Grid appears, filter buttons work, 3D tilt responds
- [ ] **Projects section loads**: Projects fetch from Firestore, grid renders
- [ ] **Project detail modal opens**: Media slider, reviews, live/code links work
- [ ] **Review submission works**: New review appears in list and persists
- [ ] **Contact modal opens**: Calendar renders, time slots load, form submits
- [ ] **CV modal opens**: Profile displays, PDF downloads
- [ ] **Credentials drawer opens**: Certificate cards display
- [ ] **Certificate lightbox opens**: Image loads (or shows 404 gracefully)
- [ ] **Theme toggle works**: Dark/light switch persists across refresh
- [ ] **Secret admin login works**: Google auth redirects to `/admin`
- [ ] **Admin dashboard loads**: All 6 tabs functional
- [ ] **Admin project CRUD**: Create, view, delete projects
- [ ] **Admin booking management**: View, delete bookings
- [ ] **Admin logout**: Returns to home page

### Performance Testing

- [ ] **Lighthouse score**: Target 80+ on Performance, 90+ on Accessibility
- [ ] **First Contentful Paint**: < 2s
- [ ] **Largest Contentful Paint**: < 3s
- [ ] **No layout shift** from canvas animations
- [ ] **Mobile test**: Touch scrolling works, no horizontal overflow
- [ ] **Canvas performance**: Only visible SpaceBackground renders

### Security Testing

- [ ] **Firestore**: Unauthorized users CANNOT write to `projects` or `bookings`
- [ ] **Cloudinary upload**: Unauthenticated requests are REJECTED at `/api/upload`
- [ ] **Admin page**: Non-authenticated users are redirected to `/`
- [ ] **No secrets in client bundle**: Verify `CLOUDINARY_API_SECRET` not in JS source

### Cross-Browser Testing

- [ ] **Chrome**: Full functionality
- [ ] **Firefox**: Canvas + Web Audio work
- [ ] **Safari**: AudioContext handling, `-webkit-` prefixes
- [ ] **Edge**: Full functionality
- [ ] **Mobile Safari (iOS)**: Touch events, scroll hijacking, audio
- [ ] **Chrome Mobile (Android)**: Touch events, PWA prompt

---

## Rollback Plan

1. If deployment fails, revert to last known good commit on `main`
2. Vercel: Dashboard > Deployments > click "..." on last good deploy > "Promote to Production"
3. Keep a backup of `.env.local` outside the repository
