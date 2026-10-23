import type { L } from '../i18n';
import type { SceneId } from '../three/types';
import type { Drawing } from './svg';

/** Drawing trades are chosen by each lab (for example 'device', 'hydraulic', 'electrical', 'assembly'). */
export type SheetGroup = string;

/** One A3 drawing of the "Plans" mode. */
export interface DrawingSheet {
  id: string;
  /** Drawing number shown in the title block, e.g. "PL-T01". */
  number: string;
  group: SheetGroup;
  title: L;
  /** 2–4 sentences shown next to the drawing: what it shows and how to read it. */
  description: L;
  /** 3D world and parts to open from the drawing ("see in 3D"). */
  scene?: SceneId;
  parts?: string[];
  render(): Drawing;
}

/** Sheets that show a given part ("see the drawings of this part"). */
export function sheetsForPart(sheets: DrawingSheet[], id: string): DrawingSheet[] {
  return sheets.filter((s) => s.parts?.includes(id));
}
