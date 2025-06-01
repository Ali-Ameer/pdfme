// Implementation of the handleAddTemplateFiles function for MultiPageTemplateEditor.tsx
import React from 'react';
import { toast } from 'react-toastify';
import { Template, Schema, cloneDeep, BLANK_PDF, BasePdf } from '@pdfme/common';
import { readFile } from '../helper';

// Interface for page metadata used in the UI (e.g., sidebar)
interface PageMeta {
  id: string;
  name: string;
  thumbnailSrc?: string; // Base64 encoded thumbnail image
}

// Simple ID generator if not available from helper
const generateId = () => Math.random().toString(36).substr(2, 9);

const handleAddTemplateFiles = async (e: React.ChangeEvent<HTMLInputElement>, 
  template: Template, 
  pagesMeta: PageMeta[], 
  setTemplate: React.Dispatch<React.SetStateAction<Template>>, 
  setPagesMeta: React.Dispatch<React.SetStateAction<PageMeta[]>>, 
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>) => {
  
  if (!e.target.files || e.target.files.length === 0) return;
  setIsProcessing(true);
  
  try {
    const files = Array.from(e.target.files);
    let currentTemplate = cloneDeep(template);
    let currentPagesMeta = cloneDeep(pagesMeta);
    
    for (const file of files) {
      try {
        const jsonStr = (await readFile(file, 'text')) as string;
        const loadedData = JSON.parse(jsonStr);
        
        // Determine if this is a template or a template+pagesMeta structure
        let templateToImport: Template;
        let pageMetaToImport: PageMeta[] | undefined = undefined;
        
        if (
          loadedData &&
          typeof loadedData === 'object' &&
          'template' in loadedData &&
          'pagesMeta' in loadedData
        ) {
          templateToImport = loadedData.template as Template;
          pageMetaToImport = loadedData.pagesMeta as PageMeta[];
        } else if (
          loadedData &&
          typeof loadedData === 'object' &&
          'schemas' in loadedData &&
          'basePdf' in loadedData
        ) {
          templateToImport = loadedData as Template;
        } else {
          throw new Error(`Invalid template format in file: ${file.name}`);
        }
        
        // Process the basePdf if it's a string
        if (
          typeof templateToImport.basePdf === 'string' && 
          templateToImport.basePdf.startsWith('data:application/pdf;base64,')
        ) {
          const base64Data = templateToImport.basePdf.split(',')[1];
          const byteString = atob(base64Data);
          const byteArray = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) {
            byteArray[i] = byteString.charCodeAt(i);
          }
          templateToImport.basePdf = byteArray;
        }
        
        // Add the schemas from imported template as new pages
        if (templateToImport.schemas && Array.isArray(templateToImport.schemas)) {
          // Normalize schemas to ensure it's Schema[][]
          let schemasToImport: Schema[][] = [];
          
          if (templateToImport.schemas.length > 0) {
            if (Array.isArray(templateToImport.schemas[0])) {
              // It's already Schema[][]
              schemasToImport = templateToImport.schemas as Schema[][];
            } else {
              // It's a single page Schema[], wrap it
              schemasToImport = [templateToImport.schemas as any];
            }
          }
          
          // Add each schema page
          for (let i = 0; i < schemasToImport.length; i++) {
            const pageSchema = schemasToImport[i];
            currentTemplate.schemas.push(pageSchema);
            
            // Add page metadata
            let pageName = '';
            if (pageMetaToImport && i < pageMetaToImport.length) {
              pageName = pageMetaToImport[i].name;
            } else {
              pageName = `${file.name} (Page ${i + 1})`;
            }
            
            currentPagesMeta.push({
              id: generateId(),
              name: pageName,
            });
          }
          
          // If this is the first import and we were using BLANK_PDF, use imported basePdf
          if (
            currentTemplate.basePdf === BLANK_PDF && 
            currentTemplate.schemas.length <= schemasToImport.length + 1 &&
            templateToImport.basePdf !== BLANK_PDF
          ) {
            currentTemplate.basePdf = templateToImport.basePdf;
          }
        }
      } catch (fileError) {
        console.error(`Error processing template file ${file.name}:`, fileError);
        toast.error(`Failed to process ${file.name}: ${fileError.message}`);
        // Continue with the next file
      }
    }
    
    // Update the component state
    setTemplate(currentTemplate);
    setPagesMeta(currentPagesMeta);
    toast.success(`Added template(s) as pages`);
  } catch (error: any) {
    console.error('Error importing template(s):', error);
    toast.error(`Failed to import template(s): ${error.message}`);
  } finally {
    setIsProcessing(false);
    if (e.target) e.target.value = '';
  }
};

export default handleAddTemplateFiles;
