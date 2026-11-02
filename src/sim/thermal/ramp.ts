// The false colour of a temperature field: one ramp of colours stretched over a span chosen once and for all, so that a colour means the same thing in
// every view and at every moment. Blue is cool and red is hot, the eye's own convention, with a lightness that rises then falls. A span that is too wide
// paints a body in one shade: choose it from what the body really does. Pure numbers: no renderer here.

/** The colours of the ramp, sRGB, cool to hot. */
export const RAMP_COLOURS: readonly number[] = [0x27316f, 0x2f6fb4, 0x23a39b, 0x9cc13b, 0xf4b83a, 0xe85f2a, 0xa61a3c];

export type HeatStops = readonly (readonly [number, number])[];

/** The stops of the ramp over a span, °C and sRGB, evenly spaced. */
export function heatStops(min: number, max: number): HeatStops {
  const n = RAMP_COLOURS.length - 1;
  return RAMP_COLOURS.map((c, i) => [min + ((max - min) * i) / n, c] as const);
}

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/** One colour of sRGB as linear RGB, 0 to 1. */
export function linearRgb(hex: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  out[0] = toLinear(((hex >> 16) & 255) / 255);
  out[1] = toLinear(((hex >> 8) & 255) / 255);
  out[2] = toLinear((hex & 255) / 255);
  return out;
}

/** The colour of a temperature, linear RGB, held at the two ends of the span. `out` is written, so that a field costs no allocation. */
export function heatRgb(
  stops: HeatStops,
  T: number,
  out: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const n = stops.length - 1;
  if (T <= stops[0]![0]) return linearRgb(stops[0]![1], out);
  if (T >= stops[n]![0]) return linearRgb(stops[n]![1], out);
  let i = 0;
  while (i < n - 1 && T > stops[i + 1]![0]) i++;
  const [t0, c0] = stops[i]!;
  const [t1, c1] = stops[i + 1]!;
  const u = (T - t0) / (t1 - t0);
  const a = linearRgb(c0);
  linearRgb(c1, out);
  out[0] = a[0] + (out[0] - a[0]) * u;
  out[1] = a[1] + (out[1] - a[1]) * u;
  out[2] = a[2] + (out[2] - a[2]) * u;
  return out;
}

/** The same ramp in GLSL: `vec3 heatRamp( float T )`, linear RGB. */
export function heatRampGlsl(stops: HeatStops): string {
  const v = (hex: number): string => {
    const c = linearRgb(hex);
    return `vec3( ${c[0].toFixed(4)}, ${c[1].toFixed(4)}, ${c[2].toFixed(4)} )`;
  };
  const n = stops.length - 1;
  let body = '';
  for (let i = 0; i < n; i++) {
    const [t0, c0] = stops[i]!;
    const [t1, c1] = stops[i + 1]!;
    body += `if ( T <= ${t1.toFixed(2)} ) return mix( ${v(c0)}, ${v(c1)}, ( T - ${t0.toFixed(2)} ) / ${(t1 - t0).toFixed(2)} );\n`;
  }
  return `vec3 heatRamp( float T ) {\n T = clamp( T, ${stops[0]![0].toFixed(2)}, ${stops[n]![0].toFixed(2)} );\n${body} return ${v(stops[n]![1])};\n}\n`;
}
