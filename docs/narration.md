# Narration: a spoken guide for a lab

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
narration. Every id must exist in the lab (a lab test checks the manifest against its parts and worlds).

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

`LabDefinition.narration?: { manifest: string; onCue?(ctx, lab: string, arg?: string): void }` (`manifest` is the URL of the
manifest.json of the current language, relative to the page). When present and the interface language has a manifest:

- a speaker button in the header plays the `intro` segment; each world overview has a « Écouter » button (its `scene:` segment) and
  each part sheet has one (its `part:` segment);
- a **transport bar** (play/pause, progress, seek, speed 1× / 1.25×, subtitles on/off, « guidage 3D » on/off, and the mention of the
  synthetic voice) and **subtitles** at the bottom of the 3D view, discreet and legible, on by default;
- cues run on the audio clock (seeking replays the state: the last cue of each kind before the new position is applied);
- the visitor moving the camera or clicking a part by hand pauses the guidance (the audio keeps playing) and shows « Reprendre le
  guidage »; leaving the lab language for one without a manifest hides the buttons; `prefers-reduced-motion` shortens the flights;
- nothing plays by itself; the audio files are fetched on demand; a missing file shows a short message, never an error.
