const PDFDocument = require('pdfkit');

const MM_TO_PT = 2.83465;

function mmToPt(mm) {
  return Number(mm || 0) * MM_TO_PT;
}

function createPdfDocument() {
  return new PDFDocument({ autoFirstPage: false, margin: 0 });
}

function addMmPage(doc, page) {
  doc.addPage({
    size: [mmToPt(page.widthMm), mmToPt(page.heightMm)],
    margin: 0
  });
}

function setPdfDownloadHeaders(res, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

module.exports = {
  mmToPt,
  createPdfDocument,
  addMmPage,
  setPdfDownloadHeaders
};
