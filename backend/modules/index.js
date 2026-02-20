const cableRoutes = require('./cable/cable.routes');
const templatesRoutes = require('./templates/templates.routes');
const templateLibraryRoutes = require('./template-library/templateLibrary.routes');
const logisticsRoutes = require('./logistics/logistics.routes');
const toolsRoutes = require('./tools/tools.routes');
const ptouchRoutes = require('./ptouch/ptouch.routes');
const draftsRoutes = require('../drafts/drafts.routes');
const historyRoutes = require('../history/history.routes');
const healthRoutes = require('./health/health.routes');
const docTemplatesRoutes = require('./doc-templates/docTemplates.routes');

function registerModules(app) {
  app.use('/api/health', healthRoutes);
  app.use('/api/cable', cableRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/template-library', templateLibraryRoutes);
  app.use('/api/logistics', logisticsRoutes);
  app.use('/api/ptouch', ptouchRoutes);
  app.use('/api/tools', toolsRoutes);
  app.use('/api/draft', draftsRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api/print-history', require('../history/printHistory.routes'));
  app.use('/api/doc-templates', docTemplatesRoutes);
}

module.exports = {
  registerModules
};
