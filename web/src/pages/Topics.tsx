import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpAZ, faArrowDownZA, faArrowUp19, faArrowDown91, faUpDown } from '@fortawesome/free-solid-svg-icons';
import { LoadingScreen } from '../components/LoadingScreen';

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
	const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (activeDropdown && !(event.target as Element).closest('.dropdown-container')) {
				setActiveDropdown(null);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [activeDropdown]);

	const fetchData = useCallback(async (silent = false) => {
		if (!silent) setLoading(true);
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
			if (!silent) setLoading(false);
		}
	}, [clusterName, navigate]);

	useEffect(() => {
		fetchData();

		const interval = setInterval(() => {
			fetchData(true);
		}, 10000);

		return () => clearInterval(interval);
	}, [fetchData]);

	const requestSort = (key: keyof Topic) => {
		let direction: 'asc' | 'desc' = 'asc';
		if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
			direction = 'desc';
		}
		setSortConfig({ key, direction });
	};

	const getSortIcon = (key: keyof Topic) => {
		const isActive = sortConfig?.key === key;

		if (!isActive) {
			return (
				<FontAwesomeIcon
					icon={faUpDown}
					className="w-4 h-4 text-slate-300 opacity-50"
				/>
			);
		}

		let icon;
		if (key === 'name') {
			icon = sortConfig.direction === 'asc' ? faArrowUpAZ : faArrowDownZA;
		} else {
			icon = sortConfig.direction === 'asc' ? faArrowUp19 : faArrowDown91;
		}

		return (
			<FontAwesomeIcon
				icon={icon}
				className="w-4 h-4 text-indigo-600"
			/>
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
		return <LoadingScreen />;
	}

	return (
		<div className="mx-auto pb-20 transition-colors duration-300">
			<header className="flex items-center justify-between mb-4">
				<h1 className="text-xl ml-4 mt-4 text-slate-900 dark:text-slate-100 transition-colors duration-300">Topics</h1>
				<button className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm">
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
					<div className="relative flex-1 max-w-2xl ml-6">
						<span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
							</svg>
						</span>
						<input
							type="text"
							className="block w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-darklight rounded-md leading-5 bg-white dark:bg-dark placeholder-gray-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
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
							<div className="w-11 h-6 bg-gray-200 dark:bg-darklight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div>
						</label>
						<span className="text-sm font-medium text-slate-600 dark:text-slate-400">Show Internal Topics</span>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex space-x-2 ml-6">
					<button
						className={`px-4 py-2 border text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors ${isAnySelected ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30' : 'border-gray-400 dark:border-dark bg-gray-50 dark:bg-dark/50 text-gray-400 dark:text-slate-600 cursor-not-allowed'}`}
						disabled={!isAnySelected}
					>
						Delete selected topics ({selectedTopics.size})
					</button>
					<button
						className={`px-4 py-2 border text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors ${selectedTopics.size === 1 ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30' : 'border-gray-400 dark:border-dark bg-gray-50 dark:bg-dark/50 text-gray-400 dark:text-slate-600 cursor-not-allowed'}`}
						disabled={selectedTopics.size !== 1}
					>
						Copy selected topic
					</button>
					<button
						className={`px-4 py-2 border text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors ${isAnySelected ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30' : 'border-gray-400 dark:border-dark bg-gray-50 dark:bg-dark/50 text-gray-400 dark:text-slate-600 cursor-not-allowed'}`}
						disabled={!isAnySelected}
					>
						Purge messages
					</button>
				</div>
			</div>

			{/* Topics Table */}
			<div className="bg-white dark:bg-dark border-gray-200 dark:border-darklight border-dark shadow-sm transition-colors duration-300">
				<table className="min-w-full divide-y divide-gray-200 dark:divide-darklight">
					<thead className="bg-gray-50 dark:bg-dark/50">
						<tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
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
					<tbody className="bg-white dark:bg-dark divide-y divide-gray-100 dark:divide-darklight transition-colors duration-300">
						{filteredAndSortedTopics.length === 0 ? (
							<tr>
								<td colSpan={8} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 italic">
									No topics found
								</td>
							</tr>
						) : (
							filteredAndSortedTopics.map((topic) => (
								<tr key={topic.name} className={`hover:bg-gray-50 dark:hover:bg-darklight transition-colors ${selectedTopics.has(topic.name) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}>
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
												<span className="bg-slate-100 dark:bg-darklight text-slate-600 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 mr-2 uppercase transition-colors">IN</span>
											)}
											<span className="text-sm font-medium text-slate-900 dark:text-slate-100 transition-colors">{topic.name}</span>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 transition-colors">{topic.partitionCount}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 transition-colors">{topic.underReplicatedPartitions}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 transition-colors">{topic.replicationFactor}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 transition-colors">{topic.segmentCount}</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 transition-colors">{formatSize(topic.segmentSize)}</td>
									<td className="px-6 py-4 whitespace-nowrap text-right text-slate-400 relative dropdown-container">
										<button
											className="hover:text-slate-600 transition-colors p-1"
											onClick={() => setActiveDropdown(activeDropdown === topic.name ? null : topic.name)}
										>
											<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
												<path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
											</svg>
										</button>

										{activeDropdown === topic.name && (
											<div className="absolute right-6 top-10 w-48 bg-white dark:bg-dark border border-gray-200 dark:border-darklight rounded-md shadow-lg z-50 py-1.5 transition-colors duration-300">
												<button
													className={`w-full text-left px-4 py-2 text-sm transition-colors ${topic.internal ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-darklight dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-darklight'}`}
													disabled={topic.internal}
													title={topic.internal ? "Clearing messages is only allowed for regular topics" : ""}
												>
													Clear Messages
													{topic.internal && <span className="block text-[10px] text-gray-400 dark:text-slate-500">Not allowed for internal topics</span>}
												</button>
												<div className="border-t border-gray-100 dark:border-darklight my-1"></div>
												<button className="w-full text-left px-4 py-2 text-sm text-darklight dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-darklight transition-colors">
													Recreate Topic
												</button>
												<div className="border-t border-gray-100 dark:border-darklight my-1"></div>
												<button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors font-medium">
													Remove Topic
												</button>
											</div>
										)}
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
