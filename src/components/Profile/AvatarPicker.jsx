
import api from '../../services/api';

const avatars = Array.from({ length: 10 }, (_, i) => `/avatars/pp${i + 1}.png`);

export default function AvatarPicker({ current, onPicked }) {
  const pick = async (url) => {
    await api.put('/profile', { avatarUrl: url });   // sunucuya güncelle
    onPicked(url);                                   // üst bileşene bildir
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Profil Fotoğrafı Seç</h2>
      <div className="grid grid-cols-5 gap-3">
        {avatars.map((url) => (
          <button
            key={url}
            onClick={() => pick(url)}
            className={`border rounded ${current === url ? 'ring-2 ring-blue-500' : ''}`}
          >
            <img src={url} alt="avatar" className="w-full h-16 object-cover rounded" />
          </button>
        ))}
      </div>
    </div>
  )
}
