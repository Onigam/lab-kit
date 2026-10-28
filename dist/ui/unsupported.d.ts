/** True when a WebGL 2 context can be created in this browser (three.js needs WebGL 2). */
export declare function webglAvailable(): boolean;
/** Replace the content of the application root with the "no WebGL" message (current language first). */
export declare function showUnsupported(app: HTMLElement): void;
