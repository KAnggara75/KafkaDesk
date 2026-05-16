import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpShortWide, faArrowDownShortWide } from '@fortawesome/free-solid-svg-icons';

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

type SortConfig = {
  key: keyof Broker;
  direction: 'asc' | 'desc';
} | null;

interface CacheEntry {
  brokers: Broker[];
  metrics: BrokerMetrics | null;
  timestamp: number;
}

const brokersCache: Record<string, CacheEntry> = {};
const CACHE_TTL = 60 * 1000; // 1 minute

const Brokers: React.FC = () => {
  const { clusterName } = useParams<{ clusterName: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [metrics, setMetrics] = useState<BrokerMetrics | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'asc' });

  const fetchData = useCallback(async (force = false) => {
    if (!clusterName) return;

    const now = Date.now();
    const cached = brokersCache[clusterName];
    if (!force && cached && (now - cached.timestamp < CACHE_TTL)) {
      setBrokers(cached.brokers);
      setMetrics(cached.metrics);
      setLoading(false);
      return;
    }

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
        const newBrokers = brokersData.brokers;
        const newMetrics = {
          brokerCount: brokersData.brokerCount,
          activeControllerId: 1,
          version: brokersData.version,
          onlinePartitions: brokersData.onlinePartitionCount,
          totalPartitions: brokersData.onlinePartitionCount + brokersData.offlinePartitionCount,
          urp: brokersData.underReplicatedPartitionCount,
          inSyncReplicas: brokersData.inSyncReplicasCount,
          totalReplicas: brokersData.inSyncReplicasCount + brokersData.outOfSyncReplicasCount,
          outOfSyncReplicas: brokersData.outOfSyncReplicasCount
        };

        setBrokers(newBrokers);
        setMetrics(newMetrics);

        // Update Cache
        brokersCache[clusterName] = {
          brokers: newBrokers,
          metrics: newMetrics,
          timestamp: Date.now()
        };
      }

    } catch (err) {
      console.error('Failed to fetch brokers data', err);
    } finally {
      setLoading(false);
    }
  }, [clusterName, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedBrokers = useMemo(() => {
    const sortableItems = [...brokers];
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
  }, [brokers, sortConfig]);

  const requestSort = (key: keyof Broker) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Broker) => {
    const isActive = sortConfig?.key === key;
    const direction = isActive ? sortConfig.direction : 'asc';
    const icon = direction === 'asc' ? faArrowUpShortWide : faArrowDownShortWide;

    return (
      <FontAwesomeIcon
        icon={icon}
        className={`w-3 h-3 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-300'}`}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">Brokers</h1>
        <button
          onClick={() => fetchData(true)}
          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          title="Refresh Data"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Uptime Group */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-3 transition-colors duration-300">Uptime</h3>
          <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm divide-x divide-gray-100 dark:divide-slate-700 overflow-hidden h-24 transition-colors duration-300">
            <div className="flex-1 flex flex-col justify-center px-6">
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Broker Count</span>
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{metrics?.brokerCount}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center px-6">
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Active Controller</span>
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{metrics?.activeControllerId}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center px-6">
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Version</span>
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{metrics?.version}</span>
            </div>
          </div>
        </div>

        {/* Partitions Group */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-3 transition-colors duration-300">Partitions</h3>
          <div className="flex bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm divide-x divide-gray-100 dark:divide-slate-700 overflow-hidden h-24 transition-colors duration-300">
            <div className="flex-1 flex flex-col justify-center px-6">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Online</span>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{metrics?.onlinePartitions}</span>
                <span className="text-xs text-gray-400 dark:text-slate-500 italic">of {metrics?.totalPartitions}</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center px-6">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">URP</span>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              </div>
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{metrics?.urp}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center px-6">
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">In Sync Replicas</span>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{metrics?.inSyncReplicas}</span>
                <span className="text-xs text-gray-400 dark:text-slate-500 italic">of {metrics?.totalReplicas}</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center px-6">
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Out Of Sync Replicas</span>
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{metrics?.outOfSyncReplicas}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brokers Table */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden transition-colors duration-300">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => requestSort('id')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('id')}
                  <span>Broker ID</span>
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('partitions')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('partitions')}
                  <span>Partitions</span>
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('inSyncPartitions')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('inSyncPartitions')}
                  <span>In-Sync</span>
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('partitionsLeader')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('partitionsLeader')}
                  <span>Leaders</span>
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('partitionsSkew')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('partitionsSkew')}
                  <span>Partitions Skew</span>
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50" onClick={() => requestSort('leadersSkew')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('leadersSkew')}
                  <span>Leader Skew</span>
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => requestSort('port')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('port')}
                  <span>Port</span>
                </div>
              </th>
              <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => requestSort('host')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('host')}
                  <span>Host</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
            {sortedBrokers.map((broker) => (
              <tr key={broker.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{broker.id}</span>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{broker.partitions}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{broker.inSyncPartitions}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{broker.partitionsLeader}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{broker.partitionsSkew !== null ? `${broker.partitionsSkew}%` : '-'}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{broker.leadersSkew !== null ? `${broker.leadersSkew}%` : '-'}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">{broker.port}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">{broker.host}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Brokers;
