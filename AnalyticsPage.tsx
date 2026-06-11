import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Platform, SocialAccount, SocialHistoryPoint } from './types';
import { PLATFORM_LOGOS } from './constants';
import { 
  ArrowUpIcon, ArrowDownIcon, PlusIcon, TrashIcon, 
  FunnelIcon, CalendarIcon, ServerIcon, SparklesIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Precise time ranges (last 7, 14, or 30 days)
type DateRange = '7d' | '14d' | '30d';
type SelectedMetric = 'followers' | 'engagementRate' | 'reach' | 'impressions' | 'clicks';

export default function AnalyticsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & metrics selections
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'All'>('All');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [activeMetric, setActiveMetric] = useState<SelectedMetric>('followers');
  const [showAddModal, setShowAddModal] = useState(false);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{ date: string; value: number; x: number; y: number } | null>(null);

  // Modal Form State
  const [newHandle, setNewHandle] = useState('');
  const [newPlatform, setNewPlatform] = useState<Platform>(Platform.FACEBOOK);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch connected accounts for this user
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, 'socialAccounts'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as SocialAccount);
      setAccounts(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error loading social accounts: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper: generates realistic historical trends for 30 days
  const generateMockHistory = (platform: Platform): SocialHistoryPoint[] => {
    const result: SocialHistoryPoint[] = [];
    const baseFollowers = platform === Platform.FACEBOOK ? 12400
                        : platform === Platform.INSTAGRAM ? 28500
                        : platform === Platform.TIKTOK ? 43200
                        : 8900;

    let currentFollowers = baseFollowers;
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Daily fluctuation patterns
      const growth = Math.floor(Math.random() * 200) + 50;
      currentFollowers += growth;

      const engagement = parseFloat((3.5 + Math.random() * 5).toFixed(2));
      const reach = Math.floor(Math.random() * 8000) + 1500;
      const impressions = Math.floor(reach * (1.3 + Math.random() * 0.5));
      const clicks = Math.floor(reach * (0.05 + Math.random() * 0.08));

      result.push({
        date: dateStr,
        followers: currentFollowers,
        engagementRate: engagement,
        reach,
        impressions,
        clicks
      });
    }
    return result;
  };

  // Connect new social account action
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser || !newHandle.trim()) return;

    setIsSubmitting(true);
    try {
      const cleanHandle = newHandle.startsWith('@') ? newHandle.trim() : `@${newHandle.trim()}`;
      const accountId = `ACC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const historyPoints = generateMockHistory(newPlatform);
      const latest = historyPoints[historyPoints.length - 1];

      const newAccountObj: SocialAccount = {
        id: accountId,
        userId: currentUser.uid,
        platform: newPlatform,
        handle: cleanHandle,
        connectedAt: new Date().toISOString(),
        followers: latest.followers,
        engagementRate: latest.engagementRate,
        reach: latest.reach,
        impressions: latest.impressions,
        clicks: latest.clicks,
        historyJson: JSON.stringify(historyPoints),
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanHandle}`
      };

      await setDoc(doc(db, 'socialAccounts', accountId), newAccountObj);
      
      // Reset form
      setNewHandle('');
      setShowAddModal(false);
    } catch (err) {
      console.error("Error setting account in Firestore: ", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disconnect social account action
  const handleDisconnect = async (accountId: string) => {
    if (!window.confirm("Are you sure you want to disconnect this social account? Analytics will be lost.")) return;
    try {
      await deleteDoc(doc(db, 'socialAccounts', accountId));
    } catch (err) {
      console.error("Error deleting social account: ", err);
    }
  };

  // Standardize the metrics processing based on select filters
  const filteredAccounts = accounts.filter(acc => selectedPlatform === 'All' || acc.platform === selectedPlatform);

  // Compute aggregated KPIs
  const totalConnected = filteredAccounts.length;

  const aggregatedKPIs = (() => {
    let followersTotal = 0;
    let totalER = 0;
    let reachTotal = 0;
    let impTotal = 0;
    let clicksTotal = 0;

    filteredAccounts.forEach(acc => {
      // Parse historical points to filter by date range
      const history: SocialHistoryPoint[] = JSON.parse(acc.historyJson || '[]');
      const limit = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
      const pointsSlice = history.slice(-limit);

      if (pointsSlice.length > 0) {
        const latestPoint = pointsSlice[pointsSlice.length - 1];
        followersTotal += latestPoint.followers;
        totalER += latestPoint.engagementRate;
        
        pointsSlice.forEach(pt => {
          reachTotal += pt.reach;
          impTotal += pt.impressions;
          clicksTotal += pt.clicks;
        });
      }
    });

    const averageER = totalConnected > 0 ? parseFloat((totalER / totalConnected).toFixed(2)) : 0;

    return {
      followers: followersTotal,
      engagementRate: averageER,
      reach: reachTotal,
      impressions: impTotal,
      clicks: clicksTotal
    };
  })();

  // Produce Daily Aggregated Data points for charts
  const chartPoints: { date: string; value: number }[] = (() => {
    if (totalConnected === 0) return [];

    const limit = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
    const datePointsMap: Record<string, { total: number; count: number }> = {};

    filteredAccounts.forEach(acc => {
      const history: SocialHistoryPoint[] = JSON.parse(acc.historyJson || '[]');
      const pointsSlice = history.slice(-limit);

      pointsSlice.forEach(pt => {
        if (!datePointsMap[pt.date]) {
          datePointsMap[pt.date] = { total: 0, count: 0 };
        }
        let ptValue = pt[activeMetric];
        datePointsMap[pt.date].total += ptValue;
        datePointsMap[pt.date].count += 1;
      });
    });

    return Object.entries(datePointsMap).map(([date, data]) => {
      // For engagement rate, show the average; others are cumulative totals
      const finalVal = activeMetric === 'engagementRate' ? parseFloat((data.total / data.count).toFixed(2)) : data.total;
      return { date, value: finalVal };
    });
  })();

  // Render responsive custom SVG Line and Area Chart
  const renderSVGChart = () => {
    if (chartPoints.length === 0) return null;

    const width = 800;
    const height = 320;
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const values = chartPoints.map(p => p.value);
    const maxVal = Math.max(...values, 1) * 1.1; // Add padding to top
    const minVal = Math.min(...values, 0);

    const getX = (index: number) => paddingLeft + (index / (chartPoints.length - 1)) * chartWidth;
    const getY = (val: number) => height - paddingBottom - ((val - minVal) / (maxVal - minVal)) * chartHeight;

    // Build the SVG path strings
    let linePath = '';
    let areaPath = '';

    chartPoints.forEach((p, index) => {
      const cx = getX(index);
      const cy = getY(p.value);

      if (index === 0) {
        linePath += `M ${cx} ${cy}`;
        areaPath += `M ${cx} ${height - paddingBottom} L ${cx} ${cy}`;
      } else {
        linePath += ` L ${cx} ${cy}`;
        areaPath += ` L ${cx} ${cy}`;
      }

      if (index === chartPoints.length - 1) {
        areaPath += ` L ${cx} ${height - paddingBottom} Z`;
      }
    });

    return (
      <div className="relative w-full overflow-x-auto select-none" onMouseLeave={() => setHoveredDataPoint(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[650px] font-sans">
          <defs>
            <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#E9D5FF" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const hRatio = paddingTop + ratio * chartHeight;
            const textVal = Math.round(maxVal - ratio * (maxVal - minVal));
            return (
              <g key={idx} className="opacity-30">
                <line 
                  x1={paddingLeft} 
                  y1={hRatio} 
                  x2={width - paddingRight} 
                  y2={hRatio} 
                  stroke="#ffffff" 
                  strokeDasharray="4 6" 
                  strokeWidth="0.8" 
                />
                <text 
                  x={paddingLeft - 12} 
                  y={hRatio + 4} 
                  fill="#9CA3AF" 
                  fontSize="10" 
                  textAnchor="end"
                  className="font-mono font-bold"
                >
                  {textVal >= 1000 ? `${(textVal / 1000).toFixed(1)}k` : textVal}
                </text>
              </g>
            );
          })}

          {/* Area under line */}
          <path d={areaPath} fill="url(#chartGlow)" />

          {/* Main trend line */}
          <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* X-axis labels */}
          {chartPoints.map((p, idx) => {
            // Show subselected labels based on range size to prevent overlapping
            const showLabel = dateRange === '7d' 
              ? true 
              : dateRange === '14d' 
                ? idx % 2 === 0 
                : idx % 4 === 0;

            if (!showLabel) return null;

            return (
              <text 
                key={idx} 
                x={getX(idx)} 
                y={height - 12} 
                fill="#6B7280" 
                fontSize="9" 
                textAnchor="middle" 
                className="font-bold uppercase tracking-wider"
              >
                {p.date}
              </text>
            );
          })}

          {/* Hover interactive nodes */}
          {chartPoints.map((p, idx) => {
            const cx = getX(idx);
            const cy = getY(p.value);

            return (
              <g key={idx} className="group cursor-pointer">
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r="6" 
                  fill="#8B5CF6" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
                />
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r="3.5" 
                  fill="#ffffff" 
                  stroke="#8B5CF6" 
                  strokeWidth="2" 
                />
                {/* Bigger invisible overlay trigger for easy hover touch */}
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r="15" 
                  fill="transparent" 
                  onMouseEnter={() => setHoveredDataPoint({
                    date: p.date,
                    value: p.value,
                    x: cx,
                    y: cy
                  })}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating custom tooltip */}
        <AnimatePresence>
          {hoveredDataPoint && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute z-10 bg-[#0D0F18]/95 border border-purple-500/30 p-4 rounded-2xl shadow-xl backdrop-blur-md text-white flex flex-col gap-1 text-[11px]"
              style={{ 
                left: `${(hoveredDataPoint.x / width) * 100}%`, 
                top: `${(hoveredDataPoint.y / height) * 100 - 24}%`, 
                transform: 'translateX(-50%)' 
              }}
            >
              <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider font-mono">{hoveredDataPoint.date}</span>
              <span className="text-sm font-black tracking-tight">{hoveredDataPoint.value.toLocaleString()} {activeMetric === 'engagementRate' ? '%' : ''}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-12 text-white animate-in fade-in duration-700">
      
      {/* Header and Add Account section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Social Analytics</h1>
          <p className="text-gray-500 text-xs font-black uppercase mt-2 tracking-widest">
            Monitor real-time engagement and growth trends across nodes
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-purple-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/20 hover:scale-105 transition-transform flex items-center gap-3 self-start md:self-auto"
        >
          <PlusIcon className="w-5 h-5" />
          Link Social Account
        </button>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-[#0D0F18] border border-white/5 rounded-[30px] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <span className="text-[10px] uppercase tracking-wider font-black text-gray-500 flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-purple-500" /> Platform:
          </span>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setSelectedPlatform('All')}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedPlatform === 'All' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
            >
              All
            </button>
            {Object.values(Platform).map(p => (
              <button 
                key={p}
                onClick={() => setSelectedPlatform(p)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectedPlatform === p ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
              >
                <span className="w-3.5 h-3.5 text-current">{PLATFORM_LOGOS[p]}</span>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <span className="text-[10px] uppercase tracking-wider font-black text-gray-500 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-purple-500" /> Range:
          </span>
          <div className="flex bg-white/5 p-1 rounded-xl">
            {(['7d', '14d', '30d'] as DateRange[]).map(range => (
              <button 
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${dateRange === range ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        // Empty State when no social accounts connected
        <div className="bg-[#0D0F18] rounded-[45px] border border-white/5 p-12 lg:p-20 text-center flex flex-col items-center justify-center space-y-6 shadow-2xl">
          <div className="w-24 h-24 bg-purple-600/10 rounded-full flex items-center justify-center border border-purple-500/20 shadow-lg mb-4 animate-pulse">
            <ChartBarIcon className="w-12 h-12 text-purple-500 animate-pulse" />
          </div>
          <h3 className="text-2xl font-black tracking-tight">No Connected Social Accounts</h3>
          <p className="text-xs text-gray-500 max-w-sm leading-relaxed font-semibold">
            Deploy analytical trackers onto your brand channels to inspect live metrics. Support for Facebook, Instagram, TikTok, and YouTube networks.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:bg-purple-700 hover:scale-105"
          >
            Connect Node
          </button>
        </div>
      ) : (
        <>
          {/* KPIs Section */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6">
            {[
              { id: 'followers', name: 'Follower Count', value: aggregatedKPIs.followers, isER: false },
              { id: 'engagementRate', name: 'Engagement Rate', value: aggregatedKPIs.engagementRate, isER: true },
              { id: 'reach', name: 'Total Reach', value: aggregatedKPIs.reach, isER: false },
              { id: 'impressions', name: 'Impressions', value: aggregatedKPIs.impressions, isER: false },
              { id: 'clicks', name: 'Link Clicks', value: aggregatedKPIs.clicks, isER: false }
            ].map(kpi => (
              <button 
                key={kpi.id}
                onClick={() => setActiveMetric(kpi.id as SelectedMetric)}
                className={`bg-[#0D0F18] p-6 rounded-[28px] border text-left transition-all relative overflow-hidden flex flex-col justify-between h-36 ${activeMetric === kpi.id ? 'border-purple-500 ring-2 ring-purple-600/20' : 'border-white/5 hover:border-purple-600/30'}`}
              >
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{kpi.name}</p>
                  <p className="text-2xl lg:text-3xl font-black tracking-tighter mt-1">
                    {kpi.isER ? `${kpi.value}%` : kpi.value.toLocaleString()}
                  </p>
                </div>
                {/* Micro trend tag */}
                <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full self-start flex items-center gap-1 uppercase tracking-tight">
                  <ArrowUpIcon className="w-2.5 h-2.5" /> +{(2 + Math.random() * 5).toFixed(1)}% Up
                </span>
                {activeMetric === kpi.id && (
                  <div className="absolute right-3 top-3 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                )}
              </button>
            ))}
          </div>

          {/* Chart Visualizer */}
          <div className="bg-[#0D0F18] border border-white/5 rounded-[45px] p-8 lg:p-12 shadow-2xl space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-purple-500">Live Metric Plotter</span>
                <h3 className="text-2xl font-black tracking-tight mt-1 capitalize">{activeMetric.replace(/([A-Z])/g, ' $1')} Distribution</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Aggregated Channel Terminal</span>
              </div>
            </div>

            <div className="py-2">
              {renderSVGChart()}
            </div>
          </div>

          {/* Connected Profiles List */}
          <div className="bg-[#0D0F18] p-8 lg:p-12 rounded-[45px] border border-white/5 shadow-2xl">
            <h3 className="text-2xl font-black tracking-tight mb-8">Connected Nodes Status</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              {filteredAccounts.map(acc => (
                <div key={acc.id} className="p-6 bg-[#161924] rounded-3xl border border-white/5 flex items-center justify-between group hover:border-purple-600/30 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <img src={acc.avatarUrl} alt={acc.handle} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10" />
                      <div className="absolute -bottom-1.5 -right-1.5 p-1 bg-[#161924] rounded-lg border border-white/5 text-purple-500">
                        <span className="w-4 h-4 flex items-center justify-center text-[10px]">{PLATFORM_LOGOS[acc.platform]}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-black">{acc.handle}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{acc.platform} Network • {acc.followers.toLocaleString()} trackers</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDisconnect(acc.id)}
                    className="p-3 bg-red-500/5 text-red-500 border border-transparent hover:border-red-500/20 rounded-2xl hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Disconnect Node"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {filteredAccounts.length === 0 && (
                <p className="col-span-2 text-center py-10 opacity-30 font-black italic">No matching connected accounts filtered.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Pop-up Link Node Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-[#0D0F18] border border-white/10 rounded-[35px] p-8 space-y-6 shadow-2xl text-white"
            >
              <div>
                <h3 className="text-2xl font-black tracking-tight">Connect Brand Channel</h3>
                <p className="text-xs text-gray-500 font-semibold uppercase mt-1 tracking-widest">TomSociaGrow Tracker Node</p>
              </div>

              <form onSubmit={handleAddAccount} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Platform Network</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.values(Platform).map(p => (
                      <button 
                        type="button" 
                        key={p} 
                        onClick={() => setNewPlatform(p)} 
                        className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all ${newPlatform === p ? 'bg-purple-600 border-purple-500 scale-105' : 'bg-[#161924] border-transparent text-gray-500'}`}
                      >
                        <span className="w-5 h-5 text-current">{PLATFORM_LOGOS[p]}</span>
                        <span className="text-[8px] font-bold uppercase tracking-wider">{p}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Username / Handle</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="@username"
                    value={newHandle}
                    onChange={e => setNewHandle(e.target.value)}
                    className="w-full bg-[#161924] border border-white/5 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-purple-600 text-sm font-bold placeholder-gray-700" 
                  />
                </div>

                <div className="p-4 bg-purple-600/5 rounded-2xl border border-purple-500/10 text-[10px] text-gray-400 leading-relaxed italic flex gap-3">
                  <SparklesIcon className="w-5 h-5 text-purple-400 shrink-0" />
                  <span>Connecting will automatically register SMM tracker nodes and pull recent historical interaction metrics.</span>
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-950/40 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Linking...' : 'Link Node'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
