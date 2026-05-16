import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';

interface Cluster {
  name: string;
  status: string;
  version: string;
  brokerCount: number;
  onlinePartitionCount: number;
  topicCount: number;
  lastError: string | null;
}

const Dashboard: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClusters = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('/api/v1/clusters', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setClusters(data);
        }
      } catch (err) {
        console.error('Failed to fetch clusters', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClusters();
  }, []);

  const onlineCount = clusters.filter(c => c.status === 'online').length;
  const offlineCount = clusters.filter(c => c.status !== 'online').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Layout clusters={clusters}>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Dashboard</h1>

      {/* Status Cards */}
      <section className="flex space-x-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4 w-40 shadow-sm flex flex-col justify-between">
          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Online</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-xl font-semibold text-slate-800">{onlineCount}</span>
            <span className="ml-1 text-sm text-slate-400">clusters</span>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 w-40 shadow-sm flex flex-col justify-between">
          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">Offline</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-xl font-semibold text-slate-800">{offlineCount}</span>
            <span className="ml-1 text-sm text-slate-400">clusters</span>
          </div>
        </div>
      </section>

      {/* Cluster Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white border-b border-gray-200 text-xs">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-500">Cluster name</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Version</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Brokers count</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Partitions</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Topics</th>
              <th className="px-4 py-3 font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {clusters.map((cluster) => (
              <tr key={cluster.name} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 font-medium text-slate-800">{cluster.name}</td>
                <td className="px-4 py-4">{cluster.version}</td>
                <td className="px-4 py-4">{cluster.brokerCount}</td>
                <td className="px-4 py-4">{cluster.onlinePartitionCount}</td>
                <td className="px-4 py-4">{cluster.topicCount}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${cluster.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {cluster.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default Dashboard;
