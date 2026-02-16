# Kind Service Platform Documentation

## 1. Project Overview

The **Kind Service Platform** is a comprehensive application designed to connect clients with service providers. It features a web-based frontend for clients and administrators, a backend server handling data and logic, and a mobile application for on-the-go access.

**Key Features:**
- **User Roles:** Clients, Providers, and Administrators.
- **Provider Discovery:** Clients can search for providers based on service type and location.
- **Service Requests:** Clients can initiate contact requests with providers.
- **Real-time Messaging:** Integrated chat functionality between clients and providers.
- **Admin Dashboard:** Administrators can oversee provider registrations and approve/reject profiles.
- **SMS Notifications:** Automated SMS alerts for critical actions (registration, approval, requests) using Africa's Talking.
- **Authentication:** Secure JWT-based authentication with support for Google and Facebook OAuth.

---

## 2. Technology Stack

### Frontend (Web)
- **Framework:** React 19
- **Build Tool:** Vite 6
- **Language:** TypeScript
- **Routing:** React Router DOM v7
- **UI Components:** Lucide React (Icons), OGL (WebGL)
- **Visualization:** Recharts
- **Styling:** CSS / Tailwind CSS (Project structure implies Tailwind usage)

### Backend (API)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite (file-based `data.db`)
- **Authentication:**
  - `jsonwebtoken` (JWT) for session management.
  - `bcryptjs` for password hashing.
  - `passport` with Google & Facebook strategies for OAuth.
- **Notifications:** Africa's Talking API for SMS.

### Mobile (`/expo-app`)
- **Framework:** React Native with Expo (SDK 54)
- **Language:** TypeScript
- **Platform:** Android, iOS, Web

---

## 3. Project Structure

```
kind-service-platform/
├── components/          # Reusable React UI components
├── pages/               # Frontend application pages/routes
├── public/              # Static assets
├── server/              # Backend Express application
│   ├── index.js         # Main server entry point
│   ├── data.db          # SQLite database file
│   └── package.json     # Backend dependencies
├── expo-app/            # Mobile application source
│   ├── App.tsx          # Mobile app entry point
│   └── app.json         # Expo configuration
├── App.tsx              # Main Web App component
├── package.json         # Frontend dependencies
└── vite.config.ts       # Vite build configuration
```

---

## 4. Backend Architecture & API

The backend runs on **port 4000** by default.

### Database Schema (SQLite)

1.  **Users Table (`users`)**
    *   `id`: INTEGER PRIMARY KEY
    *   `name`, `email`, `password`: User credentials.
    *   `role`: 'CLIENT', 'PROVIDER', 'ADMIN'.
    *   `status`: 'active', 'pending' (for providers), 'rejected'.
    *   `service`, `location`: Specific to providers.
    *   `phone_number`: Contact number.

2.  **Contact Requests (`contact_requests`)**
    *   Links Clients and Providers.
    *   `status`: Defaults to 'approved' (Auto-approved logic implemented).

3.  **Messages (`messages`)**
    *   Stores chat history for contact requests.

### Key API Endpoints

#### Authentication
- `POST /api/register`: Register a new user. Triggers SMS alert for new providers.
- `POST /api/login`: Authenticate and receive JWT.
- `GET /api/me`: Get current user profile.
- `GET /api/auth/google`, `GET /api/auth/facebook`: OAuth initiation.

#### Providers & Users
- `GET /api/providers`: Search active providers by service/location.
- `GET /api/users`: List all users (Admin).
- `GET /api/admin/pending-providers`: List providers awaiting approval.
- `PUT /api/admin/providers/:id/status`: Approve or reject a provider. Triggers SMS.

#### Service Interaction
- `POST /api/contact-requests`: Create a request (Auto-approved).
- `GET /api/contact-requests/client/:clientId`: Get client's requests.
- `GET /api/contact-requests/provider/:providerId`: Get provider's requests.
- `POST /api/messages`: Send a chat message.
- `GET /api/messages/:contactRequestId`: Retrieve chat history.

---

## 5. Setup & Installation

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### 1. Backend Setup
1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment Variables:
    Create a `.env` file in the `server` directory with the following:
    ```env
    PORT=4000
    JWT_SECRET=your_jwt_secret
    
    # Africa's Talking Credentials
    AFRICASTALKING_API_KEY=your_api_key
    AFRICASTALKING_USERNAME=your_username
    ADMIN_PHONE_NUMBER=your_admin_phone
    
    # OAuth Credentials (Optional for local dev)
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    FACEBOOK_APP_ID=...
    FACEBOOK_APP_SECRET=...
    ```
4.  Start the server:
    ```bash
    npm start
    ```
    The server will initialize the SQLite database automatically.

### 2. Frontend (Web) Setup
1.  Navigate to the root directory:
    ```bash
    cd ..
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The app will run at `http://localhost:5173`.

### 3. Mobile App Setup
1.  Navigate to the expo app directory:
    ```bash
    cd expo-app
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Expo server:
    ```bash
    npx expo start
    ```
    Scan the QR code with your phone (using Expo Go) or run on an emulator.

---

## 6. Mobile Application (`/expo-app`)

The mobile application is built with **Expo**.
- **`App.tsx`**: The main entry point. Modify this file to build out the mobile UI.
- **Connection to Backend**: Ensure the mobile app points to your computer's local IP address (e.g., `http://192.168.1.5:4000`) instead of `localhost` to connect to the backend while running on a device.

## 7. Troubleshooting

- **Database Errors:** If you encounter SQLite errors, ensure the `server/data.db` file has write permissions or delete it to let the server recreate it.
- **Network Issues:** If the frontend cannot talk to the backend, verify the `PORT` in `.env` matches the frontend API calls (default is 4000).
- **SMS Failures:** Check your Africa's Talking API credentials and ensure you have sufficient balance.
