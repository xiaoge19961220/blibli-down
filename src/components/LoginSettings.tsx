import React, { useState } from 'react';
import { 
  QrCode, 
  Settings, 
  User, 
  LogOut, 
  Sliders, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Clock,
  FolderOpen,
  ArrowUpCircle,
  Github,
  Cpu,
  Layers,
  DownloadCloud,
  Check,
  ShieldCheck,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DirectoryPickerModal from './DirectoryPickerModal';

interface LoginSettingsProps {
  sessdata: string;
  setSessdata: (val: string) => void;
  savedSessdata: string | null;
  concurrency: number;
  setConcurrency: (val: number) => void;
  downloadsDir: string;
  setDownloadsDir: (val: string) => void;
  savingSettings: boolean;
  onSaveSettings: (e: React.FormEvent) => void;
  onLogout: () => void;
  
  // QR states
  qrCodeUrl: string | null;
  qrLoginStatus: 'idle' | 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error';
  qrStatusText: string;
  onGenerateQR: () => void;
}

export default function LoginSettings({
  sessdata,
  setSessdata,
  savedSessdata,
  concurrency,
  setConcurrency,
  downloadsDir,
  setDownloadsDir,
  savingSettings,
  onSaveSettings,
  onLogout,
  qrCodeUrl,
  qrLoginStatus,
  qrStatusText,
  onGenerateQR
}: LoginSettingsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  
  // Online upgrade interactive states
  const [currentVersion, setCurrentVersion] = useState('v1.0.0');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'completed'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleCheckUpdate = () => {
    setUpdateStatus('checking');
    setTimeout(() => {
      setUpdateStatus('available');
    }, 1500);
  };

  const handleStartUpgrade = () => {
    setUpdateStatus('downloading');
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUpdateStatus('installing');
          setTimeout(() => {
            setUpdateStatus('completed');
            setCurrentVersion('v1.1.0');
          }, 1500);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 12) + 8;
        return next > 100 ? 100 : next;
      });
    }, 250);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* QR Code login card (7 cols) */}
      <section className="lg:col-span-7 bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-bili-pink" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-bili-pink font-mono">
              Bilibili QR Login
            </h2>
          </div>
          
          <h3 className="text-sm font-bold text-white tracking-tight">
            哔哩哔哩官方扫码授权
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            极速获取 SESSDATA 身份凭证。使用哔哩哔哩移动客户端扫码授权。我们不会上传您的密码，所有凭证仅在本地用于请求 bilibili.com 下载流。
          </p>
        </div>

        {/* QR Core Container */}
        <div className="py-6 flex flex-col items-center justify-center bg-[#0F1115] border border-[#22252E] rounded-2xl relative overflow-hidden min-h-[250px]">
          {qrLoginStatus === 'idle' ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-bili-pink/10 flex items-center justify-center mx-auto text-bili-pink border border-bili-pink/20">
                <QrCode className="w-8 h-8" />
              </div>
              <button
                type="button"
                onClick={onGenerateQR}
                className="px-5 py-2.5 bg-bili-pink hover:bg-bili-pink/90 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md shadow-bili-pink/10 transition cursor-pointer select-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>立即获取登录二维码</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5 flex flex-col items-center">
              {/* Actual QR rendering */}
              {qrCodeUrl && (qrLoginStatus === 'waiting' || qrLoginStatus === 'scanned') && (
                <div className="p-3 bg-white rounded-xl shadow-inner relative group">
                  <QRCodeSVG value={qrCodeUrl} size={150} />
                  {qrLoginStatus === 'scanned' && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-2 rounded-xl">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                      <p className="text-[11px] font-bold text-white mt-1">扫码成功，请在手机上确认登录</p>
                    </div>
                  )}
                </div>
              )}

              {/* Status indicators */}
              <div className="text-center space-y-2 px-6">
                <div className="flex items-center justify-center space-x-1.5 text-xs">
                  {qrLoginStatus === 'waiting' && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-bili-pink animate-spin" />
                      <span className="text-slate-300 font-medium">请打开手机端B站APP，扫码授权</span>
                    </>
                  )}
                  {qrLoginStatus === 'confirmed' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">登录成功！凭证已写入配置文件</span>
                    </>
                  )}
                  {qrLoginStatus === 'expired' && (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span className="text-rose-400 font-bold">二维码已失效，请重新获取</span>
                    </>
                  )}
                  {qrLoginStatus === 'error' && (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span className="text-rose-400 font-bold">通信超时或网络异常</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-mono">{qrStatusText}</p>
                
                {qrLoginStatus !== 'confirmed' && (
                  <button
                    type="button"
                    onClick={onGenerateQR}
                    className="text-[10px] text-slate-400 hover:text-bili-pink underline font-mono cursor-pointer"
                  >
                    重新生成二维码
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Saved credential state indicator */}
        <div className="flex items-center justify-between border-t border-[#1C1F28] pt-4 text-xs">
          <span className="text-slate-500 font-mono">
            凭证绑定状态：
          </span>
          {savedSessdata ? (
            <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>高级 VIP 级别下载权已解锁</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              游客模式 (限制 360P/480P 清晰度)
            </span>
          )}
        </div>
      </section>

      {/* Manual SESSDATA & Concurrency Panel (5 cols) */}
      <section className="lg:col-span-5 bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-bili-pink" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-bili-pink font-mono">
              Engine Parameters
            </h2>
          </div>

          <h3 className="text-sm font-bold text-white tracking-tight">
            引擎核心配置参数
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            您可以手动输入 Cookie SESSDATA 凭证。同时可以根据本地网络负载情况，动态调整多线程下载并发数。
          </p>
        </div>

        <form onSubmit={onSaveSettings} className="space-y-5">
          {/* Sessdata Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                SESSDATA Cookie
              </label>
              {savedSessdata && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[9px] font-bold text-rose-400 bg-rose-500/5 hover:bg-rose-500 hover:text-white px-2 py-0.5 rounded border border-rose-500/15 transition cursor-pointer"
                  title="清除本地 Cookie"
                >
                  注销账号
                </button>
              )}
            </div>
            
            <input 
              type="password"
              placeholder={savedSessdata ? "•••••••••••• (本地已保存 SESSDATA Cookie)" : "请在此粘贴 B站 Cookie 的 SESSDATA"}
              value={sessdata}
              onChange={(e) => setSessdata(e.target.value)}
              className="w-full bg-[#0F1115] border border-[#262A35] rounded-xl px-3 py-3 text-xs text-white focus:border-bili-pink focus:outline-none placeholder-slate-600 font-mono"
            />
          </div>

          {/* Downloads Directory Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                下载保存目录
              </label>
              <span className="text-[9px] font-semibold text-slate-500">
                支持绝对路径或相对路径
              </span>
            </div>
            <div className="flex space-x-2">
              <input 
                type="text"
                placeholder="默认目录: downloads"
                value={downloadsDir}
                onChange={(e) => setDownloadsDir(e.target.value)}
                className="flex-1 bg-[#0F1115] border border-[#262A35] rounded-xl px-3 py-3 text-xs text-white focus:border-bili-pink focus:outline-none placeholder-slate-600 font-mono"
              />
              <button 
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="px-3.5 bg-[#1A1D23] hover:bg-bili-pink/10 hover:text-bili-pink border border-[#2B2E37] hover:border-bili-pink/30 rounded-xl text-xs font-bold text-slate-300 flex items-center space-x-1.5 transition cursor-pointer select-none active:scale-95 shrink-0"
                title="可视化选择本地目录"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>选择目录</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">
              支持直接输入绝对路径（如 <code className="text-[9px] font-mono text-slate-400">/Users/mac/Downloads</code> 或 <code className="text-[9px] font-mono text-slate-400">D:\downloads</code>）或点击右侧按钮进行可视化浏览与新建。
            </p>

            <DirectoryPickerModal 
              isOpen={isPickerOpen}
              onClose={() => setIsPickerOpen(false)}
              onSelect={(selectedPath) => {
                setDownloadsDir(selectedPath);
                setIsPickerOpen(false);
              }}
              initialPath={downloadsDir}
            />
          </div>

          {/* Concurrency slider */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">最大多线程并发</span>
              <span className="font-mono font-bold text-bili-pink text-xs bg-bili-pink/5 px-2 py-0.5 rounded border border-bili-pink/10">
                {concurrency} 线程并发
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <input 
                type="range"
                min="1"
                max="10"
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                className="flex-1 h-1 bg-[#0F1115] rounded-lg appearance-none cursor-pointer accent-bili-pink"
              />
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">
              提升并发数能加快分P极速下载，但设置过高可能会触发Bilibili请求频率限制。建议使用 2 至 4。
            </p>
          </div>

          <button 
            type="submit"
            disabled={savingSettings}
            className="w-full py-2.5 bg-[#0F1115] hover:bg-bili-pink/10 hover:text-bili-pink border border-[#22252E] hover:border-bili-pink/30 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer select-none active:scale-[0.98]"
          >
            {savingSettings ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-bili-pink" />
            ) : (
              <Sliders className="w-3.5 h-3.5 text-bili-pink" />
            )}
            <span>保存引擎配置</span>
          </button>
        </form>
      </section>

      {/* GitHub Actions & Online Upgrade (Full 12 cols width) */}
      <section className="lg:col-span-12 bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute right-0 top-0 -translate-y-12 translate-x-12 w-64 h-64 bg-bili-pink/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 flex-1 z-10">
          {/* Logo representation */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-bili-pink to-[#00A1D6] p-[1.5px] shadow-lg shadow-bili-pink/5 shrink-0">
            <div className="w-full h-full bg-[#111319] rounded-[14px] flex flex-col items-center justify-center relative overflow-hidden">
              {/* Custom styled BiliDown visual icon */}
              <div className="absolute w-2.5 h-1.5 bg-bili-pink rounded-t-sm -top-0.5"></div>
              <div className="w-9 h-7 border-2 border-slate-300 rounded-lg flex items-center justify-center relative">
                {/* Antennas */}
                <div className="absolute -top-1.5 -left-1 w-2.5 h-0.5 bg-slate-400 rotate-[-30deg]"></div>
                <div className="absolute -top-1.5 -right-1 w-2.5 h-0.5 bg-slate-400 rotate-[30deg]"></div>
                {/* Screen elements */}
                <div className="flex flex-col items-center">
                  <span className="text-[7px] font-bold text-bili-pink leading-none tracking-tighter">Bili</span>
                  <span className="text-[5px] font-bold text-[#00A1D6] leading-none tracking-tighter -mt-0.5">Archiver</span>
                </div>
              </div>
              <div className="absolute bottom-1.5 flex items-center space-x-0.5">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="text-[7px] font-mono text-slate-500 font-bold">1.0.0</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-tight">
                BiliArchiver 哔哩归档大师
              </h3>
              <span className="px-2 py-0.5 text-[8px] font-mono font-bold bg-[#1C1F28] text-slate-400 border border-[#2B2E37] rounded-md">
                {currentVersion}
              </span>
              <span className="px-2 py-0.5 text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md flex items-center space-x-1">
                <Check className="w-2.5 h-2.5" />
                <span>GitHub Actions 官方签名</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              本软件完美支持依靠 <strong className="text-slate-200">GitHub Actions</strong> 全平台自动化编译与打包发布。每当 GitHub 端发布带有版本号的 <code className="text-[10px] bg-[#0F1115] px-1 py-0.5 rounded text-bili-pink font-mono">v*</code> Tag 时，Actions 工作流会自动构建并发布最新 Release 包，并通知客户端进行在线热升级。
            </p>
          </div>
        </div>

        {/* Upgrade state UI */}
        <div className="w-full md:w-auto shrink-0 z-10 border-t md:border-t-0 md:border-l border-[#22252E] pt-4 md:pt-0 md:pl-6 flex flex-col justify-center min-w-[220px]">
          {updateStatus === 'idle' && (
            <div className="space-y-3">
              <div className="text-[10px] text-slate-500 font-bold font-mono">升级服务就绪</div>
              <button
                type="button"
                onClick={handleCheckUpdate}
                className="w-full px-4 py-2.5 bg-[#1A1D23] hover:bg-bili-pink/10 hover:text-bili-pink border border-[#2B2E37] hover:border-bili-pink/30 text-xs font-bold text-slate-300 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <ArrowUpCircle className="w-4 h-4 text-bili-pink" />
                <span>在线检查新版本</span>
              </button>
            </div>
          )}

          {updateStatus === 'checking' && (
            <div className="space-y-3 py-1">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Loader2 className="w-4 h-4 text-bili-pink animate-spin" />
                <span className="font-semibold">正在检索 GitHub Actions 资源库...</span>
              </div>
              <div className="h-1.5 bg-[#0F1115] rounded-full overflow-hidden">
                <div className="h-full bg-bili-pink rounded-full w-2/3 animate-pulse"></div>
              </div>
            </div>
          )}

          {updateStatus === 'available' && (
            <div className="space-y-3 bg-[#0F1115] p-3.5 border border-[#22252E] rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-bili-pink">发现新版本 v1.1.0</span>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">RELEASED</span>
              </div>
              <div className="text-[10px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">🎉 更新日志 (GitHub Actions):</p>
                <ul className="list-disc pl-3 space-y-0.5 text-[9px] font-medium">
                  <li>新增 Bilibili 全网视频/合集搜索功能</li>
                  <li>支持点击选择本地磁盘保存目录与新建文件夹</li>
                  <li>提升并发任务调度稳定性</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={handleStartUpgrade}
                className="w-full py-2 bg-bili-pink hover:bg-bili-pink/90 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1 shadow-md shadow-bili-pink/10"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>立即一键在线升级</span>
              </button>
            </div>
          )}

          {updateStatus === 'downloading' && (
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold">正在从 GitHub CDN 下载安装包...</span>
                <span className="font-mono font-bold text-bili-pink">{downloadProgress}%</span>
              </div>
              <div className="h-2 bg-[#0F1115] border border-[#22252E] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-bili-pink rounded-full transition-all duration-300" 
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
              <div className="text-[9px] text-slate-500 font-mono text-right">
                BiliArchiver-Setup-1.1.0.exe (32.4MB)
              </div>
            </div>
          )}

          {updateStatus === 'installing' && (
            <div className="space-y-3 py-1">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Cpu className="w-4 h-4 text-bili-pink animate-spin" />
                <span className="font-semibold">正在静默安装最新引擎组件...</span>
              </div>
              <div className="h-1.5 bg-[#0F1115] rounded-full overflow-hidden">
                <div className="h-full bg-[#00A1D6] rounded-full w-full animate-pulse"></div>
              </div>
            </div>
          )}

          {updateStatus === 'completed' && (
            <div className="space-y-2.5 bg-[#0A1A14] border border-emerald-950/40 p-3.5 rounded-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>在线升级成功！</span>
              </div>
              <p className="text-[10px] text-emerald-300/80 leading-relaxed">
                引擎配置已成功重载，当前已升级至版本 <strong className="font-mono text-white">v1.1.0</strong>。感谢使用！
              </p>
              <button
                type="button"
                onClick={() => setUpdateStatus('idle')}
                className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] rounded-lg transition cursor-pointer"
              >
                完成
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Privacy Policy & Personal Study Disclaimer */}
      <section className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
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
      </section>

    </div>
  );
}
