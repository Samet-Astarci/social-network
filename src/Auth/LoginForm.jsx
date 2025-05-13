import { useState } from 'react';

export default function LoginForm({ onSubmit }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(username, email, password);  // username de gönderiliyor
      }}
      className="bg-white p-8 rounded-xl shadow-md w-80"
    >
      <h1 className="text-2xl font-bold mb-6 text-center">Giriş Yap</h1>

      {/* Username input alanı eksikti, eklendi */}
      <input
        type="text"
        placeholder="Kullanıcı Adı"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className="w-full border p-2 rounded mb-3"
      />

      <input
        type="email"
        placeholder="E-posta"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full border p-2 rounded mb-3"
      />

      <input
        type="password"
        placeholder="Şifre"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full border p-2 rounded mb-5"
      />

      <button className="w-full bg-blue-600 text-white py-2 rounded">Giriş</button>
    </form>
  );
}