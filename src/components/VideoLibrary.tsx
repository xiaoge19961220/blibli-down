import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, 
  Trash2, 
  Download, 
  PlayCircle, 
  RefreshCw, 
  Folder, 
  ChevronRight, 
  ChevronDown,
  HardDrive,
  X,
  Play
} from 'lucide-react';
import { FileItem } from '../types';

interface VideoLibraryProps {
  files: FileItem[];
  loadingFiles: boolean;
  onRefreshFiles: () => void;
  onDeleteFile: (filename: string) => void;
}

export default function VideoLibrary({
  files,
  loadingFiles,
  onRefreshFiles,
  onDeleteFile
}: VideoLibraryProps) {
  const [activeStream, setActiveStream] = useState<FileItem | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    return new Date(ms).toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group files by folder
  const folders: Record<string, FileItem[]> = {};
  const flatFiles: FileItem[] = [];

  files.forEach(file => {
    if (file.folder) {
      if (!folders[file.folder]) {
        folders[file.folder] = [];
      }
      folders[file.folder].push(file);
    } else {
      flatFiles.push(file);
    }
  });

  // Automatically expand folders that have files
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    Object.keys(folders).forEach(f => {
      initialExpanded[f] = true;
    });
    setExpandedFolders(prev => ({ ...initialExpanded, ...prev }));
  }, [files]);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // Auto-scroll to player when streaming starts
  useEffect(() => {
    if (activeStream && videoPlayerRef.current) {
      videoPlayerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeStream]);

  const totalBytesUsed = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-6">
      {/* Folder-Grouped Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Main Explorer Pane (7 cols) */}
        <section className="lg:col-span-7 bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between border-b border-[#1C1F28] pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Folder className="w-5 h-5 text-bili-pink" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-bili-pink font-mono">
                    Local Disk Explorer
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  合集视频根据其大标题自动组织到对应的文件夹中
                </p>
              </div>

              <button 
                onClick={onRefreshFiles}
                disabled={loadingFiles}
                className="p-2 rounded-xl bg-[#0F1115] border border-[#22252E] hover:border-bili-pink/30 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="刷新视频库"
              >
                <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin text-bili-pink' : ''}`} />
              </button>
            </div>

            {/* Folder list */}
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {files.length === 0 ? (
                <div className="py-24 text-center text-slate-600 space-y-3">
                  <Film className="w-12 h-12 mx-auto text-slate-700" />
                  <p className="text-xs font-medium">本地暂无已下载完成的 MP4 视频文件夹</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Folders block */}
                  {Object.entries(folders).map(([folderName, folderFiles]) => {
                    const isExpanded = !!expandedFolders[folderName];
                    const folderSize = folderFiles.reduce((sum, f) => sum + f.size, 0);

                    return (
                      <div key={folderName} className="border border-[#22252E] rounded-2xl overflow-hidden bg-[#0F1115]/40">
                        {/* Folder Header */}
                        <div 
                          onClick={() => toggleFolder(folderName)}
                          className="p-3.5 bg-[#0F1115] flex items-center justify-between cursor-pointer select-none hover:bg-[#1A1D23]/30 transition"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-200 truncate pr-2" title={folderName}>
                              {folderName}
                            </span>
                            <span className="text-[9px] bg-[#1A1D23] text-slate-500 px-1.5 py-0.5 rounded-lg border border-[#2B2E37] shrink-0">
                              {folderFiles.length} 个视频
                            </span>
                          </div>

                          <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                            {formatBytes(folderSize)}
                          </span>
                        </div>

                        {/* Folder Content */}
                        {isExpanded && (
                          <div className="divide-y divide-[#1C1F28] bg-black/10 px-2 py-1">
                            {folderFiles.map(file => {
                              const isStreaming = activeStream?.filename === file.filename;
                              return (
                                <div 
                                  key={file.filename}
                                  className={`p-2.5 my-1 rounded-xl transition-all duration-200 flex items-center justify-between space-x-2 ${
                                    isStreaming 
                                      ? 'bg-bili-pink/10 border border-bili-pink/30 text-white shadow-md' 
                                      : 'border border-transparent hover:bg-[#1A1D23]/30 text-slate-300'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-semibold text-slate-200 truncate leading-tight" title={file.title}>
                                      {file.page ? `P${file.page} • ` : ''}{file.title}
                                    </h4>
                                    <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-500 mt-0.5">
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
                                          : 'bg-[#1A1D23] hover:bg-[#22252E] text-bili-pink border border-[#2B2E37]'
                                      }`}
                                      title={isStreaming ? "关闭预览" : "极速预览"}
                                    >
                                      <PlayCircle className="w-3.5 h-3.5" />
                                    </button>

                                    <a 
                                      href={`/api/files/download?file=${encodeURIComponent(file.filename)}`}
                                      download
                                      className="p-1.5 rounded-lg bg-[#1A1D23] hover:bg-[#22252E] text-blue-400 border border-[#2B2E37] transition-all"
                                      title="保存视频到系统"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>

                                    <button 
                                      onClick={() => {
                                        if (activeStream?.filename === file.filename) {
                                          setActiveStream(null);
                                        }
                                        onDeleteFile(file.filename);
                                      }}
                                      className="p-1.5 rounded-lg bg-[#1A1D23] hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 border border-[#2B2E37] transition-all cursor-pointer"
                                      title="从磁盘删除"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Flat files block (if any) */}
                  {flatFiles.length > 0 && (
                    <div className="border border-[#22252E] rounded-2xl overflow-hidden bg-[#0F1115]/40 p-3 space-y-2">
                      <div className="flex items-center space-x-2 pb-2 border-b border-[#1C1F28]">
                        <Folder className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-400">根目录文件</span>
                      </div>
                      <div className="divide-y divide-[#1C1F28]">
                        {flatFiles.map(file => {
                          const isStreaming = activeStream?.filename === file.filename;
                          return (
                            <div 
                              key={file.filename}
                              className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-between space-x-2 ${
                                isStreaming 
                                  ? 'bg-bili-pink/10 border border-bili-pink/30 text-white shadow-md' 
                                  : 'border border-transparent hover:bg-[#1A1D23]/30 text-slate-300'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-semibold text-slate-200 truncate leading-tight" title={file.title}>
                                  {file.title}
                                </h4>
                                <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-500 mt-0.5">
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
                                      : 'bg-[#1A1D23] hover:bg-[#22252E] text-bili-pink border border-[#2B2E37]'
                                  }`}
                                  title={isStreaming ? "关闭预览" : "极速预览"}
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                </button>

                                <a 
                                  href={`/api/files/download?file=${encodeURIComponent(file.filename)}`}
                                  download
                                  className="p-1.5 rounded-lg bg-[#1A1D23] hover:bg-[#22252E] text-blue-400 border border-[#2B2E37] transition-all"
                                  title="保存视频到系统"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>

                                <button 
                                  onClick={() => {
                                    if (activeStream?.filename === file.filename) {
                                      setActiveStream(null);
                                    }
                                    onDeleteFile(file.filename);
                                  }}
                                  className="p-1.5 rounded-lg bg-[#1A1D23] hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 border border-[#2B2E37] transition-all cursor-pointer"
                                  title="从磁盘删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footprint metrics */}
          {files.length > 0 && (
            <div className="pt-4 border-t border-[#1C1F28] flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="flex items-center space-x-1.5">
                <HardDrive className="w-4 h-4 text-bili-pink animate-pulse" />
                <span>已存储合集文件: <strong>{files.length}</strong> 个</span>
              </span>
              <span className="font-bold text-bili-pink bg-bili-pink/5 px-2.5 py-1 rounded-xl border border-bili-pink/15">
                磁盘占用: {formatBytes(totalBytesUsed)}
              </span>
            </div>
          )}
        </section>

        {/* Video Player Preview (5 cols) */}
        <section className="lg:col-span-5 bg-[#151821]/80 backdrop-blur border border-[#232731] rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
          {activeStream ? (
            <div className="space-y-4 h-full flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-bili-pink bg-bili-pink/10 border border-bili-pink/20 px-2 py-0.5 rounded">
                    ACTIVE STREAMING PREVIEW
                  </span>
                  <button 
                    onClick={() => setActiveStream(null)}
                    className="p-1 bg-[#0F1115] hover:bg-[#1C1F28] border border-[#22252E] text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="text-xs font-bold text-white line-clamp-2 leading-relaxed" title={activeStream.title}>
                  {activeStream.title}
                </h3>
              </div>

              {/* HTML5 video tag with safe query parameter */}
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-[#22252E] flex items-center justify-center relative shadow-inner">
                <video 
                  ref={videoPlayerRef}
                  src={`/api/files/stream?file=${encodeURIComponent(activeStream.filename)}`}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="bg-[#0F1115] p-3 rounded-2xl border border-[#22252E] text-[10px] space-y-1 text-slate-500 font-mono">
                <p className="truncate">文件: <span className="text-slate-300">{activeStream.filename}</span></p>
                <p>大小: <span className="text-slate-300 font-bold">{formatBytes(activeStream.size)}</span></p>
              </div>

              <a 
                href={`/api/files/download?file=${encodeURIComponent(activeStream.filename)}`}
                className="w-full py-2.5 bg-bili-pink hover:bg-bili-pink/90 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-bili-pink/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>一键拉取到本地</span>
              </a>
            </div>
          ) : (
            <div className="py-32 text-center text-slate-600 space-y-4 flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 rounded-full bg-[#0F1115] border border-[#22252E] flex items-center justify-center text-slate-600">
                <Play className="w-5 h-5 fill-slate-700/20" />
              </div>
              <p className="text-xs font-medium max-w-xs mx-auto leading-relaxed">
                双击视频项，或点击极速预览按钮，在此处呼出高分辨率流式播放预览区。
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
