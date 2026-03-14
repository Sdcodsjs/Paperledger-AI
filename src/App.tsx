import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  BarChart3, 
  Settings, 
  Search, 
  Plus, 
  Mic, 
  MessageSquare, 
  ShieldAlert, 
  Download, 
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
  Database,
  Briefcase,
  Leaf,
  Calculator,
  FileJson,
  FileSpreadsheet,
  Repeat,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { cn } from './utils/cn';
import * as XLSX from 'xlsx';
import { extractDocumentData, extractFromText, askAboutDocuments } from './services/gemini';
import { exportToExcel, exportToCSV, exportToJSON, generateQuickBooksIIF } from './utils/export';

// --- Types ---
interface Document {
  id: string;
  vendor: string;
  date: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  invoiceNumber?: string;
  category: string;
  isFraudulent: boolean;
  fraudReason?: string;
  status: 'processed' | 'pending' | 'flagged';
  carbonFootprintKg?: number;
  taxDeductibleScore?: number;
  taxOptimizationTip?: string;
  isSubscription?: boolean;
  subscriptionFrequency?: string;
  confidenceScore?: number;
  vendorReliabilityScore?: number;
  smartTags?: string[];
  lineItems?: { description: string; amount: number }[];
  fileUrl?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

// --- Mock Data ---
const INITIAL_DOCS: Document[] = [
  { id: '1', vendor: 'Amazon Web Services', date: '2026-03-01', totalAmount: 450.20, taxAmount: 45.02, currency: 'USD', category: 'Cloud Infrastructure', isFraudulent: false, status: 'processed', carbonFootprintKg: 12.5, taxDeductibleScore: 95, taxOptimizationTip: "Fully deductible as operational software expense.", isSubscription: true, subscriptionFrequency: 'monthly', confidenceScore: 98, vendorReliabilityScore: 99, smartTags: ['Cloud', 'Infrastructure', 'Essential'] },
  { id: '2', vendor: 'Starbucks', date: '2026-03-05', totalAmount: 12.50, taxAmount: 1.25, currency: 'USD', category: 'Meals & Entertainment', isFraudulent: false, status: 'processed', carbonFootprintKg: 0.8, taxDeductibleScore: 50, taxOptimizationTip: "Only 50% deductible if for business meeting.", isSubscription: false, confidenceScore: 95, vendorReliabilityScore: 85, smartTags: ['Food', 'Meeting'] },
  { id: '3', vendor: 'Apple Inc.', date: '2026-03-08', totalAmount: 1299.00, taxAmount: 129.90, currency: 'USD', category: 'Hardware', isFraudulent: false, status: 'processed', carbonFootprintKg: 150.0, taxDeductibleScore: 100, taxOptimizationTip: "Capitalize as asset if over $2500, otherwise expense.", isSubscription: false, confidenceScore: 99, vendorReliabilityScore: 100, smartTags: ['Hardware', 'Asset'] },
  { id: '4', vendor: 'Suspicious Vendor', date: '2026-03-10', totalAmount: 5000.00, taxAmount: 0, currency: 'USD', category: 'Consulting', isFraudulent: true, fraudReason: 'Unusually high amount for new vendor', status: 'flagged', carbonFootprintKg: 0, taxDeductibleScore: 0, taxOptimizationTip: "Audit required before deduction.", isSubscription: false, confidenceScore: 45, vendorReliabilityScore: 20, smartTags: ['High Risk', 'Consulting'] },
  { id: '5', vendor: 'Adobe Creative Cloud', date: '2026-02-15', totalAmount: 52.99, taxAmount: 5.30, currency: 'USD', category: 'Software', isFraudulent: false, status: 'processed', carbonFootprintKg: 1.2, taxDeductibleScore: 100, taxOptimizationTip: "Standard business software deduction.", isSubscription: true, subscriptionFrequency: 'monthly', confidenceScore: 97, vendorReliabilityScore: 98, smartTags: ['Design', 'Software'] },
  { id: '6', vendor: 'Google Workspace', date: '2026-02-28', totalAmount: 12.00, taxAmount: 1.20, currency: 'USD', category: 'Software', isFraudulent: false, status: 'processed', carbonFootprintKg: 0.5, taxDeductibleScore: 100, taxOptimizationTip: "Standard business software deduction.", isSubscription: true, subscriptionFrequency: 'monthly', confidenceScore: 98, vendorReliabilityScore: 100, smartTags: ['Productivity', 'Email'] },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    aria-label={label}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200",
      active ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, trend, icon: Icon }: { label: string, value: string, trend: string, icon: any }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
        <Icon size={20} />
      </div>
      <span className={cn("text-xs font-medium px-2 py-1 rounded-full", trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
        {trend}
      </span>
    </div>
    <h3 className="text-zinc-400 text-sm font-medium mb-1">{label}</h3>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'chat' | 'sustainability' | 'tax' | 'subscriptions' | 'forecasting' | 'savings'>('dashboard');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMapping, setExportMapping] = useState<Record<string, string>>({
    vendor: 'Vendor Name',
    date: 'Transaction Date',
    totalAmount: 'Amount',
    category: 'Category',
    carbonFootprintKg: 'CO2 Impact (Kg)'
  });
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCS);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, completed: 0 });
  const [chatQuery, setChatQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [simulationParams, setSimulationParams] = useState({ growth: 0, reduction: 0 });
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'EUR' | 'INR' | 'GBP'>('USD');
  // Stable ref for the speech recognition instance so we can stop it
  const recognitionRef = useRef<any>(null);

  const exchangeRates = {
    USD: 1,
    EUR: 0.92,
    INR: 83.15,
    GBP: 0.78
  };

  const currencySymbols = {
    USD: '$',
    EUR: '€',
    INR: '₹',
    GBP: '£'
  };

  const formatCurrency = (amount: number) => {
    const converted = amount * exchangeRates[currencyMode];
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyMode,
    }).format(converted);
  };

  // --- Derived Data ---
  const categoryStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    documents.forEach(doc => {
      stats[doc.category] = (stats[doc.category] || 0) + doc.totalAmount;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [documents]);

  const totalSpend = React.useMemo(() => 
    documents.reduce((acc, doc) => acc + doc.totalAmount, 0), 
  [documents]);

  const taxRecoverable = React.useMemo(() => 
    documents.reduce((acc, doc) => acc + (doc.taxAmount || 0), 0), 
  [documents]);

  const totalSavings = React.useMemo(() => {
    const taxSavings = documents.reduce((acc, doc) => acc + (doc.taxAmount || 0), 0);
    const fraudAvoided = documents.filter(doc => doc.isFraudulent).reduce((acc, doc) => acc + doc.totalAmount, 0);
    return taxSavings + fraudAvoided;
  }, [documents]);

  const upcomingPayments = React.useMemo(() => {
    return documents
      .filter(doc => doc.isSubscription)
      .map(doc => {
        // Derive a deterministic day-offset from the doc id to avoid Math.random() in useMemo
        const seed = doc.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const daysOffset = (seed % 28) + 2; // 2–29 days from now
        const due = new Date();
        due.setDate(due.getDate() + daysOffset);
        return {
          id: doc.id,
          vendor: doc.vendor,
          amount: doc.totalAmount,
          dueDate: due.toISOString().split('T')[0],
          frequency: doc.subscriptionFrequency || 'Monthly'
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [documents]);

  const fraudCount = React.useMemo(() => 
    documents.filter(doc => doc.isFraudulent).length, 
  [documents]);

  const pendingCount = React.useMemo(() => 
    documents.filter(doc => doc.status === 'pending').length, 
  [documents]);

  // --- Handlers ---
  const onDrop = async (acceptedFiles: File[]) => {
    setIsUploading(true);
    setUploadProgress({ total: acceptedFiles.length, completed: 0 });
    setError(null);
    
    for (const file of acceptedFiles) {
      try {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel';

        let extracted: any;

        if (isExcel) {
          // Parse Excel to text and send as text prompt (Gemini doesn't support xlsx MIME)
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          let textContent = '';
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            textContent += `\n--- Sheet: ${sheetName} ---\n`;
            textContent += XLSX.utils.sheet_to_csv(sheet);
          });
          extracted = await extractFromText(textContent);
        } else {
          const reader = new FileReader();
          const filePromise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const base64 = await filePromise;
          const mimeType = file.type || 'application/octet-stream';
          extracted = await extractDocumentData(base64, mimeType);
        }
        
        if (!extracted || typeof extracted.totalAmount !== 'number') {
          throw new Error("Failed to extract valid data from document.");
        }

        const newDoc: Document = {
          id: Math.random().toString(36).substring(2, 11),
          vendor: extracted.vendor || 'Unknown Vendor',
          date: extracted.date || new Date().toISOString().split('T')[0],
          totalAmount: extracted.totalAmount,
          taxAmount: extracted.taxAmount || 0,
          currency: extracted.currency || 'USD',
          category: extracted.category || 'Uncategorized',
          isFraudulent: extracted.isFraudulent || false,
          fraudReason: extracted.fraudReason,
          status: extracted.isFraudulent ? 'flagged' : 'processed',
          carbonFootprintKg: extracted.carbonFootprintKg || 0,
          taxDeductibleScore: extracted.taxDeductibleScore || 0,
          taxOptimizationTip: extracted.taxOptimizationTip,
          isSubscription: extracted.isSubscription || false,
          subscriptionFrequency: extracted.subscriptionFrequency,
          confidenceScore: extracted.confidenceScore || 0,
          vendorReliabilityScore: extracted.vendorReliabilityScore || 0,
          smartTags: extracted.smartTags || [],
          lineItems: extracted.lineItems || [],
        };
        
        setDocuments(prev => [newDoc, ...prev]);
        setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
      } catch (err: any) {
        console.error("Upload failed:", err);
        setError(`Failed to process ${file.name}: ${err.message || 'Unknown error'}`);
      }
    }
    setIsUploading(false);
    setUploadProgress({ total: 0, completed: 0 });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'image/*': [], 
      'application/pdf': [],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    disabled: isUploading
  } as any);

  const handleChat = async () => {
    if (!chatQuery.trim() || isChatLoading) return;
    const userMsg = chatQuery;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }]);
    setChatQuery('');
    setIsChatLoading(true);
    try {
      const aiResponse = await askAboutDocuments(userMsg, documents);
      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse || "I couldn't process that.", timestamp: Date.now() }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'ai', text: `Error: ${err.message || "I'm having trouble connecting to my brain right now."}`, timestamp: Date.now() }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToCSV = () => {
    // Escape a CSV field: wrap in quotes and double any embedded quotes
    const escapeCSV = (val: any): string => {
      if (val == null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const keys = Object.keys(exportMapping);
    const headers = keys.map(k => escapeCSV(exportMapping[k])).join(',');
    const rows = documents.map(doc =>
      keys.map(key => escapeCSV((doc as any)[key])).join(',')
    ).join('\n');
    const csvContent = `${headers}\n${rows}`;
    if (!navigator.clipboard) {
      setError('Clipboard not available. Please use Export → CSV instead.');
      return;
    }
    navigator.clipboard.writeText(csvContent)
      .then(() => setError(null))
      .catch(() => setError('Failed to copy to clipboard. Your browser may require HTTPS for this feature.'));
  };

  const clearAllDocuments = () => {
    if (window.confirm("Are you sure you want to clear all documents? This cannot be undone.")) {
      setDocuments([]);
    }
  };

  const getDaysSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window)) {
      setError('Voice recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      // Stop the active recognition instance via the stable ref
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // @ts-ignore
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatQuery(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      setError('Failed to start voice input. Please try again.');
      setIsListening(false);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.vendor.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-200 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col p-6 gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Database className="text-black" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">PaperLedger</h1>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarItem icon={BarChart3} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={FileText} label="Documents" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
          <SidebarItem icon={MessageSquare} label="AI Assistant" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <SidebarItem icon={Leaf} label="Sustainability" active={activeTab === 'sustainability'} onClick={() => setActiveTab('sustainability')} />
          <SidebarItem icon={Calculator} label="Tax Optimizer" active={activeTab === 'tax'} onClick={() => setActiveTab('tax')} />
          <SidebarItem icon={Repeat} label="Subscriptions" active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')} />
          <SidebarItem icon={TrendingUp} label="Forecasting" active={activeTab === 'forecasting'} onClick={() => setActiveTab('forecasting')} />
          <SidebarItem icon={Leaf} label="Savings & Payments" active={activeTab === 'savings'} onClick={() => setActiveTab('savings')} />
        </nav>
        
        <div className="p-6 border-t border-zinc-800 space-y-3">
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center justify-center gap-2 w-full bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-all"
          >
            <Download size={18} />
            Export Data
          </button>
          <button 
            onClick={clearAllDocuments}
            className="flex items-center justify-center gap-2 w-full bg-zinc-800 text-zinc-400 font-bold py-3 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-all"
          >
            <X size={18} />
            Clear All
          </button>
        </div>

        <div className="mt-auto p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-500" />
            <div>
              <p className="text-sm font-medium text-white">Pro Plan</p>
              <p className="text-xs text-zinc-500">84% of limit used</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[84%]" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-[#050505]/80 backdrop-blur-xl border-b border-zinc-800 p-6 flex justify-between items-center">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search documents, vendors, or categories..." 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 mr-2">
              {(['USD', 'EUR', 'INR', 'GBP'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrencyMode(curr)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    currencyMode === curr ? "bg-emerald-500 text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {curr}
                </button>
              ))}
            </div>
            <button 
              onClick={() => exportToExcel(documents)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors text-sm font-medium"
            >
              <Download size={16} />
              Export Excel
            </button>
            <button 
              {...getRootProps()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-colors text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              <Plus size={18} />
              AI OCR Upload
              <input {...getInputProps()} />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 p-4 bg-rose-500/10 border border-rose-500/50 rounded-2xl flex items-center justify-between text-rose-400"
            >
              <div className="flex items-center gap-3">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Spend (All Time)" value={formatCurrency(totalSpend)} trend="+12.5%" icon={ArrowUpRight} />
                <StatCard label="Pending Approval" value={pendingCount.toString()} trend="-2" icon={Clock} />
                <StatCard label="Total Savings" value={formatCurrency(totalSavings)} trend="Optimized" icon={Leaf} />
                <StatCard label="Tax Recoverable" value={formatCurrency(taxRecoverable)} trend="+4.2%" icon={CheckCircle2} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold text-white">Spending Trends</h2>
                    <select className="bg-zinc-800 border-none rounded-lg text-sm px-3 py-1.5 focus:ring-0">
                      <option>All Categories</option>
                    </select>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold text-white">Category Mix</h2>
                    <div className="flex bg-zinc-800 rounded-lg p-1">
                      <button 
                        onClick={() => setCurrencyMode('USD')}
                        className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", currencyMode === 'USD' ? "bg-emerald-500 text-black" : "text-zinc-500")}
                      >
                        USD
                      </button>
                      <button 
                        onClick={() => setCurrencyMode('EUR')}
                        className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", currencyMode === 'EUR' ? "bg-emerald-500 text-black" : "text-zinc-500")}
                      >
                        EUR
                      </button>
                    </div>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryStats}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 mt-4 max-h-[150px] overflow-y-auto pr-2">
                    {categoryStats.map((item, i) => (
                      <div key={item.name} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-zinc-400 truncate max-w-[120px]">{item.name}</span>
                        </div>
                        <span className="text-white font-medium">${item.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white">Smart Budgets</h3>
                    <button className="text-xs text-emerald-500 font-bold uppercase tracking-widest hover:text-emerald-400 transition-colors">Set Limits</button>
                  </div>
                  <div className="space-y-6">
                    {categoryStats.slice(0, 4).map((stat, i) => {
                      const limit = 2000; // Mock limit
                      const percentage = Math.min((stat.value / limit) * 100, 100);
                      return (
                        <div key={stat.name} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-300 font-medium">{stat.name}</span>
                            <span className="text-zinc-500">${stat.value.toFixed(0)} / ${limit}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className={cn(
                                "h-full rounded-full",
                                percentage > 90 ? "bg-rose-500" : percentage > 70 ? "bg-amber-500" : "bg-emerald-500"
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-white">Vendor Health</h3>
                    <button className="text-xs text-emerald-500 font-bold uppercase tracking-widest hover:text-emerald-400 transition-colors">Full Report</button>
                  </div>
                  <div className="space-y-6">
                    {Array.from(new Set(documents.map(d => d.vendor))).slice(0, 3).map(vendor => {
                      const vendorDocs = documents.filter(d => d.vendor === vendor);
                      const avgReliability = vendorDocs.reduce((acc, d) => acc + (d.vendorReliabilityScore || 0), 0) / vendorDocs.length;
                      return (
                        <div key={vendor} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs",
                              avgReliability > 90 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                              {avgReliability.toFixed(0)}%
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm">{vendor}</p>
                              <p className="text-[10px] text-zinc-500">{vendorDocs.length} Transactions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-white">${vendorDocs.reduce((acc, d) => acc + d.totalAmount, 0).toFixed(2)}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">Total Spend</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Recent Documents</h2>
                  <button onClick={() => setActiveTab('documents')} className="text-emerald-400 text-sm font-medium hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                        <th className="px-6 py-4 font-semibold">Vendor</th>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Category</th>
                        <th className="px-6 py-4 font-semibold">Amount</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {documents.slice(0, 5).map((doc) => (
                        <tr key={doc.id} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-zinc-700 transition-colors">
                                <FileText size={16} />
                              </div>
                              <span className="font-medium text-zinc-200">{doc.vendor}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-400">{doc.date}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs bg-zinc-800 px-2 py-1 rounded-md text-zinc-300">{doc.category}</span>
                          </td>
                          <td className="px-6 py-4 font-bold text-white">{formatCurrency(doc.totalAmount)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              {doc.status === 'processed' ? (
                                <CheckCircle2 size={14} className="text-emerald-500" />
                              ) : doc.status === 'flagged' ? (
                                <ShieldAlert size={14} className="text-rose-500" />
                              ) : (
                                <Clock size={14} className="text-amber-500" />
                              )}
                              <span className={cn(
                                "text-xs font-medium capitalize",
                                doc.status === 'processed' ? "text-emerald-500" : doc.status === 'flagged' ? "text-rose-500" : "text-amber-500"
                              )}>
                                {doc.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'documents' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Documents</h2>
                  <p className="text-zinc-500">Manage and export your extracted financial data.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => generateQuickBooksIIF(documents)}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-sm font-medium"
                  >
                    QuickBooks IIF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between hover:border-zinc-700 transition-all">
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs",
                        (doc.confidenceScore || 0) > 90 ? "bg-emerald-500/10 text-emerald-500" : 
                        (doc.confidenceScore || 0) > 70 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                      )}>
                        {doc.confidenceScore || 0}%
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{doc.vendor}</h3>
                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                          <span>{doc.date}</span>
                          <span>•</span>
                          <span className="text-emerald-500/80 font-medium">{getDaysSince(doc.date)} days ago</span>
                          <span>•</span>
                          <span>{doc.category}</span>
                          {doc.isFraudulent && (
                            <span className="text-rose-400 font-medium flex items-center gap-1">
                              <AlertCircle size={14} />
                              {doc.fraudReason}
                            </span>
                          )}
                        </div>
                        {doc.smartTags && doc.smartTags.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {doc.smartTags.map(tag => (
                              <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{formatCurrency(doc.totalAmount)}</p>
                        <p className="text-xs text-zinc-500">Tax: {formatCurrency(doc.taxAmount)}</p>
                      </div>
                      <button className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'subscriptions' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Subscription Auditor</h1>
                <p className="text-zinc-500">Automatically detect and manage recurring business expenses.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Active Subscriptions" value={documents.filter(d => d.isSubscription).length.toString()} trend="Stable" icon={Repeat} />
                <StatCard label="Monthly Burn" value={formatCurrency(documents.filter(d => d.isSubscription).reduce((acc, d) => acc + d.totalAmount, 0))} trend="+5%" icon={TrendingUp} />
                <StatCard label="Potential Savings" value={formatCurrency(120)} trend="Action Required" icon={AlertCircle} />
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Detected Subscriptions</h3>
                  <span className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-bold uppercase tracking-wider">AI Verified</span>
                </div>
                <div className="divide-y divide-zinc-800">
                  {documents.filter(d => d.isSubscription).map(doc => (
                    <div key={doc.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
                          <Repeat size={24} />
                        </div>
                        <div>
                          <p className="text-white font-bold">{doc.vendor}</p>
                          <p className="text-xs text-zinc-500">{doc.subscriptionFrequency || 'Monthly'} • Next billing: {new Date(new Date(doc.date).setMonth(new Date(doc.date).getMonth() + 1)).toISOString().split('T')[0]}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{formatCurrency(doc.totalAmount)}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Per Period</p>
                        </div>
                        <button className="px-4 py-2 bg-zinc-800 text-white text-sm font-bold rounded-xl hover:bg-zinc-700 transition-colors">
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'forecasting' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Predictive Cash Flow</h1>
                <p className="text-zinc-500">AI-powered forecasting based on your historical spending patterns.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
                  <h3 className="text-xl font-bold text-white mb-8">6-Month Expense Forecast</h3>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { month: 'Mar', actual: totalSpend, forecast: totalSpend },
                        { month: 'Apr', forecast: (totalSpend * 1.05) * (1 + simulationParams.growth/100) * (1 - simulationParams.reduction/100) },
                        { month: 'May', forecast: (totalSpend * 0.98) * (1 + simulationParams.growth/100) * (1 - simulationParams.reduction/100) },
                        { month: 'Jun', forecast: (totalSpend * 1.12) * (1 + simulationParams.growth/100) * (1 - simulationParams.reduction/100) },
                        { month: 'Jul', forecast: (totalSpend * 1.08) * (1 + simulationParams.growth/100) * (1 - simulationParams.reduction/100) },
                        { month: 'Aug', forecast: (totalSpend * 1.15) * (1 + simulationParams.growth/100) * (1 - simulationParams.reduction/100) },
                      ]}>
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" stroke="#71717a" />
                        <YAxis stroke="#71717a" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" strokeWidth={3} />
                        <Area type="monotone" dataKey="forecast" stroke="#3b82f6" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-8">
                  <h3 className="text-xl font-bold text-white">Scenario Simulator</h3>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <label className="text-sm text-zinc-400">Monthly Growth</label>
                        <span className="text-sm text-emerald-500 font-bold">+{simulationParams.growth}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="50" step="1" 
                        value={simulationParams.growth} 
                        onChange={(e) => setSimulationParams(p => ({ ...p, growth: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <label className="text-sm text-zinc-400">Cost Reduction</label>
                        <span className="text-sm text-rose-500 font-bold">-{simulationParams.reduction}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="50" step="1" 
                        value={simulationParams.reduction} 
                        onChange={(e) => setSimulationParams(p => ({ ...p, reduction: parseInt(e.target.value) }))}
                        className="w-full accent-rose-500"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest mb-2">Projected Impact</p>
                    <p className="text-2xl font-bold text-white">
                      ${((totalSpend * 1.15) * (1 + simulationParams.growth/100) * (1 - simulationParams.reduction/100)).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1">Estimated spend by August 2026</p>
                  </div>
                </div>
              </div>
                <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
                  <AlertCircle className="text-blue-400 shrink-0" size={24} />
                  <div>
                    <p className="text-white font-bold mb-1">AI Insight: Seasonal Spike Detected</p>
                    <p className="text-sm text-blue-100/70">Based on historical data, we expect a 12% increase in software expenses in June. Consider reviewing your seat licenses before the next billing cycle.</p>
                  </div>
                </div>
            </motion.div>
          )}

          {activeTab === 'savings' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Savings & Payments</h1>
                  <p className="text-zinc-500">Track your financial optimizations and upcoming obligations.</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-right">
                  <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">Total Savings</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(totalSavings)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
                  <h3 className="text-xl font-bold text-white mb-6">Upcoming Payments</h3>
                  <div className="space-y-4">
                    {upcomingPayments.length > 0 ? (
                      upcomingPayments.map(payment => (
                        <div key={payment.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                              <Clock size={20} />
                            </div>
                            <div>
                              <p className="text-white font-bold">{payment.vendor}</p>
                              <p className="text-xs text-zinc-500">Due: {payment.dueDate} • {payment.frequency}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-white">{formatCurrency(payment.amount)}</p>
                            <button className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest hover:underline">Pay Now</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-zinc-500 text-center py-8">No upcoming payments detected.</p>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl">
                  <h3 className="text-xl font-bold text-white mb-6">Savings Breakdown</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                          <Calculator size={20} />
                        </div>
                        <div>
                          <p className="text-white font-bold">Tax Recoverable</p>
                          <p className="text-xs text-zinc-500">Potential tax deductions identified</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-emerald-500">{formatCurrency(taxRecoverable)}</p>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                          <ShieldAlert size={20} />
                        </div>
                        <div>
                          <p className="text-white font-bold">Fraud Avoidance</p>
                          <p className="text-xs text-zinc-500">Flagged suspicious transactions</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-amber-500">{formatCurrency(documents.filter(doc => doc.isFraudulent).reduce((acc, doc) => acc + doc.totalAmount, 0))}</p>
                    </div>

                    <div className="p-6 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                      <p className="text-sm text-zinc-400 mb-4 italic">"Your AI assistant has identified 3 new ways to optimize your software spend this month, potentially saving you an additional {formatCurrency(45)}."</p>
                      {/* Note: formatCurrency inside a string literal renders literally – displayed as a static value below */}
                      <button className="w-full py-2 bg-emerald-500 text-black font-bold rounded-xl text-sm hover:bg-emerald-400 transition-all">View Optimization Plan</button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sustainability' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Sustainability Impact</h1>
                  <p className="text-zinc-500">Track the carbon footprint of your business expenses.</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-right">
                  <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">Total CO2e</p>
                  <p className="text-3xl font-bold text-white">{documents.reduce((acc, d) => acc + (d.carbonFootprintKg || 0), 0).toFixed(1)} Kg</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-white mb-6">Carbon by Category</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                        <YAxis stroke="#71717a" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl space-y-4">
                  <h3 className="text-lg font-bold text-white mb-2">High Impact Items</h3>
                  {documents
                    .filter(d => (d.carbonFootprintKg || 0) > 10)
                    .sort((a, b) => (b.carbonFootprintKg || 0) - (a.carbonFootprintKg || 0))
                    .map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                        <div>
                          <p className="text-white font-medium">{doc.vendor}</p>
                          <p className="text-xs text-zinc-500">{doc.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-rose-400 font-bold">{doc.carbonFootprintKg} Kg</p>
                          <p className="text-[10px] text-zinc-500">CO2e</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tax' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Tax Optimizer</h1>
                <p className="text-zinc-500">AI-driven insights to maximize your business deductions.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Deductible Score" value={documents.length === 0 ? '0%' : `${(documents.reduce((acc, d) => acc + (d.taxDeductibleScore || 0), 0) / documents.length).toFixed(0)}%`} trend="Optimal" icon={Calculator} />
                <StatCard label="Potential Savings" value={`$${(totalSpend * 0.2).toFixed(2)}`} trend="+12%" icon={ArrowUpRight} />
                <StatCard label="Audit Risk" value="Low" trend="Safe" icon={ShieldAlert} />
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800">
                  <h3 className="text-lg font-bold text-white">Deduction Insights</h3>
                </div>
                <div className="divide-y divide-zinc-800">
                  {documents.map(doc => (
                    <div key={doc.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center font-bold",
                          (doc.taxDeductibleScore || 0) > 80 ? "bg-emerald-500/10 text-emerald-500" : 
                          (doc.taxDeductibleScore || 0) > 40 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                        )}>
                          {doc.taxDeductibleScore}%
                        </div>
                        <div>
                          <p className="text-white font-bold">{doc.vendor}</p>
                          <p className="text-xs text-zinc-500">{doc.category} • {doc.date}</p>
                        </div>
                      </div>
                      <div className="flex-1 max-w-md">
                        <p className="text-sm text-zinc-300 italic">"{doc.taxOptimizationTip || 'No specific tip available.'}"</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">${doc.totalAmount.toFixed(2)}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Amount</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-180px)] flex flex-col bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">PaperLedger AI Assistant</h2>
                  <p className="text-xs text-zinc-500">Ask anything about your documents and spending.</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500">
                      <MessageSquare size={32} />
                    </div>
                    <div className="max-w-sm">
                      <h3 className="text-white font-bold">Start a conversation</h3>
                      <p className="text-zinc-500 text-sm">"How much did I spend on Amazon this month?" or "Show me all flagged documents."</p>
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className={cn(
                      "flex gap-4 max-w-[80%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                      msg.role === 'ai' ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400"
                    )}>
                      {msg.role === 'ai' ? <Database size={16} /> : <Briefcase size={16} />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'ai' ? "bg-zinc-800 text-zinc-200" : "bg-emerald-500 text-black font-medium"
                    )}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 border-t border-zinc-800">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder={isChatLoading ? 'AI is thinking...' : 'Type your question...'} 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-6 pr-24 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all disabled:opacity-50"
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isChatLoading && handleChat()}
                    disabled={isChatLoading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                    <button 
                      onClick={toggleVoice}
                      disabled={isChatLoading}
                      className={cn(
                        "p-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                        isListening ? "bg-rose-500 text-white animate-pulse" : "bg-zinc-800 text-zinc-400 hover:text-white"
                      )}
                    >
                      <Mic size={20} />
                    </button>
                    <button 
                      onClick={handleChat}
                      disabled={isChatLoading || !chatQuery.trim()}
                      className="p-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isChatLoading
                        ? <span className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin block" />
                        : <Plus size={20} className="rotate-45" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Export & Field Mapping</h3>
                <button onClick={() => setShowExportModal(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div>
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Field Mapping</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(exportMapping).map(key => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs text-zinc-500 capitalize">{key}</label>
                        <input 
                          type="text" 
                          value={exportMapping[key]} 
                          onChange={(e) => setExportMapping(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button 
                    onClick={() => { exportToExcel(documents); setShowExportModal(false); }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-zinc-800 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 border border-transparent transition-all group"
                  >
                    <FileSpreadsheet className="text-zinc-500 group-hover:text-emerald-500" size={32} />
                    <span className="text-xs font-bold text-white">Excel</span>
                  </button>
                  <button 
                    onClick={() => { exportToCSV(documents, exportMapping); setShowExportModal(false); }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-zinc-800 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 border border-transparent transition-all group"
                  >
                    <FileText className="text-zinc-500 group-hover:text-emerald-500" size={32} />
                    <span className="text-xs font-bold text-white">CSV</span>
                  </button>
                  <button 
                    onClick={() => { exportToJSON(documents, exportMapping); setShowExportModal(false); }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-zinc-800 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 border border-transparent transition-all group"
                  >
                    <FileJson className="text-zinc-500 group-hover:text-emerald-500" size={32} />
                    <span className="text-xs font-bold text-white">JSON</span>
                  </button>
                  <button 
                    onClick={() => { copyToCSV(); setShowExportModal(false); }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-zinc-800 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 border border-transparent transition-all group"
                  >
                    <Plus className="text-zinc-500 group-hover:text-emerald-500" size={32} />
                    <span className="text-xs font-bold text-white">Copy CSV</span>
                  </button>
                  <button 
                    onClick={() => { generateQuickBooksIIF(documents); setShowExportModal(false); }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-zinc-800 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 border border-transparent transition-all group"
                  >
                    <Database className="text-zinc-500 group-hover:text-emerald-500" size={32} />
                    <span className="text-xs font-bold text-white">QuickBooks</span>
                  </button>
                  <button 
                    onClick={() => { alert("DocHub integration coming soon!"); setShowExportModal(false); }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-zinc-800 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 border border-transparent transition-all group"
                  >
                    <FileText className="text-zinc-500 group-hover:text-emerald-500" size={32} />
                    <span className="text-xs font-bold text-white">DocHub</span>
                  </button>
                  <button 
                    onClick={() => { alert("iHub integration coming soon!"); setShowExportModal(false); }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-zinc-800 rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 border border-transparent transition-all group"
                  >
                    <Settings className="text-zinc-500 group-hover:text-emerald-500" size={32} />
                    <span className="text-xs font-bold text-white">iHub</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
                <Upload size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Processing Documents</h3>
                <p className="text-zinc-500 text-sm">
                  Processed {uploadProgress.completed} of {uploadProgress.total} files.
                </p>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                  className="h-full bg-emerald-500 transition-all duration-500" 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
