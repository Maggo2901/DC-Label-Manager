import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Confirm Action", 
    message = "Are you sure you want to proceed?",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger", // 'danger', 'warning', 'info'
    isLoading = false
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch(variant) {
            case 'danger': return <AlertTriangle className="h-6 w-6 text-rose-500" />;
            case 'warning': return <AlertTriangle className="h-6 w-6 text-amber-500" />;
            case 'info': return <Info className="h-6 w-6 text-indigo-500" />;
            default: return <AlertCircle className="h-6 w-6 text-slate-400" />;
        }
    };

    const getButtonStyles = () => {
        switch(variant) {
            case 'danger': return "bg-rose-600 hover:bg-rose-500 text-white";
            case 'warning': return "bg-amber-600 hover:bg-amber-500 text-white";
            case 'info': return "bg-indigo-600 hover:bg-indigo-500 text-white";
            default: return "bg-slate-600 hover:bg-slate-500 text-white";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div 
                className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-start justify-between p-4 border-b border-slate-800 bg-slate-800/30">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700`}>
                            {getIcon()}
                        </div>
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors rounded p-1 hover:bg-slate-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 bg-slate-950/50 border-t border-slate-800">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-slate-800 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm ${getButtonStyles()} disabled:opacity-50`}
                    >
                        {isLoading ? "Processing..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
