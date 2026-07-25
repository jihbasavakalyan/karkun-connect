declare module 'arabic-reshaper' {
  const ArabicReshaper: {
    convertArabic: (text: string) => string
    convertArabicBack: (text: string) => string
  }
  export default ArabicReshaper
}

declare module 'bidi-js' {
  type EmbeddingLevels = {
    levels: Uint8Array
    paragraphs: Array<{ start: number; end: number; level: number }>
  }

  type Bidi = {
    getEmbeddingLevels: (text: string, direction?: 'ltr' | 'rtl') => EmbeddingLevels
    getReorderSegments: (
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number,
    ) => Array<[number, number]>
  }

  export default function bidiFactory(): Bidi
}
