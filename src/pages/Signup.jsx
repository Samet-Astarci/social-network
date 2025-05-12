import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const { signup } = useContext(AuthContext);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          signup(form);
        }}
        className="bg-white p-8 rounded-xl shadow-md w-80"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Kayıt Ol</h1>
        {Object.entries(form).map(([key, val]) => (
          <input
            key={key}
            name={key}
            type={key === 'password' ? 'password' : 'text'}
            placeholder={key === 'name' ? 'İsim' : key === 'email' ? 'E-posta' : 'Şifre'}
            value={val}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            className="w-full border p-2 rounded mb-3"
          />
        ))}
        <button className="w-full bg-green-600 text-white py-2 rounded">Kaydol</button>
        <p className="text-center text-sm mt-4">
          Zaten hesabın var mı?
          <Link to="/login" className="text-blue-600 font-semibold"> Giriş Yap</Link>
        </p>
      </form>
    </div>
  );
}