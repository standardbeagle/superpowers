#!/usr/bin/env node
// Start the brainstorm server and output connection info as JSON.
// Usage: node start-server.js [--project-dir <path>] [--host <bind-host>]
//                             [--url-host <display-host>] [--foreground]
//
// Starts server on a random high port, outputs JSON with URL.
// Each session gets its own directory to avoid conflicts.
//
// Options:
//   --project-dir <path>  Store session files under <path>/.superpowers/brainstorm/
//                         instead of the system temp dir. Files persist after stop.
//   --host <bind-host>    Host/interface to bind (default: 127.0.0.1).
//                         Use 0.0.0.0 in remote/containerized environments.
//   --url-host <host>     Hostname shown in returned URL JSON.
//   --foreground          Run server in the current process (no backgrounding).

'use strict';

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ─── Argument parsing ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
let projectDir = '';
let bindHost = '127.0.0.1';
let urlHost = '';
let foreground = false;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--project-dir':  projectDir = args[++i]; break;
    case '--host':         bindHost   = args[++i]; break;
    case '--url-host':     urlHost    = args[++i]; break;
    case '--foreground':   foreground = true;       break;
    default:
      out({ error: `Unknown argument: ${args[i]}` });
      process.exit(1);
  }
}

if (!urlHost) {
  urlHost = (bindHost === '127.0.0.1' || bindHost === 'localhost')
    ? 'localhost'
    : bindHost;
}

// ─── Platform / environment detection ─────────────────────────────────────
//
// Background processes are unreliable in several environments:
//   - Windows: Node detached processes require special stdio handling
//   - Codex CI: environment reaps detached processes
//
// In these cases we run in foreground and let the tool harness manage
// the process lifetime (e.g. Bash tool run_in_background: true).

if (!foreground && (process.platform === 'win32' || process.env.CODEX_CI)) {
  foreground = true;
}

// ─── Session directory ─────────────────────────────────────────────────────

const sessionId  = `${process.pid}-${Date.now()}`;
const sessionDir = projectDir
  ? path.join(projectDir, '.superpowers', 'brainstorm', sessionId)
  : path.join(os.tmpdir(), `brainstorm-${sessionId}`);

const contentDir = path.join(sessionDir, 'content');
const stateDir   = path.join(sessionDir, 'state');
const pidFile    = path.join(stateDir, 'server.pid');
const logFile    = path.join(stateDir, 'server.log');

fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(stateDir,   { recursive: true });

// ─── Owner PID resolution ──────────────────────────────────────────────────
//
// The server monitors the owner PID and exits when it dies.
// We want the harness PID, not the ephemeral shell that spawned this script.
// On Unix: process.ppid is the shell; its parent is the harness.
// On Windows: skip PID monitoring — rely on idle timeout instead.

function resolveOwnerPid() {
  if (process.platform === 'win32') return null;
  try {
    const grandparent = execSync(`ps -o ppid= -p ${process.ppid}`, { encoding: 'utf8' });
    const pid = parseInt(grandparent.trim(), 10);
    return (pid && pid !== 1) ? pid : process.ppid;
  } catch {
    return process.ppid;
  }
}

const ownerPid = resolveOwnerPid();

// ─── Server environment ────────────────────────────────────────────────────

const serverEnv = {
  ...process.env,
  BRAINSTORM_DIR:       sessionDir,
  BRAINSTORM_HOST:      bindHost,
  BRAINSTORM_URL_HOST:  urlHost,
  ...(ownerPid ? { BRAINSTORM_OWNER_PID: String(ownerPid) } : {}),
};

const serverScript = path.join(__dirname, 'server.cjs');

// ─── Helpers ───────────────────────────────────────────────────────────────

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

// ─── Foreground mode ───────────────────────────────────────────────────────
//
// Run the server in this process — blocks until the server exits.
// Used on Windows and Codex CI. Callers should set run_in_background: true
// on their Bash tool invocation so the process survives across turns.

if (foreground) {
  const child = spawn(process.execPath, [serverScript], {
    env:   serverEnv,
    stdio: 'inherit',
  });
  child.on('exit', code => process.exit(code ?? 0));
  return; // nothing after this runs in foreground mode
}

// ─── Background mode ───────────────────────────────────────────────────────
//
// Detach the server process so it survives after this script exits.

const logFd = fs.openSync(logFile, 'a');
const child = spawn(process.execPath, [serverScript], {
  env:      serverEnv,
  stdio:    ['ignore', logFd, logFd],
  detached: true,
});
child.unref();
fs.closeSync(logFd);
fs.writeFileSync(pidFile, String(child.pid));

// Poll the log file until the server emits its startup JSON line.
const POLL_INTERVAL_MS = 100;
const TIMEOUT_MS       = 5000;
let waited = 0;

const poll = setInterval(() => {
  waited += POLL_INTERVAL_MS;

  if (fs.existsSync(logFile)) {
    const log  = fs.readFileSync(logFile, 'utf8');
    const line = log.split('\n').find(l => l.includes('server-started'));
    if (line) {
      clearInterval(poll);

      // Brief liveness window: catch environments that reap background procs.
      let alive = true;
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        if (!isAlive(child.pid)) { alive = false; break; }
      }

      if (!alive) {
        out({
          error: `Server started but was killed. Retry with: node ${path.relative(process.cwd(), __filename)} --foreground${projectDir ? ' --project-dir ' + projectDir : ''}`,
        });
        process.exit(1);
      }

      out(JSON.parse(line));
      process.exit(0);
    }
  }

  if (waited >= TIMEOUT_MS) {
    clearInterval(poll);
    out({ error: 'Server failed to start within 5 seconds' });
    process.exit(1);
  }
}, POLL_INTERVAL_MS);
