import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import { ToastContext } from '../../context/ToastContext';

export default function SuggestionList({ userId }) {
  const [sugs, setSugs] = useState(null);
  const toast = useContext(ToastContext);
  useEffect(() => {
    api.get(`/users/${userId}/suggestions`).then(r => setSugs(r.data)).catch(()=>{});
  }, [userId]);
  if (!sugs) return <p>Yükleniyor…</p>;
  if (sugs.length === 0) return <p className="text-gray-500">Öneri bulunamadı</p>;
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">Önerilen Bağlantılar</h2>
      <ul className="bg-white rounded shadow divide-y">
        {sugs.map(u => (
          <li key={u.id} className="p-3 flex items-center justify-between flex-wrap gap-2">
            <span>{u.name}</span>
            <button
              onClick={() =>
                api.post('/connections', { targetId: u.id }).then(() => setSugs(sugs.filter(x => x.id !== u.id)))
                  .catch(() => toast('Takip edilemedi'))
              }
              className="text-sm text-green-600"
            >Takip Et</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
