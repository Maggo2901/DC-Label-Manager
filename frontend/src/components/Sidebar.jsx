import { ChevronRight } from 'lucide-react';

const Sidebar = ({ activeModuleId, modules, setActiveModuleId, isCollapsed, toggleSidebar }) => {
  return (
    <aside
      className={`
        relative
        h-full
        shrink-0
        min-h-0
        bg-slate-950 border-r border-slate-800/80 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]
        transition-all duration-300 ease-in-out
        flex flex-col
        ${isCollapsed ? 'w-20' : 'w-72'}
        hidden md:flex
      `}
    >
      <span className="pointer-events-none absolute bottom-0 left-0 top-0 w-[1px] bg-gradient-to-b from-indigo-500/40 via-transparent to-indigo-500/30" />

      <div className="flex-1 overflow-y-auto border-t border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 py-4 custom-scrollbar">
        <div className="space-y-8">
          <div>
            {!isCollapsed && (
              <h4 className="mb-2 mt-4 px-4 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500/80">
                DC Label Modules
              </h4>
            )}
            <ul className="space-y-1.5">
              {modules.map((item) => {
                const Icon = item.icon;
                const isActive = activeModuleId === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveModuleId(item.id)}
                      className={`
                        relative mx-2 flex h-9 w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-400 transition-all duration-200 ease-out group
                        ${
                          isActive
                            ? "bg-slate-800/70 text-white border border-slate-700 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] before:absolute before:left-0 before:top-2 before:h-5 before:w-[3px] before:rounded-r before:bg-indigo-500 before:shadow-[0_0_8px_rgba(99,102,241,0.6)] before:content-['']"
                            : 'hover:bg-slate-800/40 hover:backdrop-blur-sm hover:text-white'
                        }
                        ${isCollapsed ? 'justify-center px-0' : ''}
                      `}
                      title={isCollapsed ? item.label : ''}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                      {!isCollapsed && isActive && <ChevronRight className="ml-auto h-4 w-4 text-indigo-500/50" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {isCollapsed && <div className="border-b border-slate-800/50 my-4 w-8 mx-auto" />}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/60 bg-slate-950/40 px-4 py-4 backdrop-blur-sm">
        {!isCollapsed && (
          <div className="pb-2 text-center text-[11px] uppercase tracking-wide text-indigo-400/70 drop-shadow-[0_0_6px_rgba(99,102,241,0.4)]">
            DC Platform v1.0.0
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-full items-center justify-center rounded-xl border border-slate-700/60 bg-transparent text-sm text-slate-300 transition-all duration-200 ease-out hover:border-indigo-500/50 hover:bg-slate-800/40 hover:text-indigo-300 hover:shadow-[0_0_12px_rgba(99,102,241,0.25)]"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5 text-slate-300" /> : <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
