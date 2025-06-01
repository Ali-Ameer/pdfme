// Simple @pdfme/manipulator demonstration
const { merge, split, remove, insert, rotate, move, organize } = require('@pdfme/manipulator');
const fs = require('fs');
const path = require('path');

async function demonstrateManipulator() {
  console.log('🎯 @pdfme/manipulator Simple Demo\n');
  
  try {
    // Load existing PDFs (a.pdf and b.pdf should be in the same directory)
    const pdfAPath = path.join(__dirname, 'a.pdf');
    const pdfBPath = path.join(__dirname, 'b.pdf');
    
    if (!fs.existsSync(pdfAPath) || !fs.existsSync(pdfBPath)) {
      console.log('❌ Required PDFs (a.pdf, b.pdf) not found in the directory');
      return;
    }
    
    const pdfA = fs.readFileSync(pdfAPath);
    const pdfB = fs.readFileSync(pdfBPath);
    
    console.log('📁 Loaded existing PDFs: a.pdf, b.pdf');
    
    // 1. Merge two PDFs
    console.log('\n1️⃣ Merging PDFs...');
    const merged = await merge([pdfA, pdfB]);
    fs.writeFileSync(path.join(__dirname, 'demo-merged.pdf'), merged);
    console.log('✅ Created: demo-merged.pdf');
    
    // 2. Split the merged PDF
    console.log('\n2️⃣ Splitting merged PDF...');
    const splits = await split(merged, [
      { start: 0, end: 0 }, // First page only
      { start: 1, end: -1 } // Remaining pages
    ]);
    fs.writeFileSync(path.join(__dirname, 'demo-split-1.pdf'), splits[0]);
    fs.writeFileSync(path.join(__dirname, 'demo-split-2.pdf'), splits[1]);
    console.log('✅ Created: demo-split-1.pdf, demo-split-2.pdf');
    
    // 3. Remove pages (remove first page)
    console.log('\n3️⃣ Removing pages...');
    const withRemovedPage = await remove(merged, [0]);
    fs.writeFileSync(path.join(__dirname, 'demo-removed.pdf'), withRemovedPage);
    console.log('✅ Created: demo-removed.pdf (first page removed)');
    
    // 4. Insert PDF at specific position
    console.log('\n4️⃣ Inserting PDF...');
    const withInserted = await insert(pdfA, [
      { pdf: pdfB, position: 0 } // Insert pdfB at the beginning
    ]);
    fs.writeFileSync(path.join(__dirname, 'demo-inserted.pdf'), withInserted);
    console.log('✅ Created: demo-inserted.pdf (b.pdf inserted at beginning)');
    
    // 5. Rotate pages
    console.log('\n5️⃣ Rotating pages...');
    const rotated = await rotate(pdfA, 90); // Rotate all pages 90 degrees
    fs.writeFileSync(path.join(__dirname, 'demo-rotated.pdf'), rotated);
    console.log('✅ Created: demo-rotated.pdf (rotated 90°)');
    
    // 6. Organize - Complex operations in sequence
    console.log('\n6️⃣ Complex organize operations...');
    const organized = await organize(merged, [
      { type: 'rotate', data: { position: 0, degrees: 180 } }, // Rotate first page 180°
      { type: 'insert', data: { pdf: pdfA, position: 1 } },    // Insert pdfA after first page
    ]);
    fs.writeFileSync(path.join(__dirname, 'demo-organized.pdf'), organized);
    console.log('✅ Created: demo-organized.pdf (rotated + inserted)');
    
    console.log('\n🎉 All demonstrations completed successfully!');
    console.log('📁 Check the node-playground directory for generated PDF files.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the demonstration
demonstrateManipulator();
