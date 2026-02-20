const { createPdfDocument, setPdfDownloadHeaders, addMmPage, mmToPt } = require('../../app/shared/pdfService');

const PAGE = { widthMm: 148, heightMm: 105 };

function renderTemplatePage(doc, template, payload) {
  addMmPage(doc, PAGE);

  doc.rect(0, 0, mmToPt(PAGE.widthMm), mmToPt(24)).fill(template.accentColor);

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text(template.name.toUpperCase(), mmToPt(8), mmToPt(7), {
    width: mmToPt(132)
  });

  doc.fillColor('#e2e8f0').font('Helvetica').fontSize(10).text(template.subtitle, mmToPt(8), mmToPt(17), {
    width: mmToPt(132)
  });

  doc.fillColor(template.textColor).font('Helvetica-Bold').fontSize(12).text('Location', mmToPt(8), mmToPt(34));
  doc.font('Helvetica').fontSize(15).text(payload.location, mmToPt(8), mmToPt(40), { width: mmToPt(132) });

  doc.font('Helvetica-Bold').fontSize(12).text('Requested By', mmToPt(8), mmToPt(60));
  doc.font('Helvetica').fontSize(13).text(payload.requestedBy, mmToPt(8), mmToPt(66), { width: mmToPt(132) });

  doc.font('Helvetica-Bold').fontSize(12).text('Note', mmToPt(8), mmToPt(80));
  doc.font('Helvetica').fontSize(11).text(payload.note || 'N/A', mmToPt(8), mmToPt(86), { width: mmToPt(132) });
}

function streamTemplateLibraryPdf({ res, template, payload, filename }) {
  setPdfDownloadHeaders(res, filename);
  const doc = createPdfDocument();
  doc.pipe(res);

  renderTemplatePage(doc, template, payload);

  doc.end();
}

module.exports = {
  PAGE,
  streamTemplateLibraryPdf
};
