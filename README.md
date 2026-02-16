<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1trkesBZoij5dXtXoqUP3dPd6gv4P4_1q

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Local API Server (registration)

This project includes a minimal Express + SQLite server to handle user registration.

1. Open a new terminal and change to the `server` folder:

```powershell
cd server
npm install
npm start
```

2. The server will start on `http://localhost:4000` and expose:
- `POST /api/register` — register a new user (body: `{ name, email, password, role }`)
- `GET /api/users` — list users

- `POST /api/login` — login with `{ email, password }`, returns `{ token, role, name }`
- `GET /api/me` — verify token from `Authorization: Bearer <token>` and return user info

3. Keep the server running while using the frontend register form.
