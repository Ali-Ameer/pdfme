import { mergeAdvanced, mergeWithTemplates, MergeItem } from '../src/index.js';
import { createTestPDF, getPDFPageCount } from './utils.js';
import { BLANK_PDF } from '@pdfme/common';

const createTestTemplate = () => ({
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'title',
        type: 'text',
        position: { x: 10, y: 10 },
        width: 100,
        height: 20,
        content: 'Test Template'
      }
    ]
  ]
});

describe('mergeAdvanced', () => {
  test('merges PDFs and templates at end (default)', async () => {
    const pdf1 = await createTestPDF(2);
    const template = createTestTemplate();

    const items: MergeItem[] = [
      { type: 'pdf', data: pdf1 },
      { type: 'template', data: template, inputs: [{ title: 'Generated Page' }] }
    ];

    const result = await mergeAdvanced(items);
    expect(await getPDFPageCount(result)).toBe(3); // 2 PDF pages + 1 template page
  });

  test('merges PDFs and templates at start', async () => {
    const pdf1 = await createTestPDF(2);
    const template = createTestTemplate();

    const items: MergeItem[] = [
      { type: 'template', data: template, inputs: [{ title: 'First Page' }] },
      { type: 'pdf', data: pdf1 }
    ];

    const result = await mergeAdvanced(items, { position: 'start' });
    expect(await getPDFPageCount(result)).toBe(3);
  });

  test('merges PDFs and templates at specific index', async () => {
    const pdf1 = await createTestPDF(3);
    const template = createTestTemplate();

    const items: MergeItem[] = [
      { type: 'pdf', data: pdf1 },
      { type: 'template', data: template, inputs: [{ title: 'Middle Page' }] }
    ];

    const result = await mergeAdvanced(items, { position: 1 });
    expect(await getPDFPageCount(result)).toBe(4); // 3 PDF pages + 1 template page
  });

  test('merges specific PDF pages', async () => {
    const pdf1 = await createTestPDF(5);
    const pdf2 = await createTestPDF(3);

    const items: MergeItem[] = [
      { type: 'pdf', data: pdf1, pages: [0, 2, 4] }, // Pages 1, 3, 5
      { type: 'pdf', data: pdf2, pages: [1] } // Page 2
    ];

    const result = await mergeAdvanced(items);
    expect(await getPDFPageCount(result)).toBe(4); // 3 + 1 pages
  });

  test('throws error for invalid page indices', async () => {
    const pdf1 = await createTestPDF(3);

    const items: MergeItem[] = [
      { type: 'pdf', data: pdf1, pages: [0, 5] } // Page 5 doesn't exist
    ];

    await expect(mergeAdvanced(items)).rejects.toThrow(
      '[@pdfme/manipulator] Invalid page index'
    );
  });

  test('throws error when no items provided', async () => {
    await expect(mergeAdvanced([])).rejects.toThrow(
      '[@pdfme/manipulator] At least one item is required'
    );
  });
});

describe('mergeWithTemplates', () => {
  test('merges base PDF with multiple templates', async () => {
    const basePdf = await createTestPDF(2);
    const template1 = createTestTemplate();
    const template2 = createTestTemplate();

    const result = await mergeWithTemplates(basePdf, [
      { 
        template: template1, 
        inputs: [{ title: 'Template 1' }], 
        position: 1 
      },
      { 
        template: template2, 
        inputs: [{ title: 'Template 2' }], 
        position: 'end' 
      }
    ]);

    expect(await getPDFPageCount(result)).toBe(4); // 2 base + 2 templates
  });

  test('throws error when no templates provided', async () => {
    const basePdf = await createTestPDF(1);

    await expect(mergeWithTemplates(basePdf, [])).rejects.toThrow(
      '[@pdfme/manipulator] At least one template is required'
    );
  });
});
