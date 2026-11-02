# The frame's fonts

Space Grotesk (text) and JetBrains Mono (figures, labels), served from each lab's own address, so a visitor's browser no longer
contacts Google. Both are under the SIL Open Font License 1.1, whose full text and copyright notices are `OFL-SpaceGrotesk.txt` and
`OFL-JetBrainsMono.txt`. Neither declares a Reserved Font Name, so a subset may keep its name. Every file keeps the copyright (name
ID 0) and the licence's address (name ID 14) in its own metadata, and `styles.css` repeats the notices in a comment that a build keeps.

| File | From | Characters | Size |
| --- | --- | --- | --- |
| `space-grotesk-latin.woff2` | `@fontsource-variable/space-grotesk` 5.3.0, `latin`, as it is | Google's `latin` subset: French and English | 22,288 B |
| `space-grotesk-marks.woff2` | the same, `latin-ext`, cut to one character | `†`, the labs' mark of a model's result, which Google keeps out of `latin` | 1,112 B |
| `jetbrains-mono-latin.woff2` | `@fontsource-variable/jetbrains-mono` 5.3.0, `latin`, as it is | the same | 40,404 B |
| `jetbrains-mono-marks.woff2` | the same, `latin-ext`, cut to one character | `†` | 984 B |
| `jetbrains-mono-greek.woff2` | the same, `greek`, as it is | the physics' symbols (η, ρ, ω, Δ…); fetched only by a page that shows one | 9,004 B |

These are the files Google served the labs (fontsource republishes them), so the letters do not change. Left out, because no lab's French or
English uses them: Cyrillic, Vietnamese and the rest of Latin Extended. What the fonts never had in these subsets (`→`, `≈`, `≤`, `₂`, Greek in
Space Grotesk…) still falls back to the system's font, as it did.

The two `marks` files were made with fontTools:

```bash
pyftsubset <family>-latin-ext-wght-normal.woff2 --unicodes=U+2020 --flavor=woff2 --layout-features='*' --name-IDs='*' --notdef-outline --output-file=<family>-marks.woff2
```

The characters the labs use were listed from every lab's committed `src/` and `narration/`, then looked up in each font's `cmap`. To add one,
cut it from the family's `latin-ext` the same way and add it to the `unicode-range` of the `marks` faces in `styles.css`.
