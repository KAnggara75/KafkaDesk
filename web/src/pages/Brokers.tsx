import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Broker {
  id: number;
  host: string;
  port: number;
  bytesInPerSec: number | null;
  bytesOutPerSec: number | null;
  partitionsLeader: number;
  partitions: number;
  inSyncPartitions: number;
  partitionsSkew: number | null;
  leadersSkew: number | null;
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      try {
        const brokersRes = await fetch(`/api/v1/clusters/${clusterName}/brokers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (brokersRes.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (brokersRes.ok) {
          const brokersData = await brokersRes.json();
          setBrokers(brokersData.brokers);

          setMetrics({
            brokerCount: brokersData.brokerCount,
            activeControllerId: 1,
            version: brokersData.version,
            onlinePartitions: brokersData.onlinePartitionCount,
            totalPartitions: brokersData.onlinePartitionCount + brokersData.offlinePartitionCount,
            urp: brokersData.underReplicatedPartitionCount,
            inSyncReplicas: brokersData.inSyncReplicasCount,
            totalReplicas: brokersData.inSyncReplicasCount + brokersData.outOfSyncReplicasCount,
            outOfSyncReplicas: brokersData.outOfSyncReplicasCount
          });
        }

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
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
              <th className="px-6 py-4">Partitions</th>
              <th className="px-6 py-4">In-Sync</th>
              <th className="px-6 py-4">Leaders</th>
              <th className="px-6 py-4">Partitions Skew</th>
              <th className="px-6 py-4">Leader Skew</th>
              <th className="px-6 py-4">Port</th>
              <th className="px-6 py-4">Host</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {brokers.map((broker) => (
              <tr key={broker.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-800">{broker.id}</span>
                </td>
                <td className="px-6 py-4 text-slate-600">{broker.partitions}</td>
                <td className="px-6 py-4 text-slate-600">{broker.inSyncPartitions}</td>
                <td className="px-6 py-4 text-slate-600">{broker.partitionsLeader}</td>
                <td className="px-6 py-4 text-slate-600">{broker.partitionsSkew !== null ? `${broker.partitionsSkew}%` : '-'}</td>
                <td className="px-6 py-4 text-slate-600">{broker.leadersSkew !== null ? `${broker.leadersSkew}%` : '-'}</td>
                <td className="px-6 py-4 text-slate-600 font-mono">{broker.port}</td>
                <td className="px-6 py-4 text-slate-600 font-mono">{broker.host}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Brokers;
