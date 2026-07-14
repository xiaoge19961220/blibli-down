import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Clock, 
  CheckSquare, 
  Square, 
  Loader2, 
  AlertTriangle,
  Play,
  ThumbsUp,
  Tv
} from 'lucide-react';
import { VideoInfo, PageInfo } from '../types';

interface VideoExtractorProps {
  urlInput: string;
  setUrlInput: (val: string) => void;
  loadingInfo: boolean;
  errorInfo: string | null;
  videoInfo: VideoInfo | null;
  selectedPages: number[];
  setSelectedPages: React.Dispatch<React.SetStateAction<number[]>>;
  handleParse: (e?: React.FormEvent) => void;
  onAddToQueue: (pages: PageInfo[]) => void;
  hasSessdata: boolean;
}

export default function VideoExtractor({
  urlInput,
  setUrlInput,
  loadingInfo,
  errorInfo,
  videoInfo,
  selectedPages,
  setSelectedPages,
  handleParse,
  onAddToQueue,
  hasSessdata
}: VideoExtractorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const selectAllPages = () => {
    if (videoInfo) {
      setSelectedPages(videoInfo.pages.map(p => p.page));
    }
  };

  const deselectAllPages = () => {
    setSelectedPages([]);
  };

  const invertPageSelection = () => {
    if (videoInfo) {
      setSelectedPages(prev => 
        videoInfo.pages
          .map(p => p.page)
          .filter(page => !prev.includes(page))
      );
    }
  };

  const togglePageSelection = (page: number) => {
    setSelectedPages(prev => 
      prev.includes(page) 
        ? prev.filter(p => p !== page) 
        : [...prev, page]
    );
  };

  const filteredPages = videoInfo
    ? videoInfo.pages.filter(p => 
        p.part.toLowerCase().includes(searchQuery.toLowerCase()) || 
        `p${p.page}`.includes(searchQuery.toLowerCase())
      )
    : [];

  const handleDownloadTrigger = () => {
    if (!videoInfo) return;
    const pagesToDownload = videoInfo.pages.filter(p => selectedPages.includes(p.page));
    onAddToQueue(pagesToDownload);
  };

  return (
    <div className="space-y-6">
      {/* Search Input Section */}
      <section className="bg-[#151821]/80 backdrop-blur border border-[#232731] hover:border-bili-pink/20 transition-all duration-300 rounded-3xl p-6 shadow-xl">
        <form onSubmit={handleParse} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Tv className="w-5 h-5 text-bili-pink" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-bili-pink font-mono">
              Bilibili Video Extractor
            </h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input 
                type="text"
                placeholder="请输入哔哩哔哩视频链接或 BV 号 (例如: BV1MTQAY4EdP)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={loadingInfo}
                className="w-full bg-[#0F1115] hover:border-slate-800 focus:border-bili-pink border border-[#262A35] rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none placeholder-slate-700 font-mono transition-all duration-200"
              />
              {urlInput && (
                <button 
                  type="button" 
                  onClick={() => setUrlInput('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  清除
                </button>
              )}
            </div>
            
            <button 
              type="submit"
              disabled={loadingInfo || !urlInput.trim()}
              className="px-6 py-3.5 bg-bili-pink hover:bg-bili-pink/95 disabled:bg-[#1C1F28] disabled:text-slate-600 disabled:cursor-not-allowed font-bold text-white text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer select-none active:scale-98"
            >
              {loadingInfo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在极速解析中...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>解析视频内容</span>
                </>
              )}
            </button>
          </div>
          
          {!hasSessdata && (
            <div className="text-[11px] bg-amber-500/5 text-amber-300 p-3 rounded-xl border border-amber-500/10 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>未绑定 SESSDATA 凭证：</strong>当前处于免登录游客状态，默认限制最高清晰度 360P/480P。如需下载 1080P/4K 高清内容，请前往 <strong>「账号管理」</strong> 栏目扫码登录。
              </span>
            </div>
          )}

          {errorInfo && (
            <div className="text-[11px] bg-rose-500/5 text-rose-300 p-3.5 rounded-xl border border-rose-500/15 flex items-start space-x-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-200">解析时遇到错误</p>
                <p className="text-rose-400">{errorInfo}</p>
              </div>
            </div>
          )}
        </form>
      </section>

      {/* Extracted Detail Cards */}
      {videoInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cover & General Metadata */}
          <section className="lg:col-span-5 bg-[#151821]/80 backdrop-blur border border-[#232731] hover:border-bili-pink/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                  Metadata File Info
                </h2>
              </div>

              {/* Video Cover */}
              <div className="aspect-video w-full rounded-2xl overflow-hidden relative border border-[#22252E] bg-[#0F1115] group">
                <img 
                  src={videoInfo.pic} 
                  alt={videoInfo.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-102 transition-all duration-500"
                />
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/75 backdrop-blur-sm text-[10px] font-mono font-bold rounded-lg text-bili-pink border border-bili-pink/20">
                  BVID: {videoInfo.bvid}
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/75 backdrop-blur-sm text-[10px] font-mono font-bold rounded-lg text-slate-300">
                  共 {videoInfo.pages.length} 个视频
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                  {videoInfo.title}
                </h3>
                {videoInfo.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                    {videoInfo.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#1C1F28] pt-4 text-[11px] text-slate-400">
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
                <div className="flex items-center space-x-3 text-slate-400 font-mono text-[10px]">
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

          {/* Chapters & Selector List */}
          <section className="lg:col-span-7 bg-[#151821]/80 backdrop-blur border border-[#232731] hover:border-bili-pink/20 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1F28] pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-bili-pink font-mono">
                    Collection Playlist
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    过滤并选择您要下载的分 P 视频片段：
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

              {/* Filtering */}
              <div className="relative">
                <input 
                  type="text"
                  placeholder="🔍 输入章节关键字过滤分 P 内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#262A35] rounded-xl px-3 py-2 text-xs text-white focus:border-bili-pink focus:outline-none placeholder-slate-700 font-mono"
                />
              </div>

              {/* Scrollable list */}
              <div className="max-h-[220px] overflow-y-auto border border-[#22252E] rounded-2xl bg-[#0F1115]/50 divide-y divide-[#1D2028] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {filteredPages.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 text-xs">
                    未检索到符合过滤规则的分 P
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
                onClick={handleDownloadTrigger}
                disabled={selectedPages.length === 0}
                className="px-5 py-2.5 bg-bili-pink hover:bg-bili-pink/90 disabled:bg-[#1A1D23] disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all active:scale-95 shadow-md shadow-bili-pink/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>一键加入下载队列</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
