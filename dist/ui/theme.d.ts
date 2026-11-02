/** Apply the visitor's earlier choice and follow the system's setting. Call once, before the application is drawn. */
export declare function initTheme(): void;
export declare function isDark(): boolean;
export declare function toggleTheme(): void;
export declare function onThemeChange(fn: () => void): () => void;
