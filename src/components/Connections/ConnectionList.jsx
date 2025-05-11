import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import { ToastContext } from '../../context/ToastContext';

export default function ConnectionList({ userId }) {
  const [list, setList] = useState(null);
  const toast = useContext(ToastContext);
  useEffect(() => {
    api.get(`/users/${userId}/connections`).then(r => setList(r.data)).catch(()=>{});
  }, [userId]);

  if (!list) return <p>Yükleniyor…</p>;
  if (list.length === 0) return <p className="text-gray-500">Hiç bağlantı yok</p>;
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">Bağlantılarım</h2>
      <ul className="bg-white rounded shadow divide-y">
        {list.map(u => (
          <li key={u.id} className="p-3 flex items-center justify-between flex-wrap gap-2">
            <span>{u.name}</span>
            <button
              onClick={() =>
                api.delete(`/connections/${u.connectionId}`).then(() => setList(list.filter(x => x.id !== u.id)))
                  .catch(() => toast('Silinemedi'))
              }
              className="text-sm text-red-500"
            >Kaldır</button>
          </li>
        ))}
      </ul>
    </section>
  );
}