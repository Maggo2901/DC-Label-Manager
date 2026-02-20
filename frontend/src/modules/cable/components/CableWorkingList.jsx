import { Trash2, Edit2, CheckSquare, Square } from 'lucide-react';

export default function CableWorkingList({
  items,
  selectedIndices,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  onItemClick,
  activePreviewIndex,
  onDeleteAll,
  onDeleteSelected
}) {
  const isAllSelected = items.length > 0 && selectedIndices.length === items.length;

  return (
    <div className="flex h-full flex-col overflow-hidden dc-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSelectAll}
            className="text-slate-400 hover:text-white"
            title="Select All"
          >
            {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
          <span className="text-xs font-medium text-slate-300">
            {items.length} Item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
            {selectedIndices.length > 0 && (
                <button 
                    onClick={onDeleteSelected}
                    className="flex items-center gap-1 rounded bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-400 hover:bg-rose-500/20"
                    title="Delete Selected"
                >
                    <Trash2 className="h-3 w-3" />
                    Delete ({selectedIndices.length})
                </button>
            )}
            {items.length > 0 && (
                <button 
                    onClick={onDeleteAll}
                    className="flex items-center gap-1 rounded bg-slate-700/50 px-2 py-1 text-[10px] font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                    title="Clear All"
                >
                    <Trash2 className="h-3 w-3" />
                    Clear All
                </button>
            )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-500">
            <p className="mb-1 text-sm">No connections yet</p>
            <p className="text-xs opacity-60">Add some via the input panel</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item, index) => {
              const isSelected = selectedIndices.includes(index);
              const isActive = activePreviewIndex === index;
              
              const rowClass = isActive
                  ? "border-indigo-500/50 bg-indigo-500/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800";

              return (
                <div
                  key={index}
                  className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${rowClass}`}
                  onClick={() => onItemClick(index)}
                >
                  <div onClick={(e) => { e.stopPropagation(); onToggleSelect(index); }}>
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-600 group-hover:text-slate-500" />
                    )}
                  </div>

                  <span className="min-w-[24px] text-xs font-mono text-slate-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="flex-1 grid grid-cols-1 gap-2 lg:grid-cols-[3fr_0.8fr_0.8fr_1fr] lg:items-center lg:gap-x-3 lg:gap-y-1">
                    
                    {/* Device Row Wrapper (A -> Arrow -> B) */}
                    <div className="md:col-span-1 p-1.5 device-row">
                        
                        {/* Device A */}
                        <div className="device-block device-a min-w-0 flex-1 text-right">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Device A</span>
                            <span className="truncate text-sm font-semibold text-slate-200">{item.aSide || item.aSideDevice || '-'}</span>
                        </div>

                        {/* Animated Arrow */}
                        <div className="connection-flow">
                             <span>→</span>
                             <span>→</span>
                             <span>→</span>
                             <span>→</span>
                        </div>

                        {/* Device B */}
                        <div className="device-block device-b min-w-0 flex-1 text-left">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium pt-[1px]">Device B</span>
                            <span className="truncate text-sm font-semibold text-slate-200">{item.zSide || item.zSideDevice || '-'}</span>
                        </div>

                    </div>

                    {/* 4. Port A */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Port A</span>
                        <span className="truncate text-sm font-medium text-slate-300">{item.portA || item.portAStart || '-'}</span>
                    </div>

                    {/* 5. Port B */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Port B</span>
                        <span className="truncate text-sm font-medium text-slate-300">{item.portB || item.portBStart || '-'}</span>
                    </div>

                    {/* 6. Additional / Serial */}
                    <div className="flex flex-col gap-0.5 min-w-0 col-span-2 lg:col-span-1">
                         {/* Only show header if content exists, or keep empty to maintain grid structure */}
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                            {(item.serial || item.additionalText) ? 'Add. Text' : '\u00A0'}
                        </span>
                        <span className="truncate text-sm font-medium text-indigo-300">
                             {item.serial || item.additionalText || ''}
                        </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                    className="opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
