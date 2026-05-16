import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUp } from '@fortawesome/free-regular-svg-icons';

interface LayoutProps {
  children: React.ReactNode;
  clusters: any[];
}

interface InfoResponse {
  build: {
    commitId: string;
    version: string;
    buildTime: string;
    isLatestRelease: boolean;
  };
  latestRelease: {
    versionTag: string;
    publishedAt: string;
    htmlUrl: string;
  } | null;
}

const Layout: React.FC<LayoutProps> = ({ children, clusters }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const [info, setInfo] = useState<InfoResponse | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const response = await fetch('/api/v1/info');
        if (response.ok) {
          const data = await response.json();
          setInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch system info', err);
      }
    };
    fetchInfo();
  }, []);

  const toggleCluster = (name: string) => {
    setExpandedClusters(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

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
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            {info && (
              <div className="flex items-center space-x-1">
                <span className="text-indigo-500 font-medium">{info.build.commitId}</span>
                <span>{info.build.version}</span>
                {(!info.build.isLatestRelease && info.latestRelease) && (
                  <a
                    href={info.latestRelease.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-amber-500 hover:text-amber-600 transition-colors animate-pulse"
                    title={`Update available: ${info.latestRelease.versionTag}`}
                  >
                    <FontAwesomeIcon icon={faCircleUp} />
                  </a>
                )}
              </div>
            )}
            {!info && (
              <span className="text-indigo-500 font-medium">Loading...</span>
            )}
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
            <Link
              className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-indigo-600 bg-indigo-50 border-r-4 border-indigo-600' : 'text-slate-700 hover:bg-slate-50'}`}
              to="/"
            >
              Dashboard
            </Link>
            {clusters.map((cluster) => {
              const isExpanded = expandedClusters[cluster.name] || location.pathname.startsWith(`/clusters/${cluster.name}`);
              return (
                <div key={cluster.name} className="space-y-1">
                  <button
                    onClick={() => toggleCluster(cluster.name)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${cluster.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {cluster.name}
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="pl-8 space-y-1 pb-2">
                      <Link
                        className={`block px-4 py-1.5 text-sm transition-colors rounded ${location.pathname === `/clusters/${cluster.name}/brokers` ? 'text-indigo-600 bg-indigo-50 border-r-4 border-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        to={`/clusters/${cluster.name}/brokers`}
                      >
                        Brokers
                      </Link>
                      <Link className="block px-4 py-1.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors" to="#">Topics</Link>
                      <Link className="block px-4 py-1.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors" to="#">Consumers</Link>
                      <Link className="block px-4 py-1.5 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors" to="#">ACL</Link>
                    </div>
                  )}
                </div>
              );
            })}
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
