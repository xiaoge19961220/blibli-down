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
  FolderOpen
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DirectoryPickerModal from './DirectoryPickerModal';

interface LoginSettingsProps {
  concurrency: number;
  setConcurrency: (val: number) => void;
  downloadsDir: string;
  setDownloadsDir: (val: string) => void;
  savingSettings: boolean;
  onSaveSettings: (e: React.FormEvent) => void;
  
  // Hoisted Login state
  savedSessdata: boolean;
  biliUser: {
    uname: string;
    face: string;
    vipStatus: number;
    vipType: number;
    mid: number;
    isLogin: boolean;
  } | null;
  checkingStatus: boolean;
  statusMessage: string;
  checkLoginStatus: () => void;
  onLogout: () => void;

  // QR states
  qrCodeUrl: string | null;
  qrLoginStatus: 'idle' | 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error';
  qrStatusText: string;
  onGenerateQR: () => void;
}

export default function LoginSettings({
  concurrency,
  setConcurrency,
  downloadsDir,
  setDownloadsDir,
  savingSettings,
  onSaveSettings,
  savedSessdata,
  biliUser,
  checkingStatus,
  statusMessage,
  checkLoginStatus,
  onLogout,
  qrCodeUrl,
  qrLoginStatus,
  qrStatusText,
  onGenerateQR
}: LoginSettingsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
      
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
            使用哔哩哔哩移动客户端扫码授权登录。我们不会上传您的密码，所有凭证仅在本地用于请求 bilibili.com 下载流。
          </p>
        </div>

        {/* QR Core Container */}
        <div className="py-6 flex flex-col items-center justify-center bg-[#0F1115] border border-[#22252E] rounded-2xl relative overflow-hidden min-h-[250px]">
          {qrLoginStatus === 'idle' ? (
            <div className="text-center space-y-4 w-full px-6 flex flex-col items-center">
              {savedSessdata && biliUser ? (
                <div className="w-full max-w-sm bg-[#161922] border border-[#262A37] rounded-2xl p-4 flex flex-col space-y-3 shadow-inner">
                  <div className="flex items-center space-x-3 text-left">
                    <img 
                      src={biliUser.face} 
                      alt={biliUser.uname} 
                      className="w-12 h-12 rounded-full border border-bili-pink/30 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-white font-bold text-xs truncate block">{biliUser.uname}</span>
                        {biliUser.vipStatus === 1 ? (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded uppercase tracking-wider scale-95 origin-left">
                            {biliUser.vipType === 2 ? '年度大会员' : '大会员'}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-slate-600 text-slate-300 rounded scale-95 origin-left">
                            普通用户
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {biliUser.mid}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-[#232734] pt-2 text-[10px]">
                    <span className="text-slate-400 flex items-center space-x-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${checkingStatus ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                      <span className="truncate max-w-[120px]">{statusMessage || '凭证验证通过'}</span>
                    </span>
                    <div className="flex items-center space-x-2.5">
                      <button
                        type="button"
                        disabled={checkingStatus}
                        onClick={checkLoginStatus}
                        className="text-bili-pink hover:text-bili-pink/80 flex items-center space-x-1 font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                        <span>检测状态</span>
                      </button>
                      <button
                        type="button"
                        onClick={onLogout}
                        className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                      >
                        注销账号
                      </button>
                    </div>
                  </div>
                </div>
              ) : savedSessdata && checkingStatus ? (
                <div className="flex flex-col items-center justify-center space-y-2 py-4">
                  <Loader2 className="w-6 h-6 text-bili-pink animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">正在检测 B 站账号登录状态...</span>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-bili-pink/10 flex items-center justify-center mx-auto text-bili-pink border border-bili-pink/20">
                  <QrCode className="w-8 h-8" />
                </div>
              )}
              
              {(!savedSessdata || !biliUser) && (
                <button
                  type="button"
                  onClick={onGenerateQR}
                  className="px-5 py-2.5 bg-bili-pink hover:bg-bili-pink/90 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-2 shadow-md shadow-bili-pink/10 select-none active:scale-[0.98]"
                >
                  <QrCode className="w-4 h-4" />
                  <span>立即获取登录二维码</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
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
                </div>
              ) : qrLoginStatus === 'expired' ? (
                <div className="text-center space-y-3 py-4">
                  <AlertCircle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
                  <p className="text-xs text-rose-400 font-bold">二维码已过期</p>
                  <button
                    type="button"
                    onClick={onGenerateQR}
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
                    type="button"
                    onClick={onGenerateQR}
                    className="mt-2 px-5 py-2 bg-bili-pink hover:bg-bili-pink/90 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    刷新重试
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Manual Settings & Concurrency Panel (5 cols) */}
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
            您可以自定义多线程任务并发限制，以及配置本地视频下载与归档的根路径。
          </p>
        </div>

        <form onSubmit={onSaveSettings} className="space-y-5">
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
              支持直接输入绝对路径（如 <code className="text-[9px] font-mono text-slate-400">/Users/mac/Downloads</code> 或 <code className="text-[9px] font-mono text-slate-400">D:\downloads</code>）或点击右侧选择。
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

    </div>
  );
}
