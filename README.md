# KIND Service Platform

KIND is a web application prototype for connecting clients with local service providers. The web frontend is built with React and Vite; the API uses Express and Supabase. The separate `expo-app` directory is currently an Expo starter scaffold.

## Requirements

- Node.js and npm
- A Supabase project

## Configure Supabase and the API

1. In the Supabase SQL editor, run [`supabase_schema.sql`](./supabase_schema.sql).
2. Copy `server/.env.example` to `server/.env`.
3. Set the required server values:
   - `JWT_SECRET`: a long, randomly generated signing secret.
   - `SUPABASE_URL`: the project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: the server-only service-role key. The API uses this key for database operations; never expose it to the browser.
4. To provision an administrator, also set `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, then run `node create_admin.js` from `server/`. Keep the service-role key private.
5. Optional features need their own credentials: Google/Facebook OAuth needs the matching client/app ID and secret; SMS needs the Africa's Talking API key and username, and can use `ADMIN_PHONE_NUMBER`.

The API defaults to `http://localhost:4000`. It reads its environment file from `server/.env` whether started from the repository root or `server/`.

## Run locally

In one terminal, from the repository root:

```sh
npm install
npm run dev
```

The Vite development server runs at `http://localhost:3000`.

In another terminal:

```sh
cd server
npm install
npm start
```

Alternatively, start the API from the repository root with `npm run start:server`.

## Notes

- `server/legacy/` contains unused scripts for the old SQLite backend. The current API uses Supabase.
- The provider and admin interfaces are works in progress; some UI actions call API routes that are not yet implemented.
- See [`DOCUMENTATION.md`](./DOCUMENTATION.md) for architecture, configuration, and API details.
