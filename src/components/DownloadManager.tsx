import React, { useState, useMemo } from 'react';
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
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderDown,
  Sparkles
} from 'lucide-react';
import { DownloadTask } from '../types';
import DirectoryPickerModal from './DirectoryPickerModal';

interface DownloadManagerProps {
  tasks: DownloadTask[];
  activeCount: number;
  concurrencyLimit: number;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRedownload: (id: string) => void;
  onRemove: (id: string, deleteFile: boolean) => void;
  onCancelAll: () => void;
  downloadsDir?: string;
}

export default function DownloadManager({
  tasks,
  activeCount,
  concurrencyLimit,
  onPause,
  onResume,
  onRedownload,
  onRemove,
  onCancelAll,
  downloadsDir = 'downloads'
}: DownloadManagerProps) {
  // Store task id that is currently showing the delete confirmation
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);

  // Store group bvid/title that is currently showing group delete confirmation
  const [confirmDeleteGroupKey, setConfirmDeleteGroupKey] = useState<string | null>(null);

  // Track collapsed state of groups (default to true/expanded)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Export path picker states
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [exportingGroup, setExportingGroup] = useState<{ bvid: string; videoTitle: string } | null>(null);
  const [exportStatus, setExportStatus] = useState<{ status: 'idle' | 'exporting' | 'success' | 'error'; message?: string }>({ status: 'idle' });

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

  // Group tasks by collection (videoTitle or bvid)
  const groupedCollections = useMemo(() => {
    const map: Record<string, {
      videoTitle: string;
      bvid: string;
      tasks: DownloadTask[];
    }> = {};

    tasks.forEach(task => {
      const groupKey = task.videoTitle || task.bvid || '其他下载';
      if (!map[groupKey]) {
        map[groupKey] = {
          videoTitle: task.videoTitle || '其他下载',
          bvid: task.bvid || '',
          tasks: []
        };
      }
      map[groupKey].tasks.push(task);
    });

    // Sort tasks within each group by page/part order
    return Object.values(map).map(group => {
      group.tasks.sort((a, b) => a.page - b.page);
      return group;
    });
  }, [tasks]);

  // Group action handlers
  const handlePauseGroup = (groupTasks: DownloadTask[]) => {
    groupTasks.forEach(task => {
      if (task.status === 'downloading') {
        onPause(task.id);
      }
    });
  };

  const handleResumeGroup = (groupTasks: DownloadTask[]) => {
    groupTasks.forEach(task => {
      if (task.status === 'paused' || task.status === 'cancelled') {
        onResume(task.id);
      }
    });
  };

  const handleRemoveGroup = (groupTasks: DownloadTask[], deleteFiles: boolean) => {
    groupTasks.forEach(task => {
      onRemove(task.id, deleteFiles);
    });
    setConfirmDeleteGroupKey(null);
  };

  // Open directory picker for exporting a specific collection
  const handleStartExport = (videoTitle: string, bvid: string) => {
    setExportingGroup({ videoTitle, bvid });
    setExportStatus({ status: 'idle' });
    setIsPickerOpen(true);
  };

  // Process folder copy/extraction request after path selection
  const handleExportSelect = async (selectedPath: string) => {
    if (!exportingGroup) return;
    setIsPickerOpen(false);
    setExportStatus({ status: 'exporting' });
    
    try {
      const res = await fetch('/api/tasks/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: exportingGroup.videoTitle,
          bvid: exportingGroup.bvid,
          targetDir: selectedPath
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '导出失败，请检查路径写入权限');
      }
      setExportStatus({
        status: 'success',
        message: `成功导出！视频合集已成功复制到指定位置：\n${data.path}`
      });
    } catch (err: any) {
      setExportStatus({
        status: 'error',
        message: err.message || '导出过程中遇到错误，请确认目标路径有效且有写权限。'
      });
    }
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
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

      {/* Export Status Notification Banner */}
      {exportStatus.status !== 'idle' && (
        <section className={`border p-5 rounded-2xl animate-in slide-in-from-top duration-300 ${
          exportStatus.status === 'exporting' ? 'bg-blue-500/5 border-blue-500/20 text-blue-300' :
          exportStatus.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' :
          'bg-rose-500/5 border-rose-500/20 text-rose-300'
        }`}>
          <div className="flex items-start space-x-3">
            <div className="shrink-0 mt-0.5">
              {exportStatus.status === 'exporting' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
              {exportStatus.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {exportStatus.status === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-bold text-white">
                {exportStatus.status === 'exporting' && '正在提取并导出视频合集...'}
                {exportStatus.status === 'success' && '合集导出归档成功'}
                {exportStatus.status === 'error' && '合集导出失败'}
              </h4>
              <p className="text-[11px] whitespace-pre-wrap leading-relaxed opacity-90 font-medium">
                {exportStatus.status === 'exporting' && `正在将视频复制到指定路径，这可能需要一些时间，请稍候...`}
                {exportStatus.status === 'success' && exportStatus.message}
                {exportStatus.status === 'error' && exportStatus.message}
              </p>
              {exportStatus.status !== 'exporting' && (
                <button
                  onClick={() => setExportStatus({ status: 'idle' })}
                  className="mt-2 px-3 py-1 bg-[#1A1D23] hover:bg-[#22252E] text-white rounded-lg text-[10px] font-bold border border-[#2B2E37] transition"
                >
                  关闭通知
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Queue Task Items */}
      <section className="bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1C1F28] pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Active and Historical Tasks ({groupedCollections.length} 合集 / {tasks.length} 视频分P)
          </h3>
        </div>

        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {groupedCollections.length === 0 ? (
            <div className="py-24 text-center text-slate-600 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#0F1115] border border-[#22252E] flex items-center justify-center mx-auto text-slate-600">
                <Download className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium max-w-xs mx-auto leading-relaxed">
                当前下载队列为空。请前往「视频提取」选项卡，解析哔哩哔哩链接并添加任务。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedCollections.map((group) => {
                const groupKey = group.videoTitle;
                const isCollapsed = !!collapsedGroups[groupKey];
                
                // Calculate metrics for the group
                const completedCount = group.tasks.filter(t => t.status === 'completed').length;
                const activeCountInGroup = group.tasks.filter(t => t.status === 'downloading').length;
                const isPausedInGroup = group.tasks.some(t => t.status === 'paused');
                const isGroupCompleted = completedCount === group.tasks.length;
                const totalDownloadedBytes = group.tasks.reduce((acc, t) => acc + t.downloadedBytes, 0);
                const totalBytesInGroup = group.tasks.reduce((acc, t) => acc + t.totalBytes, 0);
                
                // Calculate overall percentage
                const groupProgress = totalBytesInGroup > 0 
                  ? Math.round((totalDownloadedBytes / totalBytesInGroup) * 100)
                  : (group.tasks.length > 0 ? Math.round(group.tasks.reduce((acc, t) => acc + t.progress, 0) / group.tasks.length) : 0);

                const isConfirmingGroupDelete = confirmDeleteGroupKey === groupKey;

                return (
                  <div 
                    key={groupKey}
                    className="bg-[#0F1115] rounded-2xl border border-[#22252E] overflow-hidden hover:border-[#333845] transition-all duration-300"
                  >
                    {/* Collection Header Row */}
                    <div 
                      className="p-4 bg-[#151821]/50 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none border-b border-[#1C1F28]"
                      onClick={() => toggleGroupCollapse(groupKey)}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Collapse Arrow */}
                        <div className="p-1 rounded bg-[#1A1D23] text-slate-400 hover:text-white transition">
                          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>

                        {/* Icon and metadata */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-[10px] bg-bili-pink/10 text-bili-pink border border-bili-pink/20 px-2 py-0.5 rounded-lg flex items-center space-x-1 font-bold">
                              <FolderOpen className="w-3 h-3" />
                              <span>合集归档</span>
                            </span>
                            
                            <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                              BV{group.bvid || 'Local'}
                            </span>

                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isGroupCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              activeCountInGroup > 0 ? 'bg-bili-pink/10 text-bili-pink border border-bili-pink/20 animate-pulse' :
                              isPausedInGroup ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                              'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {isGroupCompleted ? '全部完成' :
                               activeCountInGroup > 0 ? `下载中 (${activeCountInGroup}个线程)` :
                               isPausedInGroup ? '已暂停' : '等待中'}
                            </span>

                            <span className="text-[10px] font-mono text-slate-400">
                              已完成 {completedCount} / {group.tasks.length} 分P
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-white truncate" title={group.videoTitle}>
                            {group.videoTitle}
                          </h4>
                        </div>
                      </div>

                      {/* Header Controls (Export, Pause all, Resume all, Delete all) */}
                      <div className="flex items-center space-x-2 self-end md:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isConfirmingGroupDelete ? (
                          <div className="flex items-center space-x-1.5 bg-[#151821] border border-rose-500/20 p-1 rounded-xl text-[10px] font-bold">
                            <span className="text-rose-400 px-1">同时删除本地视频？</span>
                            <button 
                              onClick={() => handleRemoveGroup(group.tasks, true)}
                              className="px-2 py-1 bg-rose-500 text-white rounded hover:bg-rose-600 cursor-pointer text-[10px]"
                            >
                              是
                            </button>
                            <button 
                              onClick={() => handleRemoveGroup(group.tasks, false)}
                              className="px-2 py-1 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 cursor-pointer text-[10px]"
                            >
                              否
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteGroupKey(null)}
                              className="px-1.5 py-1 text-slate-500 hover:text-white cursor-pointer text-[10px]"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Export Collection Button */}
                            <button
                              onClick={() => handleStartExport(group.videoTitle, group.bvid)}
                              disabled={completedCount === 0}
                              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-[#1A1D23] hover:bg-bili-pink/10 hover:text-bili-pink text-slate-300 border border-[#2B2E37] hover:border-bili-pink/20 transition flex items-center space-x-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title="将该合集所有已下载的视频导出/提取到指定文件夹"
                            >
                              <FolderDown className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">提取/导出到...</span>
                            </button>

                            {/* Pause Group */}
                            {activeCountInGroup > 0 && (
                              <button
                                onClick={() => handlePauseGroup(group.tasks)}
                                className="p-1.5 rounded-xl bg-[#1A1D23] hover:bg-zinc-800 text-slate-400 hover:text-white border border-[#2B2E37] transition cursor-pointer"
                                title="暂停当前合集的所有下载"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Resume Group */}
                            {!isGroupCompleted && activeCountInGroup === 0 && (
                              <button
                                onClick={() => handleResumeGroup(group.tasks)}
                                className="p-1.5 rounded-xl bg-[#1A1D23] hover:bg-bili-pink/10 hover:text-bili-pink text-slate-400 border border-[#2B2E37] transition cursor-pointer"
                                title="继续下载该合集未完成的任务"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Group Record */}
                            <button
                              onClick={() => setConfirmDeleteGroupKey(groupKey)}
                              className="p-1.5 rounded-xl bg-[#1A1D23] hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 border border-[#2B2E37] transition cursor-pointer"
                              title="删除合集下载任务记录"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Overall Progress Bar in collapsed state */}
                    <div className="px-4 py-2.5 bg-[#0F1115]/30 flex items-center space-x-4 border-b border-[#1C1F28]/50">
                      <div className="flex-1">
                        <div className="h-1 bg-[#1C1F28] rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isGroupCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-bili-pink to-blue-500'
                            }`}
                            style={{ width: `${groupProgress}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 shrink-0 font-bold">
                        合集进度: {groupProgress}%
                      </div>
                    </div>

                    {/* Collection Episodes Content Block (Hidden if collapsed) */}
                    {!isCollapsed && (
                      <div className="p-4 space-y-3 bg-[#0F1115]/20 divide-y divide-[#1C1F28]/40">
                        {group.tasks.map((task, idx) => {
                          const isDownloading = task.status === 'downloading';
                          const isQueued = task.status === 'queued';
                          const isPaused = task.status === 'paused';
                          const isCompleted = task.status === 'completed';
                          const isFailed = task.status === 'failed';
                          const isCancelled = task.status === 'cancelled';

                          const isConfirmingTaskDelete = confirmDeleteTaskId === task.id;

                          return (
                            <div 
                              key={task.id}
                              className={`pt-3 ${idx === 0 ? 'pt-0' : ''} space-y-2`}
                            >
                              {/* Individual row details */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1A1D23] border border-[#2B2E37] text-slate-400">
                                      P{task.page}
                                    </span>

                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 ${
                                      isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      isDownloading ? 'bg-bili-pink/10 text-bili-pink border border-bili-pink/20' :
                                      isQueued ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                      isPaused ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                                      isFailed ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                      'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}>
                                      {isDownloading && <Loader2 className="w-2 h-2 animate-spin shrink-0" />}
                                      {isCompleted && <CheckCircle2 className="w-2 h-2 shrink-0" />}
                                      {isFailed && <XCircle className="w-2 h-2 shrink-0" />}
                                      <span>
                                        {isCompleted ? '已完成' :
                                         isDownloading ? '下载中' :
                                         isQueued ? '排队中' :
                                         isPaused ? '已暂停' :
                                         isFailed ? '失败' : '已取消'}
                                      </span>
                                    </span>

                                    {isDownloading && task.speed > 0 && (
                                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 flex items-center space-x-1">
                                        <Zap className="w-2.5 h-2.5 animate-pulse" />
                                        <span>{formatSpeed(task.speed)}</span>
                                      </span>
                                    )}
                                  </div>

                                  <h5 className="text-[11px] font-semibold text-slate-300 truncate" title={task.part}>
                                    {task.part}
                                  </h5>
                                </div>

                                {/* Row Controls */}
                                <div className="shrink-0 flex items-center space-x-1.5">
                                  {isConfirmingTaskDelete ? (
                                    <div className="flex items-center space-x-1 bg-[#151821] border border-rose-500/20 p-1 rounded-xl text-[9px] font-bold">
                                      <span className="text-rose-400 px-1">同时删除本地视频？</span>
                                      <button 
                                        onClick={() => {
                                          onRemove(task.id, true);
                                          setConfirmDeleteTaskId(null);
                                        }}
                                        className="px-1.5 py-0.5 bg-rose-500 text-white rounded hover:bg-rose-600 cursor-pointer"
                                      >
                                        是
                                      </button>
                                      <button 
                                        onClick={() => {
                                          onRemove(task.id, false);
                                          setConfirmDeleteTaskId(null);
                                        }}
                                        className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 cursor-pointer"
                                      >
                                        否
                                      </button>
                                      <button 
                                        onClick={() => setConfirmDeleteTaskId(null)}
                                        className="px-1 text-slate-500 hover:text-white cursor-pointer"
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
                                          className="p-1.5 rounded-lg bg-[#1A1D23] hover:bg-zinc-800 text-slate-400 hover:text-white border border-[#2B2E37] transition-all cursor-pointer"
                                          title="暂停下载"
                                        >
                                          <Pause className="w-3 h-3" />
                                        </button>
                                      )}

                                      {/* Resume button */}
                                      {isPaused && (
                                        <button 
                                          onClick={() => onResume(task.id)}
                                          className="p-1.5 rounded-lg bg-bili-pink/10 hover:bg-bili-pink/20 text-bili-pink border border-bili-pink/20 transition-all cursor-pointer"
                                          title="继续下载"
                                        >
                                          <Play className="w-3 h-3 fill-bili-pink/15" />
                                        </button>
                                      )}

                                      {/* Redownload button */}
                                      {(isCompleted || isFailed || isCancelled) && (
                                        <button 
                                          onClick={() => onRedownload(task.id)}
                                          className="p-1.5 rounded-lg bg-[#1A1D23] hover:bg-zinc-800 text-slate-400 hover:text-white border border-[#2B2E37] transition-all cursor-pointer"
                                          title="重新下载"
                                        >
                                          <RefreshCw className="w-3 h-3" />
                                        </button>
                                      )}

                                      {/* Remove button */}
                                      <button 
                                        onClick={() => {
                                          if (isCompleted) {
                                            setConfirmDeleteTaskId(task.id);
                                          } else {
                                            onRemove(task.id, false);
                                          }
                                        }}
                                        className="p-1.5 rounded-lg bg-[#1A1D23] hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 border border-[#2B2E37] transition-all cursor-pointer"
                                        title="删除记录"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="h-1 bg-[#1C1F28] rounded-full overflow-hidden relative">
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

                                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
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

                              {/* Error alerts */}
                              {task.error && (
                                <div className="text-[9px] bg-rose-500/5 text-rose-300 p-2 rounded-xl border border-rose-500/10 flex items-start space-x-1.5">
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
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Directory Selector Modal for Exporting */}
      {isPickerOpen && exportingGroup && (
        <DirectoryPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleExportSelect}
          initialPath={downloadsDir}
        />
      )}
    </div>
  );
}
