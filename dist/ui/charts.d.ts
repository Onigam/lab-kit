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
    markers?: () => {
        x: number;
        y?: number;
        label: string;
        color?: string;
    }[];
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
