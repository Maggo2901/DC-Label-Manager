/**
 * Shared layout wrapper for module pages.
 * Ensures every module fills the full available viewport height consistently.
 */
const ModulePageLayout = ({ children }) => (
  <div className="flex h-full min-h-0 flex-col">
    {children}
  </div>
);

/**
 * Content area – fills remaining height below any header.
 * Applies flex-1 min-h-0 overflow-hidden so children can scroll independently.
 */
ModulePageLayout.Content = ({ children, className = '' }) => (
  <div className={`flex-1 min-h-0 overflow-hidden ${className}`.trim()}>
    {children}
  </div>
);

ModulePageLayout.displayName = 'ModulePageLayout';

export default ModulePageLayout;
