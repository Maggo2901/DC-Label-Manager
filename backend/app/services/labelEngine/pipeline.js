/**
 * Label Engine Pipeline
 * Unified PDF Generation Logic
 */
const { createPdfDocument, setPdfDownloadHeaders, addMmPage } = require('../../shared/pdfService');
const { getLayout, getTemplate: getRegistryTemplate } = require('./registry');
const templatesService = require('../../../modules/templates/templates.service');

/**
 * Stream a Label PDF to the response
 * @param {Object} res - Express response object
 * @param {Array} items - Data rows
 * @param {Object} templateOrId - Template object or ID
 * @param {string} filename - Download filename
 */
const { NotFoundError } = require('../../http/errors');

/**
 * Stream a Label PDF to the response
 * @param {Object} res - Express response object
 * @param {Array} items - Data rows
 * @param {Object} templateOrId - Template object or ID
 * @param {string} filename - Download filename
 * @param {Function} next - Express next middleware
 * @param {Object} options - Optional stream lifecycle hooks
 */
function streamLabelPdf(res, items, templateOrId, filename = 'labels.pdf', next, options = {}) {
  // If next is not provided, we can't safely handle async stream errors in a way that Express catches automatically strictly.
  // But we can still try-catch sync errors.
  const onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;
  let streamFailed = false;
  
  let template = null;
  
  try {
      if (typeof templateOrId === 'object' && templateOrId !== null) {
          template = templateOrId;
      } else if (typeof templateOrId === 'number' || (typeof templateOrId === 'string' && !isNaN(templateOrId))) {
          // Try ID (DB)
          template = templatesService.getById(templateOrId);
      } 
      
      if (!template && typeof templateOrId === 'string') {
         // Try Registry (Legacy String ID)
         template = getRegistryTemplate(templateOrId);
      }
    
      if (!template) {
        throw new NotFoundError(`Template not found: ${templateOrId}`, 'TEMPLATE_NOT_FOUND');
      }
    
      const layout = getLayout(template.layoutKey);
      if (!layout) {
        throw new NotFoundError(`Layout not found: ${template.layoutKey}`, 'LAYOUT_NOT_FOUND');
      }
    
      const renderer = layout.renderer;
      const pageConfig = template.pageConfig || layout.pageDefaults;
      // Setup Response
      setPdfDownloadHeaders(res, filename);
      
      // Create PDF
      const doc = createPdfDocument();
      doc.pipe(res);

      if (onComplete) {
        res.once('finish', () => {
          if (streamFailed) {
            return;
          }

          try {
            onComplete();
          } catch (hookErr) {
            console.error('[LabelEngine] onComplete hook failed:', hookErr);
          }
        });
      }
    
      // Error Handling
      doc.on('error', (err) => {
        streamFailed = true;
        console.error('[LabelEngine] Stream Error:', err);
        // If headers not sent, we can delegate to next if available
        if (!res.headersSent && next) {
             next(err);
        } else {
             // If headers sent, we can't really do much but end stream
             // Standard practice might be to abort connection
             res.end(); 
        }
      });
    
      // Render loop
      items.forEach((item, index) => {
            try {
                renderer(doc, item, pageConfig);
            } catch (renderErr) {
                console.error(`[LabelEngine] Error rendering item ${index}:`, renderErr);
                // Continue - partial success is better than total failure for batch
                doc.addPage({ size: 'A4' }); // Fallback page
                doc.text(`Error rendering item ${index + 1}: ${renderErr.message}`);
            }
      });
      
      doc.end();

  } catch (err) {
      if (next) {
          next(err);
      } else {
          console.error('[LabelEngine] Critical Sync Error without next:', err);
      }
  }
}

module.exports = {
  streamLabelPdf
};
