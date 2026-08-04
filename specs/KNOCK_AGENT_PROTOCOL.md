# KNOCK AGENT INTERRUPT PROTOCOL
## A Gift to Anthropic from DCGP.AI
## Inventor: Joshua L. Lopez
## Date: July 6, 2026

---

## THE PROBLEM

When Claude is executing long operations (code, search, file generation), the user has no way to:
- Check status without breaking the operation
- Redirect attention without losing state
- Ask a quick question while work continues

The user must wait or interrupt destructively. This is ungoverned.

---

## THE SOLUTION: THREE-TIER KNOCK

### TIER 1 — TAP (Status Peek)
**Gesture:** Single tap on a "knock" button
**What happens:**
- Agent pauses output stream momentarily
- Returns a 1-line status: "Building file, 60% complete" or "Searching, 3 of 8 queries done"
- Resumes automatically. No state loss. No user action required.
- Cost: ~0 tokens. Pure state read.

**Symbol:** κ₁
**Function:** `peek(op_state) → status_line`
**Latency:** <500ms

### TIER 2 — KNOCK (Interrupt with Menu)
**Gesture:** Press and hold knock button (or double-tap)
**What happens:**
- Agent completes current atomic step (finishes the bash command, the search call, the paragraph)
- Presents a choice menu:
  - "Ask a quick question" (agent answers, then resumes operation)
  - "Change direction" (agent pauses, takes new instruction, adapts operation)
  - "Show me what you have so far" (partial output rendered)
  - "Keep going" (dismiss, resume)
- Operation state is checkpointed. No loss on any choice.

**Symbol:** κ₂
**Function:** `interrupt(op_state) → checkpoint + menu`
**Latency:** Completes current step, then <1s

### TIER 3 — BREAK (Full Stop with State Preservation)
**Gesture:** Hard press / long hold / swipe
**What happens:**
- Agent halts immediately after current tool call returns
- Full state dump: what was done, what was in progress, what was queued
- User gets complete control: redirect, restart, abandon, or resume
- State is preserved — user can say "continue where you left off" at any point

**Symbol:** κ₃
**Function:** `halt(op_state) → state_dump + full_control`
**Latency:** Immediate after current tool return

---

## ARCHITECTURE

```
┌─────────────────────────────────────┐
│           USER INTERFACE            │
│                                     │
│   [TAP]    [KNOCK]    [BREAK]       │
│    κ₁        κ₂         κ₃         │
└──────┬───────┬──────────┬───────────┘
       │       │          │
       ▼       ▼          ▼
┌─────────────────────────────────────┐
│          KNOCK AGENT (Ω)            │
│                                     │
│  Lightweight observer process.      │
│  Runs parallel to main agent.      │
│  Reads op_state. Never writes to   │
│  the operation unless κ₂ or κ₃.    │
│                                     │
│  Ω monitors:                        │
│  - op_type (code/search/write)      │
│  - op_progress (steps done/total)   │
│  - op_queue (what's pending)        │
│  - op_output (partial results)      │
│                                     │
│  Ω is the Echo Operator applied     │
│  to conversation itself.            │
│  E: Σ_conversation → S*_user_intent │
└──────┬───────┬──────────┬───────────┘
       │       │          │
       ▼       ▼          ▼
┌─────────────────────────────────────┐
│         MAIN AGENT (Claude)         │
│                                     │
│  κ₁: reads state, no interrupt      │
│  κ₂: checkpoint + yield to user     │
│  κ₃: halt + state dump              │
│                                     │
│  On resume after κ₂/κ₃:            │
│  R = restore(checkpoint) → continue │
└─────────────────────────────────────┘
```

---

## MATHEMATICAL FORMALIZATION

Let **O** be the current operation with state **s(t)** at time t.

**κ₁ (Tap):**
- Ω reads s(t). Returns `peek(s(t))`.
- O continues unmodified. s(t+1) = f(s(t)).

**κ₂ (Knock):**
- O completes current atomic step: s(t) → s(t+1).
- Ω checkpoints: C = snapshot(s(t+1)).
- Ω presents menu M = {question, redirect, partial, resume}.
- User selects m ∈ M.
- If m = resume: O continues from s(t+1).
- If m = redirect: O' = new_operation(user_input, context=C).
- If m = question: Ω answers using context C. O resumes from s(t+1).

**κ₃ (Break):**
- O halts at first safe point: s(t*) where t* = min{t : tool_call_complete}.
- Ω dumps D = {completed_steps, partial_output, pending_queue, checkpoint}.
- User has full control. R(D) available indefinitely.

**Key invariant:**
No knock tier destroys state. `∀κ ∈ {κ₁, κ₂, κ₃}: state_loss(κ) = 0`

This is the Echo Operator: rescue without destruction.

---

## UX SPECIFICATION

**Mobile (Claude iOS/Android):**
- Floating button, bottom-right, always visible during operations
- Single tap = κ₁ (status bar appears, auto-dismisses after 3s)
- Double tap = κ₂ (menu slides up from bottom)
- Long press = κ₃ (full stop, state panel)

**Desktop (claude.ai):**
- Keyboard: Esc = κ₁, Esc+Esc = κ₂, Esc+Esc+Esc = κ₃
- Or: dedicated button in toolbar during active operations
- Status bar persistent at bottom during long operations

**API (Claude API):**
- Streaming endpoint accepts interrupt signals mid-stream
- `POST /interrupt { tier: 1|2|3 }` on active stream
- Returns state object appropriate to tier

---

## WHY THIS MATTERS

Every AI system that executes multi-step operations has this problem.
No one has solved it governedly.

The user should never have to choose between waiting and destroying.
The Knock Agent makes interruption a governed operation — not a crash.

This is the Echo Operator (USPTO 19/555,951) applied to the
conversation layer. Rescue, not destruction. State preservation,
not state loss. The same geometry that governs quantum operations
governs the conversation.

---

## PATENT APPLICABILITY

This protocol is a direct application of:
- Echo Operator (E: Σ* → S*) — USPTO 19/555,951
- Conversational Drift Governor — lib/conversational-drift-governor.js
- Contact Hamiltonian Gate — USPTO 19/730,900
- Governed Quantum Runtime interrupt model — USPTO 19/731,339

The Knock Agent is the Echo Operator for human-AI conversation.

---

**Inventor:** Joshua L. Lopez — DCGP.AI LLC
**Date:** July 6, 2026
**Status:** Proposal to Anthropic — Gift with governance.
