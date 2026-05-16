import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

interface Broker {
  id: number;
  host: string;
  port: number;
  rack: string | null;
  diskUsage: string;
  partitionsSkew: string;
  leaders: number;
  leaderSkew: string;
  onlinePartitions: number;
  isController: boolean;
}

interface BrokerMetrics {
  brokerCount: number;
  activeControllerId: number;
  version: string;
  onlinePartitions: number;
  totalPartitions: number;
  urp: number;
  inSyncReplicas: number;
  totalReplicas: number;
  outOfSyncReplicas: number;
}

const Brokers: React.FC = () => {
  const { clusterName } = useParams<{ clusterName: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [metrics, setMetrics] = useState<BrokerMetrics | null>(null);
  const [clusters, setClusters] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      try {
        // Fetch clusters list for sidebar
        const clustersRes = await fetch('/api/v1/clusters', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (clustersRes.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        if (clustersRes.ok) {
          const clustersData = await clustersRes.json();
          setClusters(clustersData);
        }

        // Mock data for Brokers as backend is not ready yet
        // In real app, we would fetch from `/api/v1/clusters/${clusterName}/brokers`
        setBrokers([
          {
            id: 1,
            host: '137.184.51.206',
            port: 24227,
            rack: 'sgp1',
            diskUsage: '6.37 KB, 59 segment(s)',
            partitionsSkew: '-',
            leaders: 30,
            leaderSkew: '1.70%',
            onlinePartitions: 59,
            isController: false
          },
          {
            id: 2,
            host: '157.245.118.96',
            port: 24227,
            rack: 'sgp1',
            diskUsage: '6.37 KB, 59 segment(s)',
            partitionsSkew: '-',
            leaders: 29,
            leaderSkew: '-1.70%',
            onlinePartitions: 59,
            isController: true
          }
        ]);

        setMetrics({
          brokerCount: 2,
          activeControllerId: 2,
          version: '1.0-UNKNOWN',
          onlinePartitions: 59,
          totalPartitions: 59,
          urp: 0,
          inSyncReplicas: 118,
          totalReplicas: 118,
          outOfSyncReplicas: 0
        });

      } catch (err) {
        console.error('Failed to fetch brokers data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clusterName, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Layout clusters={clusters}>
      <div className="max-w-[1600px] mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Brokers</h1>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Uptime Group */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Uptime</h3>
            <div className="flex bg-white border border-gray-200 rounded-lg shadow-sm divide-x divide-gray-100 overflow-hidden h-24">
              <div className="flex-1 flex flex-col justify-center px-6">
                <span className="text-xs text-gray-400 font-medium">Broker Count</span>
                <span className="text-lg font-semibold text-slate-800">{metrics?.brokerCount}</span>
              </div>
              <div className="flex-1 flex flex-col justify-center px-6">
                <span className="text-xs text-gray-400 font-medium">Active Controller</span>
                <span className="text-lg font-semibold text-slate-800">{metrics?.activeControllerId}</span>
              </div>
              <div className="flex-1 flex flex-col justify-center px-6">
                <span className="text-xs text-gray-400 font-medium">Version</span>
                <span className="text-lg font-semibold text-slate-800">{metrics?.version}</span>
              </div>
            </div>
          </div>

          {/* Partitions Group */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Partitions</h3>
            <div className="flex bg-white border border-gray-200 rounded-lg shadow-sm divide-x divide-gray-100 overflow-hidden h-24">
              <div className="flex-1 flex flex-col justify-center px-6">
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-400 font-medium">Online</span>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-lg font-semibold text-slate-800">{metrics?.onlinePartitions}</span>
                  <span className="text-xs text-gray-400 italic">of {metrics?.totalPartitions}</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center px-6">
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-400 font-medium">URP</span>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                </div>
                <span className="text-lg font-semibold text-slate-800">{metrics?.urp}</span>
              </div>
              <div className="flex-1 flex flex-col justify-center px-6">
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-400 font-medium">In Sync Replicas</span>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-lg font-semibold text-slate-800">{metrics?.inSyncReplicas}</span>
                  <span className="text-xs text-gray-400 italic">of {metrics?.totalReplicas}</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center px-6">
                <span className="text-xs text-gray-400 font-medium">Out Of Sync Replicas</span>
                <span className="text-lg font-semibold text-slate-800">{metrics?.outOfSyncReplicas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Brokers Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-400 font-medium">
                <th className="px-6 py-4">
                  <div className="flex items-center space-x-1 cursor-pointer">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z"></path>
                    </svg>
                    <span>Broker ID</span>
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center space-x-1 cursor-pointer">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z"></path>
                    </svg>
                    <span>Disk usage</span>
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center space-x-1 cursor-pointer">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z"></path>
                    </svg>
                    <span>Partitions skew</span>
                    <svg className="w-3.5 h-3.5 text-gray-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center space-x-1 cursor-pointer">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z"></path>
                    </svg>
                    <span>Leaders</span>
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center space-x-1 cursor-pointer">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z"></path>
                    </svg>
                    <span>Leader skew</span>
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center space-x-1 cursor-pointer">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z"></path>
                    </svg>
                    <span>Online partitions</span>
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center space-x-1 cursor-pointer">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z"></path>
                    </svg>
                    <span>Port</span>
                  </div>
                </th>
                <th className="px-6 py-4">
                  <div className="flex items-center space-x-1 cursor-pointer">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 10l5 5 5-5z"></path>
                    </svg>
                    <span>Host</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {brokers.map((broker) => (
                <tr key={broker.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 flex items-center space-x-2">
                    <span className="font-medium text-slate-800">{broker.id}</span>
                    {broker.isController && (
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                      </svg>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{broker.diskUsage}</td>
                  <td className="px-6 py-4 text-gray-400">{broker.partitionsSkew}</td>
                  <td className="px-6 py-4 text-slate-600">{broker.leaders}</td>
                  <td className="px-6 py-4 text-slate-600">{broker.leaderSkew}</td>
                  <td className="px-6 py-4 text-slate-600">{broker.onlinePartitions}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono">{broker.port}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono">{broker.host}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Brokers;
