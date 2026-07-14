import React, { useState } from 'react';
import { 
  Download, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play, 
  Pause, 
  RefreshCw, 
  Trash2,
  Zap,
  Layers,
  Sparkles
} from 'lucide-react';
import { DownloadTask } from '../types';

interface DownloadManagerProps {
  tasks: DownloadTask[];
  activeCount: number;
  concurrencyLimit: number;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRedownload: (id: string) => void;
  onRemove: (id: string, deleteFile: boolean) => void;
  onCancelAll: () => void;
}

export default function DownloadManager({
  tasks,
  activeCount,
  concurrencyLimit,
  onPause,
  onResume,
  onRedownload,
  onRemove,
  onCancelAll
}: DownloadManagerProps) {
  // Store task id that is currently showing the delete confirmation
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec <= 0) return '0 B/s';
    return `${formatBytes(bytesPerSec)}/s`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats Panel */}
      <section className="bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-bili-pink animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-bili-pink font-mono">
              Queue Status Console
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            活动线程: <strong className="font-mono text-bili-pink">{activeCount}</strong> / {concurrencyLimit} 并发线程
          </p>
        </div>

        {tasks.length > 0 && (
          <button 
            onClick={onCancelAll}
            className="px-4 py-2 text-xs font-bold bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 rounded-xl border border-rose-500/20 transition-all cursor-pointer flex items-center space-x-2"
          >
            <XCircle className="w-4 h-4" />
            <span>取消全部排队任务</span>
          </button>
        )}
      </section>

      {/* Queue Task Items */}
      <section className="bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1C1F28] pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Active and Historical Tasks ({tasks.length})
          </h3>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {tasks.length === 0 ? (
            <div className="py-24 text-center text-slate-600 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#0F1115] border border-[#22252E] flex items-center justify-center mx-auto text-slate-600">
                <Download className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium max-w-xs mx-auto leading-relaxed">
                当前下载队列为空。请前往「视频提取」选项卡，解析哔哩哔哩链接并添加任务。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isDownloading = task.status === 'downloading';
                const isQueued = task.status === 'queued';
                const isPaused = task.status === 'paused';
                const isCompleted = task.status === 'completed';
                const isFailed = task.status === 'failed';
                const isCancelled = task.status === 'cancelled';

                const isConfirming = confirmDeleteTaskId === task.id;

                return (
                  <div 
                    key={task.id}
                    className="bg-[#0F1115] p-4 rounded-2xl border border-[#22252E] space-y-3 hover:border-bili-pink/10 transition-all duration-300"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          {/* Folder tag */}
                          {task.videoTitle && (
                            <span className="text-[10px] bg-bili-pink/5 text-bili-pink border border-bili-pink/10 px-2 py-0.5 rounded-lg truncate max-w-[200px]" title={task.videoTitle}>
                              📁 {task.videoTitle}
                            </span>
                          )}

                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1A1D23] border border-[#2B2E37] text-slate-400">
                            P{task.page}
                          </span>
                          
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 ${
                            isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            isDownloading ? 'bg-bili-pink/10 text-bili-pink border border-bili-pink/20' :
                            isQueued ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            isPaused ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
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
                               isPaused ? '已暂停' :
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

                      {/* Controls Area */}
                      <div className="shrink-0 flex items-center space-x-1.5">
                        {isConfirming ? (
                          <div className="flex items-center space-x-1 bg-[#151821] border border-rose-500/20 p-1.5 rounded-xl text-[10px] font-bold">
                            <span className="text-rose-400 px-1">同时删除本地视频？</span>
                            <button 
                              onClick={() => {
                                onRemove(task.id, true);
                                setConfirmDeleteTaskId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-500 text-white rounded hover:bg-rose-600 cursor-pointer"
                            >
                              是
                            </button>
                            <button 
                              onClick={() => {
                                onRemove(task.id, false);
                                setConfirmDeleteTaskId(null);
                              }}
                              className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 cursor-pointer"
                            >
                              否
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteTaskId(null)}
                              className="px-1.5 py-0.5 text-slate-500 hover:text-white cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Pause button */}
                            {isDownloading && (
                              <button 
                                onClick={() => onPause(task.id)}
                                className="p-1.5 rounded-xl bg-[#1A1D23] hover:bg-zinc-800 text-slate-400 hover:text-white border border-[#2B2E37] transition-all cursor-pointer"
                                title="暂停下载"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Resume button */}
                            {isPaused && (
                              <button 
                                onClick={() => onResume(task.id)}
                                className="p-1.5 rounded-xl bg-bili-pink/10 hover:bg-bili-pink/20 text-bili-pink border border-bili-pink/20 transition-all cursor-pointer"
                                title="继续下载"
                              >
                                <Play className="w-3.5 h-3.5 fill-bili-pink/15" />
                              </button>
                            )}

                            {/* Redownload button */}
                            {(isCompleted || isFailed || isCancelled) && (
                              <button 
                                onClick={() => onRedownload(task.id)}
                                className="p-1.5 rounded-xl bg-[#1A1D23] hover:bg-zinc-800 text-slate-400 hover:text-white border border-[#2B2E37] transition-all cursor-pointer"
                                title="重新下载"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Remove button */}
                            <button 
                              onClick={() => {
                                if (isCompleted) {
                                  // Ask whether to delete the disk file too
                                  setConfirmDeleteTaskId(task.id);
                                } else {
                                  // Directly remove the task row
                                  onRemove(task.id, false);
                                }
                              }}
                              className="p-1.5 rounded-xl bg-[#1A1D23] hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 border border-[#2B2E37] transition-all cursor-pointer"
                              title="删除记录"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Details */}
                    <div className="space-y-1">
                      <div className="h-1.5 bg-[#1C1F28] rounded-full overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-500' :
                            isFailed ? 'bg-rose-500' :
                            isPaused ? 'bg-zinc-600' :
                            isCancelled ? 'bg-slate-700' : 'bg-gradient-to-r from-bili-pink to-blue-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
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

                    {/* Error Alerts */}
                    {task.error && (
                      <div className="text-[10px] bg-rose-500/5 text-rose-300 p-2.5 rounded-xl border border-rose-500/10 flex items-start space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
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
    </div>
  );
}
