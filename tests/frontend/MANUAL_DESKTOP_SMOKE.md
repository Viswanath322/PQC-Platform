# Manual desktop smoke checklist (Tauri app)

Use once `desktop/src-tauri` exists (Harshith). Run against a **release** build (`npm run tauri build`) and
repeat the launch/network items on a dev build. Record: date, OS, commit SHA, build type, tester, result per item.

Prereqs: MySQL + Redis + FastAPI running locally (`docker compose up -d`; `uvicorn ... --host 127.0.0.1 --port 8000`).

## 1. Launch and render
- [ ] App launches from the installed bundle / `.app` / `.exe` (no console window, no crash dialog)
- [ ] Main window renders within 5 s; no blank/white screen; window title is correct
- [ ] Window resize / minimize / maximize / close work; app process exits fully on close (`pgrep -fl <app>` empty)
- [ ] Fonts and icons render correctly with the machine offline (no fallback boxes; bundled fonts only)

## 2. Backend status
- [ ] With FastAPI running: Backend Status indicator shows **Healthy** (calls `GET http://127.0.0.1:8000/api/v1/health`)
- [ ] Stop FastAPI (Ctrl+C): indicator changes to **Unhealthy/Unreachable** within the polling interval, no UI crash
- [ ] Restart FastAPI: indicator recovers to Healthy without restarting the app
- [ ] Error toasts/messages do not leak stack traces, file paths or credentials

## 3. Navigation and data
- [ ] Sidebar reaches Dashboard, Projects, Scans, Findings, PQC, Reports; no page is blank or throws
- [ ] Browser-style back/forward or reload (Cmd/Ctrl+R) does not break routing
- [ ] Any page still showing mock data displays the "Mock data" badge

## 4. Outbound network monitoring (air-gap proof)
Goal: **zero** connections to non-local addresses during launch, navigation, and idle (5 min).

macOS:
```bash
PID=$(pgrep -f "<AppName>" | head -1)
sudo nettop -p "$PID" -L 5 -m tcp          # sample 5 s of TCP flows; every remote must be 127.0.0.1 / ::1
lsof -a -i -P -n -p "$PID"                 # list sockets held by the app; only 127.0.0.1:8000 (+ loopback) allowed
sudo tcpdump -i any -n 'not host 127.0.0.1 and not host ::1' -c 50   # should stay silent while using the app
```
Windows (PowerShell / Resource Monitor):
- [ ] `resmon` -> Network tab -> tick the app process: "TCP Connections" shows only 127.0.0.1 / ::1 remotes
- [ ] `Get-NetTCPConnection -OwningProcess (Get-Process <AppName>).Id | Select RemoteAddress,RemotePort,State`
- [ ] No DNS lookups: `Get-DnsClientCache` has no new entries after using the app
Checklist:
- [ ] No connection to any non-loopback address (Google Fonts, CDN, telemetry, update servers)
- [ ] No DNS queries issued by the app
- [ ] Repeat with the Wi-Fi/Ethernet **disabled** (section 8)

## 5. Devtools and hardening (release build)
- [ ] Right-click -> "Inspect" is absent/disabled; F12, Cmd+Opt+I, Ctrl+Shift+I do nothing
- [ ] No context menu items that expose reload/view-source
- [ ] Dragging an external file or URL onto the window does not navigate away
- [ ] Clicking an external `http(s)` link does nothing (or is blocked) - the app never opens a browser

## 6. File picker / filesystem
- [ ] ZIP upload uses the native file picker; only the file the user selects is read
- [ ] Cancelling the picker leaves state unchanged and shows no error
- [ ] The app cannot read files the user did not select (try a path outside the selection through any path input)
- [ ] Non-ZIP and oversized files are rejected with a clear message; nothing is written outside the app data dir

## 7. Data at rest
- [ ] No credentials, tokens or customer paths stored in plain-text config/log files under the app data dir
- [ ] Uninstall/removal leaves no background process or auto-start entry

## 8. Fully offline
- [ ] Turn Wi-Fi off / unplug Ethernet / enable Airplane mode; reboot the app: it launches and every feature above works
- [ ] Backend health, create project, upload ZIP, start scan (status QUEUED) all succeed offline

Result summary: PASS / FAIL / BLOCKED per section, with evidence (screenshots, command output) attached to the QA report.
