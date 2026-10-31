# The lab team: dedicated agents

Six Claude Code agents, one per role of a lab's team (`lab-template/BRIEF.md` §4). Each carries the rules of its domain from
[`docs/lab-standard.md`](../docs/lab-standard.md) and [`docs/lab-quality.md`](../docs/lab-quality.md), so a lab's quality no longer
depends on how well the lead briefs a general-purpose agent.

| Agent            | Wave | Owns                                                                            |
| ---------------- | ---- | ------------------------------------------------------------------------------- |
| `lab-researcher` | 1    | `docs/research.md`: sources, key figures, official dimensions, plan, questions  |
| `lab-physicist`  | 1    | `src/sim/**`, `docs/physics.md`: pure tested physics, never tuned to the source |
| `lab-modeler`    | 2    | `src/three/**`: worlds, mechanics, scenery, water, their tests                  |
| `lab-author`     | 2–3  | `src/data/**`, `src/drawings/**`, `src/i18n/ui.ts`: sheets, guides, lessons     |
| `lab-narrator`   | 5    | `narration/**`: the spoken guide, its checks; never spends credits              |
| `lab-reviewer`   | 4, 6 | `docs/qa.md` only: the independent walk against `lab-quality.md`                |

The lead (the main session) integrates `src/lab.ts`, commits, deploys, runs the paid audio generation after the owner's yes and
talks to the owner. No agent commits or pushes.

**The reviewer never reviews its own work**: give `lab-reviewer` a lab it did not build, before every owner checkpoint and before
`public/lab.json` switches to `released`. Its walk uses [`tools/review/walk.mjs`](../tools/review/walk.mjs).

## Install

Claude Code reads personal agents from `~/.claude/agents/`. These files are the source; copy them after each change:

```bash
cp ~/Dev/lab-kit/agents/lab-*.md ~/.claude/agents/
```

A session started after the copy offers them as agent types (`lab-reviewer`, …).
