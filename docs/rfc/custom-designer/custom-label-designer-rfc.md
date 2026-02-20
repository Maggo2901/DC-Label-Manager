# RFC: Custom Label Designer (MVP v1)

- Status: Draft
- Last Updated: 2026-02-16

## 1. Summary
This RFC defines a **small, stable MVP** for a custom black/white label designer.

Focus for v1:
- Fixed label size (`38.1mm x 101.6mm`)
- Locked lower half (non-printable)
- Simple element editing in top printable zone
- JSON template save/load
- Preview + PDF generation from the same template

## 2. Explicit v1 Scope
Included element types only:
- `text`
- `variableText`
- `line`
- `rect`
- `arrow`

Included interactions:
- Add/select/move/resize/delete elements
- Basic property editing (position, size, text, font size, bold/italic, stroke/fill)
- Basic undo/redo (single stack)
- Optional simple grid snap (on/off)

## 3. Out of Scope for v1
- QR codes
- Barcodes
- Icons
- Rotation
- Expression bindings
- Layer panel
- Complex snapping/guides
- Advanced constraint system

## 4. Constraints and Invariants
- Physical label size is fixed:
  - `widthMm = 38.1`
  - `heightMm = 101.6`
- Printable area is top half only:
  - `printableTopMm = 0`
  - `printableBottomMm = 50.8`
- Lower half (`50.8..101.6`) is visually marked and not editable for printable elements.
- Coordinates in template are stored in millimeters.

## 5. Minimal Architecture

### 5.1 Frontend
New module/route:
- `#/custom-designer`

Main components:
- `CustomLabelDesignerModule`
- `DesignerToolbar`
- `DesignerCanvas`
- `DesignerPropertiesPanel`
- `DesignerPreviewPanel`

No layer panel in v1.

### 5.2 Backend
New module:
- `backend/modules/custom-designer`

Suggested files:
- `customDesigner.routes.js`
- `customDesigner.controller.js`
- `customDesigner.service.js`
- `customDesigner.validation.js`
- `customDesigner.renderer.js`

## 6. Template Format (v1)
Canonical schema:
- `docs/schemas/custom-label-template.schema.json`

Key fields:
- `templateId`, `name`, `schemaVersion`
- `page`, `zones`
- `elements[]`
- `metadata`

Element fields (minimal):
- `id`, `type`
- `xMm`, `yMm`, `widthMm`, `heightMm`
- `style`
- `binding`

Binding kinds (v1 only):
- `static`
- `field`

## 7. State Management (minimal)
Use simple local reducer/store for v1:
- `template`
- `selectedElementId`
- `history[]`
- `historyIndex`

No complex command framework required.

## 8. Rendering Parity
Rule:
- Preview and PDF must use the same template data model and same mm-based geometry.

Pipeline:
1. Validate template
2. Resolve `variableText` field bindings from `dataContext`
3. Render preview
4. Render PDF

## 9. API Contracts
OpenAPI file:
- `docs/api/custom-label-designer.openapi.yaml`

v1 endpoints:
- `GET /api/custom-templates`
- `POST /api/custom-templates`
- `GET /api/custom-templates/{templateId}`
- `PUT /api/custom-templates/{templateId}`
- `DELETE /api/custom-templates/{templateId}`
- `POST /api/custom-templates/{templateId}/preview`
- `POST /api/custom-templates/{templateId}/generate`
- `POST /api/custom-templates/validate`

## 10. Testing (v1)
Unit:
- schema validation
- bounds checks (printable zone)
- binding resolution (`static`/`field`)

Integration:
- create/update/get/delete template
- preview response
- pdf generation response

E2E:
- create template with basic elements
- save/reload template
- preview and generate PDF

## 11. MVP Acceptance Criteria
- Small stable editor works for black/white labels.
- Only v1 element set is supported.
- No rotation and no expression bindings.
- Lower half remains non-printable.
- Saved template can be previewed and PDF-generated.
