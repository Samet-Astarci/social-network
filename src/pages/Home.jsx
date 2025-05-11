import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import ConnectionList from '../components/Connections/ConnectionList';
import SuggestionList from '../components/Connections/SuggestionList';
import StatsCards from '../components/StatsCards';

export default function Home() {
  const { user } = useContext(AuthContext);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    api.get(`/users/${user.id}/activity`).then((res) => setActivity(res.data));
  }, [user]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <StatsCards userId={user.id} />
      <div className="grid md:grid-cols-2 gap-6">
        <ConnectionList userId={user.id} />
        <SuggestionList userId={user.id} />
      </div>
      <section>
        <h2 className="text-xl font-semibold mb-2">Son Etkinlikler</h2>
        <ul className="space-y-2">
          {activity.map((act) => (
            <li key={act.id} className="bg-white shadow p-3 rounded">
              {act.text}
              <span className="text-xs text-gray-500"> {new Date(act.date).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}