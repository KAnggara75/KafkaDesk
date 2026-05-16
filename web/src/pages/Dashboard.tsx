import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

interface Cluster {
  name: string;
  status: string;
  version: string;
  brokerCount: number;
  onlinePartitionCount: number;
  topicCount: number;
  lastError: string | null;
}

type SortConfig = {
  key: keyof Cluster;
  direction: 'asc' | 'desc';
} | null;

const Dashboard: React.FC = () => {
  const { clusters } = useOutletContext<{ clusters: Cluster[] }>();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  const sortedClusters = useMemo(() => {
    const sortableItems = [...clusters];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === null) return 1;
        if (bVal === null) return -1;

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [clusters, sortConfig]);

  const requestSort = (key: keyof Cluster) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Cluster) => {
    const isActive = sortConfig?.key === key;
    return (
      <svg className={`w-3 h-3 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
      </svg>
    );
  };

  const onlineCount = clusters.filter(c => c.status === 'online').length;
  const offlineCount = clusters.filter(c => c.status !== 'online').length;

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6 transition-colors duration-300">Dashboard</h1>

      {/* Status Cards */}
      <section className="flex space-x-4 mb-8">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 w-40 shadow-sm flex flex-col justify-between transition-colors duration-300">
          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Online</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-xl font-semibold text-slate-800 dark:text-slate-100">{onlineCount}</span>
            <span className="ml-1 text-sm text-slate-400 dark:text-slate-500">clusters</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 w-40 shadow-sm flex flex-col justify-between transition-colors duration-300">
          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Offline</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-xl font-semibold text-slate-800 dark:text-slate-100">{offlineCount}</span>
            <span className="ml-1 text-sm text-slate-400 dark:text-slate-500">clusters</span>
          </div>
        </div>
      </section>

      {/* Cluster Table */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden transition-colors duration-300">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-xs">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('name')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('name')}
                  <span>Cluster name</span>
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('version')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('version')}
                  <span>Version</span>
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('brokerCount')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('brokerCount')}
                  <span>Brokers count</span>
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('onlinePartitionCount')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('onlinePartitionCount')}
                  <span>Partitions</span>
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('topicCount')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('topicCount')}
                  <span>Topics</span>
                </div>
              </th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => requestSort('status')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('status')}
                  <span>Status</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100 dark:divide-slate-700">
            {sortedClusters.map((cluster) => (
              <tr key={cluster.name} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <td className="px-4 py-4 font-medium text-slate-800 dark:text-slate-100">{cluster.name}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{cluster.version}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{cluster.brokerCount}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{cluster.onlinePartitionCount}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{cluster.topicCount}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${cluster.status === 'online' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    {cluster.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Dashboard;
