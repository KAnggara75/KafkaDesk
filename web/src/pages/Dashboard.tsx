import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpAZ, faArrowDownZA, faArrowUp19, faArrowDown91, faUpDown } from '@fortawesome/free-solid-svg-icons';

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
	const [showOnlyOffline, setShowOnlyOffline] = useState(false);

	const sortedClusters = useMemo(() => {
		let result = [...clusters];

		if (showOnlyOffline) {
			result = result.filter(c => c.status !== 'online');
		}

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
	}, [clusters, sortConfig, showOnlyOffline]);

	const requestSort = (key: keyof Cluster) => {
		let direction: 'asc' | 'desc' = 'asc';
		if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
			direction = 'desc';
		}
		setSortConfig({ key, direction });
	};

	const getSortIcon = (key: keyof Cluster) => {
		const isActive = sortConfig?.key === key;
		if (!isActive) {
			return <FontAwesomeIcon icon={faUpDown} className="w-3 h-3 text-slate-300 opacity-50" />;
		}

		let icon;
		if (key === 'name' || key === 'status' || key === 'version') {
			icon = sortConfig.direction === 'asc' ? faArrowUpAZ : faArrowDownZA;
		} else {
			icon = sortConfig.direction === 'asc' ? faArrowUp19 : faArrowDown91;
		}

		return <FontAwesomeIcon icon={icon} className="w-3 h-3 text-indigo-600" />;
	};

	const onlineCount = clusters.filter(c => c.status === 'online').length;
	const offlineCount = clusters.filter(c => c.status !== 'online').length;

	return (
		<>
			<div className="flex items-center justify-between m-4 mb-2">
				<h1 className="text-xl text-dark dark:text-slate-100 transition-colors duration-300 select-none">Dashboard</h1>
				<div className="flex items-center space-x-4">
					<div className="flex items-center space-x-3">
						<label className="relative inline-flex items-center cursor-pointer select-none">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={showOnlyOffline}
								onChange={(e) => setShowOnlyOffline(e.target.checked)}
							/>
							<div className="w-11 h-6 bg-gray-200 dark:bg-darklight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div>
						</label>
						<span className="text-sm font-medium text-slate-600 dark:text-slate-400 select-none">Only offline clusters</span>
					</div>
				</div>
			</div>

			{/* Status Cards */}
			<section className="flex space-x-4 mb-8 select-none">
				<div className="bg-white dark:bg-dark border border-gray-200 dark:border-darklight rounded-lg p-2 w-40 shadow-sm flex flex-col justify-between transition-colors duration-300">
					<div className="mb-2">
						<span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Online</span>
					</div>
					<div className="flex items-baseline">
						<span className="text-xl font-semibold text-dark dark:text-slate-100">{onlineCount}</span>
						<span className="ml-1 text-sm text-slate-400 dark:text-slate-500">clusters</span>
					</div>
				</div>
				<div className="bg-white dark:bg-dark border border-gray-200 dark:border-darklight rounded-lg p-4 w-40 shadow-sm flex flex-col justify-between transition-colors duration-300">
					<div className="mb-2">
						<span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Offline</span>
					</div>
					<div className="flex items-baseline">
						<span className="text-xl font-semibold text-dark dark:text-slate-100">{offlineCount}</span>
						<span className="ml-1 text-sm text-slate-400 dark:text-slate-500">clusters</span>
					</div>
				</div>
			</section>

			{/* Cluster Table */}
			<div className="bg-white dark:bg-dark border border-gray-200 dark:border-darklight rounded-lg shadow-sm overflow-hidden transition-colors duration-300">
				<table className="w-full text-left border-collapse">
					<thead className="bg-white dark:bg-dark border-b border-gray-200 dark:border-darklight text-xs">
						<tr>
							<th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50 select-none" onClick={() => requestSort('name')}>
								<div className="flex items-center space-x-1">
									{getSortIcon('name')}
									<span>Cluster name</span>
								</div>
							</th>
							<th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50 select-none" onClick={() => requestSort('version')}>
								<div className="flex items-center space-x-1">
									{getSortIcon('version')}
									<span>Version</span>
								</div>
							</th>
							<th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50 select-none" onClick={() => requestSort('brokerCount')}>
								<div className="flex items-center space-x-1">
									{getSortIcon('brokerCount')}
									<span>Brokers count</span>
								</div>
							</th>
							<th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50 select-none" onClick={() => requestSort('onlinePartitionCount')}>
								<div className="flex items-center space-x-1">
									{getSortIcon('onlinePartitionCount')}
									<span>Partitions</span>
								</div>
							</th>
							<th className="px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:bg-slate-50 select-none" onClick={() => requestSort('topicCount')}>
								<div className="flex items-center space-x-1">
									{getSortIcon('topicCount')}
									<span>Topics</span>
								</div>
							</th>
							<th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-darklight select-none" onClick={() => requestSort('status')}>
								<div className="flex items-center space-x-1">
									{getSortIcon('status')}
									<span>Status</span>
								</div>
							</th>
						</tr>
					</thead>
					<tbody className="text-sm divide-y divide-gray-100 dark:divide-darklight">
						{sortedClusters.map((cluster) => (
							<tr key={cluster.name} className="hover:bg-gray-50 dark:hover:bg-darklight transition-colors">
								<td className="px-4 py-4 font-medium text-dark dark:text-slate-100">{cluster.name}</td>
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
