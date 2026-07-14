import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, PlayCircle, Loader2 } from 'lucide-react';
import { PageInfo, VideoInfo, DownloadTask, FileItem, SettingsInfo } from './types';

// Modular Page Components
import Navigation from './components/Navigation';
import VideoSearch from './components/VideoSearch';
import VideoExtractor from './components/VideoExtractor';
import DownloadManager from './components/DownloadManager';
import VideoLibrary from './components/VideoLibrary';
import LoginSettings from './components/LoginSettings';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'search' | 'extractor' | 'downloads' | 'library' | 'settings'>('search');

  // Input video metadata URL or BVID
  const [urlInput, setUrlInput] = useState('BV1MTQAY4EdP');
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  
  // Parsed Video Details
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  
  // Download Queue
  const [concurrency, setConcurrency] = useState(2);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [activeTasksCount, setActiveTasksCount] = useState(0);
  
  // File Library
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // Config parameters
  const [sessdata, setSessdata] = useState('');
  const [savedSessdata, setSavedSessdata] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [downloadsDir, setDownloadsDir] = useState('downloads');
  
  // QR Login state
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeKey, setQrCodeKey] = useState<string>('');
  const [qrLoginStatus, setQrLoginStatus] = useState<'idle' | 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error'>('idle');
  const [qrStatusText, setQrStatusText] = useState('');
  const qrPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-sync polling timers on load
  useEffect(() => {
    fetchTasks();
    fetchFiles();
    fetchSettings();

    // Poll tasks every 1.5 seconds for progress, speed, etc.
    const taskInterval = setInterval(fetchTasks, 1500);
    // Poll files every 5 seconds to automatically pick up finished ones
    const fileInterval = setInterval(fetchFiles, 5000);

    return () => {
      clearInterval(taskInterval);
      clearInterval(fileInterval);
      if (qrPollIntervalRef.current) {
        clearInterval(qrPollIntervalRef.current);
      }
    };
  }, []);

  // Sync / Refresh helper
  const handleGlobalSync = () => {
    fetchTasks();
    fetchFiles();
    fetchSettings();
    showToast('已同步获取最新数据');
  };

  // Fetch server settings (SESSDATA status)
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json() as SettingsInfo;
        setSavedSessdata(data.hasSessdata);
        setConcurrency(data.concurrencyLimit);
        if (data.downloadsDir) {
          setDownloadsDir(data.downloadsDir);
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  // Fetch current downloader queue tasks status
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

  // Fetch downloaded files list recursively
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

  // Fetch Bilibili Video details
  const handleParse = async (e?: React.FormEvent, customBvid?: string) => {
    if (e) e.preventDefault();
    const bvidToParse = (customBvid || urlInput).trim();
    if (!bvidToParse) return;

    setLoadingInfo(true);
    setErrorInfo(null);
    setVideoInfo(null);
    setSelectedPages([]);

    try {
      const res = await fetch(`/api/video-info?urlOrBvid=${encodeURIComponent(bvidToParse)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '解析失败，请确认输入的是否为有效合集。');
      }

      setVideoInfo(data);
      // Auto-select all chapters by default
      if (data.pages && data.pages.length > 0) {
        setSelectedPages(data.pages.map((p: PageInfo) => p.page));
      }
    } catch (err: any) {
      setErrorInfo(err.message || '获取视频信息失败，可能网络连接不稳定或BV号无效');
    } finally {
      setLoadingInfo(false);
    }
  };

  // Jump from Search directly to Extractor & trigger parsing
  const handleExtractFromSearch = (bvid: string) => {
    setUrlInput(bvid);
    setActiveTab('extractor');
    handleParse(undefined, bvid);
  };

  // Generate Bilibili Login QR Code
  const handleGenerateQR = async () => {
    // Clear any existing poll
    if (qrPollIntervalRef.current) {
      clearInterval(qrPollIntervalRef.current);
      qrPollIntervalRef.current = null;
    }

    setQrLoginStatus('idle');
    setQrStatusText('正在请求官方二维码...');
    setQrCodeUrl(null);

    try {
      const res = await fetch('/api/login/qr/generate');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '获取二维码失败');
      }

      setQrCodeUrl(data.url);
      setQrCodeKey(data.qrcode_key);
      setQrLoginStatus('waiting');
      setQrStatusText('请扫码确认');

      // Start polling Bilibili redirect API
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
          setQrLoginStatus('confirmed');
          setQrStatusText('扫码登录成功！');
          showToast('B站扫码登录成功！高级画质已解锁');
          if (qrPollIntervalRef.current) {
            clearInterval(qrPollIntervalRef.current);
            qrPollIntervalRef.current = null;
          }
          fetchSettings();
        } else if (code === 86038) {
          setQrLoginStatus('scanned');
          setQrStatusText('手机上已扫码，请按「确认」');
        } else if (code === 86101) {
          setQrLoginStatus('waiting');
          setQrStatusText('等待您在手机端扫码授权');
        } else if (code === 86090) {
          setQrLoginStatus('expired');
          setQrStatusText('二维码已过期');
          if (qrPollIntervalRef.current) {
            clearInterval(qrPollIntervalRef.current);
            qrPollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error('Polling QR status error:', err);
      }
    };

    poll();
    qrPollIntervalRef.current = setInterval(poll, 2000);
  };

  // Save Manual sessdata or concurrency
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessdata, concurrency, downloadsDir })
      });
      if (res.ok) {
        const data = await res.json();
        setSavedSessdata(data.hasSessdata);
        setSessdata(''); // clear input
        if (data.downloadsDir) {
          setDownloadsDir(data.downloadsDir);
        }
        showToast('下载器配置已保存');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Logout/Reset sessdata
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessdata: '', concurrency, downloadsDir })
      });
      if (res.ok) {
        setSavedSessdata(false);
        setSessdata('');
        setQrLoginStatus('idle');
        setQrCodeUrl(null);
        showToast('已安全清除您的登录会话凭证');
      }
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  // Add parsed videos to download queue
  const handleAddToQueue = async (pagesToDownload: PageInfo[]) => {
    if (!videoInfo || pagesToDownload.length === 0) return;

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bvid: videoInfo.bvid,
          title: videoInfo.title, // Pass title so we save inside themed directory!
          pages: pagesToDownload,
          concurrency
        })
      });

      if (res.ok) {
        fetchTasks();
        showToast(`已成功将 ${pagesToDownload.length} 个视频推送到下载中心`);
        setActiveTab('downloads'); // Auto jump to downloads tab so user can monitor
      } else {
        const data = await res.json();
        alert(data.error || '添加下载任务失败');
      }
    } catch (err) {
      console.error('Download add queue failed:', err);
    }
  };

  // Task inline actions
  const handlePauseTask = async (id: string) => {
    try {
      const res = await fetch('/api/tasks/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchTasks();
        showToast('已暂停该下载任务');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeTask = async (id: string) => {
    try {
      const res = await fetch('/api/tasks/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchTasks();
        showToast('已恢复下载，正在连接 CDN 节点');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRedownloadTask = async (id: string) => {
    try {
      const res = await fetch('/api/tasks/redownload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchTasks();
        showToast('已清空旧缓存，重新开始下载');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTask = async (id: string, deleteFile: boolean) => {
    try {
      const res = await fetch('/api/tasks/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, deleteFile })
      });
      if (res.ok) {
        fetchTasks();
        fetchFiles();
        showToast(deleteFile ? '已成功清除记录及本地视频' : '已清除该下载记录');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelAll = async () => {
    if (!confirm('确定要取消所有排队中或正在下载的任务吗？')) return;
    try {
      const res = await fetch('/api/tasks/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAll: true })
      });
      if (res.ok) {
        fetchTasks();
        showToast('已清空所有排队下载任务');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // File disk deletion
  const handleDeleteFile = async (filename: string) => {
    if (!confirm(`警告：确定要从磁盘永久删除该视频文件吗？\n${filename}`)) return;
    try {
      const res = await fetch(`/api/files?file=${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchFiles();
        showToast('视频文件已成功从磁盘彻底抹除');
      } else {
        const data = await res.json();
        alert(data.error || '文件删除失败');
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // Toast Stack Notification
  const showToast = (message: string) => {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-5 right-5 bg-bili-pink text-white px-6 py-3.5 rounded-2xl shadow-2xl font-bold text-xs z-50 transition-all duration-300 transform translate-y-0 flex items-center space-x-2 border border-white/10 backdrop-blur';
    notification.innerHTML = `<span>✨</span><span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-bili-dark text-slate-100 font-sans selection:bg-bili-pink selection:text-white flex flex-col md:flex-row relative overflow-x-hidden">
      
      {/* Dynamic ambient design background glows */}
      <div className="absolute top-[-100px] right-[-50px] w-[500px] h-[500px] bg-bili-pink/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[-100px] w-[600px] h-[600px] bg-[#3B82F6]/3 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Persistent Sidebar Navigation */}
      <Navigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDownloadsCount={activeTasksCount}
        completedFilesCount={files.length}
        hasSessdata={savedSessdata}
      />

      {/* Main Area View */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Top bar header */}
        <header className="border-b border-[#22252E] bg-bili-dark/80 backdrop-blur sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-base font-bold text-white flex items-center space-x-2">
              <span>{activeTab === 'search' ? '哔哩哔哩视频搜索' : activeTab === 'extractor' ? '视频提取与解析' : activeTab === 'downloads' ? '多线程下载管理' : activeTab === 'library' ? '本地合集媒体库' : '设置与身份凭证'}</span>
              <span className="text-[9px] font-mono font-bold bg-bili-pink/10 text-bili-pink border border-bili-pink/20 px-2 py-0.5 rounded uppercase">
                {activeTab}
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Host: http://127.0.0.1:3000 • Electron Wrapper Desktop Engine
            </p>
          </div>

          <button 
            onClick={handleGlobalSync}
            className="p-2 bg-[#0F1115] hover:bg-[#1A1D23] border border-[#22252E] hover:border-bili-pink/20 text-slate-400 hover:text-white rounded-xl transition cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
            title="全局强同步"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">手动同步</span>
          </button>
        </header>

        {/* Dynamic Inner Panel container */}
        <main className="p-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'search' && (
                <VideoSearch 
                  onExtract={handleExtractFromSearch}
                  showToast={showToast}
                />
              )}

              {activeTab === 'extractor' && (
                <VideoExtractor 
                  urlInput={urlInput}
                  setUrlInput={setUrlInput}
                  loadingInfo={loadingInfo}
                  errorInfo={errorInfo}
                  videoInfo={videoInfo}
                  selectedPages={selectedPages}
                  setSelectedPages={setSelectedPages}
                  handleParse={handleParse}
                  onAddToQueue={handleAddToQueue}
                  hasSessdata={savedSessdata}
                />
              )}

              {activeTab === 'downloads' && (
                <DownloadManager 
                  tasks={tasks}
                  activeCount={activeTasksCount}
                  concurrencyLimit={concurrency}
                  onPause={handlePauseTask}
                  onResume={handleResumeTask}
                  onRedownload={handleRedownloadTask}
                  onRemove={handleRemoveTask}
                  onCancelAll={handleCancelAll}
                />
              )}

              {activeTab === 'library' && (
                <VideoLibrary 
                  files={files}
                  loadingFiles={loadingFiles}
                  onRefreshFiles={fetchFiles}
                  onDeleteFile={handleDeleteFile}
                />
              )}

              {activeTab === 'settings' && (
                <LoginSettings 
                  sessdata={sessdata}
                  setSessdata={setSessdata}
                  savedSessdata={savedSessdata ? 'saved' : null}
                  concurrency={concurrency}
                  setConcurrency={setConcurrency}
                  downloadsDir={downloadsDir}
                  setDownloadsDir={setDownloadsDir}
                  savingSettings={savingSettings}
                  onSaveSettings={handleSaveSettings}
                  onLogout={handleLogout}
                  qrCodeUrl={qrCodeUrl}
                  qrLoginStatus={qrLoginStatus}
                  qrStatusText={qrStatusText}
                  onGenerateQR={handleGenerateQR}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Humility legal footer */}
        <footer className="border-t border-[#1C1F28] py-5 px-6 text-center text-[10px] text-slate-600 font-mono flex flex-col sm:flex-row sm:justify-between gap-2">
          <p>© 2026 Bento Pro Media Downloader. Running under Electron Core Environment.</p>
          <p className="text-slate-700">仅作个人极速备份学习使用 • 请勿散播未经授权视频</p>
        </footer>
      </div>
    </div>
  );
}
