import { useState, useEffect, useCallback } from 'react';
import { Clock, Printer, FileText, ArrowRight, Play, CheckCircle, Users, User, Settings, RefreshCw, ChevronDown } from 'lucide-react';
import { historyApi } from '../../shared/api/platformApi';
import { openBlobForPrint, saveBlob } from '../../shared/utils/blob';
import { draftsApi } from '../../shared/api/platformApi';
import { getModuleLabelByMode } from '../../app/moduleRegistry';
import ModulePageLayout from '../../shared/components/ModulePageLayout';

// Helper to group history items
const groupHistoryByDate = (history) => {
  const groups = {
    today: [],
    week: [],
    month: [],
    older: []
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = new Date(todayStart - 6 * 24 * 60 * 60 * 1000).getTime();
  const monthStart = new Date(todayStart - 29 * 24 * 60 * 60 * 1000).getTime();

  history.forEach(job => {
    const jobTime = new Date(job.created_at).getTime();
    
    if (jobTime >= todayStart) {
      groups.today.push(job);
    } else if (jobTime >= weekStart) {
      groups.week.push(job);
    } else if (jobTime >= monthStart) {
      groups.month.push(job);
    } else {
      groups.older.push(job);
    }
  });

  return groups;
};

const HistorySection = ({ title, count, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
            <span className="text-xs text-slate-600 font-mono bg-slate-800 px-1.5 py-0.5 rounded-full">{count}</span>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>
      </button>
      
      {isOpen && (
        <div className="p-2 space-y-2 border-t border-slate-800">
            {children}
        </div>
      )}
    </div>
  );
};

const MODE_BADGE = {
  single: 'bg-blue-900/60 text-blue-200 border-blue-800/50',
  batch: 'bg-emerald-900/60 text-emerald-200 border-emerald-800/50',
  excel: 'bg-amber-900/60 text-amber-200 border-amber-800/50'
};

function normalizeHistoryMode(value) {
  const mode = String(value || '').toLowerCase();
  if (mode === 'single' || mode === 'batch' || mode === 'excel') {
    return mode;
  }
  return 'single';
}



const PrintHistoryModule = () => {
  const [tab, setTab] = useState(() => localStorage.getItem('dc_history_tab') || 'my'); // 'my' | 'team'
  const [history, setHistory] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [resumeIndex, setResumeIndex] = useState('');
  const [processingResume, setProcessingResume] = useState(false);
  const [isTeamEnabled, setIsTeamEnabled] = useState(true); 

  // User Identity
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('dc_display_name') || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const saveName = () => {
    localStorage.setItem('dc_display_name', tempName);
    setDisplayName(tempName);
    setIsEditingName(false);
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    // Don't clear history immediately to avoid flicker, or do if you want to show loading state clearly
    // setHistory([]); 
    try {
      let res;
      if (tab === 'team') {
          res = await historyApi.listTeam();
          // Only switch if backend EXPLICITLY says disabled
          if (res.disabled) {
              setIsTeamEnabled(false);
              setTab('my'); 
              return;
          } else {
             setIsTeamEnabled(true);
          }
      } else {
          res = await historyApi.list();
      }
      setHistory(res?.history || []);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  // Persist tab selection
  useEffect(() => {
    localStorage.setItem('dc_history_tab', tab);
    loadHistory();
  }, [tab, loadHistory]);



  const handleSelectJob = async (id) => {
    setLoading(true);
    try {
      const res = await historyApi.get(id);
      setSelectedJob(res.job);
      setResumeIndex(''); 
    } catch (err) {
      console.error('Failed to load job details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!selectedJob) return;
    const startIdx = parseInt(resumeIndex, 10);
    
    if (isNaN(startIdx) || startIdx < 1 || startIdx > selectedJob.total_labels) {
        alert('Invalid start label number');
        return;
    }

    const apiIndex = startIdx - 1;

    setProcessingResume(true);
    try {
        const { blob, filename } = await historyApi.resume(selectedJob.id, apiIndex);
         saveBlob(blob, filename || `resume-job-${selectedJob.id}-from-${startIdx}.pdf`);
         const url = window.URL.createObjectURL(blob);
         openBlobForPrint(url);
    } catch (err) {
        console.error('Resume failed', err);
        alert('Failed to resume print job');
    } finally {
        setProcessingResume(false);
    }
  };

  return (
    <ModulePageLayout>
      <ModulePageLayout.Content>
      <div className="flex h-full min-h-0 gap-6">
      
      {/* LEFT: History List */}
      <div className="flex w-1/3 min-w-[340px] flex-col overflow-hidden dc-panel">
        
        {/* Header with Name & Tabs */}
        <div className="flex flex-col border-b border-slate-800">
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-400" />
                        Print History
                    </h2>
                    <button 
                        onClick={loadHistory} 
                        disabled={loading}
                        className="ml-2 p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                        title="Refresh History"
                    >
                        <svg 
                            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
                
                {/* Identity Config */}
                <div className="flex items-center gap-2">
                    {isEditingName ? (
                        <div className="flex items-center gap-2 bg-slate-800 rounded p-1">
                            <input 
                                className="bg-transparent text-xs text-white outline-none w-24 px-1 border-b border-slate-600 focus:border-indigo-500"
                                placeholder="Your Name"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                autoFocus
                            />
                            <button onClick={saveName} className="text-emerald-400 text-xs px-2 hover:text-white">OK</button>
                        </div>
                    ) : (
                         <button 
                            onClick={() => { setTempName(displayName); setIsEditingName(true); }}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                            title="Set your Display Name"
                         >
                            <User className="h-3 w-3" />
                            {displayName || "Set Name"}
                         </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 gap-4">
                <button 
                    onClick={() => setTab('my')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        tab === 'my' 
                        ? 'border-indigo-500 text-white' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <User className="h-4 w-4" />
                    My History
                </button>
                {/* Always show Team tab unless explicitly disabled by backend logic previously confirmed */}
                <button 
                    onClick={() => setTab('team')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        tab === 'team' 
                        ? 'border-indigo-500 text-white' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    } ${!isTeamEnabled ? 'hidden' : ''}`} // Hide if API disabled it
                >
                    <Users className="h-4 w-4" />
                    Team History
                </button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
          {history.length === 0 && !loading && (
             <div className="text-center text-slate-500 py-10">
                 {tab === 'my' ? 'You have no print history.' : 'No team history found.'}
             </div>
          )}
          
          {(() => {
            const groups = groupHistoryByDate(history);
            return (
              <div className="space-y-1">
                <HistorySection title="Today" count={groups.today.length} defaultOpen={true}>
                    {groups.today.map(job => <HistoryItem key={job.id} job={job} selectedJob={selectedJob} onClick={handleSelectJob} tab={tab} />)}
                </HistorySection>

                <HistorySection title="This Week" count={groups.week.length} defaultOpen={false}>
                    {groups.week.map(job => <HistoryItem key={job.id} job={job} selectedJob={selectedJob} onClick={handleSelectJob} tab={tab} />)}
                </HistorySection>

                <HistorySection title="This Month" count={groups.month.length} defaultOpen={false}>
                    {groups.month.map(job => <HistoryItem key={job.id} job={job} selectedJob={selectedJob} onClick={handleSelectJob} tab={tab} />)}
                </HistorySection>

                <HistorySection title="Older" count={groups.older.length} defaultOpen={false}>
                    {groups.older.map(job => <HistoryItem key={job.id} job={job} selectedJob={selectedJob} onClick={handleSelectJob} tab={tab} />)}
                </HistorySection>
              </div>
            );
          })()}
        </div>
      </div>

      {/* RIGHT: Detail View */}
      <div className="flex flex-1 flex-col overflow-hidden dc-panel">
         {selectedJob ? (
            <div className="flex flex-col h-full">
                <div className="border-b border-slate-800 p-6">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                         <Printer className="h-6 w-6" />
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-white">Job #{selectedJob.id}</h3>
                         <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <span>{new Date(selectedJob.created_at).toLocaleString()}</span>
                            <span>•</span>
                            <span>{getModuleLabelByMode(selectedJob.mode)}</span>
                            {selectedJob.display_name && (
                                <>
                                    <span>•</span>
                                    <span className="text-indigo-400">{decodeURIComponent(selectedJob.display_name)}</span>
                                </>
                            )}
                         </div>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-3 gap-4 mt-6">
                       <div className="p-3 rounded border border-slate-700 bg-slate-800/50">
                          <label className="text-xs text-slate-500 block mb-1">Total Labels</label>
                          <span className="text-xl font-mono text-white">{selectedJob.total_labels}</span>
                       </div>
                       <div className="p-3 rounded border border-slate-700 bg-slate-800/50">
                          <label className="text-xs text-slate-500 block mb-1">Generated By</label>
                          {selectedJob.display_name ? (
                              <span className="text-sm font-medium text-white block">{decodeURIComponent(selectedJob.display_name)}</span>
                          ) : (
                              <span className="text-sm text-slate-600 italic block">
                                  {localStorage.getItem('dc_display_name') || 'Anonymous'}
                              </span>
                          )}
                       </div>
                       <div className="p-3 rounded border border-slate-700 bg-slate-800/50">
                          <label className="text-xs text-slate-500 block mb-1">Browser / Context</label>
                          <span className="text-[10px] text-slate-500 block truncate" title={selectedJob.user_agent}>
                             {selectedJob.user_agent ? (selectedJob.user_agent.length > 25 ? selectedJob.user_agent.substring(0, 25) + '...' : selectedJob.user_agent) : 'Unknown'}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono block mt-1 truncate" title={`Session ID: ${selectedJob.session_id}`}>
                             Session: ••••••••
                          </span>
                       </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                   <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> 
                      Label Data Preview ({selectedJob.payload?.rows?.length || 0})
                   </h4>
                   <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2">
                      {selectedJob.payload?.rows?.map((row, idx) => (
                         <div key={idx} className="flex items-center gap-4 p-2 rounded border border-slate-700 bg-slate-800/50 text-xs font-mono text-slate-400">
                            <span className="w-8 text-slate-600">#{idx + 1}</span>
                            <span className="flex-1 truncate" title={row.aSide}>{row.aSide}</span>
                            <ArrowRight className="h-3 w-3 text-slate-600" />
                            <span className="flex-1 truncate" title={row.zSide}>{row.zSide}</span>
                            {row.serial && <span className="text-indigo-400">{row.serial}</span>}
                         </div>
                      ))}
                   </div>
                </div>

                <div className="border-t border-slate-800 p-6">
                   <h4 className="text-sm font-bold text-white mb-4">Actions</h4>
                   <div className="flex flex-col gap-4">
                       
                       {/* Resume Section */}
                       <div className="flex items-end gap-4 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                          <div className="flex-1">
                             <label className="block text-xs font-medium text-indigo-300 mb-1">
                                Resume Printing from Label #
                             </label>
                             <input 
                                type="number" 
                                min="1" 
                                max={selectedJob.total_labels}
                                placeholder="e.g. 5"
                                value={resumeIndex}
                                onChange={(e) => setResumeIndex(e.target.value)}
                                className="dc-input"
                             />
                          </div>
                          <button 
                             onClick={handleResume}
                             disabled={!resumeIndex || processingResume}
                             className="dc-btn-primary px-6"
                          >
                             {processingResume ? 'Generating...' : (
                                <>
                                   <Play className="h-4 w-4 fill-current" />
                                   Resume Print
                                </>
                             )}
                          </button>
                       </div>

                       {/* Restore Section */}
                       <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                          <div>
                              <h5 className="text-sm font-bold text-emerald-300">Edit & Reprint</h5>
                              <p className="text-xs text-slate-400 mt-1">
                                  Restore this job's settings and data to the editor.
                              </p>
                          </div>
                          <button
                              onClick={() => {
                                  // Removed blocking confirm for streamlined workflow and testing
                                  console.log("Restoring job:", selectedJob.id);
                                  
                                  const payload = {
                                      connections: selectedJob.payload.rows || [],
                                      // If job has config, use it. If not, use defaults or try to infer?
                                      // Newer jobs have 'config' in payload. Older might not.
                                      config: selectedJob.payload.config || {}
                                  };
                                  
                                  const jobMode = normalizeHistoryMode(selectedJob.mode);
                                  const restoreMode = jobMode;
                                  
                                  localStorage.setItem('dc_restore_mode', restoreMode);
                                  
                                  const draftTarget = jobMode;

                                  draftsApi.save(draftTarget, payload)
                                      .then(() => {
                                          // Both single and batch modes live under #/serial route
                                          window.location.hash = '#/cable';
                                      })
                                      .catch(err => {
                                          console.error("Restore failed", err);
                                          alert("Failed to restore job");
                                      });
                              }}
                              className="dc-btn-success px-6"
                          >
                              <RefreshCw className="h-4 w-4" />
                              Restore to Editor
                          </button>
                       </div>
                   </div>
                </div>
            </div>
         ) : (
            <div className="flex h-full items-center justify-center text-slate-500 flex-col gap-4">
               <Printer className="h-12 w-12 opacity-20" />
               <p>Select a print job to view details</p>
            </div>
         )}
      </div>

      </div>
      </ModulePageLayout.Content>
    </ModulePageLayout>
  );
};

const HistoryItem = ({ job, selectedJob, onClick, tab }) => (
  <button
     onClick={() => onClick(job.id)}
     className={`w-full text-left rounded-lg border p-3 transition-colors ${
       selectedJob?.id === job.id 
          ? 'border-indigo-500 bg-indigo-500/10' 
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
     }`}
  >
     <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
            {/* BADGE A: MODULE NAME (e.g. Cable Label Print) */}
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {getModuleLabelByMode(job.module_key || 'cable')}
            </span>

            {(() => {
              const mode = normalizeHistoryMode(job.mode);
              return (
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${MODE_BADGE[mode] || MODE_BADGE.single}`}>
                  {mode.toUpperCase()}
                </span>
              );
            })()}
            
            {/* Show name in Team View */}
            {tab === 'team' && job.display_name && (
                <span className="text-xs max-w-[80px] truncate text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                   {decodeURIComponent(job.display_name)}
                </span>
            )}
        </div>
        <span className="text-xs text-slate-500">
          {new Date(job.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
     </div>
     <div className="text-sm text-slate-300">
        Labels: <span className="font-mono text-white">{job.total_labels}</span>
        {job.title && <span className="text-slate-500 ml-2 border-l border-slate-700 pl-2 text-xs">{job.title}</span>}
     </div>
     <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
       <CheckCircle className="h-3 w-3 text-emerald-500" />
       Completed
     </div>
  </button>
);

export default PrintHistoryModule;
