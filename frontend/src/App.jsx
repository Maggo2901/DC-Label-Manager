import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import UsernameModal from './components/UsernameModal';
import {
  MODULES,
  getDefaultModule,
  getModuleById,
  getModuleByPath,
  normalizeHashPath
} from './app/moduleRegistry';

function resolveModuleIdFromHash() {
  const path = normalizeHashPath(window.location.hash);
  const moduleItem = getModuleByPath(path);
  return moduleItem ? moduleItem.id : getDefaultModule().id;
}

function navigateToModule(moduleId) {
  const moduleItem = getModuleById(moduleId);
  if (!moduleItem) return;
  window.location.hash = moduleItem.path;
}

import { LabelSettingsProvider } from './modules/settings/LabelSettingsContext';
import LabelSettingsModal from './modules/settings/LabelSettingsModal';

function App() {
  const [appReady, setAppReady] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState(resolveModuleIdFromHash);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!window.location.hash) {
      navigateToModule(getDefaultModule().id);
    }

    const onHashChange = () => {
      setActiveModuleId(resolveModuleIdFromHash());
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const activeModule = useMemo(() => getModuleById(activeModuleId) || getDefaultModule(), [activeModuleId]);
  const ActiveModuleComponent = activeModule.component;

  const MotionDiv = motion.div;

  const sidebarModules = useMemo(() => MODULES.filter(m => m.location !== 'header'), []);
  const headerModules = useMemo(() => MODULES.filter(m => m.location === 'header'), []);

  return (
    <LabelSettingsProvider activeModuleId={activeModule.id}>
      <UsernameModal />
      <LabelSettingsModal />
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: appReady ? 1 : 0 }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
        className="h-full min-h-0 overflow-hidden"
      >
        <Layout
          activeModuleId={activeModule.id}
          modules={sidebarModules}
          headerModules={headerModules}
          setActiveModuleId={navigateToModule}
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed((state) => !state)}
          isFullscreen={Boolean(activeModule.fullscreen)}
        >
          <ActiveModuleComponent />
        </Layout>
      </MotionDiv>

      <AnimatePresence>
        {!appReady && <SplashScreen onFinish={() => setAppReady(true)} />}
      </AnimatePresence>
    </LabelSettingsProvider>
  );
}

export default App;
