declare module 'vite-plugin-compression' {
  interface ViteCompression {
    verbose?: boolean;
    algorithm?: 'gzip' | 'brotliCompress';
    ext?: string;
    filter?: RegExp | ((file: string) => boolean);
    threshold?: number;
    deleteOriginFile?: boolean;
  }

  export default function viteCompression(options?: ViteCompression): any;
}

declare module 'rollup-plugin-visualizer' {
  interface VisualizerOptions {
    open?: boolean;
    filename?: string;
    gzipSize?: boolean;
    brotliSize?: boolean;
  }

  export function visualizer(options?: VisualizerOptions): any;
} 