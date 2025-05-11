import { useEffect, useState } from 'react';
import api from '../services/api';
export default function StatsCards({ userId }) {
  const [stats, setStats] = useState();
  useEffect(() => {
    api.get(`/users/${userId}/statistics`).then(r => setStats(r.data)).catch(()=>{});
  }, [userId]);
  if (!stats) return null;
  const items = [
    { label: 'Bağlantı', value: stats.connections },
    { label: 'Topluluk', value: stats.communities },
    { label: 'Merkeziyet', value: stats.betweenness?.toFixed(2) || 0 },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map(it => (
        <div key={it.label} className="bg-white shadow p-4 rounded text-center">
          <p className="text-2xl font-bold">{it.value}</p>
          <p className="text-sm text-gray-600">{it.label}</p>
        </div>
      ))}
    </div>
  );
}