import { useState, useEffect } from 'react';
import { User, Save, X } from 'lucide-react';

const UsernameModal = () => {
    const storedName = localStorage.getItem('username');
    const [isOpen, setIsOpen] = useState(!storedName);
    const [username, setUsername] = useState(storedName || '');
    const [error, setError] = useState('');
    const [isClosable, setIsClosable] = useState(!!storedName);

    useEffect(() => {
        // Listen for edit events
        const handleEdit = () => {
            setIsOpen(true);
            setIsClosable(true); // Allow closing since we have a value
            setUsername(localStorage.getItem('username') || '');
        };

        window.addEventListener('edit-username', handleEdit);
        return () => window.removeEventListener('edit-username', handleEdit);
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        const trimmed = username.trim();
        
        if (trimmed.length < 2) {
            setError('Name must be at least 2 characters.');
            return;
        }

        localStorage.setItem('username', trimmed);
        // Also set legacy/compatibility items if needed, or just rely on httpClient updating
        localStorage.setItem('dc_display_name', trimmed); 
        
        setIsOpen(false);
        setError('');
        
        // Dispatch event so Header updates immediately
        window.dispatchEvent(new Event('username-updated'));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 relative">
                
                {isClosable && (
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}

                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 mb-4">
                        <User className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">
                        {isClosable ? 'Change Name' : 'Welcome to DC Label Platform'}
                    </h3>
                    <p className="text-slate-400 text-sm mt-2">
                        {isClosable 
                            ? 'Update how your name appears in print history.' 
                            : 'Please enter your name to identify your print jobs.'}
                    </p>
                </div>

                <form onSubmit={handleSave}>
                    <div className="mb-4">
                        <label className="dc-label uppercase">
                            Your Name
                        </label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                if (error) setError('');
                            }}
                            className="dc-input py-2.5"
                            placeholder="e.g. John Doe"
                            autoFocus
                        />
                        {error && <p className="text-rose-500 text-xs mt-2">{error}</p>}
                    </div>

                    <button 
                        type="submit"
                        disabled={!username.trim()}
                        className="dc-btn-primary w-full py-2.5"
                    >
                        <Save className="h-4 w-4" />
                        {isClosable ? 'Update Name' : 'Get Started'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UsernameModal;
