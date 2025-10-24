# MSoft Cockpit UI (React)
Airplane-style analogue cockpit for real-time mobile mapping telemetry.

## Quick Start
```bash
npm install
npm run dev
```

## Live Telemetry
Set a global variable before the app loads (e.g., in index.html or from the console):
```js
window.__TELEM_URL = "http://localhost:8080/telemetry";
```
Without it, the dashboard animates on mock data.

## Build / Preview
```bash
npm run build
npm run preview
```
