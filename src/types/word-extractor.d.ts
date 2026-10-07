declare module "word-extractor" {
  interface WordDocument {
    getBody(): string;
    getHeaders?(opts?: { includeFooters?: boolean }): string;
    getTextboxes?(opts?: { includeHeadersAndFooters?: boolean }): string;
  }
  export default class WordExtractor {
    extract(source: string | Buffer): Promise<WordDocument>;
  }
}
