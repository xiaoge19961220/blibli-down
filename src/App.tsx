import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  PlayCircle, 
  Loader2, 
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  QrCode,
  User,
  ShieldCheck,
  ShieldAlert,
  DownloadCloud,
  Cpu
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PageInfo, VideoInfo, DownloadTask, FileItem, SettingsInfo } from './types';

// Modular Page Components
import Navigation from './components/Navigation';
import VideoSearch from './components/VideoSearch';
import VideoExtractor from './components/VideoExtractor';
import DownloadManager from './components/DownloadManager';
import LoginSettings from './components/LoginSettings';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'search' | 'extractor' | 'downloads' | 'settings' | 'about'>('search');

  // Input video metadata URL or BVID
  const [urlInput, setUrlInput] = useState('');
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

  // Bilibili user login profile state (hoisted)
  const [biliUser, setBiliUser] = useState<{
    uname: string;
    face: string;
    vipStatus: number;
    vipType: number;
    mid: number;
    isLogin: boolean;
  } | null>(null);
  const [checkingLoginStatus, setCheckingLoginStatus] = useState(false);
  const [loginStatusMessage, setLoginStatusMessage] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Application auto-updater state (hoisted)
  const [currentVersion, setCurrentVersion] = useState('v1.0.0');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'completed' | 'failed'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [newVersionInfo, setNewVersionInfo] = useState<{
    latestVersion: string;
    releaseName: string;
    releaseNotes: string;
    downloadUrl: string;
    assetName: string;
    isPrerelease: boolean;
  } | null>(null);
  const [updaterError, setUpdaterError] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

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

  // Trigger check login status when savedSessdata changes
  useEffect(() => {
    if (savedSessdata) {
      checkLoginStatus();
    } else {
      setBiliUser(null);
    }
  }, [savedSessdata]);

  const checkLoginStatus = async () => {
    setCheckingLoginStatus(true);
    setLoginStatusMessage('');
    try {
      const res = await fetch('/api/login/status');
      const data = await res.json();
      if (data.success && data.isLogin) {
        setBiliUser({
          uname: data.uname,
          face: data.face,
          vipStatus: data.vipStatus,
          vipType: data.vipType,
          mid: data.mid,
          isLogin: true
        });
        setLoginStatusMessage(data.message || '凭证状态良好。');
      } else {
        setBiliUser(null);
        setLoginStatusMessage(data.message || '登录凭证无效或已过期，请重新登录。');
      }
    } catch (err) {
      console.error('Failed to fetch login status:', err);
      setLoginStatusMessage('无法连接服务，请检查网络。');
      setBiliUser(null);
    } finally {
      setCheckingLoginStatus(false);
    }
  };

  // Fetch current version on mount for auto-updater
  useEffect(() => {
    const fetchCurrentVersion = async () => {
      try {
        const res = await fetch('/api/version');
        const data = await res.json();
        if (data.version) {
          setCurrentVersion(data.version.startsWith('v') ? data.version : `v${data.version}`);
        } else {
          const checkRes = await fetch('/api/update/check');
          const checkData = await checkRes.json();
          if (checkData.currentVersion) {
            setCurrentVersion(checkData.currentVersion.startsWith('v') ? checkData.currentVersion : `v${checkData.currentVersion}`);
          }
        }
      } catch (err) {
        console.error('Failed to fetch current version, attempting fallback:', err);
        try {
          const checkRes = await fetch('/api/update/check');
          const checkData = await checkRes.json();
          if (checkData.currentVersion) {
            setCurrentVersion(checkData.currentVersion.startsWith('v') ? checkData.currentVersion : `v${checkData.currentVersion}`);
          }
        } catch (innerErr) {
          console.error('Fallback failed:', innerErr);
        }
      }
    };
    fetchCurrentVersion();
  }, []);

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setUpdaterError(null);
    setShowUpdateModal(true); // Open the modal right away to show progress
    try {
      const res = await fetch('/api/update/check');
      if (!res.ok) {
        throw new Error(`服务器返回错误: ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.available) {
        const info = {
          latestVersion: data.latestVersion,
          releaseName: data.releaseName || '',
          releaseNotes: data.releaseNotes || '',
          downloadUrl: data.downloadUrl || '',
          assetName: data.assetName || '',
          isPrerelease: !!data.isPrerelease
        };
        setNewVersionInfo(info);
        
        // Directly skip release info screen and start downloading
        setUpdateStatus('downloading');
        setDownloadProgress(0);

        const downloadRes = await fetch('/api/update/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: info.downloadUrl,
            assetName: info.assetName
          })
        });
        
        if (!downloadRes.ok) {
          throw new Error('启动升级包下载失败');
        }

        // Start polling status
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch('/api/update/status');
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setDownloadProgress(statusData.progress || 0);
              
              if (statusData.status === 'completed') {
                clearInterval(pollInterval);
                setUpdateStatus('installing');
                
                // Trigger installation
                const installRes = await fetch('/api/update/install', { method: 'POST' });
                if (installRes.ok) {
                  setUpdateStatus('completed');
                } else {
                  const installData = await installRes.json();
                  throw new Error(installData.error || '安装程序执行失败');
                }
              } else if (statusData.status === 'failed') {
                clearInterval(pollInterval);
                setUpdateStatus('failed');
                setUpdaterError('安装包下载失败');
              }
            }
          } catch (e) {
            console.error('Error polling update status:', e);
          }
        }, 1000);

      } else {
        setUpdateStatus('idle');
        setShowUpdateModal(false); // Close modal if no update
        alert(`当前已是最新版本 (${data.currentVersion})！`);
      }
    } catch (err: any) {
      console.error('Update check failed:', err);
      setUpdaterError(err.message || '检查更新失败，请重试');
      setUpdateStatus('failed');
    }
  };

  const handleCancelUpgrade = async () => {
    try {
      await fetch('/api/update/cancel', { method: 'POST' });
      setUpdateStatus('idle');
      setDownloadProgress(0);
      setShowUpdateModal(false);
    } catch (err) {
      console.error('Cancel upgrade failed:', err);
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
        } else if (code === 86090) {
          setQrLoginStatus('scanned');
          setQrStatusText('手机上已扫码，请按「确认」');
        } else if (code === 86101) {
          setQrLoginStatus('waiting');
          setQrStatusText('等待您在手机端扫码授权');
        } else if (code === 86038) {
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
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-bili-dark text-slate-100 font-sans selection:bg-bili-pink selection:text-white flex flex-col md:flex-row relative overflow-x-hidden">
      
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
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0 md:h-screen md:overflow-y-auto">
        {/* Top bar header */}
        <header className="border-b border-[#22252E] bg-bili-dark/80 backdrop-blur sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-base font-bold text-white flex items-center space-x-2">
              <span>
                {activeTab === 'search' ? '哔哩哔哩视频搜索' : 
                 activeTab === 'extractor' ? '视频提取与解析' : 
                 activeTab === 'downloads' ? '多线程下载管理' : 
                 activeTab === 'settings' ? '账号管理与配置' : 
                 '协议与隐私政策'}
              </span>
              <span className="text-[9px] font-mono font-bold bg-bili-pink/10 text-bili-pink border border-bili-pink/20 px-2 py-0.5 rounded uppercase">
                {activeTab}
              </span>
            </h1>
            <p className="text-[10px] text-bili-pink font-semibold hidden sm:block">
              100% 纯本地极速多线程备份
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Check for updates button */}
            <button 
              onClick={handleCheckUpdate}
              className="p-2 bg-[#0F1115] hover:bg-bili-pink/10 border border-[#22252E] hover:border-bili-pink/30 text-slate-400 hover:text-white rounded-xl transition cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
              title="在线检查并升级新版本"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 text-bili-pink" />
              <span className="hidden sm:inline">检查新版本</span>
            </button>

            {/* Avatar / Login button */}
            {savedSessdata && biliUser ? (
              <div 
                onClick={() => setActiveTab('settings')}
                className="flex items-center space-x-2 bg-[#0F1115] hover:bg-[#1A1D23] border border-[#22252E] hover:border-[#3B3E4A] px-2.5 py-1.5 rounded-xl cursor-pointer transition select-none"
                title={`已登录: ${biliUser.uname}`}
              >
                <img 
                  src={biliUser.face} 
                  alt={biliUser.uname}
                  className="w-5.5 h-5.5 rounded-full border border-bili-pink/30 object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-bold text-slate-200 hidden md:inline truncate max-w-[80px]">
                  {biliUser.uname}
                </span>
              </div>
            ) : (
              <button 
                onClick={() => {
                  handleGenerateQR();
                  setShowLoginModal(true);
                }}
                className="px-3 py-1.5 bg-bili-pink/10 hover:bg-bili-pink hover:text-white text-bili-pink border border-bili-pink/20 hover:border-bili-pink rounded-xl transition cursor-pointer flex items-center space-x-1.5 text-xs font-bold active:scale-95 animate-pulse"
                title="点击扫码登录"
              >
                <User className="w-3.5 h-3.5" />
                <span>扫码登录</span>
              </button>
            )}
          </div>
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
                  downloadsDir={downloadsDir}
                />
              )}

              {activeTab === 'settings' && (
                <LoginSettings 
                  savedSessdata={savedSessdata}
                  biliUser={biliUser}
                  checkingStatus={checkingLoginStatus}
                  statusMessage={loginStatusMessage}
                  checkLoginStatus={checkLoginStatus}
                  onLogout={handleLogout}
                  concurrency={concurrency}
                  setConcurrency={setConcurrency}
                  downloadsDir={downloadsDir}
                  setDownloadsDir={setDownloadsDir}
                  savingSettings={savingSettings}
                  onSaveSettings={handleSaveSettings}
                  qrCodeUrl={qrCodeUrl}
                  qrLoginStatus={qrLoginStatus}
                  qrStatusText={qrStatusText}
                  onGenerateQR={handleGenerateQR}
                />
              )}

              {activeTab === 'about' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white">协议与隐私政策</h2>
                    <p className="text-xs text-slate-400">关于 BiliArchiver 哔哩归档大师的隐私承诺与开源声明</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                    {/* Card 1: Privacy Protection Commitment */}
                    <div className="bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-bili-pink/10 flex items-center justify-center border border-bili-pink/20 shrink-0">
                            <ShieldCheck className="w-4 h-4 text-bili-pink" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">100% 纯本地隐私安全保障</h4>
                            <p className="text-[9px] text-slate-500">BiliArchiver 隐私政策与安全声明</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs text-slate-400 leading-relaxed font-normal">
                          <p>
                            🔒 <strong className="text-slate-200">本地离线运行：</strong> 所有关于 B 站视频、合集或章节的检索、数据流解析以及多线程合并操作均在您的<strong>本地计算机</strong>进行，不设任何中转服务器。
                          </p>
                          <p>
                            🍪 <strong className="text-slate-200">敏感凭证保护：</strong> 您的 <code className="text-[10px] bg-[#0F1115] px-1 py-0.5 rounded text-bili-pink font-mono">SESSDATA</code> 仅安全地保存在您本地磁盘的配置文件中，仅在与 BiliBili 官方网络通信时作为请求头部携带，**绝对不会上传**给任何第三方。
                          </p>
                          <p>
                            📁 <strong className="text-slate-200">无痕下载：</strong> 我们不收集也不上传您的下载路径、历史记录、账号昵称或任何媒体内容，您的数据完全属于您。
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#1C1F28] flex items-center justify-between">
                        <span className="text-[9px] font-semibold text-slate-500">安全级别：端到端本地加密</span>
                        <span className="text-[9px] bg-bili-pink/10 text-bili-pink px-2 py-0.5 rounded-full font-bold">已启用隐私盾</span>
                      </div>
                    </div>

                    {/* Card 2: Open Source License & Personal Study Use Disclaimer */}
                    <div className="bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#00A1D6]/10 flex items-center justify-center border border-[#00A1D6]/20 shrink-0">
                            <ShieldAlert className="w-4 h-4 text-[#00A1D6]" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">开源许可证与免责声明</h4>
                            <p className="text-[9px] text-slate-500">仅供个人学习、技术探讨与研究使用</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs text-slate-400 leading-relaxed font-normal">
                          <p>
                            🎓 <strong className="text-slate-200">仅供学习研究：</strong> 本软件开源并采用 MIT 授权协议，核心目的为研究音视频多线程传输协议以及 React/Electron 的技术实践。
                          </p>
                          <p>
                            🚫 <strong className="text-slate-200">禁止商业化与侵权：</strong> 严禁将本软件用于任何商业获利、侵权分发、海量下载或非法传播。使用者在下载视频时，必须遵守当地法律法规并确保已获内容版权所有者授权。
                          </p>
                          <p>
                            ⚠️ <strong className="text-slate-200">免责免损条款：</strong> 用户应遵守 B 站服务协议。因恶意使用、高频请求或不当行为导致账号受限、版权纠纷或其他不良后果，均由使用者本人承担，开发者对此不承担任何连带责任。
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#1C1F28] flex items-center justify-between">
                        <span className="text-[9px] font-semibold text-slate-500">许可模式：MIT (Modified for Study)</span>
                        <span className="text-[9px] bg-[#00A1D6]/10 text-[#00A1D6] px-2 py-0.5 rounded-full font-bold">个人非商业</span>
                      </div>
                    </div>
                  </div>
                </div>
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

      {/* Login QR Code Modal overlay */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#151821] border border-[#232731] rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => {
                  setShowLoginModal(false);
                  if (qrPollIntervalRef.current) {
                    clearInterval(qrPollIntervalRef.current);
                    qrPollIntervalRef.current = null;
                  }
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-90 select-none"
              >
                &times;
              </button>
              
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <QrCode className="w-5 h-5 text-bili-pink" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    扫码登录 Bilibili
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed px-4">
                  请使用哔哩哔哩移动客户端扫码授权登录以解锁高清/高帧率备份。
                </p>

                {/* QR Code Container */}
                <div className="py-6 flex flex-col items-center justify-center bg-[#0F1115] border border-[#22252E] rounded-2xl relative min-h-[220px]">
                  {qrLoginStatus === 'waiting' || qrLoginStatus === 'scanned' ? (
                    <div className="space-y-4 flex flex-col items-center">
                      {qrCodeUrl && (
                        <div className="bg-white p-2.5 rounded-xl border border-bili-pink/20 shadow-lg">
                          <QRCodeSVG value={qrCodeUrl} size={150} />
                        </div>
                      )}
                      <div className="text-[11px] font-semibold text-slate-300 animate-pulse">
                        {qrStatusText}
                      </div>
                    </div>
                  ) : qrLoginStatus === 'confirmed' ? (
                    <div className="text-center space-y-3 py-4">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                      <p className="text-xs font-bold text-emerald-400">登录成功！</p>
                      <button
                        onClick={() => setShowLoginModal(false)}
                        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                      >
                        确定
                      </button>
                    </div>
                  ) : qrLoginStatus === 'expired' ? (
                    <div className="text-center space-y-3 py-4">
                      <AlertCircle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
                      <p className="text-xs text-rose-400 font-bold">二维码已过期</p>
                      <button
                        onClick={handleGenerateQR}
                        className="px-5 py-2 bg-bili-pink hover:bg-bili-pink/95 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                      >
                        重新生成
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="w-8 h-8 text-bili-pink animate-spin" />
                      <span className="text-[11px] text-slate-400">{qrStatusText || '正在生成二维码...'}</span>
                      <button
                        onClick={handleGenerateQR}
                        className="mt-2 px-5 py-2 bg-bili-pink hover:bg-bili-pink/90 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                      >
                        刷新重试
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online Update Modal overlay */}
      <AnimatePresence>
        {showUpdateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#151821] border border-[#232731] rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => {
                  if (updateStatus !== 'downloading' && updateStatus !== 'installing') {
                    setShowUpdateModal(false);
                  }
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-90 select-none disabled:opacity-30 disabled:pointer-events-none"
                disabled={updateStatus === 'downloading' || updateStatus === 'installing'}
              >
                &times;
              </button>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <ArrowUpCircle className="w-5 h-5 text-bili-pink" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    应用一键在线升级
                  </h3>
                </div>

                {updateStatus === 'checking' && (
                  <div className="py-8 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-bili-pink animate-spin" />
                    <span className="text-xs text-slate-400 font-mono">正在检索最新发布版本...</span>
                  </div>
                )}

                {updateStatus === 'downloading' && (
                  <div className="space-y-3 py-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-semibold">正在下载升级文件...</span>
                      <span className="font-mono font-bold text-bili-pink">{downloadProgress}%</span>
                    </div>
                    <div className="h-2 bg-[#0F1115] border border-[#22252E] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-bili-pink rounded-full transition-all duration-300" 
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-end items-center text-[10px] text-slate-500 font-mono pt-1">
                      <button 
                        onClick={handleCancelUpgrade}
                        className="text-bili-pink hover:underline font-bold cursor-pointer font-sans"
                      >
                        取消升级
                      </button>
                    </div>
                  </div>
                )}

                {updateStatus === 'installing' && (
                  <div className="py-8 flex flex-col items-center justify-center space-y-3">
                    <Cpu className="w-8 h-8 text-bili-pink animate-spin" />
                    <span className="text-xs text-slate-400 font-semibold">正在释放包文件并安装组件...</span>
                  </div>
                )}

                {updateStatus === 'completed' && (
                  <div className="space-y-4 py-2 animate-in zoom-in-95 duration-200">
                    <div className="bg-[#0A1A14] border border-emerald-950/40 p-4 rounded-2xl flex flex-col items-center space-y-3">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-emerald-400">在线升级就绪！</p>
                        <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                          更新文件已解压/释放到本地，重启程序后即可启用新版本。
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUpdateModal(false);
                        setUpdateStatus('idle');
                      }}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition cursor-pointer select-none active:scale-95"
                    >
                      完成并关闭
                    </button>
                  </div>
                )}

                {updateStatus === 'failed' && (
                  <div className="space-y-4 py-2 animate-in zoom-in-95 duration-200">
                    <div className="bg-red-950/10 border border-red-500/20 p-4 rounded-2xl flex flex-col items-center space-y-3">
                      <AlertCircle className="w-12 h-12 text-red-400" />
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-red-400">升级失败</p>
                        <p className="text-[11px] text-red-300/85">
                          {updaterError || '无法完成在线升级，请重试。'}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowUpdateModal(false);
                          setUpdateStatus('idle');
                        }}
                        className="flex-1 py-2.5 bg-[#1A1D23] hover:bg-[#252A34] text-slate-300 border border-[#2B2E37] font-bold text-xs rounded-xl transition cursor-pointer select-none active:scale-95"
                      >
                        关闭
                      </button>
                      <button
                        onClick={handleCheckUpdate}
                        className="flex-1 py-2.5 bg-bili-pink hover:bg-bili-pink/90 text-white font-bold text-xs rounded-xl transition cursor-pointer select-none active:scale-95"
                      >
                        重试
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

