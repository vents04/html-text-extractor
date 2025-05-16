# HTML Text Extractor

A utility for extracting readable text content from HTML strings. This package cleans and processes HTML to obtain plain text content that is suitable for reading, while removing scripts, styles, hidden elements, and properly handling HTML entities.

## Installation

```bash
npm install html-text-extractor
```

Or if you're installing from GitHub:

```bash
npm install github:username/html-text-extractor
```

## Usage

### Basic Usage

```javascript
const { extractTextFromHtml } = require('html-text-extractor');
// Or using ES modules:
// import { extractTextFromHtml } from 'html-text-extractor';

// Extract text from an HTML string
const html = '<div><h1>Title</h1><p>This is a paragraph with <b>bold</b> text.</p></div>';
const text = extractTextFromHtml(html);
console.log(text);
// Output: "Title This is a paragraph with bold text."
```

### Working with Base64 Encoded HTML

```javascript
// For base64 encoded HTML
const base64Html = 'PGRpdj48aDE+VGl0bGU8L2gxPjxwPlRoaXMgaXMgYSBwYXJhZ3JhcGggd2l0aCA8Yj5ib2xkPC9iPiB0ZXh0LjwvcD48L2Rpdj4=';
const text = extractTextFromHtml(base64Html, true);
console.log(text);
```

### TypeScript

The package includes TypeScript definitions:

```typescript
import { extractTextFromHtml } from 'html-text-extractor';

// Function signature
function extractTextFromHtml(htmlString: string, isBase64?: boolean): string;
```

## Features

- Preserves meaningful text content from HTML
- Cleans up whitespace and preserves paragraph breaks
- Extracts text from image alt attributes
- Ignores hidden elements
- Decodes HTML entities
- Handles malformed HTML with auto-closing of unclosed tags
- Supports both direct HTML and base64 encoded HTML

## CLI Usage

This package can also be used as a command-line tool:

```bash
npx html-text-extractor file.html [output.txt]
```

## License

MIT 