{
  "AURA115_WRITE_CONFIRMED": true,
  "http_status": 200,
  "data": {
    "ok": true,
    "mode": "committed",
    "owner": "DocGrok1",
    "repo": "Aura115",
    "branch": "main",
    "path": "Aura115_CURRENT/JUPITER_9_INBOX/JOSHUA_MESSAGES",
    "commitSha": "30ebe22869409eba203b62e0ab3600f6895ba2f0",
    "contentSha": "fd34e3fd4a8848f673093f721221885819717a1e",
    "htmlUrl": "https://github.com/DocGrok1/Aura115/blob/main/Aura115_CURRENT/JUPITER_9_INBOX/JOSHUA_MESSAGES",
    "diff": {
      "oldLineCount": 0,
      "newLineCount": 173,
      "firstChangedLine": 1,
      "oldChangedLines": 0,
      "newChangedLines": 173,
      "previewNew": "import React from \"react\";\n\nexport const dynamic = \"force-dynamic\";\n\nasync function sendToAura115(formData: FormData) {\n  \"use server\";\n\n  const message = String(formData.get(\"message\") || \"\").trim();\n\n  if (!message) {\n    return;\n  }\n\n  const owner = process.env.GITHUB_OWNER || \"DocGrok1\";\n  const repo = process.env.GITHUB_REPO || \"Aura115\";\n  const branch = process.env.GITHUB_BRANCH || \"main\";\n  const token = process.env.GITHUB_TOKEN;\n  const rootPrefix =\n    process.env.GITHUB_ROOT_PREFIX || \"Aura115_FULL_STANDUP_TPM_JUPYTER_GITHUB\";\n"
    }
  }
}