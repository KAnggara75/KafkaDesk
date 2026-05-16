import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/v1/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.status === 204) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-green-600">Berhasil Login</h1>
      <p className="mt-4 text-xl text-gray-700">Selamat datang di Dashboard KafkaDesk</p>
      <button
        onClick={handleLogout}
        className="mt-8 px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
