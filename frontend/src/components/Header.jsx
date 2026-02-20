import { useState, useEffect } from 'react';

const Header = ({ headerModules, activeModuleId, setActiveModuleId }) => {
  const [username, setUsername] = useState('');

  useEffect(() => {
    const updateName = () => {
        const stored = localStorage.getItem('username') || localStorage.getItem('dc_display_name');
        setUsername(stored || '');
    };
    updateName();
    window.addEventListener('username-updated', updateName);
    return () => window.removeEventListener('username-updated', updateName);
  }, []);

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = `${time.toLocaleDateString('en-GB', { weekday: 'long' })}, ${time.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })}`;

  const formattedTime = time.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <header className="h-16 w-full border-b border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 px-6 backdrop-blur-sm">
      <div className="grid h-full grid-cols-[auto_1fr_auto] items-center gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/dc-label-platform-logo.svg"
            alt="DC Label Platform"
            className="h-7 w-auto object-contain"
          />
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-100">DC Label Platform</h1>
            <span className="mt-1 truncate text-xs uppercase tracking-wide text-slate-400">Enterprise Print & Label System</span>
          </div>
        </div>

        <nav className="flex items-center justify-center gap-8 whitespace-nowrap">
          {headerModules?.map((module) => {
            const isActive = activeModuleId === module.id;
            return (
              <button
                type="button"
                key={module.id}
                onClick={() => setActiveModuleId(module.id)}
                className={`group relative inline-flex items-center text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>{module.label}</span>
                <span
                  className={`absolute -bottom-1 left-0 h-px w-full origin-left bg-slate-100 transition-transform ${
                    isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-6 whitespace-nowrap text-xs">
          <div className="text-slate-400">
            {formattedDate}
            <span className="mx-1 text-slate-600">|</span>
            <span>{formattedTime}</span>
          </div>

          <span className="text-slate-600">•</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('edit-username'))}
            className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700/70"
            title="Change Name"
          >
            <span className="max-w-[110px] truncate">{username || 'Guest'}</span>
          </button>

          <span className="text-slate-600">•</span>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>System Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
