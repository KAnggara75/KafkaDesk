import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUp } from '@fortawesome/free-regular-svg-icons';

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

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [infoRes, clustersRes] = await Promise.all([
          fetch('/api/v1/info', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/v1/clusters', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!isMounted) return;

        if (infoRes.status === 401 || clustersRes.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (infoRes.ok) {
          const infoData = await infoRes.json();
          setInfo(infoData);
        }
        if (clustersRes.ok) {
          const clustersData = await clustersRes.json();
          setClusters(clustersData);
        }
      } catch (err) {
        console.error('Failed to fetch layout data', err);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []); // Empty dependency array to run only once on mount

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/v1/logout', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Logout failed', err);
    }
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleCluster = (name: string) => {
    setExpandedClusters(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden min-h-screen transition-colors duration-300">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 sticky top-0 z-50 transition-colors duration-300">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-500 dark:text-slate-400"
            title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isSidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"></path>
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-800 dark:text-slate-200">KafkaDesk</span>
          </Link>
          <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500">
            {info && (
              <div className="flex items-center space-x-1">
                <span className="text-indigo-500 font-medium">{info.build.commitId.substring(0, 7)}</span>
                <span>v{info.build.version}</span>
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
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 18v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button onClick={handleLogout} className="text-xs hover:text-red-600 transition-colors">Logout</button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 py-4 flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-56 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 pointer-events-none'}`}>
          <div className="w-56"> {/* Fixed width wrapper to prevent layout shift during transition */}
            <nav className="space-y-1">
            <Link
              className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-r-4 border-indigo-600' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
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
                    className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
                        className={`block px-4 py-1.5 text-sm transition-colors rounded ${location.pathname === `/clusters/${cluster.name}/brokers` ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-r-4 border-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        to={`/clusters/${cluster.name}/brokers`}
                      >
                        Brokers
                      </Link>
                      <Link
                        className={`block px-4 py-1.5 text-sm transition-colors rounded ${location.pathname === `/clusters/${cluster.name}/topics` ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-r-4 border-indigo-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        to={`/clusters/${cluster.name}/topics`}
                      >
                        Topics
                      </Link>
                      <Link className="block px-4 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors" to="#">Consumers</Link>
                      <Link className="block px-4 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors" to="#">ACL</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet context={{ clusters }} />
        </main>
      </div>
    </div>
  );
};

export default Layout;
