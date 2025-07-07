"use client";
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import * as XLSX from 'xlsx';

type HistoryEntry = {
  id: string;
  url: string;
  source?: string;
  medium?: string;
  campaign?: string;
  timestamp: string;
  term?: string;
  content?: string;
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

  // Advanced UTM fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');

  // Step state
  const [step, setStep] = useState(1);

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
        if (term) {
          url.searchParams.set('utm_term', term);
        } else {
          url.searchParams.delete('utm_term');
        }
        if (content) {
          url.searchParams.set('utm_content', content);
        } else {
          url.searchParams.delete('utm_content');
        }
        setGeneratedURL(url.toString());
      } catch {
        setGeneratedURL('');
      }
    } else {
      setGeneratedURL('');
    }
  }, [baseURL, source, medium, campaign, term, content]);

  // Step logic: advance as fields are filled
  useEffect(() => {
    if (!baseURL) setStep(1);
    else if (!source) setStep(2);
    else if (!medium) setStep(3);
    else setStep(4); // 4 = highlight buttons
  }, [baseURL, source, medium]);

  // Add state for newly added history highlight
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  useEffect(() => {
    if (newlyAddedId) {
      const timeout = setTimeout(() => setNewlyAddedId(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [newlyAddedId]);

  const saveToHistory = async () => {
    if (!generatedURL) return;
    const newEntry = {
      id: uuidv4(),
      url: generatedURL,
      source,
      medium,
      campaign,
      term,
      content,
      timestamp: new Date().toISOString()
    };
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });
    if (res.ok) {
      setHistory(prev => [newEntry, ...prev]);
      setStep(0); // End step-by-step
      setNewlyAddedId(newEntry.id); // Highlight new entry
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
      setStep(0); // End step-by-step
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

  // Add export to Excel function
  const handleExportExcel = () => {
    // Prepare data for export (all visible fields)
    const exportData = filteredHistory.map(entry => ({
      URL: entry.url,
      Source: entry.source || '',
      Medium: entry.medium || '',
      Campaign: entry.campaign || '',
      Term: entry.term || '',
      Content: entry.content || '',
      Timestamp: entry.timestamp
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'UTM History');
    XLSX.writeFile(workbook, 'utm-history.xlsx');
  };

  const [showTutorial, setShowTutorial] = useState(true);

  useEffect(() => {
    const tut = typeof window !== 'undefined' ? localStorage.getItem('utmTutorialDismissed') : null;
    if (tut === '1') setShowTutorial(false);
  }, []);
  const handleDismissTutorial = () => {
    setShowTutorial(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('utmTutorialDismissed', '1');
    }
  };

  const [activeTab, setActiveTab] = useState<'history' | 'shortlinks'>('history');
  const [bitlyLoading, setBitlyLoading] = useState(false);
  const [bitlyResult, setBitlyResult] = useState<{ url: string; duplicate: boolean } | null>(null);
  const [shortlinks, setShortlinks] = useState<{ utm_url: string; bitly_url: string; created_at: string }[]>([]);

  // Fetch shortlinks for the tab
  useEffect(() => {
    if (activeTab === 'shortlinks') {
      fetch('/api/bitly?all=1').then(res => res.json()).then(data => {
        if (Array.isArray(data)) setShortlinks(data);
      });
    }
  }, [activeTab]);

  // Bitly button handler
  const handleBitly = async () => {
    setBitlyLoading(true);
    setBitlyResult(null);
    const res = await fetch('/api/bitly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utm_url: generatedURL })
    });
    const data = await res.json();
    setBitlyLoading(false);
    if (data.bitly_url) setBitlyResult({ url: data.bitly_url, duplicate: data.duplicate });
    else setBitlyResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-100 flex flex-col items-center justify-center py-8 px-2">
      {showTutorial && (
        <div className="w-full max-w-3xl mx-auto mb-6 bg-gradient-to-r from-blue-100 via-purple-50 to-pink-100 border border-purple-200 rounded-xl shadow-lg p-5 flex flex-col gap-3 relative animate-fade-in">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-purple-600 text-xl font-bold focus:outline-none"
            onClick={handleDismissTutorial}
            title="Dismiss tutorial"
          >
            ×
          </button>
          <div className="flex items-center gap-3">
            <svg className="h-7 w-7 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h2 className="text-xl font-bold text-purple-700">Welcome to the UTM Link Builder!</h2>
          </div>
          <ul className="list-disc pl-7 text-base text-gray-700 space-y-1">
            <li><b>Enter your base URL</b> (e.g. https://example.com) and select <b>Source</b>, <b>Medium</b>, and (optionally) <b>Campaign</b>.</li>
            <li>Click <b>Save</b> to add the generated UTM link to your <b>shared team history</b>.</li>
            <li>Use the <b>+ Add advanced UTM fields</b> to add <b>Term</b> and <b>Content</b> if needed.</li>
            <li>Filter, search, and sort your history. <b>Export</b> your filtered results to Excel anytime.</li>
            <li>All changes are <b>shared instantly</b> with your team.</li>
          </ul>
          <div className="flex gap-2 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1"><svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6" /></svg>Click <b>+</b> for advanced fields</span>
            <span className="flex items-center gap-1"><svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01-8 0" /></svg>Export to Excel with the top-right button</span>
            <span className="flex items-center gap-1"><svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Dismiss this tutorial anytime</span>
          </div>
        </div>
      )}
      {latestLabel && (
        <div className="mb-4 text-center text-xs text-gray-500 font-semibold tracking-wide">
          {latestLabel}
        </div>
      )}
      {/* After the tutorial banner, add a floating 'Need Help?' button if the tutorial is dismissed */}
      {!showTutorial && (
        <button
          className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full shadow-xl text-base font-semibold hover:from-purple-600 hover:to-blue-600 focus:outline-none animate-pulse-slow"
          style={{ boxShadow: '0 4px 16px rgba(80,0,120,0.18)' }}
          onClick={() => setShowTutorial(true)}
          title="Show tutorial"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10a4 4 0 118 0c0 2-2 3-2 3m-2 4h.01" /></svg>
          Need Help?
        </button>
      )}
      {/* Add a stepper at the top */}
      <div className="w-full max-w-3xl mx-auto flex justify-center gap-4 mb-4 animate-fade-in">
        <div className={`flex flex-col items-center ${step === 1 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}>
          <div className={`rounded-full w-7 h-7 flex items-center justify-center border-2 ${step === 1 ? 'border-purple-500 bg-white focus-pulse' : 'border-gray-300 bg-gray-100'}`}>1</div>
          <span className="text-xs mt-1">URL</span>
        </div>
        <div className="h-7 w-8 border-t-2 border-gray-200 mt-3"></div>
        <div className={`flex flex-col items-center ${step === 2 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}>
          <div className={`rounded-full w-7 h-7 flex items-center justify-center border-2 ${step === 2 ? 'border-purple-500 bg-white focus-pulse' : 'border-gray-300 bg-gray-100'}`}>2</div>
          <span className="text-xs mt-1">Source</span>
        </div>
        <div className="h-7 w-8 border-t-2 border-gray-200 mt-3"></div>
        <div className={`flex flex-col items-center ${step === 3 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}>
          <div className={`rounded-full w-7 h-7 flex items-center justify-center border-2 ${step === 3 ? 'border-purple-500 bg-white focus-pulse' : 'border-gray-300 bg-gray-100'}`}>3</div>
          <span className="text-xs mt-1">Medium</span>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
        <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 lg:max-h-[90vh] lg:overflow-auto">
          <div className="flex justify-center mb-1">
            <Image src="/logo.png" alt="Logo" width={112} height={112} className="object-contain" />
          </div>
          <h1 className="text-4xl font-comfortaa text-center mb-8 text-blue-700 leading-tight">UTM Link Builder</h1>
          <div className="space-y-4">
            {/* Add animation and focus pulse to form fields */}
            <input
              className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base ${step === 1 ? 'focus-pulse border-purple-500' : ''}`}
              placeholder="Base URL (e.g. https://example.com)"
              value={baseURL}
              onChange={e => setBaseURL(e.target.value)}
            />

            <div className="flex gap-4">
              <div className="w-1/2">
                <select
                  className={`w-full p-3 border border-gray-300 rounded-lg text-gray-900 text-base ${step === 2 ? 'focus-pulse border-purple-500' : ''}`}
                  value={showCustomSourceInput ? 'custom' : source}
                  onChange={e => {
                    if (e.target.value === 'custom') {
                      setShowCustomSourceInput(true);
                    } else {
                      setSource(e.target.value);
                    }
                  }}
                >
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
                <select
                  className={`w-full p-3 border border-gray-300 rounded-lg text-gray-900 text-base ${step === 3 ? 'focus-pulse border-purple-500' : ''}`}
                  value={showCustomMediumInput ? 'custom' : medium}
                  onChange={e => {
                    if (e.target.value === 'custom') {
                      setShowCustomMediumInput(true);
                    } else {
                      setMedium(e.target.value);
                    }
                  }}
                >
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

            {/* Add animation and focus pulse to form fields */}
            {/* Remove Campaign from main form and step logic */}

            {/* In the form UI, add a + button to show advanced fields */}
            <div className="flex justify-end mt-2">
              {!showAdvanced && (
                <button
                  className="text-blue-500 text-sm font-semibold flex items-center gap-1 hover:underline"
                  onClick={() => setShowAdvanced(true)}
                  type="button"
                >
                  <span className="text-lg font-bold">+</span> Add advanced UTM fields
                </button>
              )}
            </div>
            {showAdvanced && (
              <div className="space-y-2 mt-2">
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base"
                  placeholder="Campaign (utm_campaign, optional)"
                  value={campaign}
                  onChange={e => setCampaign(e.target.value)}
                />
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base"
                  placeholder="Term (utm_term, optional)"
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                />
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base"
                  placeholder="Content (utm_content, optional)"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
                <button
                  className="text-blue-500 text-xs font-semibold hover:underline mt-1"
                  onClick={() => setShowAdvanced(false)}
                  type="button"
                >Hide advanced fields</button>
              </div>
            )}
          </div>

          {/* Always visible output box */}
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl shadow-md mt-8 min-h-[56px] flex items-center">
            <p className={`break-words font-semibold text-base w-full ${generatedURL ? 'text-gray-900' : 'text-gray-400'}`}>{generatedURL || 'Your UTM link will appear here...'}</p>
          </div>

          {/* Minimalistic buttons below the box */}
          <div className="flex gap-3 justify-center mt-3">
            <button
              className={`flex items-center gap-2 border border-[#ee6123] text-[#ee6123] bg-white px-4 py-1.5 rounded-full font-medium shadow-sm transition text-base hover:bg-[#ee6123] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ee6123] disabled:opacity-50 disabled:cursor-not-allowed`}
              onClick={handleBitly}
              disabled={!generatedURL || bitlyLoading}
              title="Shorten with Bitly"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-5 w-5" fill="#ee6123"><path d="M23.6 8.4c-2.1-2.1-5.5-2.1-7.6 0l-6.2 6.2c-2.1 2.1-2.1 5.5 0 7.6 2.1 2.1 5.5 2.1 7.6 0l1.2-1.2c.4-.4.4-1 0-1.4s-1-.4-1.4 0l-1.2 1.2c-1.3 1.3-3.3 1.3-4.6 0-1.3-1.3-1.3-3.3 0-4.6l6.2-6.2c1.3-1.3 3.3-1.3 4.6 0 1.3 1.3 1.3 3.3 0 4.6l-.7.7c-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0l.7-.7c2.1-2.1 2.1-5.5 0-7.6z"/></svg>
              {bitlyLoading ? 'Shortening...' : 'Shorten with Bitly'}
            </button>
            <button
              className={`flex items-center gap-2 border border-blue-500 text-blue-700 px-4 py-1.5 rounded-full font-medium shadow-sm transition text-base hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed ${step === 4 ? 'focus-pulse border-purple-500' : ''}`}
              onClick={handleCopy}
              disabled={!generatedURL}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v2" /></svg>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              className={`flex items-center gap-2 border border-green-500 text-green-700 px-4 py-1.5 rounded-full font-medium shadow-sm transition text-base hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed ${step === 4 ? 'focus-pulse border-purple-500' : ''}`}
              onClick={saveToHistory}
              disabled={!generatedURL}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Save
            </button>
          </div>
          {bitlyResult && (
            <div className={`mt-2 text-center text-base ${bitlyResult.duplicate ? 'text-yellow-600' : 'text-[#ee6123]'}`}>
              {bitlyResult.duplicate ? (
                <span>Shortlink already exists: <a href={bitlyResult.url} target="_blank" rel="noopener noreferrer" className="underline font-bold">{bitlyResult.url}</a></span>
              ) : (
                <span>Bitly shortlink: <a href={bitlyResult.url} target="_blank" rel="noopener noreferrer" className="underline font-bold">{bitlyResult.url}</a></span>
              )}
            </div>
          )}
        </div>
        <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 mt-10 lg:mt-0 h-fit animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-comfortaa text-purple-700 leading-tight">History</h2>
            <button
              className="flex items-center gap-1 px-3 py-1.5 border border-green-500 text-green-700 bg-white rounded-full text-sm font-medium shadow-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-300 transition"
              onClick={handleExportExcel}
              type="button"
              title="Export to Excel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Export
            </button>
          </div>
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
              <div
                key={entry.id}
                className={`bg-white border border-gray-200 p-4 rounded-xl shadow hover:shadow-lg transition mb-2 flex flex-col gap-2 ${entry.id === newlyAddedId ? 'bg-green-50 border-green-400 animate-fade-highlight' : ''}`}
              >
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
                      {entry.term && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">Term: {entry.term}</span>
                      )}
                      {entry.content && (
                        <span className="bg-pink-100 text-pink-800 text-xs font-semibold px-2 py-0.5 rounded-full">Content: {entry.content}</span>
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
