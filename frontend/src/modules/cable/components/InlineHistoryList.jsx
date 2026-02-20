import { useState, useEffect } from 'react';
import { printHistoryApi, historyApi } from '../../../shared/api/platformApi';
import { Clock, RotateCcw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const MODE_STYLE = {
    single: 'bg-indigo-900/50 text-indigo-200',
    batch: 'bg-emerald-900/50 text-emerald-200',
    excel: 'bg-amber-900/50 text-amber-200'
};

const InlineHistoryList = ({ onRestore, refreshTrigger }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [restoringId, setRestoringId] = useState(null);

    useEffect(() => {
        loadHistory();
    }, [refreshTrigger]);

    const loadHistory = async () => {
        setLoading(true);
        console.log('[DEBUG] InlineHistoryList: Loading history...');
        try {
            const res = await printHistoryApi.listMy();
            console.log('[DEBUG] InlineHistoryList: Loaded:', res.history);
            setHistory(res.history || []);
        } catch (err) {
            console.error("Failed to load inline history", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreClick = async (job) => {
        if (restoringId) return;
        setRestoringId(job.id);
        
        try {
            // Fetch full details
            const res = await historyApi.get(job.id);
            const fullJob = res.job;
            
            if (fullJob && fullJob.payload) {
                 onRestore(fullJob.payload);
            }
        } catch (err) {
            console.error("Failed to restore job", err);
            alert("Failed to restore job details.");
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <div className="dc-panel flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Recent Print Jobs</h3>
                </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {loading && history.length === 0 ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center p-4 text-xs text-slate-500 italic">
                        No recent history
                    </div>
                ) : (
                    history.slice(0, 10).map(job => (
                        <div 
                            key={job.id}
                            className="group flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-indigo-500/30 transition-all"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-mono text-indigo-300">
                                        {format(new Date(job.created_at), 'HH:mm')}
                                    </span>
                                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${MODE_STYLE[job.mode] || MODE_STYLE.single}`}>
                                        {String(job.mode || 'single').toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-300 truncate font-medium">
                                    {job.total_labels} Labels
                                </div>
                            </div>
                            
                            <button
                                onClick={() => handleRestoreClick(job)} 
                                disabled={restoringId !== null}
                                className="ml-2 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                title="Restore configuration"
                            >
                                {restoringId === job.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                                ) : (
                                    <RotateCcw className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default InlineHistoryList;
