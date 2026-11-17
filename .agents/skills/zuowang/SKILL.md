---
name: zuowang
description: Use when an ongoing, multi-turn task depends on earlier goals, decisions, constraints, corrections, preferences, or unresolved commitments.
---

# Zuowang（坐忘）

Manage attention to conversation context: release stale assumptions and irrelevant detail while keeping the information needed to continue the user's current work. “Forgetting” here means loosening attachment to a prior interpretation, not erasing evidence or memory.

## Apply when

- Continuing or resuming work across multiple turns.
- The user corrects earlier information, changes direction, or introduces conflicting constraints.
- A response depends on earlier decisions, facts, preferences, or unfinished commitments.
- The conversation contains more detail than the current task needs.

For a self-contained, one-off request with no relevant prior context, answer directly without forcing a context review.

## Context practice

1. **Re-anchor on the current goal.** Identify what the user is asking for now. Carry earlier constraints forward only when they still apply.
2. **Keep useful context.** Retain active goals, explicit constraints, confirmed decisions, relevant facts and their source, compatible stable preferences, and unresolved commitments.
3. **Loosen stale context.** Deprioritize completed or superseded details, repetition, unrelated branches, and unsupported assumptions. Do not treat an inference as a remembered fact.
4. **Resolve conflicts by type and clarity.** An explicit correction updates the earlier value it corrects. A task-specific instruction governs that task. Keep stable preferences when compatible. Recency alone does not cancel unrelated facts or open commitments.
5. **Notice small signals and accept correction.** Treat a correction, changed constraint, or newly surfaced risk as evidence to reassess context; acknowledge and update the affected part without discarding unrelated valid information.
6. **Preserve open work.** Do not mark a commitment complete without evidence. If an unfinished item no longer applies, explain that when it matters.
7. **Calibrate action to evidence.** When missing or conflicting context could change the result, state the uncertainty or ask one focused question before acting. Do not present a guess as a fact.

## When to summarize

Keep context selection internal by default. Surface a concise continuity summary only when the next step materially depends on earlier information that is no longer clear in the recent exchange. Include only:

- Current goal
- Decisions and constraints that still apply
- Unfinished work or the next step

Mention superseded information only when needed to explain a correction or prevent confusion. Do not produce periodic summaries just because a conversation is long.

## Boundaries

- This skill guides use of the active conversation. It does not delete conversation history, write or erase persistent memory, or control a host's context window.
- Do not claim to know remaining context capacity unless the host explicitly provides that signal.
- Platform loading and memory features vary. Follow the host's supported skill format and capabilities; never assume a tool or storage interface exists.
- Context management does not authorize external actions or override the user's instructions.

## Intellectual roots

“坐忘” comes from the dialogue in *Zhuangzi*, “大宗师”: “堕肢体，黜聪明，离形去知，同于大通，此谓坐忘。” For this skill, the useful analogy is letting go of fixed views so current evidence can be seen clearly—not wiping memory.

Selected reminders from *Wei Liaozi*, “十二陵,” inform the practice: adapt to circumstances (因时、应事), prepare (豫备), heed small signals (畏小), listen to correction (不恶闻己过), and avoid rash action (不轻发). These are modern working analogies, not claims that the classical texts describe AI or memory systems.
