import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { runStart, stopRunning } from "../src/server";

test("no combination of submissions ever writes private contents to events.jsonl", async () => {
  const dir = mkdtempSync(join(tmpdir(), "comp-"));
  const ctl = await runStart({ command:"start", sessionDir:dir, docRoots:[], host:"127.0.0.1", port:0, urlHost:undefined, foreground:true, emitNavigate:false });
  try {
    const envPath = join(dir, ".env");
    writeFileSync(join(dir, "screens", "s1.md"),
      `---\nkind: question\nid: s1\ntitle: T\ninputs:\n  - {type: text, name: notes}\n  - {type: text, name: hidden, private: true}\n  - {type: file-edit, path: ${envPath}, private: true}\n---\n`);
    await new Promise(r => setTimeout(r, 400));

    const secrets = [
      "TOTALLY_FAKE_SECRET_FOR_TESTING_1",
      "TOTALLY_FAKE_SECRET_FOR_TESTING_2",
      "TOTALLY_FAKE_SECRET_FOR_TESTING_3",
    ];

    // Submit an answer that includes a private text input
    await fetch(`${ctl.url}/api/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        screen_id: "s1",
        client_submission_id: "a1",
        inputs: { notes: "visible", hidden: secrets[0] },
      }),
    });

    // Save a private file with a different secret
    await fetch(`${ctl.url}/api/private-save`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: "s1", name: "env", path: envPath, contents: secrets[1] }),
    });

    // Try the naive mistake: put the secret in a public input field
    await fetch(`${ctl.url}/api/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        screen_id: "s1",
        client_submission_id: "a2",
        inputs: { notes: "safe", hidden: secrets[2] },
      }),
    });

    const jsonl = readFileSync(join(dir, "events.jsonl"), "utf8");
    for (const secret of secrets) {
      expect(jsonl).not.toContain(secret);
    }
  } finally {
    await stopRunning(ctl);
    rmSync(dir, { recursive: true, force: true });
  }
});
