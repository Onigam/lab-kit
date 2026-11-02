export declare const SERIES_COLORS: {
    hydro: string;
    pv: string;
    load: string;
    dump: string;
};
export interface SeriesDef {
    key: string;
    label: () => string;
    color: string;
    /** Dashed stroke (secondary series). */
    dash?: boolean;
    /** Thicker stroke (highlighted series). */
    bold?: boolean;
}
/**
 * A mark on a chart at abscissa `x`. As before when only `x`, `y`, `label` and `color` are given: with a `y`, a dot with its label; without, a vertical line
 * with its label at the top. The rest says what to draw when that is not it: a label alone, a line alone, a side.
 */
export interface ChartMarker {
    x: number;
    y?: number;
    label?: string;
    color?: string;
    /** Draw the vertical line (default: when there is no `y`). */
    line?: boolean;
    /** Draw the dot at `y` (default: when there is a `y`). */
    dot?: boolean;
    /** Which side of the point the label is on: `start`, after it, `end`, before it (default: `end` past 70 % of the width). */
    align?: 'start' | 'end';
}
interface ChartOpts {
    height: number;
    series: SeriesDef[];
    yMin?: number;
    yMax?: number;
    yFmt: (v: number) => string;
    xFmt: (v: number) => string;
    /** Show a legend row (always when ≥ 2 series). */
    legend?: boolean;
    /** Vertical reference lines and points drawn over the series. */
    markers?: () => ChartMarker[];
}
export declare class LineChart {
    private opts;
    readonly el: HTMLDivElement;
    private canvas;
    private tip;
    private legendEl;
    private xs;
    private ys;
    private hover;
    constructor(opts: ChartOpts);
    setData(xs: number[], ys: Record<string, number[]>): void;
    draw(): void;
}
/** Power vs speed curve of the runner with the operating point and the optimum. */
export declare class CurveChart {
    private height;
    private labels;
    readonly el: HTMLDivElement;
    private canvas;
    private data;
    private point;
    constructor(height: number, labels: {
        optimum: () => string;
        operating: () => string;
    });
    set(data: [number, number][], point: [number, number]): void;
    draw(): void;
}
export {};
