# Narration: a spoken guide for a lab

> What to say and how (tone, voice, budget, process): [`narration-style.md`](narration-style.md). The tone of Pelton Lab's script is the standard.

A lab can offer a spoken explanation of the whole site, of each world and of each part, with subtitles, and the 3D view follows
what the narrator says (camera, selection, explode, section, flows, simulation). The audio is **pre-rendered** by
`tools/narration/generate.mjs` from a script and shipped as static files: no API key and no cost at runtime.

## 1. The script (written by the lab, `narration/<lang>.json`)

```json
{
  "lang": "fr",
  "voiceLabel": { "fr": "Voix de synthèse", "en": "Synthetic voice" },
  "settings": { "stability": 0.5, "similarity_boost": 0.8, "style": 0.3, "speed": 0.95 },
  "segments": [
    {
      "id": "intro",
      "scope": "intro",
      "title": "Présentation du site",
      "scene": "site",
      "text": "Il était une fois… [[home]] une chute d’eau, [[frame:turbine]] et une petite roue qui tourne."
    }
  ]
}
```

- `scope`: `intro` (the whole lab, played from the header), `scene:<sceneId>` (one world), `part:<partId>` (one part sheet),
  `lesson:<lessonId>` (optional). One segment per scope value; `id` is its file name.
- `scene`: the world the narration starts in (the player switches to it first; defaults to the part's or scene's world).
- `text` is **what is spoken**: write numbers and units in words (« sept virgule cinq mètres », « mètres cubes par heure »),
  no symbols, no abbreviations, no markdown; punctuation drives the rhythm (« … » for a pause, commas, short sentences).
  It is also the subtitle text.
- **Cue markers** `[[action]]` or `[[action:argument]]` are removed from the spoken text; the action runs when the narrator reaches
  the next word. Actions:

| Marker                                | Effect                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `[[scene:<id>]]`                      | switch world                                                                                                   |
| `[[home]]`                            | overview of the world                                                                                          |
| `[[frame:<id>[,<id>…]]]`              | fly the camera to frame these parts (and highlight them)                                                       |
| `[[select:<id>]]` / `[[select:none]]` | select a part (its sheet opens) / clear                                                                        |
| `[[explode:<0..1>]]`                  | set the explode slider                                                                                         |
| `[[xray:on]]` / `[[xray:off]]`        | X-ray                                                                                                          |
| `[[cutaway:on]]` / `[[cutaway:off]]`  | section                                                                                                        |
| `[[flows:on]]` / `[[flows:off]]`      | animated flows                                                                                                 |
| `[[isolate:on]]` / `[[isolate:off]]`  | isolate the selected part                                                                                      |
| `[[mode:<mode>]]`                     | `explore`, `assembly`, `install`, `sim`, `plans`, `lessons`, `parts`, `about`                                  |
| `[[lab:<name>[:<arg>]]]`              | a hook of the lab (`LabDefinition.narration.onCue`), e.g. `preset:valve-1`, `scenario:source-drop`, `time:600` |

A **part** segment starts by framing and selecting its part automatically: add markers only for what happens _during_ the
narration. Every id must exist in the lab (a lab test checks the manifest against its parts and worlds, see §4).

How the app reads the markers (the same code paths as the buttons of the interface):

- `select:<id>` is a click on the part (its sheet opens, the camera frames it, a part of another world switches world);
  `frame:<ids>` flies to the parts and outlines them until the next `frame`, `home`, `select` or world change; `home` is the
  « Vue d'ensemble » button; `scene:<id>` frames the overview of the world. When several cues fall together, the last
  camera movement wins.
- `isolate:on` needs a selected part; `cutaway:on` is ignored in a world without a section; an unknown id, mode or world is
  ignored (one warning in the console), never an error.
- `lab:<name>[:<arg>]` calls `narration.onCue(ctx, name, arg)`. After a seek, the last cue **of each name** is replayed.
- The narration starts from a clean state for what its cues touch: an introduction, a world or a lesson starts with no
  selection, not isolated and on the overview of its world; a cue kind used by the segment (`explode`, `xray`, `cutaway`,
  `flows`, `isolate`, `mode`) starts at its default, so a seek backwards undoes what a later cue did.

## 2. Generation (`tools/narration/generate.mjs`)

```
node tools/narration/generate.mjs --src narration/fr.json --out public/audio/fr [--only intro,part:nozzle] [--dry-run] [--force]
```

