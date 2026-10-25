# Central Monitoring System Frontend

A React + Vite frontend for monitoring device health, managing users, and viewing operational analytics for the Central Monitoring System.

## Features

- Secure authentication with role-based access control
- Device monitoring dashboard and status tracking
- Historical device logs with filtering/export support
- User management and profile/password flows
- System health visibility
- Responsive UI with dark/light theme

## Tech Stack

- React 18
- Vite 5
- JavaScript/JSX (with some TypeScript files)
- Tailwind CSS
- React Router
- Zustand
- Axios
- Chart.js / Recharts

## Prerequisites

- Node.js 18+
- npm 9+
- Backend API running at `http://localhost:8080`

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run in development

```bash
npm run dev
```

App URL (default): `http://localhost:5173`

### 3) Build for production

```bash
npm run build
```

### 4) Preview production build

```bash
npm run preview
```

## Environment

Create a `.env` file (optional if defaults are used):

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_NAME=Central Monitoring System
VITE_APP_VERSION=1.0.0
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Project Structure

```text
cms_frontend/
├── public/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── pages/
│   ├── services/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## API Expectations

This frontend expects backend endpoints like:

- `/auth/*`
- `/users/*`
- `/devices/*`
- `/device-status/*`
- `/analytics/*`
- `/dashboard/*`

## Troubleshooting

### Backend connection issues
- Ensure backend is running at `http://localhost:8080`
- Check browser Network tab for failed requests

### Auth issues
- Re-login if token/session expired
- Clear site storage if stale auth state persists

### Dependency/build issues (Windows PowerShell)
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

## Contributing

1. Create a feature branch
2. Commit focused changes
3. Open a PR with clear description and screenshots (if UI changed)

## License

MIT
