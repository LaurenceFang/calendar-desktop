# Calendar Desktop (Bootstrap)

Local-only Windows-targeted desktop calendar app bootstrap. This repo includes:

- Electron desktop shell (`apps/desktop`)
- React web UI (`apps/web`)
- Express API (`apps/api`)
- Shared types package (`packages/shared`, dual ESM/CJS build)

## Prerequisites

- Node.js 22 (recommended for Windows)
- pnpm (`corepack enable` then `corepack prepare pnpm@9.12.0 --activate`)

## Install

```powershell
pnpm install
```

## How to run (Dev)

```powershell
pnpm dev
```

This will start:

- API on `http://localhost:3101`
- Web on `http://localhost:5173`
- Electron window loading the web UI

## Where data is stored

The SQLite database lives under the Electron `userData` directory:

- `db/schedule.db`

Default locations by OS (the folder is created automatically):

- **Windows**: `%APPDATA%\Calendar Desktop\db\schedule.db`
- **macOS**: `~/Library/Application Support/Calendar Desktop/db/schedule.db`
- **Linux**: `~/.config/Calendar Desktop/db/schedule.db`

The app also creates `imports`, `exports`, and `logs` folders alongside the `db` folder.

## Build (Production)

```powershell
pnpm build
```

Build outputs:

- `apps/web/dist`
- `apps/api/dist`
- `apps/desktop/dist`

## Ports Used

- API: `3101`
- Web: `5173`

## Troubleshooting (Windows)

- **Port already in use**: close any process using 3101 or 5173, then re-run `pnpm dev`.
- **Electron window is blank**: ensure the web dev server is running on `http://localhost:5173`.
- **PowerShell execution policies**: if scripts are blocked, run PowerShell as Administrator and allow signed scripts, or use `cmd`.

## Stopping Processes

- In the terminal running `pnpm dev`, press `Ctrl + C` once. `concurrently` will stop all processes.
