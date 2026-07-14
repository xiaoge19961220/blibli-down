import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Search, 
  Folder, 
  Play, 
  Trash2, 
  Loader2, 
  Settings, 
  Check, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  AlertTriangle, 
  Layers, 
  QrCode, 
  Film, 
  ThumbsUp, 
  X, 
  Info,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
  Sliders,
  Tv,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageInfo, VideoInfo, DownloadTask, FileItem, SettingsInfo } from './types';

export default function App() {
  // Input URL or BVID
  const [urlInput, setUrlInput] = useState('BV1MTQAY4EdP');
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  
  // Video Metadata
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  
  // Download config & queue
  const [concurrency, setConcurrency] = useState(2);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [activeTasksCount, setActiveTasksCount] = useState(0);
  
  // File management
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // Settings
  const [showSettings, setShowSettings] = useState(true); // Default show settings in Bento dashboard
  const [sessdata, setSessdata] = useState('');
  const [savedSessdata, setSavedSessdata] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Bilibili QR code login state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeKey, setQrCodeKey] = useState('');
  const [qrLoginStatus, setQrLoginStatus] = useState<'idle' | 'loading' | 'waiting_scan' | 'waiting_confirm' | 'success' | 'expired' | 'error'>('idle');
  const [qrStatusText, setQrStatusText] = useState('');
  const qrPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [settingsTab, setSettingsTab] = useState<'qr' | 'manual'>('qr');
  
  // Active streaming video
  const [activeStream, setActiveStream] = useState<FileItem | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Search/Filter for parts
  const [partSearchQuery, setPartSearchQuery] = useState('');

  // Auto poll timers
  useEffect(() => {
    fetchTasks();
    fetchFiles();
    fetchSettings();

    // Poll tasks every 1.5 seconds
    const taskInterval = setInterval(fetchTasks, 1500);
    // Poll files every 5 seconds to catch newly finished ones
    const fileInterval = setInterval(fetchFiles, 5000);

    return () => {
      clearInterval(taskInterval);
      clearInterval(fileInterval);
    };
  }, []);

  // Fetch Bilibili Video details
  const handleParse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setLoadingInfo(true);
    setErrorInfo(null);
    setVideoInfo(null);
    setSelectedPages([]);

    try {
      const res = await fetch(`/api/video-info?urlOrBvid=${encodeURIComponent(urlInput.trim())}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '解析失败，请检查输入是否正确');
      }

      setVideoInfo(data);
      // Auto-select all pages by default
      if (data.pages && data.pages.length > 0) {
        setSelectedPages(data.pages.map((p: PageInfo) => p.page));
      }
    } catch (err: any) {
      setErrorInfo(err.message || '获取视频信息失败，可能网络连接不稳定或BV号无效');
    } finally {
      setLoadingInfo(false);
    }
  };

  // Fetch current downloader tasks status
  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
        setActiveTasksCount(data.activeCount);
      }
    } catch (err) {
      console.error('Failed to fetch download tasks:', err);
    }
  };

  // Fetch downloaded files list
  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to fetch files list:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Fetch server settings (SESSDATA status)
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json() as SettingsInfo;
        setSavedSessdata(data.hasSessdata);
        setConcurrency(data.concurrencyLimit);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  // Generate Bilibili Login QR Code
  const handleGenerateQR = async () => {
    // Clear any existing poll
    if (qrPollIntervalRef.current) {
      clearInterval(qrPollIntervalRef.current);
      qrPollIntervalRef.current = null;
    }

    setQrLoginStatus('loading');
    setQrStatusText('正在获取登录二维码...');
    setQrCodeUrl('');
    setQrCodeKey('');

    try {
      const res = await fetch('/api/login/qr/generate');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '获取二维码失败');
      }

      setQrCodeUrl(data.url);
      setQrCodeKey(data.qrcode_key);
      setQrLoginStatus('waiting_scan');
      setQrStatusText('请使用哔哩哔哩App扫码登录');

      // Start polling
      startQRPolling(data.qrcode_key);
    } catch (err: any) {
      setQrLoginStatus('error');
      setQrStatusText(err.message || '生成二维码失败，请重试');
    }
  };

  // Poll Bilibili Login status
  const startQRPolling = (key: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/login/qr/poll?qrcode_key=${encodeURIComponent(key)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '状态查询失败');
        }
        
        const code = data.code;
        if (code === 0) {
          setQrLoginStatus('success');
          setQrStatusText('扫码登录成功！已自动保存 SESSDATA');
          showToast('B站扫码登录成功！');
          if (qrPollIntervalRef.current) {
            clearInterval(qrPollIntervalRef.current);
            qrPollIntervalRef.current = null;
          }
          fetchSettings();
        } else if (code === 86038) {
          setQrLoginStatus('waiting_confirm');
          setQrStatusText('已扫码，请在手机端确认登录');
        } else if (code === 86101) {
          setQrLoginStatus('expired');
          setQrStatusText('二维码已过期，请重新生成');
          if (qrPollIntervalRef.current) {
            clearInterval(qrPollIntervalRef.current);
            qrPollIntervalRef.current = null;
          }
        } else if (code === 86090) {
          setQrLoginStatus('waiting_scan');
          setQrStatusText('请使用哔哩哔哩App扫码登录');
        }
      } catch (err) {
        console.error('Polling QR status error:', err);
      }
    };

    poll();
    qrPollIntervalRef.current = setInterval(poll, 1800);
  };

  useEffect(() => {
    return () => {
      if (qrPollIntervalRef.current) {
        clearInterval(qrPollIntervalRef.current);
      }
    };
  }, []);

  // Save SESSDATA / Concurrency settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessdata, concurrency })
      });
      if (res.ok) {
        const data = await res.json();
        setSavedSessdata(data.hasSessdata);
        setSessdata(''); // Clear input after saving
        
        // Give visual confirmation toast
        showToast('设置保存成功');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Logout / Clear settings
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessdata: '', concurrency })
      });
      if (res.ok) {
        setSavedSessdata(false);
        setSessdata('');
        setQrLoginStatus('idle');
        showToast('已退出登录并清除 SESSDATA 凭证');
      }
    } catch (err) {
      console.error('Failed to clear settings:', err);
    }
  };

  // Toast helper
  const showToast = (message: string) => {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-5 right-5 bg-bili-pink text-white px-6 py-3 rounded-xl shadow-2xl font-semibold z-50 transition-all duration-300 transform translate-y-0';
    notification.innerText = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  // Trigger download of selected chapters
  const handleDownload = async () => {
    if (!videoInfo || selectedPages.length === 0) return;

    const pagesToDownload = videoInfo.pages.filter(p => selectedPages.includes(p.page));
    
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bvid: videoInfo.bvid,
          pages: pagesToDownload,
          concurrency
        })
      });

      if (res.ok) {
        fetchTasks();
        showToast(`已成功添加 ${pagesToDownload.length} 个视频到下载队列`);
      } else {
        const data = await res.json();
        alert(data.error || '添加下载任务失败');
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('无法连接到服务器，请重试');
    }
  };

  // Cancel task
  const handleCancelTask = async (taskId: string) => {
    try {
      const res = await fetch('/api/tasks/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId })
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  };

  // Cancel all tasks
  const handleCancelAll = async () => {
    if (!confirm('确定要取消所有正在下载或排队的任务吗？')) return;
    try {
      const res = await fetch('/api/tasks/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAll: true })
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to cancel all tasks:', err);
    }
  };

  // Remove task from list
  const handleRemoveTask = async (taskId: string) => {
    try {
      const res = await fetch('/api/tasks/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId })
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to remove task record:', err);
    }
  };

  // Delete downloaded file
  const handleDeleteFile = async (filename: string) => {
    if (!confirm(`确定要删除文件吗？\n${filename}`)) return;
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchFiles();
        if (activeStream && activeStream.filename === filename) {
          setActiveStream(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // Format Helper functions
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec <= 0) return '0 B/s';
    return formatBytes(bytesPerSec) + '/s';
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (ms: number): string => {
    return new Date(ms).toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Selection managers
  const togglePageSelection = (page: number) => {
    if (selectedPages.includes(page)) {
      setSelectedPages(selectedPages.filter(p => p !== page));
    } else {
      setSelectedPages([...selectedPages, page]);
    }
  };

  const selectAllPages = () => {
    if (!videoInfo) return;
    setSelectedPages(videoInfo.pages.map(p => p.page));
  };

  const deselectAllPages = () => {
    setSelectedPages([]);
  };

  const invertPageSelection = () => {
    if (!videoInfo) return;
    const all = videoInfo.pages.map(p => p.page);
    setSelectedPages(all.filter(p => !selectedPages.includes(p)));
  };

  // Filter parts list
  const filteredPages = videoInfo?.pages.filter(p => 
    p.part.toLowerCase().includes(partSearchQuery.toLowerCase()) ||
    `p${p.page}`.includes(partSearchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-bili-dark text-slate-100 font-sans selection:bg-bili-pink selection:text-white pb-12 relative overflow-x-hidden">
      
      {/* Dynamic ambient pink background glows for tech bento vibe */}
      <div className="absolute top-[-100px] right-[-50px] w-[500px] h-[500px] bg-bili-pink/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[-100px] w-[600px] h-[600px] bg-[#3B82F6]/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Modern High-End Bento Header */}
      <header className="border-b border-[#22252E] bg-bili-dark/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-bili-pink/10 rounded-xl border border-bili-pink/20 text-bili-pink">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Bilibili 视频合集下载器</span>
                <span className="text-[10px] font-mono font-bold bg-bili-pink/10 text-bili-pink border border-bili-pink/20 px-2 py-0.5 rounded uppercase">
                  Bento Pro
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  100% 本地化运行
                </span>
              </h1>
              <p className="text-xs text-slate-400">基于本地多线程并发 · 流媒体边下边播的极速影音管理器（免云端服务器/本地存储）</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => { fetchTasks(); fetchFiles(); fetchSettings(); }}
              className="p-2.5 rounded-xl bg-[#1A1D23] hover:bg-[#22252E] border border-[#2B2E37] text-slate-300 hover:text-white transition-all active:scale-95"
              title="全局同步刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Bento Grid Layer 1: Parse Box & Settings Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Bento Cell 1: Parser Console (8 columns on large screen) */}
          <section id="bento-parser" className="lg:col-span-8 bg-[#151821]/80 backdrop-blur border border-[#232731] hover:border-bili-pink/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-bili-pink animate-ping"></span>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-bili-pink font-mono">
                  Bilibili Video Parsing Station
                </h2>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                合集解析面板
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                输入 Bilibili 视频链接或 12 位 BV 号。解析完成后即可选择合集中的各个章节进行并发多线程高速下载。
              </p>
            </div>

            <form onSubmit={handleParse} className="relative flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input 
                  type="text"
                  placeholder="在此粘贴 B站视频链接 或 BV号 (例如: BV1MTQAY4EdP)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#262A35] rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-slate-600 focus:border-bili-pink focus:outline-none transition-all text-sm font-mono"
                />
              </div>
              <button 
                type="submit"
                disabled={loadingInfo}
                className="bg-bili-pink hover:bg-bili-pink/90 disabled:bg-bili-pink/50 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shrink-0 cursor-pointer shadow-lg shadow-bili-pink/10"
              >
                {loadingInfo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>立即解析</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Presets row */}
            <div className="flex flex-wrap items-center gap-2 text-xs border-t border-[#1C1F28] pt-4">
              <span className="text-slate-500">快捷预设：</span>
              <button 
                type="button"
                onClick={() => { setUrlInput('BV1MTQAY4EdP'); setTimeout(() => handleParse(), 100); }}
                className="px-3 py-1.5 rounded-xl bg-[#0F1115] hover:bg-[#1A1D23] border border-[#22252E] hover:border-bili-pink/30 text-slate-400 hover:text-bili-pink transition-all font-mono cursor-pointer"
              >
                BV1MTQAY4EdP (初级社工合集)
              </button>
            </div>

            {errorInfo && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl flex items-start space-x-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">解析出错</span>
                  <span>{errorInfo}</span>
                </div>
              </div>
            )}
          </section>

          {/* Bento Cell 2: Download Configuration Panel (4 columns) */}
          <section id="bento-settings" className="lg:col-span-4 bg-[#151821]/80 backdrop-blur border border-[#232731] hover:border-bili-pink/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-bili-pink" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-bili-pink font-mono">
                    Downloader Settings
                  </h2>
                </div>
                {/* Mini Tabs for Switch */}
                <div className="flex bg-[#0F1115] p-1 rounded-lg border border-[#262A35]">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('qr')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      settingsTab === 'qr'
                        ? 'bg-bili-pink text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    扫码登录
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsTab('manual')}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      settingsTab === 'manual'
                        ? 'bg-bili-pink text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    手动参数
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {settingsTab === 'qr' 
                  ? '使用 B站 App 扫码登录，免除手动获取与填入 SESSDATA 的烦恼。' 
                  : '手动配置 B站 SESSDATA，可解锁超清/1080P/4K 下载。'}
              </p>
            </div>

            <div className="border-t border-[#1C1F28] pt-4 mt-4 flex-1 flex flex-col justify-between">
              {settingsTab === 'qr' ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {savedSessdata ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 text-center space-y-3 my-auto">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400">
                        <Check className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-emerald-400">B站账号已登录</p>
                        <p className="text-[11px] text-slate-400">已自动解锁超清、1080P/4K 画质多线程极速下载权限。</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 underline transition cursor-pointer"
                      >
                        退出当前登录 / 清除凭证
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3 py-1">
                      {qrLoginStatus === 'idle' && (
                        <div className="text-center space-y-4 py-3">
                          <p className="text-xs text-slate-400 px-4">
                            SESSDATA 是B站登录后的安全会话凭证。使用扫码登录，系统会自动提取并保存到本地，无需您手动复制。
                          </p>
                          <button
                            type="button"
                            onClick={handleGenerateQR}
                            className="inline-flex items-center space-x-1.5 bg-bili-pink hover:bg-bili-pink/90 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-bili-pink/20 transition cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>生成登录二维码</span>
                          </button>
                        </div>
                      )}

                      {qrLoginStatus === 'loading' && (
                        <div className="flex flex-col items-center py-6 space-y-2">
                          <Loader2 className="w-6 h-6 text-bili-pink animate-spin" />
                          <p className="text-xs text-slate-400 font-mono">{qrStatusText}</p>
                        </div>
                      )}

                      {(qrLoginStatus === 'waiting_scan' || qrLoginStatus === 'waiting_confirm' || qrLoginStatus === 'expired') && (
                        <div className="flex flex-col items-center space-y-3">
                          <div className="relative p-2 bg-white rounded-2xl overflow-hidden shadow-xl">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrCodeUrl)}`}
                              alt="Bilibili Login QR Code"
                              referrerPolicy="no-referrer"
                              className={`w-32 h-32 transition-all ${
                                qrLoginStatus === 'waiting_confirm' ? 'opacity-30 blur-[1px]' : ''
                              } ${qrLoginStatus === 'expired' ? 'opacity-10 blur-[3px]' : ''}`}
                            />
                            {qrLoginStatus === 'waiting_confirm' && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900 font-bold text-xs p-2 text-center">
                                <CheckCircle2 className="w-8 h-8 text-bili-pink animate-bounce mb-1" />
                                <span className="bg-white/90 px-2 py-0.5 rounded shadow">已扫码待确认</span>
                              </div>
                            )}
                            {qrLoginStatus === 'expired' && (
                              <button
                                type="button"
                                onClick={handleGenerateQR}
                                className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-[11px] font-bold p-2 text-center cursor-pointer transition"
                              >
                                <RefreshCw className="w-5 h-5 mb-1 text-bili-pink" />
                                <span>已失效，点击刷新</span>
                              </button>
                            )}
                          </div>
                          
                          <p className={`text-[11px] font-medium text-center ${
                            qrLoginStatus === 'waiting_confirm' ? 'text-bili-pink animate-pulse font-semibold' : 'text-slate-400'
                          }`}>
                            {qrStatusText}
                          </p>

                          {qrLoginStatus !== 'expired' && (
                            <button
                              type="button"
                              onClick={handleGenerateQR}
                              className="text-[10px] text-slate-500 hover:text-bili-pink underline cursor-pointer"
                            >
                              重新获取二维码
                            </button>
                          )}
                        </div>
                      )}

                      {qrLoginStatus === 'error' && (
                        <div className="text-center space-y-2 py-4">
                          <p className="text-xs text-rose-400 font-semibold">{qrStatusText}</p>
                          <button
                            type="button"
                            onClick={handleGenerateQR}
                            className="bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 text-xs py-1.5 px-4 rounded-lg transition cursor-pointer"
                          >
                            重试
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Shared concurrency settings at the bottom of QR tab as well */}
                  <div className="space-y-1.5 pt-3 border-t border-[#1C1F28] mt-auto">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono">并发线程上限</span>
                      <span className="font-mono font-bold text-bili-pink text-xs bg-bili-pink/5 px-1.5 py-0.5 rounded border border-bili-pink/10">
                        {concurrency} 线程
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input 
                        type="range"
                        min="1"
                        max="5"
                        value={concurrency}
                        onChange={async (e) => {
                          const val = parseInt(e.target.value, 10);
                          setConcurrency(val);
                          // Auto save concurrency when changed
                          try {
                            await fetch('/api/settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ concurrency: val })
                            });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="flex-1 h-1 bg-[#0F1115] rounded-lg appearance-none cursor-pointer accent-bili-pink"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveSettings} className="space-y-4 flex flex-col justify-between flex-1 h-full">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                          SESSDATA Cookie
                        </label>
                        {savedSessdata ? (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            已配置高级
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            游客画质
                          </span>
                        )}
                      </div>
                      <input 
                        type="password"
                        placeholder={savedSessdata ? "•••••••••••• (已保存 SESSDATA)" : "请粘贴 B站 Cookie 里的 SESSDATA"}
                        value={sessdata}
                        onChange={(e) => setSessdata(e.target.value)}
                        className="w-full bg-[#0F1115] border border-[#262A35] rounded-xl px-3 py-2 text-xs focus:border-bili-pink focus:outline-none placeholder-slate-600 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">并发线程上限</span>
                        <span className="font-mono font-bold text-bili-pink text-sm bg-bili-pink/5 px-2 py-0.5 rounded border border-bili-pink/10">
                          {concurrency} 线程
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="range"
                          min="1"
                          max="5"
                          value={concurrency}
                          onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                          className="flex-1 h-1 bg-[#0F1115] rounded-lg appearance-none cursor-pointer accent-bili-pink"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center space-x-2">
                    <button 
                      type="submit"
                      disabled={savingSettings}
                      className="flex-1 bg-[#0F1115] hover:bg-bili-pink/10 hover:text-bili-pink border border-[#22252E] hover:border-bili-pink/30 text-slate-300 font-semibold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      {savingSettings ? (
                        <Loader2 className="w-3 h-3 animate-spin text-bili-pink" />
                      ) : (
                        <Sliders className="w-3.5 h-3.5 text-bili-pink" />
                      )}
                      <span>保存引擎参数</span>
                    </button>
                    {savedSessdata && (
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-3 bg-[#0F1115] hover:bg-rose-500/10 hover:text-rose-400 border border-[#22252E] hover:border-rose-500/20 text-slate-400 py-2 rounded-xl text-xs transition-all cursor-pointer"
                        title="清除凭证"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </section>

        </div>

        {/* Bento Grid Layer 2: Parsed Video Details & Chapter list (Conditional on videoInfo) */}
        <AnimatePresence>
          {videoInfo && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5"
            >
              {/* Bento Cell 3: Parsed Video Cover & Stats (5 columns) */}
              <section id="bento-meta" className="lg:col-span-5 bg-[#151821]/80 backdrop-blur border border-[#232731] hover:border-bili-pink/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                      Parsed Metadata File
                    </h2>
                  </div>

                  {/* Thumbnail Cover */}
                  <div className="aspect-video w-full rounded-2xl overflow-hidden relative border border-[#22252E] bg-[#0F1115] group">
                    <img 
                      src={videoInfo.pic} 
                      alt={videoInfo.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/75 backdrop-blur-sm text-[10px] font-mono font-bold rounded-lg text-bili-pink border border-bili-pink/20">
                      BVID: {videoInfo.bvid}
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/75 backdrop-blur-sm text-[10px] font-mono font-bold rounded-lg text-slate-300">
                      共 {videoInfo.pages.length} 个视频
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
                      {videoInfo.title}
                    </h3>
                    {videoInfo.description && (
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {videoInfo.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#1C1F28] pt-4 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <img 
                      src={videoInfo.owner?.face} 
                      alt={videoInfo.owner?.name} 
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800"
                    />
                    <span className="font-semibold text-slate-200 text-xs">{videoInfo.owner?.name}</span>
                  </div>

                  {videoInfo.stat && (
                    <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
                      <div className="flex items-center space-x-1">
                        <Play className="w-3 h-3 text-bili-pink" />
                        <span>{videoInfo.stat.view.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="w-3 h-3 text-bili-pink" />
                        <span>{videoInfo.stat.like.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Bento Cell 4: Part Playlist & Selection (7 columns) */}
              <section id="bento-playlist" className="lg:col-span-7 bg-[#151821]/80 backdrop-blur border border-[#232731] hover:border-bili-pink/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1F28] pb-3">
                    <div className="space-y-0.5">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-bili-pink font-mono">
                        Collection Chapter List
                      </h2>
                      <p className="text-xs text-slate-400">
                        过滤并选择需要添加到并发队列的视频：
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={selectAllPages}
                        className="px-2.5 py-1 text-[10px] font-bold bg-[#0F1115] hover:bg-[#1C1F28] border border-[#22252E] text-slate-300 rounded-lg transition-all cursor-pointer"
                      >
                        全选
                      </button>
                      <button 
                        onClick={deselectAllPages}
                        className="px-2.5 py-1 text-[10px] font-bold bg-[#0F1115] hover:bg-[#1C1F28] border border-[#22252E] text-slate-300 rounded-lg transition-all cursor-pointer"
                      >
                        清空
                      </button>
                      <button 
                        onClick={invertPageSelection}
                        className="px-2.5 py-1 text-[10px] font-bold bg-[#0F1115] hover:bg-[#1C1F28] border border-[#22252E] text-slate-300 rounded-lg transition-all cursor-pointer"
                      >
                        反选
                      </button>
                    </div>
                  </div>

                  {/* Filter Search Input */}
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="🔍 搜索章节名称或序号 (例如: 第一章, p2...)"
                      value={partSearchQuery}
                      onChange={(e) => setPartSearchQuery(e.target.value)}
                      className="w-full bg-[#0F1115] border border-[#262A35] rounded-xl px-3 py-2 text-xs focus:border-bili-pink focus:outline-none placeholder-slate-700 font-mono"
                    />
                  </div>

                  {/* Playlist scrollable view */}
                  <div className="max-h-[220px] overflow-y-auto border border-[#22252E] rounded-2xl bg-[#0F1115]/50 divide-y divide-[#1D2028] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {filteredPages.length === 0 ? (
                      <div className="p-8 text-center text-slate-600 text-xs">
                        未匹配到相关合集章节
                      </div>
                    ) : (
                      filteredPages.map((p) => {
                        const isSelected = selectedPages.includes(p.page);
                        return (
                          <div 
                            key={p.cid}
                            onClick={() => togglePageSelection(p.page)}
                            className={`flex items-center space-x-3 px-4 py-2.5 cursor-pointer select-none transition-all ${
                              isSelected ? 'bg-bili-pink/5 hover:bg-bili-pink/10' : 'hover:bg-[#1A1D23]/40'
                            }`}
                          >
                            <span className="shrink-0 text-bili-pink">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 fill-bili-pink/10" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-700" />
                              )}
                            </span>
                            
                            <span className="text-[10px] font-mono font-bold bg-[#0F1115] px-2 py-0.5 rounded text-slate-400 border border-[#22252E]">
                              P{p.page}
                            </span>

                            <div className="flex-1 min-w-0">
                              <p className={`text-xs truncate ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>
                                {p.part}
                              </p>
                            </div>

                            <div className="shrink-0 flex items-center space-x-1 font-mono text-[10px] text-slate-500">
                              <Clock className="w-3 h-3 text-slate-600" />
                              <span>{formatDuration(p.duration)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#0F1115] border border-[#22252E] rounded-2xl">
                  <span className="text-xs text-slate-400">
                    已选中 <strong className="text-bili-pink font-mono">{selectedPages.length}</strong> / {videoInfo.pages.length} 章节
                  </span>

                  <button 
                    onClick={handleDownload}
                    disabled={selectedPages.length === 0}
                    className="px-5 py-2 bg-bili-pink hover:bg-bili-pink/90 disabled:bg-[#1A1D23] disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all active:scale-95 shadow-md shadow-bili-pink/10 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>一键并发下载</span>
                  </button>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bento Grid Layer 3: Download Controller & Local Disk Library */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Bento Cell 5: Download Console (7 columns) */}
          <section id="bento-queue" className="lg:col-span-7 bg-[#151821]/80 backdrop-blur border border-[#232731] hover:border-bili-pink/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1C1F28] pb-3.5">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-bili-pink" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-bili-pink font-mono">
                    Download Live Monitor
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  当前并发线程: <strong className="font-mono text-bili-pink">{activeTasksCount}</strong> / {concurrency}
                </p>
              </div>

              {tasks.length > 0 && (
                <button 
                  onClick={handleCancelAll}
                  className="px-3 py-1.5 text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 rounded-lg border border-rose-500/20 transition-all cursor-pointer flex items-center space-x-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>取消全部任务</span>
                </button>
              )}
            </div>

            {/* Task scrolling viewport */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {tasks.length === 0 ? (
                <div className="py-16 text-center text-slate-600 space-y-3">
                  <Download className="w-10 h-10 mx-auto text-slate-700 animate-bounce" />
                  <p className="text-xs font-medium">暂无正在执行的任务，解析后添加即可开始</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks.map((task) => {
                    const isDownloading = task.status === 'downloading';
                    const isQueued = task.status === 'queued';
                    const isCompleted = task.status === 'completed';
                    const isFailed = task.status === 'failed';
                    const isCancelled = task.status === 'cancelled';

                    return (
                      <div 
                        key={task.id}
                        className="bg-[#0F1115] p-3.5 rounded-2xl border border-[#22252E] space-y-2.5 hover:border-bili-pink/10 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1A1D23] border border-[#2B2E37] text-slate-400">
                                P{task.page}
                              </span>
                              
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 ${
                                isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                isDownloading ? 'bg-bili-pink/10 text-bili-pink border border-bili-pink/20' :
                                isQueued ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                isFailed ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {isDownloading && <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />}
                                {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />}
                                {isFailed && <XCircle className="w-2.5 h-2.5 shrink-0" />}
                                <span>
                                  {isCompleted ? '已完成' :
                                   isDownloading ? '下载中' :
                                   isQueued ? '排队中' :
                                   isFailed ? '失败' : '已取消'}
                                </span>
                              </span>
                              
                              {isDownloading && task.speed > 0 && (
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 flex items-center space-x-1">
                                  <Zap className="w-2.5 h-2.5 animate-pulse" />
                                  <span>{formatSpeed(task.speed)}</span>
                                </span>
                              )}
                            </div>
                            
                            <h4 className="text-xs font-semibold text-slate-200 truncate" title={task.part}>
                              {task.part}
                            </h4>
                          </div>

                          <div className="shrink-0">
                            {(isDownloading || isQueued) ? (
                              <button 
                                onClick={() => handleCancelTask(task.id)}
                                className="p-1.5 rounded-xl bg-[#1A1D23] hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 border border-[#2B2E37] hover:border-rose-500/20 transition-all cursor-pointer"
                                title="取消该任务"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleRemoveTask(task.id)}
                                className="p-1.5 rounded-xl bg-[#1A1D23] hover:bg-slate-800 text-slate-500 hover:text-slate-300 border border-[#2B2E37] transition-all cursor-pointer"
                                title="清除进度记录"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Custom visual progress bar */}
                        <div className="space-y-1">
                          <div className="h-1.5 bg-[#1C1F28] rounded-full overflow-hidden relative">
                            <motion.div 
                              className={`h-full rounded-full ${
                                isCompleted ? 'bg-emerald-500' :
                                isFailed ? 'bg-rose-500' :
                                isCancelled ? 'bg-slate-700' : 'bg-gradient-to-r from-bili-pink to-blue-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${task.progress}%` }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>
                              {task.totalBytes > 0 ? (
                                `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`
                              ) : (
                                `已传输 ${formatBytes(task.downloadedBytes)}`
                              )}
                            </span>
                            <span className="font-bold text-slate-400">
                              {task.progress}%
                            </span>
                          </div>
                        </div>

                        {task.error && (
                          <div className="text-[10px] bg-rose-500/5 text-rose-300 p-2 rounded-xl border border-rose-500/10 flex items-start space-x-1.5">
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                            <span>发生异常: {task.error}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Bento Cell 6: File Management Dashboard (5 columns) */}
          <section id="bento-library" className="lg:col-span-5 bg-[#151821]/80 backdrop-blur border border-[#232731] hover:border-bili-pink/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between border-b border-[#1C1F28] pb-3.5">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Folder className="w-4 h-4 text-bili-pink" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-bili-pink font-mono">
                      Local Media Library
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    本地媒体库，双击或点击播放按钮流式预览
                  </p>
                </div>

                <button 
                  onClick={fetchFiles}
                  disabled={loadingFiles}
                  className="p-1.5 rounded-xl bg-[#0F1115] border border-[#22252E] hover:border-bili-pink/30 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="刷新视频库"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin text-bili-pink' : ''}`} />
                </button>
              </div>

              {/* Scrollable file cards */}
              <div className="space-y-2 max-h-[290px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {files.length === 0 ? (
                  <div className="py-16 text-center text-slate-600 space-y-3">
                    <Film className="w-10 h-10 mx-auto text-slate-700" />
                    <p className="text-xs font-medium">本地暂无已下载完成的 MP4 文件</p>
                  </div>
                ) : (
                  files.map((file) => {
                    const isStreaming = activeStream?.filename === file.filename;
                    return (
                      <div 
                        key={file.filename}
                        className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between space-x-2 ${
                          isStreaming 
                            ? 'bg-bili-pink/10 border-bili-pink/40 text-white shadow-lg' 
                            : 'bg-[#0F1115] border-[#22252E] text-slate-300 hover:bg-[#1A1D23]/40 hover:border-slate-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <h4 className="text-[11px] font-bold text-slate-200 line-clamp-1 leading-snug break-all" title={file.title}>
                            {file.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-500">
                            <span className="font-bold text-slate-400">{formatBytes(file.size)}</span>
                            <span>•</span>
                            <span>{formatTime(file.createdAt)}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center space-x-1">
                          <button 
                            onClick={() => setActiveStream(isStreaming ? null : file)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              isStreaming 
                                ? 'bg-bili-pink text-white hover:bg-bili-pink/90 shadow' 
                                : 'bg-[#1A1D23] hover:bg-[#22252E] text-bili-pink'
                            }`}
                            title={isStreaming ? "关闭预览" : "极速预览"}
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                          </button>

                          <a 
                            href={`/api/files/download/${encodeURIComponent(file.filename)}`}
                            download
                            className="p-1.5 rounded-lg bg-[#1A1D23] hover:bg-[#22252E] text-blue-400 transition-all"
                            title="拉取到本地"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button 
                            onClick={() => handleDeleteFile(file.filename)}
                            className="p-1.5 rounded-lg bg-[#1A1D23] hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 transition-all cursor-pointer"
                            title="从磁盘彻底删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Disk space usage bento footer */}
            {files.length > 0 && (
              <div className="pt-3 border-t border-[#1C1F28] flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span className="flex items-center space-x-1">
                  <HardDrive className="w-3.5 h-3.5 text-bili-pink" />
                  <span>已管理合集文件 {files.length} 个</span>
                </span>
                <span className="font-bold text-bili-pink bg-bili-pink/5 px-2 py-0.5 rounded border border-bili-pink/10">
                  {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                </span>
              </div>
            )}
          </section>

        </div>

        {/* Bento Grid Layer 4: Floating Immersive Video streaming block (renders full-width when activeStream is set) */}
        <AnimatePresence>
          {activeStream && (
            <motion.section 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="bg-[#151821]/95 backdrop-blur-md border border-bili-pink/30 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => setActiveStream(null)}
                  className="p-2 bg-black/65 hover:bg-[#22252E] text-slate-400 hover:text-white rounded-full border border-zinc-800 transition-all cursor-pointer"
                  title="关闭播放"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <span className="inline-block text-[9px] font-mono font-bold tracking-widest text-bili-pink bg-bili-pink/10 border border-bili-pink/20 px-2 py-0.5 rounded uppercase">
                  LOCAL VIDEO STREAM ACTIVE (RANGE PLAYBACK)
                </span>
                <h3 className="text-sm font-bold text-white pr-10 truncate">
                  {activeStream.title}
                </h3>
              </div>

              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-[#22252E] shadow-inner relative max-w-4xl mx-auto">
                <video 
                  ref={videoPlayerRef}
                  src={`/api/files/stream/${encodeURIComponent(activeStream.filename)}`}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F1115] p-3.5 rounded-2xl text-[11px] text-slate-400 border border-[#22252E]">
                <div className="space-y-0.5">
                  <p>文件路径：<code className="text-slate-300 font-mono text-[10px] bg-[#1A1D23] px-1.5 py-0.5 rounded border border-[#282B34]">{activeStream.filename}</code></p>
                  <p>占用空间：<span className="text-slate-300 font-bold font-mono">{formatBytes(activeStream.size)}</span></p>
                </div>
                <div>
                  <a 
                    href={`/api/files/download/${encodeURIComponent(activeStream.filename)}`}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-bili-pink hover:bg-bili-pink/90 font-bold text-white rounded-xl transition-all shadow-md shadow-bili-pink/10 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>提取原始 MP4 文件</span>
                  </a>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

      </main>

      <footer className="border-t border-[#1C1F28] mt-16 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5 font-mono">
          <p>Bilibili Collection Downloader & Local Media Library</p>
          <p className="text-slate-600 text-[11px]">
            仅作技术学习交流使用。请遵守 Bilibili 社区条例及相关网络安全版权规定。
          </p>
        </div>
      </footer>
    </div>
  );
}
