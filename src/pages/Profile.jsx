import { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import AvatarPicker from '../components/Profile/AvatarPicker';

export default function Profile() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);

  const isSelf = user.id === id || !id;
  const targetId = id || user.id;

  useEffect(() => {
    api.get(`/users/${targetId}`).then((res) => setProfile(res.data));
  }, [targetId]);

  if (!profile) return <p className="p-8">Yükleniyor…</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <img
          src={profile.avatarUrl || '/avatars/default.png'}
          alt="avatar"
          className="w-24 h-24 rounded-full object-cover border"
        />
        <div>
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          <p className="text-gray-600">{profile.email}</p>
        </div>
      </div>

      {isSelf && (
        <AvatarPicker
          current={profile.avatarUrl}
          onPicked={(url) => setProfile({ ...profile, avatarUrl: url })}
        />
      )}
    </div>
  );
}
