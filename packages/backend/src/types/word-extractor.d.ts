// Type declarations for word-extractor
// This package doesn't ship with types

declare module 'word-extractor' {
  interface ExtractedDoc {
    getBody(): string;
    getFootnotes(): string;
    getHeaders(): string;
    getAnnotations(): string;
  }

  class WordExtractor {
    extract(buffer: Buffer | string): Promise<ExtractedDoc>;
  }

  export default WordExtractor;
}
