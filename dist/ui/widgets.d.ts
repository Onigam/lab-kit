export declare function slider(label: string, value: number, min: number, max: number, step: number, fmt: (v: number) => string, on: (v: number) => void): HTMLElement;
export declare function select<T extends string | number>(label: string, value: T, options: [T, string][], on: (v: T) => void): HTMLElement;
export declare function toggle(label: string, checked: boolean, on: (v: boolean) => void): HTMLElement;
export declare function section(title: string, ...children: (HTMLElement | null)[]): HTMLElement;
