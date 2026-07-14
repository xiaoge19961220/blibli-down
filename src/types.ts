export interface PageInfo {
  cid: number;
  page: number;
  part: string;
  duration: number;
}

export interface VideoInfo {
  bvid: string;
  title: string;
  description: string;
  pic: string;
  owner: {
    name: string;
    face: string;
  };
  pubdate: number;
  duration: number;
  pages: PageInfo[];
  activePage?: number;
  stat?: {
    view: number;
    danmaku: number;
    reply: number;
    favorite: number;
    coin: number;
    share: number;
    like: number;
  };
}

export interface DownloadTask {
  id: string;
  bvid: string;
  videoTitle?: string;
  page: number;
  cid: number;
  part: string;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  error?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface FileItem {
  filename: string;
  size: number;
  createdAt: number;
  bvid?: string;
  page?: number;
  title: string;
  folder?: string;
}

export interface SettingsInfo {
  sessdata: string;
  hasSessdata: boolean;
  concurrencyLimit: number;
}
