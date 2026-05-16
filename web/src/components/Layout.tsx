import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  clusters: any[];
}

const Layout: React.FC<LayoutProps> = ({ children, clusters }) => {
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
    <div className="bg-gray-50 font-sans text-slate-900 overflow-x-hidden min-h-screen">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"></path>
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-800">KafkaDesk</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-slate-400">
            <span className="text-indigo-500 font-medium">83b5a60</span>
            <span>v0.7.2</span>
          </div>
        </div>
        <div className="flex items-center space-x-5 text-slate-500">
          <div className="flex items-center space-x-1 cursor-pointer hover:text-indigo-600">
            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">A</div>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <button onClick={handleLogout} className="text-xs hover:text-red-600 transition-colors">Logout</button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 py-4 flex-shrink-0">
          <nav className="space-y-1">
            <a className="flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border-r-4 border-indigo-600" href="/">
              Dashboard
            </a>
            {clusters.map((cluster) => (
              <div key={cluster.name} className="group">
                <button className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${cluster.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {cluster.name}
                  </div>
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </button>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
