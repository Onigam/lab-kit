# Quality and detail: what every lab must get right (v1)

The [lab standard](lab-standard.md) counts what a lab contains. This file says **how good** each thing must be. Every rule below comes
from a defect found on a lab that had already been shown as done, almost all of them by the owner, none by the agents who built it.
From now on they are checked **before** the owner sees the lab, by a reviewer who did not build it, and reported in the lab's
`docs/qa.md` (section 8).

Each rule says how to check it and where it came from (lab, date, the owner's words).

## 1. Mechanics you can believe

- **Every moving part is visibly attached to what drives it.** A spring, a chain, a belt, a cable or a linkage ends on a part, at a
  visible point, in every world and in the exploded view. _Check_: a close-up of each joint, and a test that the two parts touch.
  _Pelton, 22/10/2026: the deflector's spring « a l'air d'être dans le vide ». Mill, 30/10: « on ne voit pas comment la chaîne est
  reliée à la vis »._
- **Nothing floats, nothing sinks.** A body rests on what carries it (a plinth on the ground, a bearing on its frame) to within a few
  millimetres. _Check_: a test per heavy part comparing its lowest point with its support, and close-ups at ground level. _Pelton: the
  injector's base was out of line. Mill, 31/10: the generator stood 6.5 cm inside the bank._
- **Things turn the right way, at a speed the eye reads right.** The direction follows the flow that drives it; above a few turns a
  second, cap the visual speed and add a blur disc (the wagon-wheel effect). _Pelton, 21/10: the wheel seemed to turn against the jet._
- **A part sits where it acts.** If it only acts sometimes (a deflector on overspeed), its sheet says when. _Pelton, 22/10: the
  deflectors « ont l'air un peu dans le vide »._
- **The maker's dimensions before the model.** Fetch the official figures first, then model from `dims.ts` only. _Pelton, 22/10: the
  whole model was realigned on the maker's box (574 × 328 × 402) and wheel (26 buckets) after the fact._

## 2. One machine, the same everywhere

- **A machine shown in two worlds is the same machine**: built by the same function from the same dimensions and moved into place,
  never redrawn simpler (no box standing in for a drive). _Check_: a test that the shared parts sit within 3 mm of each other across
  the worlds. _Mill, 30/10: the site showed a box where the screw world has a chain and a belt, « c'est pas cohérent avec la vue
  vis »._
- **Every system a visitor can name has a place to look at it.** The equipment room, the battery and the wiring get a world of their
  own, laid out in the order the current flows. _Piggott, 29/10: « on a rien sur la partie local technique / batterie »._
- **A tool that teaches nothing is left out.** _Piggott, 29/10: no cut in the equipment room, « ce n'est pas vraiment intéressant »._

## 3. Scenery and water that look real

- **Every prop reads as what it is**, close up and from afar: a tree looks like its species, a wall like stone, a platform not like a
  table; no bare primitive stands in for a part. _Check_: a screenshot of each prop at three distances, asking « what is this? » of
  each. _Mill, 30/10: the willow « on dirait une méduse », and the generator's platform looked like a table._
- **The setting has had its polish pass**: relief with banks, varied vegetation, textured materials, light that shows the volumes,
  buildings at the right scale. _Mill, 30/10: « soigner plus le décor, le rendre plus réaliste »._
- **The water follows the physics wherever the physics says something**: levels, the head over a weir, the speed in a canal, a
  horizontal free surface in a pocket, splashes, leaks and overflow in proportion to the model's numbers. What is only decoration (foam,
  ripples) is listed as such in `docs/water.md`. _Mill, 30/10: « soigner la mécanique des fluides de l'eau »._
- **The device can be found in its setting**: from the overview the visitor sees where the machine is, and selecting it brings the
  camera close enough to read it. _Mill, 30/10: « la vue du site est grossière »._

## 4. Camera, layout, way in

- **The camera turns around what you are looking at**, not around a fixed point. _Check_: in each world, select a part far from the
  centre and orbit. _Pelton, 28/10: « difficile voire impossible de tourner autour d'un dispositif précis »._
- **Nothing is crushed at any width**: the part sheet, its tabs and its specs stay readable at 1280, 768 and 390 px, and the panel can
  be widened to read. _Pelton, 22/10: the specs were « illisible » under a long text._
- **The spoken guide is the way in**: on a first visit the speaker button invites the visitor with a light animation (kit 0.4.0).
  _29/10: « c'est un peu le point d'entrée pour le didacticiel »._

## 5. Depth and clarity

- **As much detail per device as Pelton**: several ways to look (exploded, x-ray, isolate, cut, flows), a learning part (lessons and
  quiz), design drawings that show the connections, the assembly and the dimensions. _Pelton, 22/10; ram pump, 24/10: « il faut plus de
  détails pour chaque dispositif comme pour le Pelton Lab »._
- **A title and a description that say what it is and what the page holds**, in both languages. _Ram pump, 24/10: the French title
  was still « Ram pump lab », and « le labo du bélier, c'est trop vague »._
- **README in English first, French at the end.** _Pelton, 22/10._

## 6. Honest numbers, said once

- **The simulation is never tuned to print the source's figures.** When the model disagrees, it says so and why, and the owner judges
  the scale. _Piggott, 29/10: the model gives 63 W at the peak; the owner found about 60 W right for that size._
- **Warnings and « this is a model » are said once, where they matter**, not on every figure nor in every segment; research
  references like « (K22) » never reach the visitor. _Ram pump spoken guide, 28/10: « les disclaimers à chaque fois c'est un peu
  chiant »._

## 7. The spoken guide

- Pelton's tone is the reference (a warm storyteller in the spirit of the Maestro of « Il était une fois… la vie »), set out in
  [`narration-style.md`](narration-style.md). The 3D follows the voice; subtitles are on by default, discreet but readable, with
  « Voix de synthèse » shown. _28/10._
- A sample first (the introduction and one world), the owner listens, then the rest. No credit is spent without the owner's yes.
- Before the owner listens: every clip transcribed back (Whisper) and compared with its script (nothing skipped, repeated or
  invented), a steady speaking rate, no gap in the subtitles, and the guide played in the browser in both languages.

## 8. The review before the owner sees the lab

A reviewer who did not build the lab walks it in a browser and writes `docs/qa.md`:

1. every world: the overview, then each part at three distances, in the normal view, exploded, isolated, in x-ray and in cut where
   the world allows it;
2. every mode at 1280, 768 and 390 px, in French and in English, with the console open (no error);
3. the spoken guide played in both languages, the 3D following it;
4. each rule of this file ticked, or listed as a defect with its screenshot.

**The owner's past finds are the test set**: the spring in the void, the wheel turning backwards, the crushed specs, the untranslated
title, the fixed camera pivot, the missing equipment room, the chain not attached, the jellyfish tree, the sunk generator, a lab
called finished with two worlds. A review that would not have caught every one of them is not finished. Known defects stay in the
report, never hidden. Each new remark from the owner becomes a new rule in this file.
