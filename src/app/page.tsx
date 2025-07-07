"use client";
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';

type HistoryEntry = {
  id: string;
  url: string;
  source?: string;
  medium?: string;
  campaign?: string;
  timestamp: string;
};

const sources = [
  'google', 'twitter', 'linkedin', 'instagram', 'youtube', 'signature', 'newsletter',
  'referral', 'direct', 'affiliate', 'display', 'partner', 'webinar', 'outreach', 'drip'
];

const mediums = [
  'social', 'paid_social', 'email', 'paid_ad', 'banner', 'video', 'referral',
  'organic', 'print', 't-shirt', 'podcast', 'influencer', 'signature', 'event'
];

export default function Page() {
  const [baseURL, setBaseURL] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [generatedURL, setGeneratedURL] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [filterCategory] = useState<'all' | 'source' | 'medium' | 'campaign' | 'url'>('all');
  const [search, setSearch] = useState('');
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
  // Date filter/sort state
  const [dateSort, setDateSort] = useState<'latest' | 'oldest'>('latest');
  const [monthFilter, setMonthFilter] = useState('');
  // Sort/filter by field
  const [sortField, setSortField] = useState<'all' | 'source' | 'medium' | 'campaign' | 'url'>('all');
  const [fieldFilter, setFieldFilter] = useState('');
  const [historyLimit, setHistoryLimit] = useState(10);

  // Custom sources/mediums (persisted)
  const [customSources, setCustomSources] = useState<string[]>([]);
  const [customMediums, setCustomMediums] = useState<string[]>([]);
  const [showCustomSourceInput, setShowCustomSourceInput] = useState(false);
  const [showCustomMediumInput, setShowCustomMediumInput] = useState(false);
  const [newCustomSource, setNewCustomSource] = useState('');
  const [newCustomMedium, setNewCustomMedium] = useState('');

  // Replace localStorage history logic with API calls
  useEffect(() => {
    async function fetchHistory() {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    }
    fetchHistory();
  }, []);

  // Load custom sources/mediums from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cs = localStorage.getItem('customSources');
      if (cs) setCustomSources(JSON.parse(cs));
      const cm = localStorage.getItem('customMediums');
      if (cm) setCustomMediums(JSON.parse(cm));
    }
  }, []);

  // Save custom sources/mediums to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('customSources', JSON.stringify(customSources));
      localStorage.setItem('customMediums', JSON.stringify(customMediums));
    }
  }, [customSources, customMediums]);

  useEffect(() => {
    if (baseURL && source && medium) {
      try {
        const url = new URL(baseURL);
        url.searchParams.set('utm_source', source);
        url.searchParams.set('utm_medium', medium);
        if (campaign) {
          url.searchParams.set('utm_campaign', campaign);
        } else {
          url.searchParams.delete('utm_campaign');
        }
        setGeneratedURL(url.toString());
      } catch {
        setGeneratedURL('');
      }
    } else {
      setGeneratedURL('');
    }
  }, [baseURL, source, medium, campaign]);

  const saveToHistory = async () => {
    if (!generatedURL) return;
    const newEntry = {
      id: uuidv4(),
      url: generatedURL,
      source,
      medium,
      campaign,
      timestamp: new Date().toISOString()
    };
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });
    if (res.ok) {
      setHistory(prev => [newEntry, ...prev]);
    }
  };

  const deleteFromHistory = async (id: string) => {
    const res = await fetch('/api/history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      setHistory(prev => prev.filter(h => h.id !== id));
    }
  };

  // Helper to extract base URL (without UTM params)
  function getBaseUrl(fullUrl: string) {
    try {
      const url = new URL(fullUrl);
      url.search = '';
      return url.toString().replace(/\/?$/, ''); // remove trailing slash for consistency
    } catch {
      return fullUrl;
    }
  }

  let filteredHistory = [...history];
  // Filter by month
  if (monthFilter) {
    filteredHistory = filteredHistory.filter(h => {
      const d = new Date(h.timestamp);
      const m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      return m === monthFilter;
    });
  }
  // Filter by field
  if (sortField !== 'all' && fieldFilter) {
    filteredHistory = filteredHistory.filter(h => {
      if (sortField === 'url') return getBaseUrl(h.url) === fieldFilter;
      return h[sortField] === fieldFilter;
    });
  }
  // Filter by campaign/url (legacy filter bar)
  if (filter) {
    filteredHistory = filteredHistory.filter(h => {
      if (filterCategory === 'campaign') {
        return h.campaign && h.campaign.toLowerCase().includes(filter.toLowerCase());
      } else if (filterCategory === 'url') {
        return getBaseUrl(h.url).toLowerCase().includes(filter.toLowerCase());
      }
      return false;
    });
  }
  // Search
  if (search) {
    filteredHistory = filteredHistory.filter(h =>
      (h.url && h.url.toLowerCase().includes(search.toLowerCase())) ||
      (h.source && h.source.toLowerCase().includes(search.toLowerCase())) ||
      (h.medium && h.medium.toLowerCase().includes(search.toLowerCase())) ||
      (h.campaign && h.campaign.toLowerCase().includes(search.toLowerCase()))
    );
  }
  // Sort by date
  filteredHistory.sort((a, b) => {
    if (dateSort === 'latest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
  });
  // Sort by field (always ascending)
  if (sortField !== 'all') {
    filteredHistory.sort((a, b) => {
      let aVal = '', bVal = '';
      if (sortField === 'url') {
        aVal = getBaseUrl(a.url);
        bVal = getBaseUrl(b.url);
      } else if (sortField === 'source' || sortField === 'medium' || sortField === 'campaign') {
        aVal = a[sortField] || '';
        bVal = b[sortField] || '';
      }
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  }

  // Get unique months for month filter
  const monthOptions = Array.from(new Set(history.map(h => {
    const d = new Date(h.timestamp);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  })));
  // Get unique values for sort/filter fields
  const sourceOptions = Array.from(new Set(history.map(h => h.source).filter(Boolean)));
  const mediumOptions = Array.from(new Set(history.map(h => h.medium).filter(Boolean)));
  const campaignOptions = Array.from(new Set(history.map(h => h.campaign).filter(Boolean)));
  const urlOptions = Array.from(new Set(history.map(h => getBaseUrl(h.url)).filter(Boolean)));

  const handleCopy = () => {
    if (generatedURL) {
      navigator.clipboard.writeText(generatedURL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleCopyHistory = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedHistoryId(id);
    setTimeout(() => setCopiedHistoryId(null), 1200);
  };

  const allSources = [...sources, ...customSources];
  const allMediums = [...mediums, ...customMediums];

  const handleAddCustomSource = () => {
    if (newCustomSource && !allSources.includes(newCustomSource)) {
      setCustomSources(prev => [...prev, newCustomSource]);
      setSource(newCustomSource);
    }
    setShowCustomSourceInput(false);
    setNewCustomSource('');
  };
  const handleAddCustomMedium = () => {
    if (newCustomMedium && !allMediums.includes(newCustomMedium)) {
      setCustomMediums(prev => [...prev, newCustomMedium]);
      setMedium(newCustomMedium);
    }
    setShowCustomMediumInput(false);
    setNewCustomMedium('');
  };

  // When filters/search change, reset historyLimit
  useEffect(() => {
    setHistoryLimit(10);
  }, [filter, search, monthFilter, fieldFilter, sortField]);

  // Get latest entry's month and year
  const latestEntry = history.length > 0 ? history.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] : null;
  // NOTE: For true automatic versioning, use the build or git commit date instead of latest UTM entry.
  let latestLabel = '';
  if (latestEntry) {
    const d = new Date(latestEntry.timestamp);
    latestLabel = `Version: ${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-100 flex flex-col items-center justify-center py-8 px-2">
      {latestLabel && (
        <div className="mb-4 text-center text-xs text-gray-500 font-semibold tracking-wide">
          {latestLabel}
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
        <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 lg:max-h-[90vh] lg:overflow-auto">
          <div className="flex justify-center mb-1">
            <Image src="/logo.png" alt="Logo" width={112} height={112} className="object-contain" />
          </div>
          <h1 className="text-4xl font-comfortaa text-center mb-8 text-blue-700 leading-tight">UTM Link Builder</h1>
          <div className="space-y-4">
            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base"
              placeholder="Base URL (e.g. https://example.com)"
              value={baseURL}
              onChange={e => setBaseURL(e.target.value)}
            />

            <div className="flex gap-4">
              <div className="w-1/2">
                <select className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 text-base" value={showCustomSourceInput ? 'custom' : source} onChange={e => {
                  if (e.target.value === 'custom') {
                    setShowCustomSourceInput(true);
                  } else {
                    setSource(e.target.value);
                  }
                }}>
                  <option value="">Select Source</option>
                  {allSources.map(src => <option key={src} value={src}>{src}</option>)}
                  <option value="custom">Add custom…</option>
                </select>
                {showCustomSourceInput && (
                  <div className="flex mt-2 gap-2">
                    <input
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-gray-900 text-base"
                      placeholder="Enter custom source"
                      value={newCustomSource}
                      onChange={e => setNewCustomSource(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddCustomSource(); }}
                      autoFocus
                    />
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm font-semibold"
                      onClick={handleAddCustomSource}
                    >Add</button>
                    <button
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
                      onClick={() => { setShowCustomSourceInput(false); setNewCustomSource(''); }}
                    >Cancel</button>
                  </div>
                )}
              </div>
              <div className="w-1/2">
                <select className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 text-base" value={showCustomMediumInput ? 'custom' : medium} onChange={e => {
                  if (e.target.value === 'custom') {
                    setShowCustomMediumInput(true);
                  } else {
                    setMedium(e.target.value);
                  }
                }}>
                  <option value="">Select Medium</option>
                  {allMediums.map(med => <option key={med} value={med}>{med}</option>)}
                  <option value="custom">Add custom…</option>
                </select>
                {showCustomMediumInput && (
                  <div className="flex mt-2 gap-2">
                    <input
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-gray-900 text-base"
                      placeholder="Enter custom medium"
                      value={newCustomMedium}
                      onChange={e => setNewCustomMedium(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddCustomMedium(); }}
                      autoFocus
                    />
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm font-semibold"
                      onClick={handleAddCustomMedium}
                    >Add</button>
                    <button
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
                      onClick={() => { setShowCustomMediumInput(false); setNewCustomMedium(''); }}
                    >Cancel</button>
                  </div>
                )}
              </div>
            </div>

            <input
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base"
              placeholder="Campaign (optional)"
              value={campaign}
              onChange={e => setCampaign(e.target.value)}
            />
          </div>

          {/* Always visible output box */}
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl shadow-md mt-8 min-h-[56px] flex items-center">
            <p className={`break-words font-semibold text-base w-full ${generatedURL ? 'text-gray-900' : 'text-gray-400'}`}>{generatedURL || 'Your UTM link will appear here...'}</p>
          </div>

          {/* Minimalistic buttons below the box */}
          <div className="flex gap-3 justify-center mt-3">
            <button
              className="flex items-center gap-2 border border-blue-500 text-blue-700 px-4 py-1.5 rounded-full font-medium shadow-sm transition text-base hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCopy}
              disabled={!generatedURL}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v2" /></svg>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              className="flex items-center gap-2 border border-green-500 text-green-700 px-4 py-1.5 rounded-full font-medium shadow-sm transition text-base hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={saveToHistory}
              disabled={!generatedURL}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Save
            </button>
          </div>
        </div>
        <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 mt-10 lg:mt-0 h-fit">
          <h2 className="text-2xl font-comfortaa text-purple-700 leading-tight mb-4">History</h2>
          <div className="flex flex-wrap gap-2 items-center bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-4">
            <span className="text-sm text-purple-700 font-semibold mr-2">Sort/Filter by:</span>
            <select
              className="p-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900"
              value={sortField}
              onChange={e => {
                const val = e.target.value as typeof sortField;
                setSortField(val);
                setFieldFilter('');
              }}
            >
              <option value="all">All</option>
              <option value="source">Source</option>
              <option value="medium">Medium</option>
              <option value="campaign">Campaign</option>
              <option value="url">URL</option>
            </select>
            <select
              className="p-2 border border-gray-300 rounded-lg text-base w-40 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900"
              value={fieldFilter}
              onChange={e => {
                const val = e.target.value;
                setFieldFilter(val === '' ? '' : val);
              }}
              disabled={sortField === 'all'}
            >
              <option value="">All</option>
              {((sortField === 'source' ? sourceOptions : sortField === 'medium' ? mediumOptions : sortField === 'campaign' ? campaignOptions : sortField === 'url' ? urlOptions : [])
                .filter((opt): opt is string => typeof opt === 'string'))
                .map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            <button
              className="p-2 border border-gray-300 rounded-lg text-base text-gray-700 hover:bg-purple-100 ml-2"
              onClick={() => { setMonthFilter(''); setFieldFilter(''); setFilter(''); setSearch(''); setSortField('all'); }}
            >Clear</button>
          </div>
          {/* Minimal date controls below search, above history */}
          <div className="flex flex-wrap gap-2 items-center justify-end mb-4 text-xs text-gray-600">
            <span>Date:</span>
            <select
              className="p-1 border border-gray-200 rounded focus:outline-none text-xs text-gray-700"
              value={dateSort}
              onChange={e => setDateSort(e.target.value as 'latest' | 'oldest')}
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
            </select>
            <select
              className="p-1 border border-gray-200 rounded focus:outline-none text-xs text-gray-700"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
            >
              <option value="">All Months</option>
              {monthOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <input
            className="p-2 border border-gray-300 rounded-lg text-base w-full mb-6 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-900"
            placeholder="Search in history..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="space-y-3">
            {filteredHistory.length === 0 && (
              <div className="text-center text-gray-400 py-8 bg-white rounded-lg shadow-inner text-base">No history found.</div>
            )}
            {filteredHistory.slice(0, historyLimit).map(entry => (
              <div key={entry.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow hover:shadow-lg transition mb-2 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="overflow-hidden min-w-0">
                    <p className="truncate text-base text-gray-900 font-semibold max-w-xs">{entry.url}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {entry.source && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">Source: {entry.source}</span>
                      )}
                      {entry.medium && (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">Medium: {entry.medium}</span>
                      )}
                      {entry.campaign && (
                        <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full">Campaign: {entry.campaign}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 min-w-fit">
                    <p className="text-xs text-gray-500 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</p>
                    <div className="flex gap-2">
                      <button
                        className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-full transition relative"
                        title="Copy link"
                        onClick={() => handleCopyHistory(entry.url, entry.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/><rect x="3" y="3" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                        {copiedHistoryId === entry.id && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs rounded px-2 py-0.5 shadow">Copied!</span>
                        )}
                      </button>
                      <button
                        className="text-red-500 text-sm font-bold px-3 py-1.5 rounded-full hover:bg-red-50 transition shadow"
                        onClick={() => deleteFromHistory(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredHistory.length > historyLimit && (
            <div className="flex justify-center mt-4">
              <button
                className="px-6 py-2 bg-purple-100 text-purple-700 rounded-full font-semibold shadow hover:bg-purple-200 transition"
                onClick={() => setHistoryLimit(l => l + 10)}
              >
                Show More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
