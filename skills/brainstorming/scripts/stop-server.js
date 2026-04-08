#!/usr/bin/env node
// Stop the brainstorm server and clean up.
// Usage: node stop-server.js <session_dir>
//
// Sends SIGTERM, waits up to 2s, escalates to SIGKILL if needed.
// Only deletes session directory if it lives under the system temp dir.
// Persistent directories (.superpowers/) are kept so mockups survive.

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// ─── Helpers ───────────────────────────────────────────────────────────────

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

// Synchronous sleep — acceptable here since stop-server is a short-lived CLI.
function sleep(ms) {
  const end = Date.now() + ms;
  // Use Atomics.wait when available (Node 9+), fall back to busy-wait.
  if (typeof SharedArrayBuffer !== 'undefined') {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } else {
    while (Date.now() < end) {} // eslint-disable-line no-empty
  }
}

function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

// Cross-platform process termination.
// On Windows, SIGTERM and SIGKILL both call TerminateProcess — there is no
// graceful shutdown signal, so we treat them identically.
function terminate(pid, force) {
  if (process.platform === 'win32') {
    try { process.kill(pid); } catch {} // unconditional termination on Windows
  } else {
    try { process.kill(pid, force ? 'SIGKILL' : 'SIGTERM'); } catch {}
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

const sessionDir = process.argv[2];

if (!sessionDir) {
  out({ error: 'Usage: node stop-server.js <session_dir>' });
  process.exit(1);
}

const stateDir = path.join(sessionDir, 'state');
const pidFile  = path.join(stateDir, 'server.pid');

if (!fs.existsSync(pidFile)) {
  out({ status: 'not_running' });
  process.exit(0);
}

const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);

// Graceful shutdown
terminate(pid, false);

// Wait up to 2s for graceful exit
const deadline = Date.now() + 2000;
while (Date.now() < deadline && isAlive(pid)) {
  sleep(100);
}

// Escalate if still alive
if (isAlive(pid)) {
  terminate(pid, true);
  sleep(200);
}

if (isAlive(pid)) {
  out({ status: 'failed', error: 'process still running' });
  process.exit(1);
}

// Cleanup
fs.rmSync(pidFile, { force: true });
fs.rmSync(path.join(stateDir, 'server.log'), { force: true });

// Only delete ephemeral sessions (those under the system temp dir)
const tmpDir = os.tmpdir();
const inTmp  = sessionDir.startsWith(tmpDir + path.sep)
            || sessionDir.startsWith('/tmp/');   // common Linux alias

if (inTmp) {
  fs.rmSync(sessionDir, { recursive: true, force: true });
}

out({ status: 'stopped' });
