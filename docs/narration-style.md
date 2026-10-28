# Narration style: the Pelton Lab voice is the standard

Every spoken guide of the series sounds like the one of [Pelton Lab](https://github.com/Onigam/pelton-lab)
(`narration/fr.json`, `narration/en.json`). The owner judged that tone perfect (2026-10-28): **keep all of it, do not
"improve" it**. A new script is written to match it. The technical format (segments, cues, manifest) is in
[`narration.md`](narration.md); this page is about what to say and how.

## The voice

A warm, slightly mischievous storyteller who takes the listener by the hand, in the spirit of the Maestro of the classic
French educational animation series (the owner's own picture of it). He follows one small character (a drop of water),
asks questions, marvels without gushing, and never lectures. The text never quotes, copies or names any existing series.

Voice: ElevenLabs, voice `dG4EtDDFH6iucyb67oJV`, model `eleven_v4`, settings `stability 0.5 · similarity_boost 0.8 ·
style 0.35 · speed 0.95` (they are in the script's `settings`). A synthetic voice inspired by the genre, never presented
as a real actor's; non-commercial use; the "Voix de synthèse" mention stays visible while it plays. The API key lives in
`~/.config/lab-narration/elevenlabs.env`, never in a repository.

## What Pelton does (copy the moves, not the sentences)

| Move                                                | Pelton Lab says                                                                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opens on an image or a question, never a definition | « Imaginez un ruisseau de montagne, si mince qu'on l'enjamberait. Il murmure, il ne fait pas de vagues… et pourtant, il cache un trésor. »         |
| Follows one character                               | « Suivons une petite goutte d'eau. »                                                                                                               |
| Calls back at the end                               | « Voilà toute l'histoire : une goutte, une pente, une roue… et une ampoule qui sourit. »                                                           |
| A part opens on its surprise                        | « Stopper net trois cent cinquante mètres de colonne d'eau ? » · « Un manteau d'aluminium marin, épais de deux millimètres seulement : le capot. » |
| A small exclamation when something clever happens   | « Feuilles et graviers […] s'en vont jusqu'au bout : la grille se nettoie toute seule ! »                                                          |
| A golden rule, said plainly                         | « Une seule règle d'or : toujours un petit débordement. » · « Ne la retournez jamais. »                                                            |
| Ends on one concrete detail                         | « Quatre grenouillères l'ôtent sans outil. »                                                                                                       |

## Rules of the register

- Address the listener with « vous », « on », « nous »; never « tu ». English: « you », « we ».
- Short sentences (aim below 120 characters: subtitles are cut at sentence ends), one image or one wonder per part,
  questions to the listener, exclamations rare but present (about 0.5 to 1 per 1 000 characters; Pelton: 0.8), no joke repeated.
- A part says what it DOES for the water, in the order the water meets it, then closes on one concrete detail from the
  lab's own fields (`design`, `tip`, `maintenance`, specs). Do not re-teach what another part says.
- Spoken text only (it is also the subtitle text): numbers and units in words, estimates marked « environ » or
  « dans le modèle », no symbol, no abbreviation, acronyms and codes replaced by words, « … » for a pause, no markdown.
- **Anonymous**: no person, channel, company, brand or institution in the text or the titles (credits live in the Sources
  panel). Say « la vidéo », « les manuels ». No name at all, not even a historical inventor (the owner had Montgolfier removed from the ram script): say "le principe date de la fin du dix-huitième siècle", with no year.
- **Honest, and said once.** What the sheets flag as estimate, assumption or model result is never stated as a reported fact, and a
  video claim is attributed to « la vidéo » only where the sheet says so. The disclaimers are **said once**: the introduction says the
  lab is an educational reconstruction (no official plan, no maker's product), that the device is generic if it is, and that the
  figures come from the simulation except when « la vidéo » is quoted; the drinkability warning comes once, where the water is drunk.
  Never repeat them in the worlds or the parts, and do not hang « dans le modèle » on every figure: the owner found it tiresome
  (« y'en a trop », 2026-10-28). Keep the hedge only where a figure contrasts with the video's. Safety and law: one short sentence
  where the action is risky, once per hazard.
- **English is an adaptation, not a translation**: same segment ids, same cues at the matching point of the sentence,
  British spelling and units, France-only formulas made general.

## Cues, in short

One camera move (`scene`, `home`, `frame`, `select`) per 35 spoken characters at most; only parts of the current world;
everything a cue switches on (`flows`, `xray`, `cutaway`, `explode`, `isolate`) is switched off before the end; a part starts
already framed and selected, so a part segment usually needs none; no `xray` or `cutaway` where the world does not allow it.

## Budget

At most **30 000 spoken characters per language per lab** (1 character ≈ 1 credit); aim for 17 000 to 24 000. An ordinary
part is about 270 characters, a hero part 350 to 440, a world 500 to 700, the introduction about 2 000.

## Process (never skip a step)

1. A writer agent drafts `narration/fr.json` from the lab's sheets, with Pelton's script as the model.
2. The lead compares the tone with Pelton, with numbers and by reading: `node tools/narration/tone-stats.mjs
narration/fr.json` prints sentence length, long sentences, exclamations and questions per 1 000 characters, « tu » and
   symbols for the script and for Pelton's. Then the lab's own test (ids, cues, spacing, budget) and
   `generate.mjs --dry-run` (0 credit).
3. **The owner says yes before any credit is spent.** A new language starts with a sample (introduction and one world).
4. Generate (the hash cache never bills the same text twice), build (`check-narration.mjs` refuses a partial manifest),
   preview, the owner listens, merge.
