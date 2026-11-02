/** The colours of the ramp, sRGB, cool to hot. */
export declare const RAMP_COLOURS: readonly number[];
export type HeatStops = readonly (readonly [number, number])[];
/** The stops of the ramp over a span, °C and sRGB, evenly spaced. */
export declare function heatStops(min: number, max: number): HeatStops;
/** One colour of sRGB as linear RGB, 0 to 1. */
export declare function linearRgb(hex: number, out?: [number, number, number]): [number, number, number];
/** The colour of a temperature, linear RGB, held at the two ends of the span. `out` is written, so that a field costs no allocation. */
export declare function heatRgb(stops: HeatStops, T: number, out?: [number, number, number]): [number, number, number];
/** The same ramp in GLSL: `vec3 heatRamp( float T )`, linear RGB. */
export declare function heatRampGlsl(stops: HeatStops): string;
