# The lab standard (v1): what "livré" means

**Why it exists.** Mill Lab was called finished with 2 3D worlds, 3 drawings and no spoken guide, while the three labs delivered before it
(Pelton, the ram pump, Piggott) have 4 to 5 worlds, 8 to 13 drawings and a spoken guide in French and English. The cause was in the
template: it defined a **"Lite" level as the default** ("1 device + 1 setting, 3 drawings, 5 lessons"), so a thin lab looked finished by
the book. **"Lite" is retired.** There is one bar, and it is the least of the three labs that set it. A new lab may not be thinner.

## The bar (automated)

`src/standard.ts` holds the numbers and `src/standard.test.ts` gathers the facts from the lab and its files (every lab built from
`lab-template` has both). `npm test` reports every shortfall.

| What                      | At least                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| 3D worlds                 | **4**: the setting, the machine, and at least two detailed sub-assemblies or rooms         |
| Parts with a sheet        | **36**                                                                                     |
| Assembly guide            | **20** steps; installation guide **10** steps                                              |
| Lessons                   | **6**, with **12** quiz questions in all                                                   |
| A3 design drawings        | **8**                                                                                      |
| Spoken guide              | **French and English**, complete: one segment for the introduction, one per world, one per part |
| README                    | English first, a French part (`## Français`)                                               |
| `public/lab.json`         | tagline and tags filled (not the template's text)                                          |

## Not automated (the lead checks, the owner decides)

- **The quality and detail rules of [`lab-quality.md`](lab-quality.md)**, checked by a reviewer who did not build the lab, before the
  owner sees it; the report is the lab's `docs/qa.md`. The points below are the short version.
- The spoken guide follows `narration-style.md` (Pelton's tone, anonymous, honest, at most 30,000 characters a language); **no credit is
  spent without the owner's yes** and the owner listens before it goes live.
- Each world looks finished: the scenery and the water have had their polish pass, nothing floats, every moving part is attached to what
  drives it, the same machine looks the same in every world (the site's drive train is the screw world's).
- Honesty: numbers tagged reported / derived / model result / assumption / estimate; nothing tuned to a target; credits, safety and law;
  "independent educational reconstruction".
- Every mode swept at 1280, 768 and 390 px in both languages (no clipped text, no console error), every text linted, CI green, live site
  walked in a browser.
- The owner's checkpoint, signed off in the roadmap.

## States, and the only way to "livré"

`public/lab.json` carries `"status"`:

- `"building"` (the default, written by `new-lab`): the lab is in progress. The test passes but prints each shortfall as a **todo**; the
  showcase lists the lab as "en construction"; nobody says "finished".
- `"released"`: every shortfall **fails** the test and the CI. A lab may switch to `released` only when the automated bar is met, the
  manual list above is ticked and the owner has said yes. The showcase lists it as live.

An exception (for example a lab whose device genuinely has two worlds) needs the owner's written approval, recorded in `lab.json` under
`"exceptions": [{ "line": "3D worlds", "date": "…", "reason": "…" }]`: the line then passes, and the exception stays visible.

## For whoever leads a lab

1. At the start, write the plan **against the bar** (worlds, parts, sheets, spoken guide) with its cost in tokens and credits, and get the
   owner's yes on that scope, not on a smaller one.
2. Never write "terminé" or "livré" before `status: released`. At each checkpoint show the owner the standard's report.
3. Budget for the bar: about 4 to 5 million tokens and 35,000 to 45,000 ElevenLabs credits (both languages) per lab.
4. Before each checkpoint, have the lab reviewed against [`lab-quality.md`](lab-quality.md) by someone who did not build it, and show
   the owner that report with the standard's.
