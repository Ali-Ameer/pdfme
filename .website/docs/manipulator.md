# Manipulator

The `@pdfme/manipulator` package provides powerful utilities for manipulating PDF files. It can be used in both Node.js and browser environments.

## Installation

```bash
npm install @pdfme/manipulator
```

## Features

### merge
Combines multiple PDF files into a single PDF with optional position control.

```ts
import { merge } from '@pdfme/manipulator';

const pdf1 = new ArrayBuffer(...); // First PDF
const pdf2 = new ArrayBuffer(...); // Second PDF

// Basic merge (at end)
const merged = await merge([pdf1, pdf2]);

// Merge at start
const mergedAtStart = await merge([pdf1, pdf2], { position: 'start' });

// Merge at specific index
const mergedAtIndex = await merge([pdf1, pdf2], { position: 1 });
```

### mergeAdvanced
Combines multiple PDFs and templates into a single PDF with full control over positioning.

```ts
import { mergeAdvanced, MergeItem } from '@pdfme/manipulator';

const pdf1 = new ArrayBuffer(...); // PDF file
const template = { 
  basePdf: BLANK_PDF, 
  schemas: [/* template definition */] 
};

const items: MergeItem[] = [
  { type: 'pdf', data: pdf1, pages: [0, 2] }, // Include only pages 1 and 3
  { 
    type: 'template', 
    data: template, 
    inputs: [{ field1: 'value1' }] 
  }
];

// Merge at end (default)
const result = await mergeAdvanced(items);

// Merge at specific position
const resultAtIndex = await mergeAdvanced(items, { position: 1 });
```

### mergeWithTemplates
Merges a base PDF with multiple templates at specified positions.

```ts
import { mergeWithTemplates } from '@pdfme/manipulator';

const basePdf = new ArrayBuffer(...);
const template1 = { /* template definition */ };
const template2 = { /* template definition */ };

const result = await mergeWithTemplates(basePdf, [
  { 
    template: template1, 
    inputs: [{ title: 'Page 1' }], 
    position: 0 // Insert at beginning
  },
  { 
    template: template2, 
    inputs: [{ title: 'Page 2' }], 
    position: 'end' // Add at end
  }
]);
```

### split
Splits a PDF into multiple PDFs based on page ranges.

```ts
import { split } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // Source PDF
const splits = await split(pdf, [
  { start: 0, end: 1 }, // Pages 1-2
  { start: 2, end: 4 }, // Pages 3-5
]);
```

### rotate
Rotates specified pages in a PDF.

```ts
import { rotate } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // Source PDF
const result = await rotate(pdf, 90); // Rotate all pages 90 degrees
// Or rotate specific pages:
const result2 = await rotate(pdf, 90, [0, 2]); // Rotate pages 1 and 3
```

### insert
Inserts PDF pages at specified positions.

```ts
import { insert } from '@pdfme/manipulator';

const basePdf = new ArrayBuffer(...); // Base PDF
const insertPdf = new ArrayBuffer(...); // PDF to insert
const result = await insert(basePdf, [
  { pdf: insertPdf, position: 1 } // Insert after first page
]);
```

### remove
Removes specified pages from a PDF.

```ts
import { remove } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // Source PDF
const result = await remove(pdf, [1, 3]); // Remove pages 2 and 4
```

### move
Moves a page from one position to another within the PDF.

```ts
import { move } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // Source PDF
const result = await move(pdf, { from: 0, to: 2 }); // Move first page to third position
```

### organize
Performs multiple PDF operations in sequence.

```ts
import { organize } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // Source PDF
const insertPdf = new ArrayBuffer(...); // PDF to insert
const result = await organize(pdf, [
  { type: 'remove', data: { position: 1 } },
  { type: 'insert', data: { pdf: insertPdf, position: 0 } },
  { type: 'rotate', data: { position: 0, degrees: 90 } },
]);
```

## Error Handling

All functions throw descriptive errors when invalid parameters are provided:

- Invalid page numbers: `[@pdfme/manipulator] Invalid page number`
- Invalid rotation degrees: `[@pdfme/manipulator] Rotation degrees must be a multiple of 90`
- Invalid positions: `[@pdfme/manipulator] Invalid position`
- Empty inputs: `[@pdfme/manipulator] At least one PDF is required`

## Types

```ts
type PDFInput = ArrayBuffer;

interface PageRange {
  start?: number;
  end?: number;
}

interface InsertOperation {
  pdf: PDFInput;
  position: number;
}

type OrganizeAction =
  | { type: 'remove'; data: { position: number } }
  | { type: 'insert'; data: { pdf: PDFInput; position: number } }
  | { type: 'replace'; data: { pdf: PDFInput; position: number } }
  | { type: 'rotate'; data: { position: number; degrees: 0 | 90 | 180 | 270 | 360 } }
  | { type: 'move'; data: { from: number; to: number } };

interface MergeItem {
  type: 'pdf' | 'template';
  data: ArrayBuffer | Uint8Array | Template;
  pages?: number[]; // For PDF: specific pages to include
  inputs?: Record<string, unknown>[]; // For template: input data
}

interface MergeOptions {
  position?: 'start' | 'end' | number; // Position to insert
}
```

## Contact

If you have any questions or suggestions about `@pdfme/manipulator`, please reach out via:

- **Discord**: [https://discord.gg/xWPTJbmgNV](https://discord.gg/xWPTJbmgNV)
- **GitHub Issues**: [https://github.com/pdfme/pdfme/issues](https://github.com/pdfme/pdfme/issues)
