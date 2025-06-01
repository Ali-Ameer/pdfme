import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Template, Schema, checkTemplate, cloneDeep, BLANK_PDF, BasePdf, getInputFromTemplate } from '@pdfme/common';
import { Designer } from '@pdfme/ui';
import { PDFDocument } from '@pdfme/pdf-lib'; // For merging and modifying PDFs
import { readFile, getFontsData, downloadJsonFile } from '../helper';
import { getPlugins } from '../plugins';
import { generate } from '@pdfme/generator';
import handleAddTemplateFiles from './handleAddTemplateFiles';

// Simple ID generator if not available from helper
const generateId = () => Math.random().toString(36).substr(2, 9);

// Interface for page metadata used in the UI (e.g., sidebar)
interface PageMeta {
  id: string;
  name: string;
  thumbnailSrc?: string; // Base64 encoded thumbnail image
}

interface MultiPageTemplateEditorProps {
  onSave?: (template: Template, pagesMeta: PageMeta[]) => void; // User saves the whole setup
  onLoad?: (template: Template, pagesMeta: PageMeta[]) => void; // User loads a setup
  initialTemplate?: Template;
  initialPagesMeta?: PageMeta[];
  className?: string;
}

// Helper to create an initial blank page meta
const createInitialPageMeta = (index: number = 0): PageMeta => ({
  id: generateId(),
  name: `Page ${index + 1}`,
});

// Helper to create an initial blank template
const createInitialTemplate = (): Template => ({
  basePdf: BLANK_PDF,
  schemas: [[]], // pdfme expects schemas as Schema[][]
});

