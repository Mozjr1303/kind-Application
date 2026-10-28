# KIND Service Platform Documentation

## 1. Overview

KIND is a web application prototype for a local-services marketplace. It is intended to help clients find and contact service providers and to let administrators review provider registrations. The UI includes client, provider, and admin areas. Some product areas (including bookings, payments, reviews, and provider discovery) remain incomplete or use mock data.

The current server persists application data in Supabase. The SQLite utilities in `server/legacy/` belong to an older implementation and are not used by the active API.

## 2. Technology

### Web

- React 19 and TypeScript
- Vite 6, development port `3000`
- React Router DOM 7 with `HashRouter`
- Lucide React, Recharts, OGL, and GSAP
- CSS and Tailwind utility classes; Tailwind is loaded from the CDN in `index.html`

### API

- Node.js and Express 4, default port `4000`
- Supabase JavaScript client for database access
- `bcryptjs` for password hashing; `jsonwebtoken` for API tokens
- Passport Google and Facebook OAuth strategies
- Africa's Talking for SMS notifications

### Mobile

`expo-app/` is configured for Expo, React Native, and Android/iOS/web targets, but its `App.tsx` is still the default Expo starter screen; it is not an implemented KIND client.

## 3. Repository layout and startup

- `App.tsx`, `index.tsx`, `index.css`, `vite.config.ts`: web app root and Vite setup.
- `pages/`: public, client, provider, and admin screens.
- `components/`: shared dashboard layout, cards, and visual effects.
- `server/index.js`: Express API entry point and routes.
- `server/supabase.js`: Supabase client setup.
- `supabase_schema.sql`: database table definitions and system-user seed.
- `public/`: static assets, PWA manifest, styles, and service worker.
- `server/legacy/`: inactive SQLite scripts, retained for reference.

The web app mounts from `index.tsx` and routes in `App.tsx`. The API loads `server/.env`, checks required variables, then starts Express. The Vite dev server listens on port `3000` and proxies `/api` requests to the API at port `4000`.

## 4. Database and data

The schema in `supabase_schema.sql` defines:

- `users`: accounts and provider profile attributes.
- `contact_requests`: client-to-provider requests and status.
- `messages`: messages attached to a contact request.
- `alerts`: admin alert records.
- `logs`: activity log records.

The schema creates the system user used for automated messages. It does not seed an administrator account; provision one with `server/create_admin.js`.

The API currently has registration/login, `/api/me`, provider approval, user management, contact request, message, alert, and log routes in `server/index.js`. The client UI also calls provider-search and individual-user routes that are not present in the current server implementation. Some admin alert and deletion controls likewise target routes that are not implemented. Check the server routes before relying on those UI operations.

The checked-in schema does not define Supabase row-level-security policies. Confirm the project's RLS and access policies before deployment.

## 5. Authentication and integrations

Email/password registration hashes the password with `bcryptjs`; login returns a signed JWT and a `user` object. Google and Facebook OAuth require provider credentials and callback URLs configured in those provider consoles. The web client stores the token and user data in browser `localStorage`.

The server requires:

- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional integrations:

- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Facebook OAuth: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
- Africa's Talking SMS: `AFRICASTALKING_API_KEY`, `AFRICASTALKING_USERNAME`; `ADMIN_PHONE_NUMBER` is used for admin notifications.

The admin provisioning script additionally requires `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. The service-role key must remain server-side and must not be committed or exposed to the browser.

All supported names and blank example values are listed in `server/.env.example`. Copy it to `server/.env` and fill only the values needed for the chosen features. OAuth test and legacy SQLite reset variables in that template are only for the corresponding scripts.

## 6. Setup

1. Create a Supabase project.
2. Run `supabase_schema.sql` in the Supabase SQL editor.
3. Copy `server/.env.example` to `server/.env`; set `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ALLOWED_ORIGINS`.
4. Optionally provision an admin by setting `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, then run `node create_admin.js` from `server/`.
5. Install and start the web application from the repository root:

   ```sh
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`.

6. In a separate terminal, install and start the API:

   ```sh
   cd server
   npm install
   npm start
   ```

   The API is available at `http://localhost:4000` unless `PORT` overrides it. The equivalent root command is `npm run start:server`.

## 7. Testing and deployment

`server/test-workflow.js` and `server/test-oauth.js` are manual API workflow scripts, not an automated test suite. The project does not currently define frontend unit/UI tests or lint scripts. Root validation is available with `npm run build`.

`vercel.json` configures a Vercel static build and server function. Configure the same required server variables in the deployment environment. Before exposing a deployment, add and verify server-side authentication and role authorization for protected API operations; frontend route gating is not an authorization boundary.

The PWA service worker in `public/sw.js` caches only a small app shell and does not provide offline data synchronization.
