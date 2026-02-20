const db = require('../../db');
const { getLayout } = require('../../app/services/labelEngine/registry');
const { BadRequestError, NotFoundError, ConflictError } = require('../../app/http/errors');

/**
 * Maps a raw SQLite template row (snake_case) to the API format (camelCase + parsed JSON).
 */
function mapTemplateRow(t) {
  return {
    ...t,
    moduleType: t.module_type,
    layoutKey: t.layout_key,
    pageConfig: t.page_config ? JSON.parse(t.page_config) : {},
    dataSchema: t.data_schema ? JSON.parse(t.data_schema) : {},
    renderConfig: t.render_config ? JSON.parse(t.render_config) : null,
    isDefault: Boolean(t.is_default)
  };
}

const templatesService = {
  getAll(moduleType) {
    let stmt;
    let rows;
    if (moduleType) {
        stmt = db.prepare('SELECT * FROM label_templates WHERE module_type = ? ORDER BY name ASC');
        rows = stmt.all(moduleType);
    } else {
        stmt = db.prepare('SELECT * FROM label_templates ORDER BY name ASC');
        rows = stmt.all();
    }
    
    return rows.map(mapTemplateRow);
  },

  getById(id) {
    const template = db.prepare('SELECT * FROM label_templates WHERE id = ?').get(id);
    if (!template) return null;
    return mapTemplateRow(template);
  },

  getByLayout(layoutKey, moduleType) {
    const template = db.prepare('SELECT * FROM label_templates WHERE layout_key = ? AND module_type = ? LIMIT 1').get(layoutKey, moduleType);
    if (!template) return null;
    return mapTemplateRow(template);
  },

  getDefault(moduleType) {
    const template = db.prepare('SELECT * FROM label_templates WHERE module_type = ? AND is_default = 1').get(moduleType);
    if (!template) {
        // Fallback: get ANY template for this module
        const any = db.prepare('SELECT * FROM label_templates WHERE module_type = ? LIMIT 1').get(moduleType);
        if (any) return mapTemplateRow(any);
        return null;
    }
    return mapTemplateRow(template);
  },

  create({ moduleType, name, layoutKey, pageConfig, dataSchema, renderConfig }) {
    // Validate Layout Key
    if (layoutKey && !getLayout(layoutKey)) {
        throw new BadRequestError(`Invalid layoutKey: ${layoutKey}`, 'INVALID_LAYOUT_KEY');
    }

    const type = moduleType || 'cable';
    const result = db.prepare(
        'INSERT INTO label_templates (module_type, name, layout_key, page_config, data_schema, render_config, is_default) VALUES (?, ?, ?, ?, ?, ?, 0)'
    ).run(type, name, layoutKey, JSON.stringify(pageConfig), JSON.stringify(dataSchema), renderConfig ? JSON.stringify(renderConfig) : null);
    
    return { 
        id: result.lastInsertRowid, 
        module_type: type, 
        name, 
        layout_key: layoutKey,
        pageConfig, 
        dataSchema,
        renderConfig: renderConfig || null,
        isDefault: false 
    };
  },

  update(id, { name, layoutKey, pageConfig, dataSchema, renderConfig }) {
     // Validate Layout Key if provided
    if (layoutKey && !getLayout(layoutKey)) {
        throw new BadRequestError(`Invalid layoutKey: ${layoutKey}`, 'INVALID_LAYOUT_KEY');
    }

    // Dynamically build update query based on provided fields
    const updates = [];
    const params = [];
    
    if (name) { updates.push('name = ?'); params.push(name); }
    if (layoutKey) { updates.push('layout_key = ?'); params.push(layoutKey); }
    if (pageConfig) { updates.push('page_config = ?'); params.push(JSON.stringify(pageConfig)); }
    if (dataSchema) { updates.push('data_schema = ?'); params.push(JSON.stringify(dataSchema)); }
    if (renderConfig !== undefined) { updates.push('render_config = ?'); params.push(renderConfig ? JSON.stringify(renderConfig) : null); }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    const sql = `UPDATE label_templates SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(sql).run(...params);
    return result.changes > 0;
  },

  delete(id) {
    const template = db.prepare('SELECT is_default, module_type FROM label_templates WHERE id = ?').get(id);
    if (!template) return false; // Controller handles 404
    
    if (template.is_default) {
        throw new ConflictError("Cannot delete the default template. Please set another template as default first.", 'CANNOT_DELETE_DEFAULT');
    }
    
    const count = db.prepare('SELECT count(*) as c FROM label_templates WHERE module_type = ?').get(template.module_type).c;
    if (count <= 1) {
        throw new ConflictError("Cannot delete the last remaining template for this module.", 'CANNOT_DELETE_LAST_TEMPLATE');
    }

    return db.prepare('DELETE FROM label_templates WHERE id = ?').run(id).changes > 0;
  },

  setDefault(id) {
    const template = db.prepare('SELECT module_type FROM label_templates WHERE id = ?').get(id);
    if (!template) return false;

    const transaction = db.transaction(() => {
      // Unset default for all in this module
      db.prepare('UPDATE label_templates SET is_default = 0 WHERE module_type = ?').run(template.module_type);
      // Set default for this one
      const result = db.prepare('UPDATE label_templates SET is_default = 1 WHERE id = ?').run(id);
      return result.changes > 0;
    });
    return transaction();
  },
  seedDefaults() {
    const modules = ['cable', 'rack'];
    let seeded = false;

    const transaction = db.transaction(() => {
        for (const type of modules) {
             const count = db.prepare('SELECT count(*) as c FROM label_templates WHERE module_type = ?').get(type).c;
             if (count === 0) {
                 console.log(`[Templates] No templates found for module '${type}'. Seeding defaults...`);
                 // Get defaults from registry or hardcoded? 
                 // We don't have a registry of defaults anymore in init.js... 
                 // We need to define them here or move the defaults array from db.js (which was only for initial seed) to here.
                 // For now, let's look at what db.js used or define minimal safe defaults.
                 
                 let defaults = [];
                 if (type === 'cable') {
                     defaults = [
                        { name: 'Standard Cable Label', layout_key: 'layout-a', is_default: 1, page_config: { widthMm: 38.1, heightMm: 101.6 }, data_schema: {} },
                        { name: 'Standard Cable Label + QR', layout_key: 'layout-a-qr', is_default: 0, page_config: { widthMm: 38.1, heightMm: 101.6 }, data_schema: {} },
                        { name: 'Cable Alternate (Layout B)', layout_key: 'layout-b', is_default: 0, page_config: { widthMm: 38.1, heightMm: 101.6 }, data_schema: {} }
                     ];
                 } else if (type === 'rack') {
                     defaults = [
                        { name: 'Rack Standard', layout_key: 'rack-standard', is_default: 1, page_config: { widthMm: 88, heightMm: 25 }, data_schema: {} }
                     ];
                 }

                 const insert = db.prepare('INSERT INTO label_templates (module_type, name, layout_key, page_config, data_schema, is_default) VALUES (?, ?, ?, ?, ?, ?)');
                 for (const d of defaults) {
                     insert.run(type, d.name, d.layout_key, JSON.stringify(d.page_config), JSON.stringify(d.data_schema), d.is_default);
                 }
                 seeded = true;
             } else {
                 // Check if any default is set
                 const def = db.prepare('SELECT id FROM label_templates WHERE module_type = ? AND is_default = 1').get(type);
                 if (!def) {
                     console.log(`[Templates] No default found for module '${type}'. Setting first available as default.`);
                     // Set the first one as default
                     const first = db.prepare('SELECT id FROM label_templates WHERE module_type = ? LIMIT 1').get(type);
                     if (first) {
                         db.prepare('UPDATE label_templates SET is_default = 1 WHERE id = ?').run(first.id);
                         seeded = true;
                     }
                 }
             }
        }
    });
    
    transaction();
    return seeded;
  }
};

module.exports = templatesService;
