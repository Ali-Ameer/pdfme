const { mergeAdvanced, mergeWithTemplates } = require('@pdfme/manipulator');
const { BLANK_PDF } = require('@pdfme/common');
const fs = require('fs');
const path = require('path');

// Load existing PDFs
const aPdf = fs.readFileSync(path.join(__dirname, 'a.pdf'));
const bPdf = fs.readFileSync(path.join(__dirname, 'b.pdf'));

// Create a simple template
const template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'title',
        type: 'text',
        position: { x: 10, y: 10 },
        width: 100,
        height: 20,
        content: 'Generated from Template'
      }
    ]
  ]
};

// Example 1: Merge PDFs and templates
async function example1() {
  const items = [
    { type: 'pdf', data: aPdf, pages: [0] }, // First page of a.pdf
    { type: 'template', data: template, inputs: [{ title: 'Middle Page' }] },
    { type: 'pdf', data: bPdf } // All pages of b.pdf
  ];

  const result = await mergeAdvanced(items, { position: 'end' });
  fs.writeFileSync(path.join(__dirname, 'merged-advanced.pdf'), result);
  console.log('Advanced merge completed: merged-advanced.pdf');
}

// Example 2: Merge base PDF with templates
async function example2() {
  const result = await mergeWithTemplates(aPdf, [
    { 
      template, 
      inputs: [{ title: 'Template at Start' }], 
      position: 0 
    },
    { 
      template, 
      inputs: [{ title: 'Template at End' }], 
      position: 'end' 
    }
  ]);

  fs.writeFileSync(path.join(__dirname, 'merged-with-templates.pdf'), result);
  console.log('Template merge completed: merged-with-templates.pdf');
}

// Run examples
Promise.all([example1(), example2()])
  .then(() => console.log('All examples completed'))
  .catch(console.error);
