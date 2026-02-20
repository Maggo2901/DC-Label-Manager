import { useEffect, useState } from 'react';
import { logisticsApi } from '../../shared/api/platformApi';

const LogisticsModule = () => {
  const [status, setStatus] = useState('Loading module status...');

  useEffect(() => {
    const run = async () => {
      try {
        const payload = await logisticsApi.getStatus();
        setStatus(payload?.data?.message || 'Logistics module is placeholder-only in V1.');
      } catch {
        setStatus('Logistics module is placeholder-only in V1.');
      }
    };

    run();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Logistics</h2>
        <p className="text-slate-400">Module reserved for future inbound/outbound label operations.</p>
      </div>

      <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-8">
        <h3 className="text-lg font-semibold text-slate-100">Placeholder</h3>
        <p className="mt-2 text-slate-400">{status}</p>
      </section>
    </div>
  );
};

export default LogisticsModule;
