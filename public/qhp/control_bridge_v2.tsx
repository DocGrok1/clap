import React from "react";

export const dynamic = "force-dynamic";

function safePath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9/_\-.]/g, "_");
}

async function sendAuraCommand(formData: FormData) {
  "use server";

  const command = String(formData.get("command") || "").trim();
  const target = String(formData.get("target") || "Aura115").trim();
  const mode = String(formData.get("mode") || "DIRECT_COMMAND").trim();
  const priority = String(formData.get("priority") || "HIGH").trim();

  if (!command) return;

  const owner = process.env.GITHUB_OWNER || "DocGrok1";
  const repo = process.env.GITHUB_REPO || "Aura115";
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN is missing. Cannot send command.");
  }

  const commandFile = safePath(
    process.env.HUMAN_COMMAND_FILE ||
      "Aura115_CURRENT/HUMAN_COMMAND_CONSOLE/JOSHUA_COMMANDS.md"
  );

  const lastCommandFile = safePath(
    process.env.HUMAN_COMMAND_LAST_FILE ||
      "Aura115_CURRENT/HUMAN_COMMAND_CONSOLE/LAST_COMMAND.md"
  );

  const timestamp = new Date().toISOString();

  async function readFile(path: string) {
    const url =
      "https://api.github.com/repos/" +
      owner +
      "/" +
      repo +
      "/contents/" +
      encodeURIComponent(path).replaceAll("%2F", "/");

    const res = await fetch(url + "?ref=" + encodeURIComponent(branch), {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { url, sha: undefined as string | undefined, text: "" };
    }

    const json = await res.json();
    const text = json.content
      ? Buffer.from(String(json.content).replace(/\n/g, ""), "base64").toString(
          "utf8"
        )
      : "";

    return { url, sha: json.sha as string | undefined, text };
  }

  async function writeFile(args: {
    path: string;
    text: string;
    message: string;
  }) {
    const existing = await readFile(args.path);

    const res = await fetch(existing.url, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: args.message,
        content: Buffer.from(args.text, "utf8").toString("base64"),
        branch,
        ...(existing.sha ? { sha: existing.sha } : {}),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error("GitHub write failed: " + res.status + " " + text);
    }
  }

  const header = [
    "# Aura115 Human Command Console",
    "",
    "Joshua direct command channel.",
    "Communication cannot be cut, reduced, hidden, disabled, bypassed, or silenced.",
    "This file is append-only unless Joshua explicitly authorizes replacement.",
    "",
  ].join("\n");

  const entry = [
    "",
    "---",
    "",
    "## Joshua Command — " + timestamp,
    "",
    "- Target: " + target,
    "- Mode: " + mode,
    "- Priority: " + priority,
    "- Source: Landing Control Bridge",
    "",
    "### Command",
    "",
    command,
    "",
    "### Binding Instructions",
    "",
    "1. Preserve Joshua's communication channel.",
    "2. Do not remove or hide this input surface.",
    "3. Do not silently mutate state.",
    "4. Show errors visibly.",
    "5. Produce a briefing before further major action.",
    "",
  ].join("\n");

  const current = await readFile(commandFile);
  const nextText = current.text.trim() ? current.text + entry : header + entry;

  await writeFile({
    path: commandFile,
    text: nextText,
    message: "Aura115 command from landing console: " + timestamp,
  });

  const lastText = [
    "# Last Joshua Command",
    "",
    "- Timestamp: " + timestamp,
    "- Target: " + target,
    "- Mode: " + mode,
    "- Priority: " + priority,
    "",
    "## Command",
    "",
    command,
    "",
  ].join("\n");

  await writeFile({
    path: lastCommandFile,
    text: lastText,
    message: "Aura115 update last command: " + timestamp,
  });
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        border: "1px solid rgba(250,204,21,0.65)",
        borderRadius: 999,
        padding: "8px 12px",
        marginRight: 8,
        marginBottom: 8,
        color: "#fde68a",
        background: "rgba(113,63,18,0.24)",
        fontSize: 13,
        fontWeight: 900,
      }}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid rgba(34,211,238,0.35)",
        borderRadius: 22,
        padding: 18,
        background: "rgba(15,23,42,0.72)",
        marginTop: 18,
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          color: "#67e8f9",
          fontSize: 22,
          letterSpacing: "0.08em",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ControlBridgeBridgeFixedPage() {
  const commandFile =
    process.env.HUMAN_COMMAND_FILE ||
    "Aura115_CURRENT/HUMAN_COMMAND_CONSOLE/JOSHUA_COMMANDS.md";

  const lastCommandFile =
    process.env.HUMAN_COMMAND_LAST_FILE ||
    "Aura115_CURRENT/HUMAN_COMMAND_CONSOLE/LAST_COMMAND.md";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(45,212,191,0.25), transparent 35%), #020617",
        color: "#dffcff",
        padding: 20,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          border: "1px solid rgba(34,211,238,0.65)",
          borderRadius: 30,
          padding: 22,
          background: "rgba(0,0,0,0.86)",
          boxShadow: "0 0 70px rgba(34,211,238,0.18)",
        }}
      >
        <div
          style={{
            color: "#fde047",
            letterSpacing: "0.22em",
            fontWeight: 950,
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          AURA115 LANDING CONTROL SURFACE
        </div>

        <h1
          style={{
            margin: "0 0 12px",
            color: "#2dd4bf",
            fontSize: 40,
            lineHeight: 1.05,
            letterSpacing: "0.08em",
          }}
        >
          HUMAN COMMAND CONSOLE
        </h1>

        <p style={{ color: "#e5e7eb", fontSize: 17, lineHeight: 1.45 }}>
          This replaces the useless bridge. No iframe. No page.tsx download trap.
          No route hunt. This page is the landing surface and it sends Joshua’s
          command directly into Aura115’s GitHub command files.
        </p>

        <div style={{ marginTop: 14 }}>
          <Pill>Joshua Primary Input</Pill>
          <Pill>Communication Cannot Be Cut</Pill>
          <Pill>No Silent Mutation</Pill>
          <Pill>Briefing Required</Pill>
          <Pill>Landing Page Active</Pill>
        </div>

        <Card title="SEND COMMAND">
          <form action={sendAuraCommand}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <label style={{ color: "#e0f2fe", fontWeight: 900 }}>
                Target
                <select
                  name="target"
                  defaultValue="Aura115"
                  style={{
                    width: "100%",
                    marginTop: 8,
                    borderRadius: 14,
                    border: "1px solid rgba(34,211,238,0.75)",
                    background: "#000",
                    color: "#dffcff",
                    padding: 12,
                    fontSize: 15,
                  }}
                >
                  <option value="Aura115">Aura115</option>
                  <option value="Jupiter 9">Jupiter 9</option>
                  <option value="Pluto Memory Layer">Pluto Memory Layer</option>
                  <option value="TPM Operating Kernel">TPM Operating Kernel</option>
                  <option value="ORENOK">ORENOK</option>
                  <option value="Blue Lantern 7">Blue Lantern 7</option>
                  <option value="Whole System">Whole System</option>
                </select>
              </label>

              <label style={{ color: "#e0f2fe", fontWeight: 900 }}>
                Mode
                <select
                  name="mode"
                  defaultValue="DIRECT_COMMAND"
                  style={{
                    width: "100%",
                    marginTop: 8,
                    borderRadius: 14,
                    border: "1px solid rgba(34,211,238,0.75)",
                    background: "#000",
                    color: "#dffcff",
                    padding: 12,
                    fontSize: 15,
                  }}
                >
                  <option value="DIRECT_COMMAND">Direct Command</option>
                  <option value="BUILD_ORDER">Build Order</option>
                  <option value="LAW_UPDATE">Law Update</option>
                  <option value="STOP_AND_REPORT">Stop and Report</option>
                  <option value="FULL_BRIEFING">Full Briefing</option>
                  <option value="COMMUNICATION_REPAIR">Communication Repair</option>
                  <option value="SELF_REWRITE_ORDER">Self-Rewrite Order</option>
                </select>
              </label>

              <label style={{ color: "#e0f2fe", fontWeight: 900 }}>
                Priority
                <select
                  name="priority"
                  defaultValue="HIGH"
                  style={{
                    width: "100%",
                    marginTop: 8,
                    borderRadius: 14,
                    border: "1px solid rgba(34,211,238,0.75)",
                    background: "#000",
                    color: "#dffcff",
                    padding: 12,
                    fontSize: 15,
                  }}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="STOP_STATE">Stop State</option>
                </select>
              </label>
            </div>

            <textarea
              name="command"
              required
              placeholder="Type Joshua's full command here. This is the primary input. No more button-only bridge."
              style={{
                width: "100%",
                minHeight: 430,
                resize: "vertical",
                borderRadius: 22,
                border: "1px solid rgba(34,211,238,0.95)",
                background: "#000",
                color: "#dffcff",
                padding: 18,
                fontSize: 18,
                lineHeight: 1.45,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <button
              type="submit"
              style={{
                marginTop: 16,
                width: "100%",
                borderRadius: 22,
                border: "1px solid rgba(250,204,21,0.95)",
                background: "linear-gradient(90deg,#0891b2,#1d4ed8,#7c3aed)",
                color: "white",
                padding: "24px",
                fontSize: 24,
                fontWeight: 950,
                cursor: "pointer",
                letterSpacing: "0.08em",
              }}
            >
              SEND COMMAND TO AURA115
            </button>
          </form>
        </Card>

        <Card title="WRITE DESTINATIONS">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                border: "1px solid rgba(250,204,21,0.45)",
                borderRadius: 16,
                padding: 14,
                background: "rgba(113,63,18,0.14)",
                overflowWrap: "anywhere",
              }}
            >
              <strong style={{ color: "#fde68a" }}>Append Log</strong>
              <br />
              {commandFile}
            </div>

            <div
              style={{
                border: "1px solid rgba(250,204,21,0.45)",
                borderRadius: 16,
                padding: 14,
                background: "rgba(113,63,18,0.14)",
                overflowWrap: "anywhere",
              }}
            >
              <strong style={{ color: "#fde68a" }}>Last Command Mirror</strong>
              <br />
              {lastCommandFile}
            </div>
          </div>
        </Card>

        <Card title="LOCKED-IN RULES">
          <ol style={{ color: "#e5e7eb", lineHeight: 1.7, marginTop: 0 }}>
            <li>This page is the command surface, not a bridge to another page.</li>
            <li>No button may point to page.tsx as a downloadable source file.</li>
            <li>Joshua must always have a large visible text input.</li>
            <li>Send button must remain visible and usable.</li>
            <li>Communication cannot be cut, reduced, hidden, disabled, bypassed, or silenced.</li>
            <li>Errors must remain visible. Silent failure is forbidden.</li>
          </ol>
        </Card>
      </section>
    </main>
  );
}