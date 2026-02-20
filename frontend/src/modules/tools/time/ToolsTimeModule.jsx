import { useEffect, useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';
import {
  FRANKFURT_TZ,
  getAllTimeZones,
  isValidTimeZone,
  getOffsetMinutes,
  formatOffset,
  formatClock,
  getDstActive,
  describeDifferenceToFrankfurt
} from './tzUtils';
import ModulePageLayout from '../../../shared/components/ModulePageLayout';

const CORE_ZONES = [
  'UTC',
  'GMT',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Asia/Dubai',
  'Australia/Sydney'
];

const STORAGE_KEY = 'dc_tools_time_favorites_v1';
const REGION_FILTERS = ['All', 'Africa', 'America', 'Asia', 'Europe', 'Pacific'];

function uniqueValidZones(list) {
  return Array.from(
    new Set(
      (list || [])
        .map((item) => String(item || '').trim())
        .filter((zone) => zone && zone !== FRANKFURT_TZ && isValidTimeZone(zone))
    )
  );
}

function cardClass(extra = '') {
  return `dc-panel ${extra}`;
}

const ToolsTimeModule = () => {
  const [now, setNow] = useState(() => new Date());
  const [selectedZone, setSelectedZone] = useState('UTC');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRegion, setActiveRegion] = useState('All');
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return uniqueValidZones(JSON.parse(raw));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueValidZones(favorites)));
  }, [favorites]);

  const allTimeZones = useMemo(
    () =>
      getAllTimeZones()
        .filter((zone) => zone !== FRANKFURT_TZ)
        .sort((a, b) => a.localeCompare(b)),
    []
  );

  const filteredZones = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allTimeZones.filter((zone) => {
      const regionMatch = activeRegion === 'All' ? true : zone.startsWith(`${activeRegion}/`);
      const searchMatch = q ? zone.toLowerCase().includes(q) : true;
      return regionMatch && searchMatch;
    });
  }, [allTimeZones, searchTerm, activeRegion]);

  const frankfurtOffset = useMemo(() => getOffsetMinutes(now, FRANKFURT_TZ), [now]);
  const selectedOffset = useMemo(() => getOffsetMinutes(now, selectedZone), [now, selectedZone]);
  const diff = useMemo(() => describeDifferenceToFrankfurt(selectedOffset, frankfurtOffset), [selectedOffset, frankfurtOffset]);

  const isFavorite = (zone) => favorites.includes(zone);

  const toggleFavorite = (zone) => {
    if (zone === FRANKFURT_TZ) return;
    setFavorites((prev) => {
      if (prev.includes(zone)) {
        return prev.filter((item) => item !== zone);
      }
      return uniqueValidZones([...prev, zone]);
    });
  };

  const coreZoneMeta = useMemo(
    () =>
      CORE_ZONES.map((zone) => {
        const zoneOffset = getOffsetMinutes(now, zone);
        return {
          zone,
          compactDiff: describeDifferenceToFrankfurt(zoneOffset, frankfurtOffset).compact
        };
      }),
    [now, frankfurtOffset]
  );

  const selectedDst = getDstActive(now, selectedZone);
  const frankfurtDst = getDstActive(now, FRANKFURT_TZ);

  return (
    <ModulePageLayout>
      <ModulePageLayout.Content className="px-6">
      <div className="flex h-full min-h-0 flex-col gap-4 py-2">
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className={cardClass('p-4')}>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Frankfurt (Europe/Berlin)</div>
              <div className="mt-2 text-[2.6rem] leading-none font-mono font-semibold text-white">{formatClock(now, FRANKFURT_TZ)}</div>
              <div className="mt-3 text-xs text-slate-400">UTC Offset: {formatOffset(frankfurtOffset)}</div>
              <div className="text-xs text-slate-400">DST Active: {frankfurtDst ? 'Yes' : 'No'}</div>
            </div>

            <div className={cardClass('p-4')}>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Selected Zone</div>
              <div className="mt-1 text-sm text-slate-300 truncate">{selectedZone}</div>
              <div className="mt-2 text-[2.6rem] leading-none font-mono font-semibold text-white">{formatClock(now, selectedZone)}</div>
              <div className="mt-3 text-xs text-slate-400">UTC Offset: {formatOffset(selectedOffset)}</div>
              <div className="text-xs text-slate-400">DST Active: {selectedDst ? 'Yes' : 'No'}</div>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-700/50 bg-indigo-900/20 px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-indigo-300">Difference</div>
            <div className="mt-1 text-xl font-semibold text-indigo-100">{diff.verbose}</div>
          </div>
        </section>

        <section className={cardClass('p-3')}>
          <div className="px-1 pb-2 text-[11px] uppercase tracking-wider text-slate-500">Core Zones</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {coreZoneMeta.map((item) => {
              const active = selectedZone === item.zone;
              return (
                <button
                  key={item.zone}
                  onClick={() => setSelectedZone(item.zone)}
                  className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-100'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium truncate">{item.zone}</div>
                  <div className="text-xs opacity-90">{item.compactDiff}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-3">
          <div className={cardClass('min-h-0 p-3 xl:col-span-1 flex flex-col')}>
            <div className="px-1 pb-2 text-[11px] uppercase tracking-wider text-slate-500">Favorites</div>
            {favorites.length === 0 && <p className="px-1 text-sm text-slate-500">No favorites yet.</p>}
            {favorites.length > 0 && (
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-2">
                {favorites.map((zone) => {
                  const active = selectedZone === zone;
                  const zoneOffset = getOffsetMinutes(now, zone);
                  const compactDiff = describeDifferenceToFrankfurt(zoneOffset, frankfurtOffset).compact;
                  return (
                    <div
                      key={zone}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-2 ${
                        active ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <button onClick={() => setSelectedZone(zone)} className="min-w-0 flex-1 text-left">
                        <div className={`truncate text-sm font-medium ${active ? 'text-amber-100' : 'text-slate-200'}`}>{zone}</div>
                        <div className="text-xs text-slate-400">{compactDiff}</div>
                      </button>
                      <button
                        onClick={() => toggleFavorite(zone)}
                        className="rounded p-1 text-amber-300 hover:bg-slate-700"
                        title="Remove favorite"
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={cardClass('min-h-0 p-3 xl:col-span-2 flex flex-col')}>
            <div className="px-1 pb-2 text-[11px] uppercase tracking-wider text-slate-500">Search All Timezones</div>
            <div className="mb-2 flex items-center gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search IANA timezone"
                  className="dc-input py-2 pl-9 pr-3"
                />
              </div>
              <div className="flex gap-2 shrink-0 flex-nowrap overflow-x-auto whitespace-nowrap">
                {REGION_FILTERS.map((region) => {
                  const isActive = activeRegion === region;
                  return (
                    <button
                      key={region}
                      onClick={() => setActiveRegion(region)}
                      className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-100'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {region}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/50 pr-2">
              {filteredZones.map((zone) => {
                const favorite = isFavorite(zone);
                const active = selectedZone === zone;
                return (
                  <div key={zone} className="flex items-center gap-2 border-b border-slate-800 px-3 py-2 last:border-b-0">
                    <button
                      onClick={() => setSelectedZone(zone)}
                      className={`flex-1 truncate text-left text-sm ${active ? 'text-indigo-300' : 'text-slate-200'}`}
                    >
                      {zone}
                    </button>
                    <button
                      onClick={() => toggleFavorite(zone)}
                      className={`rounded p-1 ${favorite ? 'text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
                      title={favorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Star className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
      </ModulePageLayout.Content>
    </ModulePageLayout>
  );
};

export default ToolsTimeModule;
