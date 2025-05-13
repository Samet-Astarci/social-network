import { useState } from 'react';

export default function RegisterForm({ onSubmit }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="bg-white p-8 rounded-xl shadow-md w-80"
    >
      <h1 className="text-2xl font-bold mb-6 text-center">Kayıt Ol</h1>
      {Object.entries(form).map(([k, v]) => (
        <input
          key={k}
          name={k}
          type={k === 'password' ? 'password' : 'text'}
          placeholder={
            k === 'username' ? 'Kullanıcı Adı' :
            k === 'email' ? 'E‑posta' :
            'Şifre'
          }
          value={v}
          onChange={e => setForm({ ...form, [k]: e.target.value })}
          className="w-full border p-2 rounded mb-3"
        />
      ))}
      <button className="w-full bg-green-600 text-white py-2 rounded">Kaydol</button>
    </form>
  );
}