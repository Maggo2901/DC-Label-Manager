const templatesService = require('./templates.service');
const { NotFoundError, BadRequestError } = require('../../app/http/errors');

const templatesController = {
  getAll(req, res, next) {
    try {
      const { moduleType } = req.query;
      const templates = templatesService.getAll(moduleType);
      res.json(templates);
    } catch (error) {
      next(error);
    }
  },

  create(req, res, next) {
    try {
      const { moduleType, name, layoutKey, pageConfig, dataSchema } = req.body;
      if (!name || !layoutKey || !pageConfig || !dataSchema) {
        throw new BadRequestError('Name, layoutKey, pageConfig, and dataSchema are required', 'MISSING_FIELDS');
      }
      const newItem = templatesService.create({ moduleType, name, layoutKey, pageConfig, dataSchema });
      res.status(201).json(newItem);
    } catch (error) {
       next(error);
    }
  },

  update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, layoutKey, pageConfig, dataSchema } = req.body;
      const success = templatesService.update(id, { name, layoutKey, pageConfig, dataSchema });
      if (!success) throw new NotFoundError(`Template '${id}' not found`, 'TEMPLATE_NOT_FOUND');
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  delete(req, res, next) {
    try {
      const { id } = req.params;
      const success = templatesService.delete(id);
      if (!success) throw new NotFoundError(`Template '${id}' not found`, 'TEMPLATE_NOT_FOUND');
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  setDefault(req, res, next) {
    try {
      const { id } = req.params;
      const success = templatesService.setDefault(id);
      if (!success) throw new NotFoundError(`Template '${id}' not found`, 'TEMPLATE_NOT_FOUND');
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = templatesController;
