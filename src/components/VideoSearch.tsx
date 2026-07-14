import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Tv, 
  PlayCircle, 
  Clock, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  User
} from 'lucide-react';

interface SearchResult {
  bvid: string;
  title: string;
  pic: string;
  author: string;
  duration: string;
  play: number | string;
  description: string;
  pubdate?: number;
}

interface VideoSearchProps {
  onExtract: (bvid: string) => void;
  showToast: (msg: string) => void;
}

const TRENDING_KEYWORDS = [
  '黑神话悟空',
  'AI大模型',
  'Vite 教程',
  'React19 新特性',
  'B站动漫推荐',
  '极客湾',
  '何同学',
  '周杰伦'
];

export default function VideoSearch({ onExtract, showToast }: VideoSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Parse play counts from Bilibili API (e.g. 12500 -> 1.25万)
  const formatPlayCount = (play: number | string) => {
    if (typeof play === 'string') return play;
    if (play >= 10000) {
      return `${(play / 10000).toFixed(1)}万`;
    }
    return play.toString();
  };

  // Format Bilibili duration from seconds or keep string
  const formatDuration = (dur: string) => {
    if (!dur) return '00:00';
    if (dur.includes(':')) return dur; // already formatted like "12:34"
    const secs = parseInt(dur, 10);
    if (isNaN(secs)) return dur;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSearch = async (searchKeyword: string) => {
    const term = searchKeyword.trim();
    if (!term) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/search?keyword=${encodeURIComponent(term)}`);
      if (!res.ok) {
        throw new Error('搜索请求失败，请检查网络连接');
      }
      const data = await res.json();
      if (data.success === false) {
        // If the Bilibili API returns code -352 or other error, explain it to the user nicely
        if (data.code === -352) {
          setError('哔哩哔哩搜索当前需要登录账号，请在【账号管理】配置您的 SESSDATA 后再试。');
        } else {
          setError(data.error || '哔哩哔哩搜索服务返回异常');
        }
        setResults([]);
      } else {
        setResults(data.results || []);
      }
    } catch (err: any) {
      setError(err.message || '搜索接口调用失败，请重试');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(keyword);
  };

  const handleTrendingClick = (kw: string) => {
    setKeyword(kw);
    handleSearch(kw);
  };

  const handleExtractNow = (bvid: string) => {
    showToast(`正在跳转提取视频 ${bvid}...`);
    onExtract(bvid);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Tv className="w-5 h-5 text-bili-pink" />
          <span>哔哩哔哩视频搜索</span>
        </h2>
        <p className="text-xs text-slate-400">
          直接检索B站全网公开视频，一键快速跳转至视频/合集提取下载界面。
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="bg-[#151821] border border-[#232731] rounded-3xl p-6 shadow-xl space-y-4">
        <form onSubmit={onSubmit} className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="输入视频标题、关键字、BV号或UP主名称进行搜索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full bg-[#0F1115] border border-[#262A35] rounded-2xl pl-12 pr-28 py-4 text-sm text-white focus:border-bili-pink focus:outline-none placeholder-slate-500 transition duration-200"
          />
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="absolute right-2 px-5 py-2.5 bg-bili-pink hover:bg-bili-pink/90 text-white rounded-xl text-xs font-bold transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-95"
          >
            {loading ? (
              <span className="flex items-center space-x-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>搜索中</span>
              </span>
            ) : (
              <span>开始搜索</span>
            )}
          </button>
        </form>

        {/* Trending Suggestions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>大家都在搜：</span>
          </span>
          {TRENDING_KEYWORDS.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => handleTrendingClick(kw)}
              className="px-3 py-1.5 bg-[#0F1115] hover:bg-bili-pink/5 hover:text-bili-pink border border-[#22252E] hover:border-bili-pink/20 rounded-xl text-xs text-slate-400 cursor-pointer transition font-medium select-none"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="bg-[#151821]/50 border border-[#232731]/50 rounded-3xl py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-bili-pink animate-spin" />
          <p className="text-xs text-slate-400">正在与B站检索中心通信...</p>
        </div>
      ) : error ? (
        <div className="bg-[#2A151D] border border-rose-950/40 rounded-3xl p-6 flex items-start space-x-3.5">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-200">搜索限制或异常</h4>
            <p className="text-xs text-rose-300/80 leading-relaxed">
              {error}
            </p>
          </div>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="bg-[#151821]/50 border border-[#232731]/50 rounded-3xl py-16 text-center">
          <p className="text-xs text-slate-500">未找到匹配的视频结果，请尝试其他关键词</p>
        </div>
      ) : hasSearched ? (
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono px-1">
            搜索结果 ({results.length}个)
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((item) => (
              <div 
                key={item.bvid}
                className="bg-[#151821] border border-[#232731] rounded-2xl p-4 flex gap-4 hover:border-bili-pink/20 hover:shadow-lg transition-all duration-200 group"
              >
                {/* Thumbnail */}
                <div className="relative w-36 h-24 rounded-xl overflow-hidden bg-[#0F1115] shrink-0">
                  <img 
                    src={item.pic} 
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      // Fallback image if blocked or fails
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop';
                    }}
                  />
                  {/* Duration Badge */}
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/75 rounded text-[10px] font-mono font-bold text-white flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span>{formatDuration(item.duration)}</span>
                  </div>
                </div>

                {/* Info and action */}
                <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                  <div className="space-y-1">
                    <h3 
                      className="text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-bili-pink transition"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 line-clamp-1 font-mono flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{item.author}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1C1F28]">
                    {/* View stats */}
                    <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-semibold font-mono">
                      <PlayCircle className="w-3.5 h-3.5 text-slate-600" />
                      <span>{formatPlayCount(item.play)}次播放</span>
                    </div>

                    {/* Quick Extract Action */}
                    <button
                      onClick={() => handleExtractNow(item.bvid)}
                      className="px-3 py-1.5 bg-bili-pink/10 hover:bg-bili-pink text-bili-pink hover:text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer select-none"
                    >
                      <span>一键提取</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty / Welcome State */
        <div className="bg-[#151821]/30 border border-dashed border-[#232731] rounded-3xl py-16 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#151821] border border-[#232731] flex items-center justify-center text-slate-500">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-1 max-w-sm px-4">
            <h4 className="text-xs font-bold text-slate-300">还没有进行任何搜索</h4>
            <p className="text-[10px] text-slate-500 leading-normal">
              使用上方的搜索输入框或点击推荐的关键字来发现B站视频，一键极速提取并下载视频的每一章节。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
