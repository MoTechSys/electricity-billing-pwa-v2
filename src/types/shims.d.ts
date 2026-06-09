declare module 'arabic-reshaper' {
  export function convertArabic(text: string): string;
  export function convertArabicBack(text: string): string;
}

declare module 'bidi-js' {
  interface BidiApi {
    getEmbeddingLevels(text: string, direction?: 'ltr' | 'rtl' | 'auto'): unknown;
    getReorderSegments(text: string, embeddingLevels: unknown): Array<[number, number]>;
  }
  export default function bidiFactory(): BidiApi;
}
