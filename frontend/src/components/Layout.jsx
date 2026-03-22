import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ 
  children, 
  activeModuleId,
  modules,
  headerModules,
  setActiveModuleId,
  isSidebarCollapsed, 
  toggleSidebar,
}) => {
  return (
    <div
      className="flex h-screen min-h-0 w-full flex-col overflow-hidden bg-slate-950 font-sans text-slate-200 selection:bg-indigo-500/30"
      style={{ '--app-header-height': '4rem' }}
    >
      
      {/* 
        Header
        - fixed height (auto/shrinks)
        - flex-shrink: 0
        - full width at the top
      */}
      <div className="shrink-0 z-40">
          <Header 
            headerModules={headerModules} 
            activeModuleId={activeModuleId} 
            setActiveModuleId={setActiveModuleId}
          />
      </div>

      {/* 
        Body Container
        - flex row
        - takes remaining height (flex-1)
        - contains Sidebar + Main Content
      */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden w-full">
        
        {/* 
          Sidebar: Flex item
          - width: fixed (w-64 or w-20)
          - height: 100% (of parent flex container)
        */}
        <Sidebar 
          activeModuleId={activeModuleId}
          modules={modules}
          setActiveModuleId={setActiveModuleId}
          isCollapsed={isSidebarCollapsed} 
          toggleSidebar={toggleSidebar} 
        />

        {/* 
          Content Area
          - flex: 1 (takes remaining width)
          - overflow-y: auto (scrollable)
          - padding
        */}
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-950">
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
                {children}
            </div>
        </main>

      </div>
    </div>
  );
};

export default Layout;
