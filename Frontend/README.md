# BoxGuard Frontend

The React dashboard for BoxGuard: live box counting, session history, challans, and analytics.

> For setup and the full project guide, see the [project README](../README.md).

## Quick start

```bash
cd Frontend
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` to the backend on port 5000. The backend must be running for sign-in, sessions and the live feed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Build a production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Structure

```
src/
├── pages/
│   ├── Landing.jsx        Public home page
│   ├── Login.jsx          Sign in
│   ├── Signup.jsx         Create an account
│   ├── Dashboard.jsx      Start a session and watch the live count
│   ├── Sessions.jsx       Session history, recordings and challans
│   ├── OperatorStats.jsx  Analytics and PDF export
│   └── Profile.jsx        Warehouse and challan details
├── components/            Header, navigation, route guard, tooltip, animations
├── context/               SessionContext: shared live-session state
├── hooks/useWebSocket.js  Connects to the backend stream
└── api/index.js           REST calls to the backend
```

## Notes

- Sign-in state is kept in `localStorage` (`token` and `user`). Signing out clears both.
- The backend address (`localhost:5000`) is set in `src/api/index.js` (REST and `WS_URL`). Some pages also call it directly (`Dashboard.jsx`, `Sessions.jsx`), so change those too when deploying.
- The analytics page includes jsPDF, which makes its bundle larger. Vite warns about this during build. It is harmless.
