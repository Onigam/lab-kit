# The frame's fonts

Space Grotesk (text) and JetBrains Mono (figures, labels), served from each lab's own address, so a visitor's browser no longer
contacts Google. Both are under the SIL Open Font License 1.1, whose full text and copyright notices are `OFL-SpaceGrotesk.txt` and
`OFL-JetBrainsMono.txt`, copied to `dist/fonts`. Neither declares a Reserved Font Name, so a subset may keep its name. A lab's own build
drops those text files and the notice in `styles.css` (its minifier removes even a `/*!` comment), so every font file carries its notices in its
metadata, which is what the OFL's condition 2 allows: the copyright (name ID 0), the licence's sentence (13) and its address (14).

| File | From (`@fontsource-variable`, 5.3.0) | Characters | Weights | Size |
| --- | --- | --- | --- | --- |
| `space-grotesk-latin.woff2` | `space-grotesk`, `latin` | Google's `latin` subset: French and English | 300 to 700 | 22.3 KB |
| `space-grotesk-marks.woff2` | the same, `latin-ext`, cut to one character | `†`, the labs' mark of a model's result, which that family keeps out of `latin` | 300 to 700 | 1.2 KB |
| `jetbrains-mono-latin.woff2` | `jetbrains-mono`, `latin`, its weight axis cut | the same as Space Grotesk's | 400 to 600 | 30.0 KB |
| `jetbrains-mono-marks.woff2` | the same, `latin-ext`, cut to one character and its axis cut | `†` | 400 to 600 | 0.9 KB |
| `jetbrains-mono-greek.woff2` | the same, `greek`, its axis cut | the physics' symbols (η, ρ, ω, Δ…); fetched only by a page that shows one | 400 to 600 | 6.5 KB |

The same fonts Google served the labs, at the weights their `<link>` asked for: Space Grotesk 2.000 and JetBrains Mono 2.211, the same characters and
the same advance widths in `latin` and `greek` as Google's files of 2 November 2026 (compared with fontTools). The bytes differ: Google cuts the axis to fit each
request. Left out, because no lab's French or English uses them: Cyrillic, Vietnamese and the rest of Latin Extended. What these subsets never had (`→`, `≈`, `≤`,
`₂`, Greek in Space Grotesk…) still falls back to the system's font, as it did.

JetBrains Mono's axis is cut to 400 to 600 because the frame asks for no other weight: 40,404 B become 29,988 B. At 400 and 600 no glyph changed its width and no point
moved by a whole unit of the 1,000 to the em. Space Grotesk's axis is left whole: cutting it saves 200 B.

Made with fontTools:

```bash
# the one-character files
pyftsubset <family>-latin-ext-wght-normal.woff2 --unicodes=U+2020 --flavor=woff2 --layout-features='*' --name-IDs='*' --notdef-outline --output-file=<family>-marks.woff2
```

```python
# JetBrains Mono's axis
font = instancer.instantiateVariableFont(TTFont('<file>.woff2'), {'wght': (400, 600)})
font.flavor = 'woff2'
font.save('<out>.woff2')
```

And name ID 13 was set on all five with `font['name'].setName(text, 13, 3, 1, 0x409)`: the Google subsets had dropped it.

The characters the labs use were listed from every lab's committed `src/` and `narration/`, then looked up in each font's `cmap`. To add one, cut it from the family's
`latin-ext` the same way and add it to the `unicode-range` of the `marks` faces in `styles.css`.
