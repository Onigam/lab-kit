/** Sheets that show a given part ("see the drawings of this part"). */
export function sheetsForPart(sheets, id) {
    return sheets.filter((s) => s.parts?.includes(id));
}