Needs `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in the environment (or in `~/.config/lab-narration/elevenlabs.env`; never in
a repository). `ELEVENLABS_MODEL` defaults to `eleven_v4`. `--dry-run` prints the characters per segment and the total, and calls
nothing. A segment is generated again only when its spoken text, the voice, the model or the settings changed (the hash is in the
manifest) or with `--force`: credits are never spent twice on the same text. The tool uses the "with timestamps" endpoint to turn
each marker into a time and cuts the subtitles at sentence ends.

Output: `<out>/<id>.mp3` (mono, 64 kbit/s) and `<out>/manifest.json`:

```json
{
  "lang": "fr",
  "model": "eleven_v4",
  "generatedAt": "2026-10-28T…",
  "voiceLabel": { "fr": "…", "en": "…" },
  "segments": [
    {
      "id": "intro",
      "scope": "intro",
      "title": "…",
      "scene": "site",
      "file": "intro.mp3",
      "duration": 84.2,
      "chars": 1620,
      "hash": "…",
      "captions": [{ "t0": 0, "t1": 3.4, "text": "Il était une fois…" }],
      "cues": [{ "t": 3.4, "do": { "frame": ["turbine"] } }]
    }
  ]
}
```

`do` is one of `{ scene }`, `{ home: true }`, `{ frame: string[] }`, `{ select: string | null }`, `{ explode: number }`,
`{ xray: boolean }`, `{ cutaway: boolean }`, `{ flows: boolean }`, `{ isolate: boolean }`, `{ mode: string }`, `{ lab: string, arg?: string }`.

## 3. In the app (kit)

```ts
LabDefinition.narration?: {
  manifest: string | ((lang: 'fr' | 'en') => string | null);
  onCue?(ctx: AppContext, lab: string, arg?: string): void;
}
```

`manifest` is the URL of the `manifest.json` of the interface language, relative to the page: a string (`{lang}` stands for
`fr` or `en`: `'audio/{lang}/manifest.json'`) or a function of the language (`null`: no narration in that language). The audio
files are relative to the manifest. The manifest is asked for once the application is up (and again when the language changes,
once per language); a language without a manifest (404, not JSON, no usable segment, or a `lang` that is not the interface
language) shows nothing of the feature, silently. The audio files are fetched on demand, nothing plays by itself.

- a speaker button in the header, next to the language switch, plays the `intro` segment (a « ● » on it while the narrator
  speaks); each world overview has a « Écouter · 0:42 » button (its `scene:` segment) and each part sheet and lesson has one
  (`part:`, `lesson:`), only when the segment exists; the button becomes « Pause » while it speaks and « Réécouter » at the end;
- a **transport bar** over the 3D view (above the toolbar; on a phone above the toolbar that rides on the bottom sheet, the
  sheet folds when a narration starts): play/pause, a seekable position with elapsed and total time, speed 1× / 1.25× / 1.5×,
  subtitles on/off, « Guidage 3D » on/off, close, the title of the segment and the mention of the synthetic voice
  (`voiceLabel`), always. The 3D view is framed in what the bar leaves free. Space (focus in the bar) plays and pauses, Esc closes;
- **subtitles** centred at the bottom of the 3D view, two lines at most (a long caption is cut where the voice pauses and
  follows the voice), on by default, remembered in this browser with the speed and the guidance switch
  (`<lab id>:narration` in `localStorage`); `aria-live="polite"`;
- cues run on the audio clock; **seeking replays the state** (the last cue of each kind up to the new position, from the start
  state of the segment); playing another segment stops the current one;
- **guidance**: when the visitor takes the camera (drag, pinch, wheel), the world, the mode or the selected part by hand, the
  cues stop being applied (the audio goes on) and « Reprendre le guidage » replays the state at the current position and goes
  on. A **part** segment ends instead (the audio stops, the 3D view stays as the visitor left it) when the visitor selects
  another part, closes the sheet or changes world or mode;
- at the end of a segment the audio stops, the 3D view keeps its last state and the bar offers « Réécouter »; the markers left after the last
  word (a closing `[[cutaway:off]]`) have run by then, even though their time is a hair after the end of the decoded audio (kit 0.3.1);
- `prefers-reduced-motion` shortens the camera flights; a missing or undecodable file, or a browser that refuses to start the
  audio, shows a short message in the bar, never an error.

## 4. In a lab's tests

`@onigam/lab-kit/narration` is the part of the feature without DOM (manifest reading, cue scheduling, replay, captions): a lab
test reads its manifests and checks them against its content:

```ts
import { readManifest, validateManifest } from '@onigam/lab-kit/narration';

const { manifest, problems } = readManifest(JSON.parse(fs.readFileSync('public/audio/fr/manifest.json', 'utf8')));
expect(problems).toEqual([]);
expect(
  validateManifest(manifest!, {
    scenes: lab.scenes.map((s) => s.id),
    parts: lab.parts.map((p) => p.id),
    lessons: lab.lessons?.items.map((l) => l.id),
  }),
).toEqual([]); // every scope, world, part and mode named by a segment or a cue exists
```

`node tools/narration/selftest.mjs` checks the scheduling and replay logic of the kit itself.
