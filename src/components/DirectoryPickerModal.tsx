import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  ArrowLeft, 
  X, 
  Check, 
  Loader2, 
  RefreshCw,
  Home
} from 'lucide-react';

interface DirectoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPath: string) => void;
  initialPath: string;
}

interface BrowseResponse {
  currentPath: string;
  parentPath: string | null;
  subdirs: string[];
}

export default function DirectoryPickerModal({
  isOpen,
  onClose,
  onSelect,
  initialPath
}: DirectoryPickerModalProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [subdirs, setSubdirs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create folder state
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Manual path input so they can jump directly if needed
  const [manualPath, setManualPath] = useState('');

  const browsePath = async (pathStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dirs/browse?path=${encodeURIComponent(pathStr)}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '浏览目录失败');
      }
      const data: BrowseResponse = await res.json();
      setCurrentPath(data.currentPath);
      setManualPath(data.currentPath);
      setParentPath(data.parentPath);
      setSubdirs(data.subdirs);
    } catch (err: any) {
      setError(err.message || '获取目录结构失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      browsePath(initialPath);
    }
  }, [isOpen, initialPath]);

  const handleNavigate = (subDirName: string) => {
    // Join path properly depending on platform separators (handles backslash and forward slash)
    const separator = currentPath.includes('\\') ? '\\' : '/';
    const newPath = currentPath.endsWith(separator) 
      ? `${currentPath}${subDirName}` 
      : `${currentPath}${separator}${subDirName}`;
    browsePath(newPath);
  };

  const handleGoBack = () => {
    if (parentPath) {
      browsePath(parentPath);
    }
  };

  const handleGoHome = () => {
    browsePath('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPath.trim()) {
      browsePath(manualPath.trim());
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await fetch('/api/dirs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPath: currentPath, folderName: newFolderName.trim() })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '创建文件夹失败');
      }
      setNewFolderName('');
      // Re-browse current path to see the new folder
      await browsePath(currentPath);
    } catch (err: any) {
      alert(err.message || '无法创建文件夹');
    } finally {
      setCreatingFolder(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-[#151821] border border-[#232731] rounded-3xl w-full max-w-xl flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#1C1F28] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Folder className="w-5 h-5 text-bili-pink" />
            <div>
              <h3 className="text-sm font-bold text-white">选择视频保存目录</h3>
              <p className="text-[10px] text-slate-400">选择您要存放下载媒体文件的磁盘路径</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0F1115] border border-[#22252E] text-slate-400 hover:text-white hover:border-bili-pink/30 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Path Input Bar */}
        <div className="p-4 bg-[#0F1115]/50 border-b border-[#1C1F28] space-y-2">
          <form onSubmit={handleManualSubmit} className="flex items-center space-x-2">
            <input 
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              className="flex-1 bg-[#0F1115] border border-[#262A35] rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-bili-pink focus:outline-none font-mono"
              placeholder="输入保存绝对路径..."
            />
            <button 
              type="submit"
              className="px-3 py-2 bg-[#1A1D23] hover:bg-[#22252E] border border-[#2B2E37] hover:border-bili-pink/30 text-xs font-bold text-slate-300 rounded-xl transition cursor-pointer"
            >
              跳转
            </button>
          </form>

          {/* Navigation helpers */}
          <div className="flex items-center space-x-2 text-[11px]">
            <button 
              onClick={handleGoHome}
              className="flex items-center space-x-1 text-slate-400 hover:text-bili-pink font-medium transition cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>根目录</span>
            </button>
            {parentPath && (
              <>
                <span className="text-slate-600">/</span>
                <button 
                  onClick={handleGoBack}
                  className="flex items-center space-x-1 text-slate-400 hover:text-bili-pink font-medium transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>上一级</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Folder list content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[350px]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-2.5">
              <Loader2 className="w-8 h-8 text-bili-pink animate-spin" />
              <p className="text-xs text-slate-400">正在检索磁盘目录结构...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-400 space-y-2">
              <p className="text-xs font-bold">{error}</p>
              <button 
                onClick={() => browsePath(currentPath)}
                className="text-[10px] font-bold text-bili-pink hover:underline font-mono"
              >
                重试加载该路径
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono mb-2">
                当前目录包含的文件夹 ({subdirs.length}个)
              </p>
              
              {subdirs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  当前目录下没有子文件夹
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subdirs.map(dir => (
                    <div 
                      key={dir}
                      onClick={() => handleNavigate(dir)}
                      className="p-2.5 bg-[#0F1115]/60 hover:bg-bili-pink/5 border border-[#22252E] hover:border-bili-pink/20 rounded-xl flex items-center space-x-2.5 cursor-pointer transition text-left group"
                    >
                      <Folder className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-105 transition duration-200" />
                      <span className="text-xs font-semibold text-slate-300 truncate pr-1">
                        {dir}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Folder Inline bar */}
        <div className="p-4 bg-[#0F1115]/30 border-t border-[#1C1F28] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <form onSubmit={handleCreateFolder} className="flex items-center space-x-2 flex-1">
            <input 
              type="text"
              placeholder="新文件夹名称..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 bg-[#0F1115] border border-[#262A35] rounded-xl px-3 py-2 text-xs text-white focus:border-bili-pink focus:outline-none"
            />
            <button 
              type="submit"
              disabled={creatingFolder || !newFolderName.trim()}
              className="p-2 bg-[#1A1D23] hover:bg-bili-pink/10 hover:text-bili-pink border border-[#2B2E37] text-slate-300 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center space-x-1"
              title="在当前路径新建文件夹"
            >
              {creatingFolder ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5" />
              )}
            </button>
          </form>

          {/* Action Confirm buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-[#1A1D23] hover:bg-[#22252E] text-slate-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer select-none"
            >
              取消
            </button>
            <button 
              onClick={() => onSelect(currentPath)}
              className="px-4 py-2 bg-bili-pink hover:bg-bili-pink/90 text-white rounded-xl text-xs font-bold shadow-lg shadow-bili-pink/10 flex items-center space-x-1.5 cursor-pointer transition select-none"
            >
              <Check className="w-3.5 h-3.5" />
              <span>选择当前路径</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
