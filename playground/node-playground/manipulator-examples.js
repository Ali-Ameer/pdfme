const { merge, split, remove, insert, rotate, move, organize, mergeAdvanced } = require('@pdfme/manipulator');
const { BLANK_PDF } = require('@pdfme/common');
const { generate } = require('@pdfme/generator');
const fs = require('fs');
const path = require('path');

// Helper function to create a test PDF with multiple pages
async function createTestPDF(pageCount, prefix = 'Page') {
  const template = {
    basePdf: BLANK_PDF,
    schemas: [
      [
        {
          name: 'title',
          type: 'text',
          position: { x: 50, y: 50 },
          width: 100,
          height: 20,
          fontSize: 16,
        }
      ]
    ]
  };

  const inputs = Array.from({ length: pageCount }, (_, i) => ({
    title: `${prefix} ${i + 1}`
  }));

  return await generate({ template, inputs });
}

// Example 1: Basic PDF Operations
async function basicOperations() {
  console.log('🔧 Running Basic Operations...');
  
  // Create test PDFs
  const pdf1 = await createTestPDF(3, 'Document A - Page');
  const pdf2 = await createTestPDF(2, 'Document B - Page');
  
  // Save test PDFs
  fs.writeFileSync(path.join(__dirname, 'test-doc-a.pdf'), pdf1);
  fs.writeFileSync(path.join(__dirname, 'test-doc-b.pdf'), pdf2);
  
  // 1. Merge PDFs
  const merged = await merge([pdf1, pdf2]);
  fs.writeFileSync(path.join(__dirname, 'example-merged.pdf'), merged);
  console.log('✅ Merged PDF created: example-merged.pdf');
  
  // 2. Split PDF into ranges
  const splits = await split(merged, [
    { start: 0, end: 2 }, // First 3 pages
    { start: 3, end: 4 }  // Last 2 pages
  ]);
  splits.forEach((splitPdf, index) => {
    fs.writeFileSync(path.join(__dirname, `example-split-${index + 1}.pdf`), splitPdf);
  });
  console.log('✅ Split PDFs created: example-split-1.pdf, example-split-2.pdf');
  
  // 3. Remove pages (remove pages 2 and 4)
  const withRemovedPages = await remove(merged, [1, 3]);
  fs.writeFileSync(path.join(__dirname, 'example-removed-pages.pdf'), withRemovedPages);
  console.log('✅ PDF with removed pages: example-removed-pages.pdf');
  
  // 4. Insert PDF at specific position
  const withInserted = await insert(pdf1, [
    { pdf: pdf2, position: 1 } // Insert pdf2 after first page of pdf1
  ]);
  fs.writeFileSync(path.join(__dirname, 'example-inserted.pdf'), withInserted);
  console.log('✅ PDF with inserted pages: example-inserted.pdf');
  
  // 5. Rotate pages
  const rotated = await rotate(pdf1, 90, [0, 2]); // Rotate pages 1 and 3 by 90 degrees
  fs.writeFileSync(path.join(__dirname, 'example-rotated.pdf'), rotated);
  console.log('✅ PDF with rotated pages: example-rotated.pdf');
  
  // 6. Move page
  const moved = await move(pdf1, { from: 0, to: 2 }); // Move first page to third position
  fs.writeFileSync(path.join(__dirname, 'example-moved.pdf'), moved);
  console.log('✅ PDF with moved page: example-moved.pdf');
}

// Example 2: Advanced Operations with organize
async function advancedOperations() {
  console.log('🚀 Running Advanced Operations...');
  
  const basePdf = await createTestPDF(5, 'Base Document - Page');
  const insertPdf = await createTestPDF(1, 'Inserted Page');
  const replacePdf = await createTestPDF(1, 'Replacement Page');
  
  // Complex sequence of operations
  const result = await organize(basePdf, [
    { type: 'remove', data: { position: 1 } },                    // Remove page 2
    { type: 'insert', data: { pdf: insertPdf, position: 1 } },   // Insert new page at position 2
    { type: 'replace', data: { pdf: replacePdf, position: 2 } }, // Replace page 3
    { type: 'rotate', data: { position: 0, degrees: 90 } },      // Rotate first page 90°
    { type: 'move', data: { from: 3, to: 1 } },                  // Move page 4 to position 2
  ]);
  
  fs.writeFileSync(path.join(__dirname, 'example-organized.pdf'), result);
  console.log('✅ Complex organized PDF: example-organized.pdf');
}

// Example 3: Working with Templates
async function templateOperations() {
  console.log('📝 Running Template Operations...');
  
  // Load existing PDF
  const existingPdf = fs.readFileSync(path.join(__dirname, 'a.pdf'));
  
  // Create a template
  const template = {
    basePdf: BLANK_PDF,
    schemas: [
      [
        {
          name: 'title',
          type: 'text',
          position: { x: 50, y: 50 },
          width: 150,
          height: 30,
          fontSize: 20,
        },
        {
          name: 'description',
          type: 'text',
          position: { x: 50, y: 100 },
          width: 200,
          height: 60,
          fontSize: 12,
        }
      ]
    ]
  };
  
  // Advanced merge with both PDFs and templates
  const items = [
    { type: 'pdf', data: existingPdf, pages: [0] }, // Only first page
    { 
      type: 'template', 
      data: template, 
      inputs: [{ 
        title: 'Generated Cover Page',
        description: 'This page was generated using @pdfme/manipulator with template integration.'
      }] 
    },
    { type: 'pdf', data: existingPdf } // All pages
  ];
  
  const mergedWithTemplate = await mergeAdvanced(items, { position: 'end' });
  fs.writeFileSync(path.join(__dirname, 'example-template-merge.pdf'), mergedWithTemplate);
  console.log('✅ PDF with template integration: example-template-merge.pdf');
}

// Example 4: Browser-compatible example (for reference)
function browserExample() {
  console.log('🌐 Browser Usage Example:');
  console.log(`
// For browser usage, you can use file inputs:
async function handleFileUpload(event) {
  const files = event.target.files;
  if (files.length >= 2) {
    const pdf1 = await files[0].arrayBuffer();
    const pdf2 = await files[1].arrayBuffer();
    
    const merged = await merge([pdf1, pdf2]);
    
    // Download the result
    const blob = new Blob([merged], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    a.click();
  }
}

// In your HTML:
// <input type="file" multiple accept=".pdf" onchange="handleFileUpload(event)" />
  `);
}

// Error handling example
async function errorHandlingExample() {
  console.log('⚠️ Error Handling Examples:');
  
  try {
    // This will throw an error - no PDFs provided
    await merge([]);
  } catch (error) {
    console.log('Expected error for empty merge:', error.message);
  }
  
  try {
    const pdf = await createTestPDF(3);
    // This will throw an error - invalid page number
    await remove(pdf, [5]);
  } catch (error) {
    console.log('Expected error for invalid page:', error.message);
  }
  
  try {
    const pdf = await createTestPDF(3);
    // This will throw an error - invalid rotation degree
    await rotate(pdf, 45);
  } catch (error) {
    console.log('Expected error for invalid rotation:', error.message);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('🎯 Starting @pdfme/manipulator Examples\n');
  
  try {
    await basicOperations();
    console.log();
    
    await advancedOperations();
    console.log();
    
    await templateOperations();
    console.log();
    
    browserExample();
    console.log();
    
    await errorHandlingExample();
    console.log();
    
    console.log('🎉 All examples completed successfully!');
    console.log('📁 Check the node-playground directory for generated PDF files.');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  createTestPDF,
  basicOperations,
  advancedOperations,
  templateOperations,
  runAllExamples
};
