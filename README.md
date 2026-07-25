# AMBIT Unified Workspace

AMBIT is a premium External Brain productivity system. This unified workspace contains:
- **`frontend/`**: React + Vite application served via a custom Express proxy/server.
- **`backend/`**: Next.js API server using Prisma ORM and PostgreSQL.

---

## ⚡ Quick Start & Prerequisites

To run this application locally on your PC, ensure you have the following installed:
1. **Node.js** (v18.0.0 or higher recommended)
2. **PostgreSQL** database (a local instance or a cloud database like [Neon](https://neon.tech) or [Supabase](https://supabase.com))
3. **Gemini API Key** (obtain from [Google AI Studio](https://aistudio.google.com))
4. **Google OAuth Client Credentials** (set up in the [Google Cloud Console](https://console.cloud.google.com))

---

## 🛠️ Step-by-Step Setup

### 1. Clone & Install Dependencies
First, clone the repository to your local machine and install all dependencies:
```bash
# Install root, backend, and frontend dependencies automatically
npm install
```
> [!NOTE]
> The root `package.json` contains a `postinstall` script which automatically triggers `npm install` inside both the `frontend/` and `backend/` directories.

### 2. Configure Environment Variables

You need to create configuration files in both the `backend/` and `frontend/` directories.

#### A. Backend Environment Setup (`backend/.env`)
Create a file named `.env` inside the `backend/` folder (using `backend/.env.example` as a template):
```bash
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<database_name>?schema=public"

# NextAuth secret key (Generate one with `npx auth secret` or use any random 32-character string)
AUTH_SECRET="your-32-character-random-string"

# Google OAuth Credentials (obtain from Google Cloud Console)
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

#### B. Frontend Environment Setup (`frontend/.env`)
Create a file named `.env` inside the `frontend/` folder (using `frontend/.env.example` as a template):
```bash
# Gemini AI Key from Google AI Studio
GEMINI_API_KEY="your-gemini-api-key"

# App URL (Use localhost:3000 for local development)
APP_URL="http://localhost:3000"
```

---

### 3. Initialize the Database
Configure your database tables by running the Prisma schema push command:
```bash
# From the root directory:
npx prisma db push --schema=backend/prisma/schema.prisma

# Or navigate to backend and run:
cd backend
npx prisma db push
```

---

### 4. Start the Application
Run the concurrent dev command from the root workspace directory:
```bash
npm run dev
```
This command starts both the React frontend (with its Express server) and the Next.js backend concurrently:
- **Express Proxy / Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **Next.js Backend API**: [http://localhost:3001](http://localhost:3001)

> [!IMPORTANT]
> **Always access the app via `http://localhost:3000`**. The Express server on port 3000 manages Gemini API calls, serves frontend assets, and proxies standard database/session endpoints to the Next.js backend on port 3001.

---

## 🔑 Google OAuth Redirect URIs Configuration

When setting up your Google OAuth client ID on Google Cloud Console, configure the following values to enable authentication to work correctly:

- **Authorized JavaScript origins**:
  - `http://localhost:3000`
  - `http://localhost:3001`
- **Authorized redirect URIs**:
  - `http://localhost:3000/api/auth/callback/google`
  - `http://localhost:3001/api/auth/callback/google`

