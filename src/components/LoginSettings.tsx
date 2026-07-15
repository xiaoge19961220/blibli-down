import React, { useState } from 'react';
import { 
  Settings, 
  Sliders, 
  Loader2, 
  FolderOpen
} from 'lucide-react';
import DirectoryPickerModal from './DirectoryPickerModal';

interface LoginSettingsProps {
  concurrency: number;
  setConcurrency: (val: number) => void;
  downloadsDir: string;
  setDownloadsDir: (val: string) => void;
  savingSettings: boolean;
  onSaveSettings: (e: React.FormEvent) => void;
}

export default function LoginSettings({
  concurrency,
  setConcurrency,
  downloadsDir,
  setDownloadsDir,
  savingSettings,
  onSaveSettings
}: LoginSettingsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-200">
      
      {/* Manual Settings & Concurrency Panel */}
      <section className="bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 flex flex-col space-y-6 shadow-xl">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-bili-pink" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-bili-pink font-mono">
              Engine Parameters
            </h2>
          </div>

          <h3 className="text-sm font-bold text-white tracking-tight">
            引擎核心配置与系统参数
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-normal">
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
