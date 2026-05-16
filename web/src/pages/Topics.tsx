import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Topic {
  name: string;
  internal: boolean;
  partitionCount: number;
  replicationFactor: number;
  replicas: number;
  inSyncReplicas: number;
  segmentSize: number;
  segmentCount: number;
  underReplicatedPartitions: number;
  cleanUpPolicy: string;
}

type SortConfig = {
  key: keyof Topic;
  direction: 'asc' | 'desc';
} | null;

const Topics: React.FC = () => {
  const { clusterName } = useParams<{ clusterName: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInternal, setShowInternal] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/v1/clusters/${clusterName}/topics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setTopics(data.topics || []);
        }
      } catch (err) {
        console.error('Failed to fetch topics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clusterName, navigate]);

  const requestSort = (key: keyof Topic) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Topic) => {
    const isActive = sortConfig?.key === key;
    return (
      <svg className={`w-3 h-3 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 12l5 5 5-5H5z"></path>
        <path d="M15 8l-5-5-5 5h10z"></path>
      </svg>
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredAndSortedTopics = useMemo(() => {
    let result = topics.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesInternal = showInternal || !t.internal;
      return matchesSearch && matchesInternal;
    });

    if (sortConfig !== null) {
      result.sort((a, b) => {
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

    return result;
  }, [topics, searchQuery, showInternal, sortConfig]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTopics(new Set(filteredAndSortedTopics.map(t => t.name)));
    } else {
      setSelectedTopics(new Set());
    }
  };

  const toggleSelectTopic = (name: string) => {
    const newSelected = new Set(selectedTopics);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedTopics(newSelected);
  };

  const isAllSelected = filteredAndSortedTopics.length > 0 && selectedTopics.size === filteredAndSortedTopics.length;
  const isAnySelected = selectedTopics.size > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Topics</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center hover:bg-indigo-700 transition-colors shadow-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
          Add a Topic
        </button>
      </header>

      {/* Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </span>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-2 border border-gray-200 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
              placeholder="Search by Topic Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setSearchQuery('')}
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                </svg>
              </button>
            )}
          </div>
          {/* Internal Topics Toggle */}
          <div className="flex items-center space-x-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showInternal}
                onChange={(e) => setShowInternal(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div>
            </label>
            <span className="text-sm font-medium text-slate-600">Show Internal Topics</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 border text-xs font-semibold rounded-md uppercase tracking-wider transition-colors ${isAnySelected ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'}`}
            disabled={!isAnySelected}
          >
            Delete selected topics ({selectedTopics.size})
          </button>
          <button
            className={`px-4 py-2 border text-xs font-semibold rounded-md uppercase tracking-wider transition-colors ${selectedTopics.size === 1 ? 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'}`}
            disabled={selectedTopics.size !== 1}
          >
            Copy selected topic
          </button>
          <button
            className={`px-4 py-2 border text-xs font-semibold rounded-md uppercase tracking-wider transition-colors ${isAnySelected ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100' : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'}`}
            disabled={!isAnySelected}
          >
            Purge messages
          </button>
        </div>
      </div>

      {/* Topics Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('name')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('name')}
                  <span>Topic Name</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('partitionCount')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('partitionCount')}
                  <span>Partitions</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('underReplicatedPartitions')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('underReplicatedPartitions')}
                  <span>Out of sync replicas</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('replicationFactor')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('replicationFactor')}
                  <span>Replication Factor</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('segmentCount')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('segmentCount')}
                  <span>Number of messages</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('segmentSize')}>
                <div className="flex items-center space-x-1">
                  {getSortIcon('segmentSize')}
                  <span>Size</span>
                </div>
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredAndSortedTopics.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                  No topics found
                </td>
              </tr>
            ) : (
              filteredAndSortedTopics.map((topic) => (
                <tr key={topic.name} className={`hover:bg-gray-50 transition-colors ${selectedTopics.has(topic.name) ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                      checked={selectedTopics.has(topic.name)}
                      onChange={() => toggleSelectTopic(topic.name)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {topic.internal && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 mr-2 uppercase">IN</span>
                      )}
                      <span className="text-sm font-medium text-slate-900">{topic.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{topic.partitionCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{topic.underReplicatedPartitions}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{topic.replicationFactor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{topic.segmentCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{formatSize(topic.segmentSize)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-slate-400">
                    <button className="hover:text-slate-600 transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Topics;
