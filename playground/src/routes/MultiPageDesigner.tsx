import React, { useState } from 'react';
import { toast } from 'react-toastify';
import MultiPageTemplateEditor from '../components/MultiPageTemplateEditor';
import { NavBar, NavItem } from '../components/NavBar';
import ExternalButton from '../components/ExternalButton';

function MultiPageDesignerApp() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const navItems: NavItem[] = [
    {
      label: 'View Mode',
      content: (
        <select
          className="w-full border rounded px-2 py-1"
          value={isFullscreen ? 'fullscreen' : 'normal'}
          onChange={(e) => setIsFullscreen(e.target.value === 'fullscreen')}
        >
          <option value="normal">Normal</option>
          <option value="fullscreen">Fullscreen</option>
        </select>
      ),
    },
    {
      label: 'Help',
      content: (
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Add PDFs to create individual pages</p>
          <p>• Import templates to merge content</p>
          <p>• Drag pages to reorder them</p>
          <p>• Edit each page individually</p>
          <p>• Generate final combined PDF</p>
        </div>
      ),
    },
    {
      label: '',
      content: React.createElement(ExternalButton, {
        href: 'https://github.com/pdfme/pdfme/issues/new?template=feature_request.yml&title=Multi-Page%20Editor%20Feature',
        title: 'Request Feature',
      }),
    },
  ];
  const handleSaveTemplate = (template: any) => {
    // Save to localStorage or handle as needed
    localStorage.setItem('multiPageTemplate', JSON.stringify(template));
    toast.success('Template saved to browser storage');
  };

  const handleLoadTemplate = () => {
    toast.info('Template loaded successfully');
  };

  return (
    <div className="h-screen flex flex-col">
      {!isFullscreen && <NavBar items={navItems} />}
      
      <div className="flex-1 overflow-hidden">
        <MultiPageTemplateEditor
          onSave={handleSaveTemplate}
          onLoad={handleLoadTemplate}
          className="h-full"
        />
      </div>
    </div>
  );
}

export default MultiPageDesignerApp;