export function MultiPageTemplateEditor({
  onSave,
  onLoad,
  initialTemplate,
  initialPagesMeta,
  className = '',
}: MultiPageTemplateEditorProps) {
  const [template, setTemplate] = useState<Template>(initialTemplate || createInitialTemplate());
  const [pagesMeta, setPagesMeta] = useState<PageMeta[]>(
    initialPagesMeta || [createInitialPageMeta(0)],
  );

  const [isProcessing, setIsProcessing] = useState(false);  
  const [isInitializing, setIsInitializing] = useState(false); // Changed from true to false, buildDesigner will set it
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null); // For loading the multi-page JSON template
  const templateImportRef = useRef<HTMLInputElement>(null); // For importing templates as pages

  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  // Initialize or update the Designer
  const buildDesigner = useCallback(async () => {
    if (!designerRef.current) {
      return;
    }

    // Clean up existing designer
    if (designer.current) {
      designer.current.destroy();
      designer.current = null;
    }

    setIsInitializing(true);
    try {
      const templateToLoad = cloneDeep(template);

      // Ensure schemas is always an array of arrays
      if (!templateToLoad.schemas || templateToLoad.schemas.length === 0) {
        templateToLoad.schemas = [[]];
      }

      // Synchronize pagesMeta with schemas length if needed
      if (templateToLoad.schemas.length !== pagesMeta.length) {
        const newPagesMeta = templateToLoad.schemas.map(
          (_, index) => pagesMeta[index] || createInitialPageMeta(index),
        );
        setPagesMeta(newPagesMeta);
      }

      checkTemplate(templateToLoad); // Validate before use

      const ds = new Designer({
        domContainer: designerRef.current,
        template: templateToLoad,
        options: {
          font: getFontsData(),
          lang: 'en',
          labels: { 'signature.clear': '🗑️' },
          theme: { token: { colorPrimary: '#25c2a0' } },
        },
        plugins: getPlugins(),
      });

      ds.onSaveTemplate((savedTemplate?: Template) => {
        if (savedTemplate) {
          setTemplate(savedTemplate);
          // Sync pagesMeta if the number of schema arrays (pages) changed
          if (savedTemplate.schemas && savedTemplate.schemas.length !== pagesMeta.length) {
            const newMetas = savedTemplate.schemas.map(
              (_, index) => pagesMeta[index] || createInitialPageMeta(index),
            );
            setPagesMeta(newMetas);
          }
        }
      });

      designer.current = ds;
    } catch (error: any) {
      console.error('Error building designer:', error);
      toast.error(`Failed to initialize editor: ${error.message}`);
      // Fallback to a clean state to avoid crash loops
      setTemplate(createInitialTemplate());
      setPagesMeta([createInitialPageMeta()]);
    } finally {
      setIsInitializing(false);
    }
  }, [template.basePdf, template.schemas, pagesMeta.length]);

  useEffect(() => {
    buildDesigner();
  }, [buildDesigner]); // buildDesigner itself has dependencies

  // Cleanup designer on component unmount
  useEffect(() => {
    return () => {
      designer.current?.destroy();
      designer.current = null;
    };
  }, []);

  // --- Page Management Functions ---
  const handleAddBlankPage = useCallback(async () => {
    setIsProcessing(true);
    try {
      let newBasePdf: BasePdf = template.basePdf;
      let newSchemas = cloneDeep(template.schemas);
      let newPagesMeta = cloneDeep(pagesMeta);

      if (newBasePdf === BLANK_PDF) {
        // If base is BLANK_PDF, just add a new schema entry 
        newSchemas.push([]);
        newPagesMeta.push(createInitialPageMeta(newPagesMeta.length));
      } else {
        // If base is an actual PDF, add a physical blank page
        if (typeof newBasePdf === 'string' || newBasePdf instanceof Uint8Array) {
          // Convert to PDFDocument
          const pdfDoc = typeof newBasePdf === 'string' 
            ? await PDFDocument.load(Uint8Array.from(atob(newBasePdf.split(',')[1]), c => c.charCodeAt(0)))
            : await PDFDocument.load(newBasePdf);
          
          // Add a blank page with content stream
          const newPage = pdfDoc.addPage();
          // Add minimal invisible content to ensure the page has a Contents entry
          newPage.drawText(' ', { x: 0, y: 0, size: 1, opacity: 0 });
          
          // Save the updated PDF
          newBasePdf = await pdfDoc.save();
        }
        // Add new schema entry for the page
        newSchemas.push([]);
        newPagesMeta.push(createInitialPageMeta(newPagesMeta.length));
      }
      
      setTemplate({ basePdf: newBasePdf, schemas: newSchemas });
      setPagesMeta(newPagesMeta);
      toast.success('Added blank page');
    } catch (error: any) {
      console.error('Error adding blank page:', error);
      toast.error(`Failed to add blank page: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [template, pagesMeta]);

  const handleAddPdfFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setIsProcessing(true);
      try {
        const files = Array.from(e.target.files);
        let currentPdfDoc: PDFDocument;
        let currentSchemas: Schema[][] = [];
        let currentPagesMeta: PageMeta[] = [];

        // Initialize currentPdfDoc: if template.basePdf is BLANK_PDF or empty, create new. Else, load existing.
        if (template.basePdf === BLANK_PDF || !template.basePdf) {
          currentPdfDoc = await PDFDocument.create();
          // Keep existing schemas/meta if they were for BLANK_PDF pages before this import
          if (
            template.basePdf === BLANK_PDF &&
            template.schemas.length > 0 &&
            !(template.schemas.length === 1 && template.schemas[0].length === 0)
          ) {
            currentSchemas = cloneDeep(template.schemas);
            currentPagesMeta = cloneDeep(pagesMeta);
          }
        } else {
          if (typeof template.basePdf === 'string') {
            currentPdfDoc = await PDFDocument.load(
              Uint8Array.from(atob(template.basePdf.split(',')[1]), (c) => c.charCodeAt(0)),
            );
          } else if (template.basePdf instanceof Uint8Array) {
            currentPdfDoc = await PDFDocument.load(template.basePdf);
          } else {
            // If it's an object with dimensions, create a new PDF
            currentPdfDoc = await PDFDocument.create();
          }
          currentSchemas = cloneDeep(template.schemas);
          currentPagesMeta = cloneDeep(pagesMeta);
        }

        for (const file of files) {
          const fileBuffer = (await readFile(file, 'arrayBuffer')) as ArrayBuffer;
          const importedPdfDoc = await PDFDocument.load(fileBuffer);
          const pageIndices = importedPdfDoc.getPageIndices();
          const copiedPages = await currentPdfDoc.copyPages(importedPdfDoc, pageIndices);
          copiedPages.forEach((copiedPage, i) => {
            currentPdfDoc.addPage(copiedPage);
            currentSchemas.push([]); // Add empty schema for the new page
            currentPagesMeta.push({
              id: generateId(),
              name: `${file.name} (Page ${i + 1})`,
            });
          });
        }        
        
        // Ensure all pages have content streams before saving
        const pageCount = currentPdfDoc.getPageCount();
        for (let i = 0; i < pageCount; i++) {
          const page = currentPdfDoc.getPage(i);
          // Add invisible text to ensure page has content stream
          page.drawText(' ', { x: 0, y: 0, size: 1, opacity: 0 });
        }
        
        const mergedPdfBytes = await currentPdfDoc.save();
        setTemplate({ basePdf: mergedPdfBytes, schemas: currentSchemas });
        setPagesMeta(currentPagesMeta);
        toast.success(`Added ${files.length} PDF(s) as new pages`);
      } catch (error: any) {
        console.error('Error adding PDF files:', error);
        toast.error(`Failed to import PDF(s): ${error.message}`);
      } finally {
        setIsProcessing(false);
        if (pdfFileInputRef.current) pdfFileInputRef.current.value = '';
      }
    },
    [template, pagesMeta],
  );

  const handleDeletePage = useCallback(
    async (pageIndex: number) => {
      if (pagesMeta.length <= 1) {
        toast.warn('Cannot delete the last page. Add another page or change this one.');
        return;
      }
      setIsProcessing(true);
      try {
        let newBasePdf: BasePdf = template.basePdf;
        let newSchemas = cloneDeep(template.schemas);
        let newPagesMeta = cloneDeep(pagesMeta);

        newSchemas.splice(pageIndex, 1);
        newPagesMeta.splice(pageIndex, 1);
        if (newBasePdf !== BLANK_PDF) {
          if (typeof newBasePdf === 'string') {
            const pdfDoc = await PDFDocument.load(
              Uint8Array.from(atob(newBasePdf.split(',')[1]), (c) => c.charCodeAt(0)),
            );
            if (pageIndex < pdfDoc.getPageCount()) {
              pdfDoc.removePage(pageIndex);
              newBasePdf = await pdfDoc.save();
            } else {
              console.warn('Page index out of bounds for PDF document during delete.');
            }
          } else if (newBasePdf instanceof Uint8Array) {
            const pdfDoc = await PDFDocument.load(newBasePdf);
            if (pageIndex < pdfDoc.getPageCount()) {
              pdfDoc.removePage(pageIndex);
              newBasePdf = await pdfDoc.save();
            } else {
              console.warn('Page index out of bounds for PDF document during delete.');
            }
          }
          // If it's an object with dimensions, we can't remove physical pages
        }
        setTemplate({ basePdf: newBasePdf, schemas: newSchemas });
        setPagesMeta(newPagesMeta);
        toast.success('Page deleted');
      } catch (error: any) {
        console.error('Error deleting page:', error);
        toast.error(`Failed to delete page: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [template, pagesMeta],
  );

  const handleMovePage = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || toIndex < 0 || toIndex >= pagesMeta.length) return;
      setIsProcessing(true);
      try {
        const newSchemas = cloneDeep(template.schemas);
        const newPagesMeta = cloneDeep(pagesMeta);

        // Reorder schemas
        const [movedSchema] = newSchemas.splice(fromIndex, 1);
        newSchemas.splice(toIndex, 0, movedSchema);

        // Reorder pagesMeta
        const [movedMeta] = newPagesMeta.splice(fromIndex, 1);
        newPagesMeta.splice(toIndex, 0, movedMeta);

        let finalBasePdf: BasePdf = template.basePdf;
        if (template.basePdf !== BLANK_PDF) {
          let pdfBytes: Uint8Array;
          if (typeof template.basePdf === 'string') {
            pdfBytes = Uint8Array.from(atob(template.basePdf.split(',')[1]), (c) =>
              c.charCodeAt(0),
            );
          } else if (template.basePdf instanceof Uint8Array) {
            pdfBytes = template.basePdf;
          } else {
            // If it's an object with dimensions, we can't reorder physical pages
            setTemplate((prev) => ({ ...prev, schemas: newSchemas }));
            setPagesMeta(newPagesMeta);
            toast.success('Page reordered (schemas and UI only).');
            setIsProcessing(false);
            return;
          }

          const originalPdfDoc = await PDFDocument.load(pdfBytes);
          const numOriginalPages = originalPdfDoc.getPageCount();
          if (newPagesMeta.length !== numOriginalPages) {
            toast.error(
              'Page metadata and PDF page count mismatch. Cannot reorder physical pages reliably. Schemas reordered only.',
            );
            setTemplate((prev) => ({ ...prev, schemas: newSchemas }));
            setPagesMeta(newPagesMeta);
            setIsProcessing(false);
            return;
          }

          // Create an array of original 0-based indices [0, 1, ..., N-1]
          const originalPageIndices = Array.from({ length: numOriginalPages }, (_, i) => i);

          // Apply the same move operation to originalPageIndices to get the new order of original page numbers
          const [movedOriginalPageIndexValue] = originalPageIndices.splice(fromIndex, 1);
          originalPageIndices.splice(toIndex, 0, movedOriginalPageIndexValue);
          // Now, originalPageIndices contains the original page indices in the desired new order.

          const newPdfDoc = await PDFDocument.create();
          // copyPages expects an array of 0-based indices of pages to copy from originalPdfDoc
          const pagesToCopyInOrder = await newPdfDoc.copyPages(originalPdfDoc, originalPageIndices);
          pagesToCopyInOrder.forEach((page) => newPdfDoc.addPage(page));

          finalBasePdf = await newPdfDoc.save();

          setTemplate({ basePdf: finalBasePdf, schemas: newSchemas });
          setPagesMeta(newPagesMeta);
          toast.success('Page reordered physically and in UI.');
        } else {
          // BLANK_PDF case
          setTemplate((prev) => ({ ...prev, schemas: newSchemas }));
          setPagesMeta(newPagesMeta);
          toast.success('Page reordered (schemas and UI).');
        }
      } catch (error: any) {
        console.error('Error reordering page:', error);
        toast.error(`Failed to reorder page: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    }, 
    [template, pagesMeta],
  );

  // --- PDF Generation and Template Save/Load ---
  const handleGenerateFinalPDF = useCallback(async () => {
    if (!designer.current) {
      toast.error('Designer not initialized');
      return;
    }
    setIsProcessing(true);

    try {
      const template = designer.current.getTemplate();
      const options = designer.current.getOptions();
      const inputs = getInputFromTemplate(template);
      const font = getFontsData();

      // Ensure basePdf is in base64 format for generation
      let processedTemplate = { ...template };
      if (template.basePdf instanceof Uint8Array) {
        // Convert Uint8Array to base64 string
        const arr = Array.from(template.basePdf);
        const btoaSafeString = arr.map((byte) => String.fromCharCode(byte)).join('');
        processedTemplate.basePdf = `data:application/pdf;base64,${btoa(btoaSafeString)}`;
      }      
      
      // Process the PDF to ensure all pages have content streams
      if (processedTemplate.basePdf !== BLANK_PDF) {
        try {
          processedTemplate.basePdf = await ensurePageContents(processedTemplate.basePdf);
        } catch (validationError) {
          console.error('PDF validation error:', validationError);
          console.error('Continuing with generation anyway, but errors may occur');
        }
      }
      
      // Apply the content stream fix to ensure all pages have Contents      
      // Use the original generate function from @pdfme/generator      
      const pdf = await generate({
        template: processedTemplate,
        inputs,
        options: {
          font,
          lang: options.lang,
          title: 'pdfme',
        },
        plugins: getPlugins(),
      });

      // Create a new Blob directly from the buffer
      const blob = new Blob([new Uint8Array(pdf.buffer as ArrayBuffer)], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob));
      toast.success('PDF generated successfully!');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      console.error('Error stack:', error.stack);
      
      let errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('MissingPageContentsEmbeddingError')) {
        errorMessage = 'Missing page contents. This may be due to blank pages in the PDF.';
        console.error('PDF structure issue detected: Missing Contents entry in a page');
        toast.error(`PDF generation failed: ${errorMessage}`);
      } else {
        toast.error(`Failed to generate PDF: ${errorMessage}`);
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSaveUserTemplate = useCallback(() => {
    if (!designer.current) {
      toast.error('Designer not initialized.');
      return;
    }
    const currentFullTemplate = designer.current.getTemplate();
    let basePdfToSave: string | BasePdf = currentFullTemplate.basePdf;
    if (currentFullTemplate.basePdf instanceof Uint8Array) {
      // Convert Uint8Array to base64 string for JSON serialization
      const arr = Array.from(currentFullTemplate.basePdf);
      const btoaSafeString = arr.map((byte) => String.fromCharCode(byte)).join('');
      basePdfToSave = `data:application/pdf;base64,${btoa(btoaSafeString)}`;
    }

    const serializableTemplate: Template = {
      ...currentFullTemplate,
      basePdf: basePdfToSave,
    };

    const dataToSave = {
      template: serializableTemplate,
      pagesMeta: pagesMeta, // Save pagesMeta alongside
    };

    downloadJsonFile(dataToSave, 'pdfme-multipage-template');
    if (onSave) {
      onSave(currentFullTemplate, pagesMeta); // Callback with original template if needed
    }
    toast.success('Template saved!');
  }, [pagesMeta, onSave]);

  const handleLoadUserTemplate = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || !event.target.files[0]) return;
      setIsProcessing(true);
      try {
        const file = event.target.files[0];
        const jsonStr = (await readFile(file, 'text')) as string;
        const loadedData = JSON.parse(jsonStr); // Parse first, then check structure

        let rawTemplateObject: Template;
        let rawPagesMeta: PageMeta[] | undefined = undefined;

        // Check if the loaded data is in the { template: Template, pagesMeta: PageMeta[] } structure
        if (
          loadedData &&
          typeof loadedData === 'object' &&
          'template' in loadedData &&
          'pagesMeta' in loadedData
        ) {
          rawTemplateObject = loadedData.template as Template;
          rawPagesMeta = loadedData.pagesMeta as PageMeta[];
        } else if (
          loadedData &&
          typeof loadedData === 'object' &&
          'schemas' in loadedData &&
          'basePdf' in loadedData
        ) {
          // Assume loadedData itself is the Template object
          rawTemplateObject = loadedData as Template;
        } else {
          throw new Error(
            'Invalid template file structure. Expected either a Template object or { template: Template, pagesMeta: PageMeta[] }.',
          );
        }

        // This check might be redundant given the logic above, but good for safety.
        if (!rawTemplateObject) {
          throw new Error('Could not extract template from file.');
        }

        let loadedBasePdf = rawTemplateObject.basePdf;
        if (
          typeof loadedBasePdf === 'string' &&
          loadedBasePdf.startsWith('data:application/pdf;base64,')
        ) {
          const base64Data = loadedBasePdf.split(',')[1];
          const byteString = atob(base64Data);
          const byteArray = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) {
            byteArray[i] = byteString.charCodeAt(i);
          }
          loadedBasePdf = byteArray;
        }

        let finalSchemas: Schema[][];
        const loadedSchemasProperty = rawTemplateObject.schemas;
        if (
          typeof loadedSchemasProperty === 'object' &&
          loadedSchemasProperty !== null &&
          !Array.isArray(loadedSchemasProperty)
        ) {
          // Case: rawTemplateObject.schemas is a single Schema object (map for one page)
          // e.g., { "text1": { type: "text", ... }, "image1": { type: "image", ... } }
          finalSchemas = [loadedSchemasProperty as any];
        } else if (Array.isArray(loadedSchemasProperty)) {
          // Case: rawTemplateObject.schemas is an array.
          // This should be Schema[][] = [SchemaMap1, SchemaMap2, ...]
          // Or it could be an empty array [], or an array like [[]] for blank pages.
          if (loadedSchemasProperty.length === 0) {
            finalSchemas = [[]]; // Treat empty array as one blank page schema
          } else {
            // Assume it's already Schema[][] if it's an array of objects (Schema maps) or an array of empty arrays (blank pages)
            finalSchemas = loadedSchemasProperty as Schema[][];
          }
        } else {
          // Schemas property was undefined, null, or primitive
          finalSchemas = [[]]; // Default to one blank page schema
        }

        const newTemplate: Template = {
          ...rawTemplateObject,
          basePdf: loadedBasePdf,
          schemas: finalSchemas,
        };

        checkTemplate(newTemplate); // Validate the structure
        setTemplate(newTemplate);
        
        // Generate pagesMeta based on the final newTemplate.schemas (which is Schema[][])
        // If rawPagesMeta was loaded from a file that included it, use that.
        const newPagesMeta =
          rawPagesMeta || newTemplate.schemas.map((_, i) => createInitialPageMeta(i));
        setPagesMeta(newPagesMeta);

        if (onLoad) {
          onLoad(newTemplate, newPagesMeta);
        }
        toast.success('Template loaded successfully!');
      } catch (error: any) {
        console.error('Error loading template:', error);
        toast.error(`Failed to load template: ${error.message}`);
      } finally {
        setIsProcessing(false);
        if (templateFileInputRef.current) templateFileInputRef.current.value = '';
      }
    },
    [onLoad],
  );
  
  // Cleanup designer on component unmount
  useEffect(() => {
    return () => {
      designer.current?.destroy();
      designer.current = null;
    };
  }, []);
  
  // Helper function to ensure all pages in a PDF document have content streams
  /**
   * Ensures all pages in a PDF have content streams to prevent MissingPageContentsEmbeddingError
   * @param basePdf The PDF to process
   * @returns The processed PDF with content streams on all pages
   */
  const ensurePageContents = async (basePdf: BasePdf): Promise<BasePdf> => {
    if (basePdf === BLANK_PDF) return basePdf;
    
    try {
      let pdfBytes: Uint8Array;
      
      if (typeof basePdf === 'string') {
        if (basePdf.startsWith('data:application/pdf;base64,')) {
          pdfBytes = Uint8Array.from(atob(basePdf.split(',')[1]), c => c.charCodeAt(0));
        } else {
          return basePdf; // Not a base64 PDF
        }
      } else if (basePdf instanceof Uint8Array) {
        pdfBytes = basePdf;
      } else {
        return basePdf; // Not a PDF we can process
      }
      
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      
      // Add minimal content to each page to ensure Contents entry exists
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        // Add invisible text to ensure page has content stream
        page.drawText(' ', { x: 0, y: 0, size: 1, opacity: 0 });
      }
      
      // Return the updated PDF
      return await pdfDoc.save();
    } catch (error) {
      console.error('Error ensuring page contents:', error);
      return basePdf; // Return original on error
    }
  };

  // Placeholder for JSX structure, will be refined
  return (
    <div className={`flex h-full ${className}`}>
      {/* Left Sidebar: Page Thumbnails & Controls */}
      <div className="w-72 border-r border-gray-200 bg-gray-50 flex flex-col p-3 space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Pages ({pagesMeta.length})</h2>

        <button
          onClick={handleAddBlankPage}
          disabled={isProcessing || isInitializing}
          className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Add Blank Page
        </button>

        <label className="w-full px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 cursor-pointer text-center disabled:opacity-50">
          Import PDF(s)
          <input
            ref={pdfFileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleAddPdfFiles}
            className="hidden"
            disabled={isProcessing || isInitializing}
          />
        </label>
        
        <label className="w-full px-3 py-2 bg-teal-500 text-white text-sm rounded hover:bg-teal-600 cursor-pointer text-center disabled:opacity-50">
          Import Templates
          <input
            ref={templateImportRef}
            type="file"
            accept="application/json"
            multiple
            onChange={(e) => handleAddTemplateFiles(e, template, pagesMeta, setTemplate, setPagesMeta, setIsProcessing)}
            className="hidden"
            disabled={isProcessing || isInitializing}
          />
        </label>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {pagesMeta?.map((page, index) => (
            <div
              key={page.id}
              className="p-2 border rounded bg-white shadow hover:shadow-md flex justify-between items-center"
            >
              <span className="text-sm truncate" title={page.name}>
                {index + 1}. {page.name}
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleMovePage(index, index - 1)}
                  disabled={index === 0 || isProcessing}
                  className="text-xs p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  title="Move Up"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMovePage(index, index + 1)}
                  disabled={index === pagesMeta.length - 1 || isProcessing}
                  className="text-xs p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  title="Move Down"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleDeletePage(index)}
                  disabled={pagesMeta.length <= 1 || isProcessing}
                  className="text-xs p-1 text-red-500 hover:bg-red-100 rounded disabled:opacity-30"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-2 pt-3 border-t">
          <button
            onClick={handleSaveUserTemplate}
            disabled={isProcessing || isInitializing}
            className="w-full px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
          >
            Save Template
          </button>
          <label className="w-full px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 cursor-pointer text-center block disabled:opacity-50">
            Load Template
            <input
              ref={templateFileInputRef}
              type="file"
              accept="application/json"
              onChange={handleLoadUserTemplate}
              className="hidden"
              disabled={isProcessing || isInitializing}
            />
          </label>
        </div>
      </div>

      {/* Main Content Area: Designer & Toolbar */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-100 border-b border-gray-300 p-2 flex justify-end items-center">
          <button
            onClick={handleGenerateFinalPDF}
            disabled={isProcessing || isInitializing || template.schemas.length === 0}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isProcessing ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>

        {isInitializing && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Initializing Editor...
          </div>
        )}
        <div
          ref={designerRef}
          className={`flex-1 overflow-auto ${isInitializing ? 'hidden' : ''}`}
          style={{ position: 'relative' }} // Needed for designer's internal absolute positioning
        />
      </div>
    </div>
  );
}

export default MultiPageTemplateEditor;
