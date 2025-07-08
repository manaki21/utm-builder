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
  bitly_url?: string;
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

  // Populate mock data if running locally and Supabase env vars are missing
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setHistory([
        {
          id: '1',
          url: 'https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=spring&utm_term=shoes&utm_content=ad1',
          source: 'google',
          medium: 'cpc',
          campaign: 'spring',
          term: 'shoes',
          content: 'ad1',
          bitly_url: 'https://bit.ly/abc123',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
        },
        {
          id: '2',
          url: 'https://example.com/?utm_source=twitter&utm_medium=social&utm_campaign=launch&utm_term=promo&utm_content=organic',
          source: 'twitter',
          medium: 'social',
          campaign: 'launch',
          term: 'promo',
          content: 'organic',
          bitly_url: 'https://bit.ly/xyz789',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
        },
        {
          id: '3',
          url: 'https://example.com/?utm_source=linkedin&utm_medium=email&utm_campaign=b2b&utm_term=lead&utm_content=drip',
          source: 'linkedin',
          medium: 'email',
          campaign: 'b2b',
          term: 'lead',
          content: 'drip',
          bitly_url: '',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
        },
        {
          id: '4',
          url: 'https://example.com/?utm_source=instagram&utm_medium=paid_social&utm_campaign=summer&utm_term=swim&utm_content=carousel',
          source: 'instagram',
          medium: 'paid_social',
          campaign: 'summer',
          term: 'swim',
          content: 'carousel',
          bitly_url: 'https://bit.ly/insta456',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString()
        },
        {
          id: '5',
          url: 'https://example.com/?utm_source=newsletter&utm_medium=email&utm_campaign=weekly&utm_term=update&utm_content=footer',
          source: 'newsletter',
          medium: 'email',
          campaign: 'weekly',
          term: 'update',
          content: 'footer',
          bitly_url: '',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
        },
        {
          id: '6',
          url: 'https://example.com/?utm_source=affiliate&utm_medium=referral&utm_campaign=partner&utm_term=bonus&utm_content=sidebar',
          source: 'affiliate',
          medium: 'referral',
          campaign: 'partner',
          term: 'bonus',
          content: 'sidebar',
          bitly_url: 'https://bit.ly/aff321',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString()
        }
      ]);
    }
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

  // Add state for search and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filtering and sorting logic
  const filteredHistory = history.filter(h => {
    const q = searchQuery.toLowerCase();
    return (
      (h.url && h.url.toLowerCase().includes(q)) ||
      (h.source && h.source.toLowerCase().includes(q)) ||
      (h.medium && h.medium.toLowerCase().includes(q)) ||
      (h.campaign && h.campaign.toLowerCase().includes(q)) ||
      (h.term && h.term.toLowerCase().includes(q)) ||
      (h.content && h.content.toLowerCase().includes(q)) ||
      (h.bitly_url && h.bitly_url.toLowerCase().includes(q))
    );
  });
  filteredHistory.sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    switch (sortColumn) {
      case 'url':
        aVal = a.url || '';
        bVal = b.url || '';
        break;
      case 'bitly_url':
        aVal = a.bitly_url || '';
        bVal = b.bitly_url || '';
        break;
      case 'source':
        aVal = a.source || '';
        bVal = b.source || '';
        break;
      case 'medium':
        aVal = a.medium || '';
        bVal = b.medium || '';
        break;
      case 'campaign':
        aVal = a.campaign || '';
        bVal = b.campaign || '';
        break;
      case 'term':
        aVal = a.term || '';
        bVal = b.term || '';
        break;
      case 'content':
        aVal = a.content || '';
        bVal = b.content || '';
        break;
      case 'timestamp':
      default:
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

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
  }, [searchQuery, monthOptions, sourceOptions, mediumOptions, campaignOptions, urlOptions, sortColumn, sortDirection]);

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
      Shortlink: entry.bitly_url || '',
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

  const [bitlyLoading, setBitlyLoading] = useState(false);
  const [bitlyResult, setBitlyResult] = useState<{ url: string; duplicate: boolean } | null>(null);
  // Tabs: All, UTM Links, Shortlinks
  const [historyTab] = useState<'all' | 'utm' | 'shortlinks'>('all');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [shortlinks, setShortlinks] = useState<{ utm_url: string; bitly_url: string; created_at: string }[]>([]);

  // Fetch shortlinks for the tab
  useEffect(() => {
    if (historyTab === 'shortlinks') {
      fetch('/api/bitly?all=1').then(res => res.json()).then(data => {
        if (Array.isArray(data)) setShortlinks(data);
      });
    }
  }, [historyTab]);

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
    // Update history entry in Supabase and local state
    if (data.bitly_url) {
      // Find the history entry by url
      const entry = history.find(h => h.url === generatedURL);
      if (entry) {
        // Update in Supabase
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...entry, bitly_url: data.bitly_url })
        });
        // Update in local state
        setHistory(prev => prev.map(h => h.url === generatedURL ? { ...h, bitly_url: data.bitly_url } : h));
      } else {
        // If not found, add a new entry
        const newEntry = {
          id: uuidv4(),
          url: generatedURL,
          source,
          medium,
          campaign,
          term,
          content,
          timestamp: new Date().toISOString(),
          bitly_url: data.bitly_url
        };
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry)
        });
        setHistory(prev => [newEntry, ...prev]);
      }
    }
  };

  // Filter history for the selected tab
  let displayedHistory = filteredHistory;
  if (historyTab === 'utm') {
    displayedHistory = filteredHistory.filter(h => !h.bitly_url);
  } else if (historyTab === 'shortlinks') {
    displayedHistory = filteredHistory.filter(h => h.bitly_url);
  }

  const [copied, setCopied] = useState(false);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-100 flex flex-col lg:flex-row items-start justify-center py-4 sm:py-8 px-1 sm:px-2 gap-4 lg:gap-8 relative mt-20 sm:mt-24">
      {/* Add a top header bar */}
      <div className="w-full flex items-center justify-between px-3 sm:px-8 py-2 sm:py-3 bg-white/80 border-b border-gray-200 shadow-sm fixed top-0 left-0 z-40 backdrop-blur">
        <div className="flex items-center gap-2 sm:gap-3">
          <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" />
          <span className="text-lg sm:text-xl font-bold text-blue-700 tracking-tight">UTM Builder</span>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-500 font-semibold tracking-wide select-none">{latestLabel}</div>
      </div>
      {/* Full-width tutorial banner overlay */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-2 sm:px-0">
          <div className="w-full max-w-lg sm:max-w-2xl mx-auto bg-gradient-to-r from-blue-100 via-purple-50 to-pink-100 border border-purple-200 rounded-2xl shadow-2xl p-4 sm:p-10 flex flex-col gap-3 relative animate-fade-in">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-purple-600 text-xl font-bold focus:outline-none"
              onClick={handleDismissTutorial}
              title="Dismiss tutorial"
            >
              ×
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-purple-700 mb-2">Welcome to the UTM Link Builder!</h2>
            <p className="text-sm sm:text-base text-gray-700 mb-4">Easily create, save, and manage UTM links for your campaigns. Here’s what you can do:</p>
            <ul className="list-disc pl-5 sm:pl-7 text-sm sm:text-base text-gray-700 space-y-2">
              <li>Build UTM links with custom parameters and advanced fields.</li>
              <li>Instantly copy your UTM link or generate a Bitly shortlink.</li>
              <li>View, filter, and manage your link history in the table.</li>
              <li>Export your history to Excel for reporting or sharing.</li>
            </ul>
          </div>
        </div>
      )}
      {/* Need Help button (floating, bottom right) */}
      {!showTutorial && (
        <button
          className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 z-50 flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full shadow-xl text-sm sm:text-base font-semibold hover:from-purple-600 hover:to-blue-600 focus:outline-none animate-pulse-slow"
          style={{ boxShadow: '0 4px 16px rgba(80,0,120,0.18)' }}
          onClick={() => setShowTutorial(true)}
          title="Show tutorial"
        >
          <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10a4 4 0 118 0c0 2-2 3-2 3m-2 4h.01" /></svg>
          Need Help?
        </button>
      )}
      {/* Left: UTM Link Builder with stepper and wider column */}
      <div className="w-full max-w-full sm:max-w-md bg-white rounded-2xl shadow-2xl p-4 sm:p-8 border border-gray-100 flex-shrink-0 relative mb-4 lg:mb-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-center mb-4 text-blue-700 leading-tight tracking-tight relative">
          UTM Link Builder
          <span className="block w-8 sm:w-12 h-1 mx-auto mt-2 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></span>
        </h1>
        {/* Stepper under heading */}
        <div className="flex justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className={`flex flex-col items-center ${step === 1 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}> 
            <div className={`rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center border-2 ${step === 1 ? 'border-purple-500 bg-white focus-pulse' : 'border-gray-300 bg-gray-100'}`}>1</div>
            <span className="text-[10px] sm:text-xs mt-1">URL</span>
          </div>
          <div className="h-6 sm:h-7 w-6 sm:w-8 border-t-2 border-gray-200 mt-3"></div>
          <div className={`flex flex-col items-center ${step === 2 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}> 
            <div className={`rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center border-2 ${step === 2 ? 'border-purple-500 bg-white focus-pulse' : 'border-gray-300 bg-gray-100'}`}>2</div>
            <span className="text-[10px] sm:text-xs mt-1">Source</span>
          </div>
          <div className="h-6 sm:h-7 w-6 sm:w-8 border-t-2 border-gray-200 mt-3"></div>
          <div className={`flex flex-col items-center ${step === 3 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}> 
            <div className={`rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center border-2 ${step === 3 ? 'border-purple-500 bg-white focus-pulse' : 'border-gray-300 bg-gray-100'}`}>3</div>
            <span className="text-[10px] sm:text-xs mt-1">Medium</span>
          </div>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <input
            className={`w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base ${step === 1 ? 'focus-pulse border-purple-500' : ''}`}
            placeholder="Base URL (e.g. https://example.com)"
            value={baseURL}
            onChange={e => setBaseURL(e.target.value)}
          />
          <div className="space-y-2 sm:space-y-3">
            <select
              className={`w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-gray-900 text-base ${step === 2 ? 'focus-pulse border-purple-500' : ''}`}
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
                  className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold"
                  onClick={handleAddCustomSource}
                >Add</button>
                <button
                  className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-semibold"
                  onClick={() => { setShowCustomSourceInput(false); setNewCustomSource(''); }}
                >Cancel</button>
              </div>
            )}
            <select
              className={`w-full p-2 sm:p-3 border border-gray-300 rounded-lg text-gray-900 text-base ${step === 3 ? 'focus-pulse border-purple-500' : ''}`}
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
                  className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold"
                  onClick={handleAddCustomMedium}
                >Add</button>
                <button
                  className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-semibold"
                  onClick={() => { setShowCustomMediumInput(false); setNewCustomMedium(''); }}
                >Cancel</button>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-1 sm:mt-2">
            {!showAdvanced && (
              <button
                className="text-blue-500 text-xs sm:text-sm font-semibold flex items-center gap-1 hover:underline"
                onClick={() => setShowAdvanced(true)}
                type="button"
              >
                <span className="text-lg font-bold">+</span> Add advanced UTM fields
              </button>
            )}
          </div>
          {showAdvanced && (
            <div className="space-y-1 sm:space-y-2 mt-1 sm:mt-2">
              <input
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base"
                placeholder="Campaign (utm_campaign, optional)"
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
              />
              <input
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base"
                placeholder="Term (utm_term, optional)"
                value={term}
                onChange={e => setTerm(e.target.value)}
              />
              <input
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-gray-900 text-base"
                placeholder="Content (utm_content, optional)"
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              <button
                className="text-blue-500 text-[11px] sm:text-xs font-semibold hover:underline mt-1"
                onClick={() => setShowAdvanced(false)}
                type="button"
              >Hide advanced fields</button>
            </div>
          )}
        </div>
        <div className="bg-blue-50 border border-blue-200 p-3 sm:p-5 rounded-xl shadow-md mt-6 sm:mt-8 min-h-[48px] sm:min-h-[56px] flex items-center">
          <p className={`break-words font-semibold text-sm sm:text-base w-full ${generatedURL ? 'text-gray-900' : 'text-gray-400'}`}>{generatedURL || 'Your UTM link will appear here...'}</p>
        </div>
        <div className="flex gap-2 sm:gap-3 justify-center mt-2 sm:mt-3 items-center flex-wrap">
          <button
            className={`flex items-center gap-2 border border-[#ee6123] text-[#ee6123] bg-white px-3 sm:px-4 py-1.5 rounded-full font-medium shadow-sm transition text-sm sm:text-base hover:bg-[#ee6123] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ee6123] disabled:opacity-50 disabled:cursor-not-allowed h-9 sm:h-10`}
            onClick={handleBitly}
            disabled={!generatedURL || bitlyLoading}
            title="Shorten with Bitly"
          >
            Bitly
          </button>
          <button
            className={`flex items-center gap-2 border border-blue-500 text-blue-700 px-3 sm:px-4 py-1.5 rounded-full font-medium shadow-sm transition text-sm sm:text-base hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed h-9 sm:h-10`}
            onClick={handleCopy}
            disabled={!generatedURL}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v2" /></svg>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            className={`flex items-center gap-2 border border-green-500 text-green-700 px-3 sm:px-4 py-1.5 rounded-full font-medium shadow-sm transition text-sm sm:text-base hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed h-9 sm:h-10`}
            onClick={saveToHistory}
            disabled={!generatedURL}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Save
          </button>
        </div>
        {bitlyResult && bitlyResult.url && (
          <div className="flex justify-center mt-2">
            <button
              className="inline-flex items-center gap-1 bg-orange-50 border border-[#ee6123] px-2 py-0.5 rounded-full min-w-0 flex-nowrap hover:bg-orange-100 transition relative"
              title="Copy shortlink"
              onClick={() => {
                navigator.clipboard.writeText(bitlyResult.url);
                setCopiedHistoryId('bitly-ui');
                setTimeout(() => setCopiedHistoryId(null), 1200);
              }}
              style={{ lineHeight: 0 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-4 w-4 flex-shrink-0" fill="#ee6123"><path d="M23.6 8.4c-2.1-2.1-5.5-2.1-7.6 0l-6.2 6.2c-2.1 2.1-2.1 5.5 0 7.6 2.1 2.1 5.5 2.1 7.6 0l1.2-1.2c.4-.4.4-1 0-1.4s-1-.4-1.4 0l-1.2 1.2c-1.3 1.3-3.3 1.3-4.6 0-1.3-1.3-1.3-3.3 0-4.6l6.2-6.2c1.3-1.3 3.3-1.3 4.6 0 1.3 1.3 1.3 3.3 0 4.6l-.7.7c-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0l.7-.7c2.1-2.1 2.1-5.5 0-7.6z"/></svg>
              <span style={{ color: '#ee6123', fontWeight: 600, fontSize: '0.95rem', lineHeight: '1.2', display: 'inline-block', verticalAlign: 'middle' }}>Bitly</span>
              {copiedHistoryId === 'bitly-ui' && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#ee6123] text-white text-xs rounded px-2 py-0.5 shadow">Copied!</span>
              )}
            </button>
          </div>
        )}
      </div>
      {/* Right: History Table */}
      <div className="w-full flex-1 bg-white rounded-2xl shadow-2xl p-3 sm:p-6 border border-gray-100 overflow-x-auto">
        <div className="flex flex-col sm:flex-row items-center mb-3 sm:mb-4 gap-2 sm:gap-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-purple-700 leading-tight tracking-tight mb-1 sm:mb-2 text-left relative flex-shrink-0">
            History
            <span className="block w-8 sm:w-10 h-1 mt-1 rounded-full bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400"></span>
          </h2>
          <div className="flex-grow"></div>
          <input
            type="text"
            className="max-w-[120px] sm:max-w-xs px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
            placeholder="Search history..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ minWidth: 100 }}
          />
          <button
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 border border-green-500 text-green-700 bg-white rounded-full text-xs sm:text-sm font-medium shadow-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-300 transition ml-1 sm:ml-2 flex-shrink-0"
            onClick={handleExportExcel}
            type="button"
            title="Export to Excel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[600px] sm:min-w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                {[
                  { key: 'url', label: 'UTM Link' },
                  { key: 'bitly_url', label: 'Bitly' },
                  { key: 'source', label: 'Source' },
                  { key: 'medium', label: 'Medium' },
                  { key: 'campaign', label: 'Campaign' },
                  { key: 'term', label: 'Term' },
                  { key: 'content', label: 'Content' },
                  { key: 'timestamp', label: 'Date' },
                  { key: 'actions', label: 'Actions', sortable: false },
                ].map(col => (
                  <th
                    key={col.key}
                    className={`px-2 sm:px-3 py-2 font-semibold text-gray-700 border-b cursor-pointer select-none ${col.sortable === false ? '' : 'hover:text-purple-700'}`}
                    onClick={() => {
                      if (col.sortable === false) return;
                      if (sortColumn === col.key) {
                        setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortColumn(col.key);
                        setSortDirection('asc');
                      }
                    }}
                  >
                    {col.label}
                    {col.sortable === false ? null : sortColumn === col.key ? (
                      <span className="ml-1 text-[10px] sm:text-xs">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <span className="ml-1 text-[10px] sm:text-xs text-gray-300">▲▼</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedHistory.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-6 sm:py-8 bg-white rounded-lg shadow-inner text-xs sm:text-base">No history found.</td>
                </tr>
              )}
              {displayedHistory.slice(0, historyLimit).map((entry, idx) => (
                <tr key={entry.id} className={`hover:bg-blue-50 transition ${entry.id === newlyAddedId ? 'bg-green-50 border-green-400 animate-fade-highlight' : ''} ${idx !== displayedHistory.slice(0, historyLimit).length - 1 ? 'border-b border-gray-200' : ''}`}>
                  {/* UTM Link */}
                  <td className="px-2 sm:px-3 py-2 align-middle max-w-[180px] sm:max-w-[340px] whitespace-nowrap">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 font-semibold hover:underline max-w-[120px] sm:max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap"
                        title={entry.url}
                        style={{ display: 'inline-block', verticalAlign: 'middle' }}
                      >
                        {entry.url}
                      </a>
                      <button
                        className="inline-flex items-center gap-1 bg-blue-50 border border-blue-400 px-1 sm:px-2 py-0.5 rounded-full hover:bg-blue-100 transition text-blue-700 font-semibold text-[11px] sm:text-xs"
                        title="Copy UTM link"
                        onClick={() => handleCopyHistory(entry.url, entry.id)}
                        style={{ lineHeight: 1 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#2563eb"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="#2563eb" strokeWidth="2" fill="none"/><rect x="3" y="3" width="13" height="13" rx="2" ry="2" stroke="#2563eb" strokeWidth="2" fill="none"/></svg>
                        Copy
                        {copiedHistoryId === entry.id && (
                          <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs rounded px-2 py-0.5 shadow">Copied!</span>
                        )}
                      </button>
                    </div>
                  </td>
                  {/* Bitly Link */}
                  <td className="px-2 sm:px-3 py-2 align-middle max-w-[100px] sm:max-w-[180px] whitespace-nowrap">
                    {entry.bitly_url && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <a
                          href={entry.bitly_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#ee6123] font-semibold hover:underline max-w-[80px] sm:max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap"
                          title={entry.bitly_url}
                          style={{ display: 'inline-block', verticalAlign: 'middle' }}
                        >
                          {entry.bitly_url}
                        </a>
                        <button
                          className="inline-flex items-center gap-1 bg-orange-50 border border-[#ee6123] px-1 sm:px-2 py-0.5 rounded-full hover:bg-orange-100 transition text-[#ee6123] font-semibold text-[11px] sm:text-xs"
                          title="Copy shortlink"
                          onClick={() => handleCopyHistory(entry.bitly_url!, entry.id + '-bitly')}
                          style={{ lineHeight: 1 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" fill="#ee6123"><path d="M23.6 8.4c-2.1-2.1-5.5-2.1-7.6 0l-6.2 6.2c-2.1 2.1-2.1 5.5 0 7.6 2.1 2.1 5.5 2.1 7.6 0l1.2-1.2c.4-.4.4-1 0-1.4s-1-.4-1.4 0l-1.2 1.2c-1.3 1.3-3.3 1.3-4.6 0-1.3-1.3-1.3-3.3 0-4.6l6.2-6.2c1.3-1.3 3.3-1.3 4.6 0 1.3 1.3 1.3 3.3 0 4.6l-.7.7c-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0l.7-.7c2.1-2.1 2.1-5.5 0-7.6z"/></svg>
                          Copy
                          {copiedHistoryId === entry.id + '-bitly' && (
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#ee6123] text-white text-xs rounded px-2 py-0.5 shadow">Copied!</span>
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                  {/* Source */}
                  <td className="px-2 sm:px-3 py-2 align-middle whitespace-nowrap">
                    <span className="text-blue-700 font-semibold">{entry.source}</span>
                  </td>
                  {/* Medium */}
                  <td className="px-2 sm:px-3 py-2 align-middle whitespace-nowrap">
                    <span className="text-green-700 font-semibold">{entry.medium}</span>
                  </td>
                  {/* Campaign */}
                  <td className="px-2 sm:px-3 py-2 align-middle whitespace-nowrap">
                    <span className="text-purple-700 font-semibold">{entry.campaign}</span>
                  </td>
                  {/* Term */}
                  <td className="px-2 sm:px-3 py-2 align-middle whitespace-nowrap">
                    <span className="text-yellow-700 font-semibold">{entry.term}</span>
                  </td>
                  {/* Content */}
                  <td className="px-2 sm:px-3 py-2 align-middle whitespace-nowrap">
                    <span className="text-pink-700 font-semibold">{entry.content}</span>
                  </td>
                  {/* Date */}
                  <td className="px-2 sm:px-3 py-2 align-middle whitespace-nowrap text-[10px] sm:text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</td>
                  {/* Actions */}
                  <td className="px-2 sm:px-3 py-2 align-middle whitespace-nowrap">
                    <button
                      className="text-red-500 text-xs font-bold px-2 sm:px-3 py-1 rounded-full hover:bg-red-50 transition shadow-sm"
                      onClick={() => deleteFromHistory(entry.id)}
                      style={{ fontSize: '0.95rem' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayedHistory.length > historyLimit && (
          <div className="flex justify-center mt-3 sm:mt-4">
            <button
              className="px-4 sm:px-6 py-2 bg-purple-100 text-purple-700 rounded-full font-semibold shadow hover:bg-purple-200 transition"
              onClick={() => setHistoryLimit(l => l + 10)}
            >
              Show More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
