# AGENTS.md

## Cursor Cloud specific instructions

This is a pure frontend React application (Create React App) with no backend services or databases.

### Services

| Service | Command | Port |
|---------|---------|------|
| React dev server | `npm start` | 3000 |

### Key commands

- **Install deps**: `npm install`
- **Dev server**: `npm start` (runs on port 3000)
- **Tests**: `npm test -- --watchAll=false`
- **Lint**: `npx eslint src/`
- **Build**: `npm run build`

### Notes

- There are 2 pre-existing lint errors in `src/App.test.js` (testing-library/no-node-access). These are not regressions.
- All data is static/hardcoded in `src/data/test.js`; no API or DB is needed.
- The app uses `localStorage` for persisting filter selections across refreshes.
- Node.js v22+ and npm 10+ are available in the environment.
