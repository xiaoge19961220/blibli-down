import React from 'react';
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
  Clock
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface LoginSettingsProps {
  sessdata: string;
  setSessdata: (val: string) => void;
  savedSessdata: string | null;
  concurrency: number;
  setConcurrency: (val: number) => void;
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
  savingSettings,
  onSaveSettings,
  onLogout,
  qrCodeUrl,
  qrLoginStatus,
  qrStatusText,
  onGenerateQR
}: LoginSettingsProps) {

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
