import express from 'express';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const CONFIG_PATH = path.join(process.cwd(), 'config.json');

let sessdata = process.env.SESSDATA || '';
let concurrencyLimit = 2;
let downloadsDir = 'downloads';

function loadSettings() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (data.sessdata !== undefined) sessdata = data.sessdata;
      if (data.concurrencyLimit !== undefined) concurrencyLimit = data.concurrencyLimit;
      if (data.downloadsDir !== undefined) downloadsDir = data.downloadsDir;
    } catch (err) {
      console.error('Failed to parse config.json, using defaults:', err);
    }
  } else {
    saveSettings();
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      sessdata,
      concurrencyLimit,
      downloadsDir
    }, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config.json:', err);
  }
}

loadSettings();

function getDownloadsDir() {
  let dir = downloadsDir || 'downloads';
  if (!path.isAbsolute(dir)) {
    dir = path.resolve(process.cwd(), dir);
  }
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

app.use(express.json());

// Memory-based state
interface DownloadTask {
  id: string; // e.g. "BV1MTQAY4EdP-1"
  bvid: string;
  videoTitle?: string;
  page: number;
  cid: number;
  part: string;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  speed: number; // bytes/sec
  error?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
}

const tasks = new Map<string, DownloadTask>();
const activeRequests = new Map<string, AbortController>();
let activeCount = 0;

// Process the download queue
async function processQueue() {
  const queuedTasks = Array.from(tasks.values())
    .filter(t => t.status === 'queued')
    .sort((a, b) => a.addedAt - b.addedAt);

  while (activeCount < concurrencyLimit && queuedTasks.length > 0) {
    const task = queuedTasks.shift()!;
    startDownload(task);
  }
}

// Download segment helper
async function downloadSegment(
  url: string,
  outputPath: string,
  signal: AbortSignal,
  segmentSize: number,
  onProgress: (chunkSize: number) => void
) {
  let existingBytes = 0;
  if (fs.existsSync(outputPath)) {
    existingBytes = fs.statSync(outputPath).size;
  }

  // If already completed this segment, skip downloading
  if (existingBytes > 0 && existingBytes >= segmentSize) {
    return;
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.bilibili.com',
    'Cookie': sessdata ? `SESSDATA=${sessdata}` : ''
  };

  if (existingBytes > 0) {
    headers['Range'] = `bytes=${existingBytes}-`;
  }

  const res = await fetch(url, { headers, signal });
  if (!res.ok) {
    if (res.status === 416 && existingBytes > 0) {
      // Range not satisfiable usually means we have all bytes
      return;
    }
    throw new Error(`Bilibili CDN stream error: ${res.statusText} (${res.status})`);
  }

  const fileWriteStream = fs.createWriteStream(outputPath, { flags: existingBytes > 0 ? 'a' : 'w' });
  const readableWebStream = res.body;
  if (!readableWebStream) {
    throw new Error('Video stream is empty');
  }

  const reader = readableWebStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileWriteStream.write(Buffer.from(value));
      onProgress(value.length);
    }
  } finally {
    fileWriteStream.end();
  }
}

// Perform the actual download
async function startDownload(task: DownloadTask) {
  activeCount++;
  task.status = 'downloading';
  task.startedAt = Date.now();
  task.error = undefined;
  
  const controller = new AbortController();
  activeRequests.set(task.id, controller);

  // Group under a folder named after the video's general title or bvid
  const safeTitle = (task.videoTitle || task.bvid).replace(/[\\/:*?"<>|]/g, '_').trim();
  const folderDir = path.join(getDownloadsDir(), safeTitle);
  
  // Safe filename
  const safePart = task.part.replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${task.page}_${safePart}.mp4`;
  
  const filePath = path.join(folderDir, filename);
  const tempPath = filePath + '.tmp';

  try {
    // Ensure folders exist
    if (!fs.existsSync(folderDir)) {
      fs.mkdirSync(folderDir, { recursive: true });
    }

    // 1. Get playurl from Bilibili API
    const playurlApi = `https://api.bilibili.com/x/player/playurl?bvid=${task.bvid}&cid=${task.cid}&qn=80&otype=json&platform=html5&high_quality=1`;
    const playurlRes = await fetch(playurlApi, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com',
        'Cookie': sessdata ? `SESSDATA=${sessdata}` : ''
      },
      signal: controller.signal
    });
    
    const playurlJson = await playurlRes.json() as any;
    if (playurlJson.code !== 0 || !playurlJson.data || !playurlJson.data.durl || playurlJson.data.durl.length === 0) {
      throw new Error(playurlJson.message || `Failed to fetch video download link (Code: ${playurlJson.code})`);
    }

    const durlList = playurlJson.data.durl;
    
    // Sum total bytes across all segments
    let totalBytes = 0;
    for (const d of durlList) {
      totalBytes += d.size || 0;
    }
    task.totalBytes = totalBytes;

    // Calculate current total downloaded bytes from existing fragments
    let initialDownloaded = 0;
    for (let i = 0; i < durlList.length; i++) {
      const segTempPath = durlList.length === 1 ? tempPath : `${tempPath}_seg_${i}`;
      if (fs.existsSync(segTempPath)) {
        initialDownloaded += fs.statSync(segTempPath).size;
      }
    }
    task.downloadedBytes = initialDownloaded;
    if (task.totalBytes > 0) {
      task.progress = Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100));
    }

    let lastReportedTime = Date.now();
    let lastReportedBytes = task.downloadedBytes;

    // Download each segment (supporting pause and resume!)
    for (let i = 0; i < durlList.length; i++) {
      const d = durlList[i];
      const segTempPath = durlList.length === 1 ? tempPath : `${tempPath}_seg_${i}`;
      
      await downloadSegment(
        d.url,
        segTempPath,
        controller.signal,
        d.size || 0,
        (chunkSize) => {
          task.downloadedBytes += chunkSize;
          if (task.totalBytes > 0) {
            task.progress = Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100));
          }

          const now = Date.now();
          const duration = (now - lastReportedTime) / 1000;
          if (duration >= 0.5) {
            const chunkBytes = task.downloadedBytes - lastReportedBytes;
            task.speed = Math.round(chunkBytes / duration);
            lastReportedBytes = task.downloadedBytes;
            lastReportedTime = now;
          }
        }
      );
    }

    // Merge multiple segments if they exist
    if (durlList.length > 1) {
      task.speed = 0;
      // Merge all segment tmp files into tempPath
      const writeStream = fs.createWriteStream(tempPath);
      for (let i = 0; i < durlList.length; i++) {
        const segTempPath = `${tempPath}_seg_${i}`;
        if (fs.existsSync(segTempPath)) {
          const data = fs.readFileSync(segTempPath);
          writeStream.write(data);
          fs.unlinkSync(segTempPath); // Clean up the fragment file immediately
        }
      }
      writeStream.end();
    }

    activeRequests.delete(task.id);

    // Verify stats
    const stats = fs.statSync(tempPath);
    if (stats.size === 0) {
      throw new Error('Downloaded file is empty (size 0). SESSDATA may be invalid or access restricted.');
    }

    // Rename temp file to final file
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    fs.renameSync(tempPath, filePath);

    task.status = 'completed';
    task.completedAt = Date.now();
    task.progress = 100;
    task.speed = 0;

  } catch (err: any) {
    activeRequests.delete(task.id);
    
    if (err.name === 'AbortError' || controller.signal.aborted) {
      task.status = 'paused';
    } else {
      task.status = 'failed';
      task.error = err.message || 'Unknown network error';
      console.error(`Task ${task.id} download failed:`, err);
    }
    
    task.speed = 0;
  } finally {
    activeCount--;
    processQueue();
  }
}

// --- API ROUTES ---

// 1. Fetch Bilibili Video details (Title, Author, Cover, Pages)
app.get('/api/video-info', async (req, res) => {
  const { urlOrBvid } = req.query;
  if (!urlOrBvid || typeof urlOrBvid !== 'string') {
    return res.status(400).json({ error: 'urlOrBvid is required' });
  }

  // Extract bvid from string (e.g. url or raw bvid)
  const bvidMatch = urlOrBvid.match(/(BV[a-zA-Z0-9]{10})/i);
  if (!bvidMatch) {
    return res.status(400).json({ error: 'Invalid Bilibili BV ID or URL' });
  }
  const bvid = bvidMatch[1];

  // Try to parse part/page index if present, e.g. p=3
  let activePage = 1;
  const pMatch = urlOrBvid.match(/[?&]p=(\d+)/i);
  if (pMatch) {
    activePage = parseInt(pMatch[1], 10);
  }

  try {
    const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    const infoRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com',
        'Cookie': sessdata ? `SESSDATA=${sessdata}` : ''
      }
    });

    const json = await infoRes.json() as any;
    if (json.code !== 0) {
      return res.status(400).json({ error: json.message || 'Bilibili API returned error' });
    }

    const d = json.data;
    res.json({
      bvid,
      title: d.title,
      description: d.desc,
      pic: d.pic,
      owner: {
        name: d.owner?.name,
        face: d.owner?.face
      },
      pubdate: d.pubdate,
      duration: d.duration,
      stat: d.stat,
      pages: (d.pages || []).map((p: any) => ({
        cid: p.cid,
        page: p.page,
        part: p.part,
        duration: p.duration
      })),
      activePage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch video info' });
  }
});

// 2. Add video pages to the download queue
app.post('/api/download', (req, res) => {
  const { bvid, title, pages, concurrency } = req.body;
  if (!bvid || !pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'bvid and pages are required' });
  }

  if (concurrency && typeof concurrency === 'number' && concurrency > 0) {
    concurrencyLimit = Math.min(10, concurrency); // cap at 10 to protect server / avoid ban
  }

  const videoTitle = title || bvid;

  for (const p of pages) {
    const id = `${bvid}-${p.page}`;
    
    // Add or reset task in queue
    const task: DownloadTask = {
      id,
      bvid,
      videoTitle,
      page: p.page,
      cid: p.cid,
      part: p.part,
      status: 'queued',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      addedAt: Date.now()
    };
    tasks.set(id, task);
  }

  processQueue();
  res.json({ success: true, message: `Added ${pages.length} video tasks to queue` });
});

// 3. Get current tasks and their status
app.get('/api/tasks', (req, res) => {
  const sortedTasks = Array.from(tasks.values()).sort((a, b) => b.addedAt - a.addedAt);
  res.json({
    tasks: sortedTasks,
    activeCount,
    concurrencyLimit
  });
});

// 4. Pause task
app.post('/api/tasks/pause', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }
  const task = tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status === 'downloading' || task.status === 'queued') {
    if (task.status === 'downloading') {
      const controller = activeRequests.get(id);
      if (controller) {
        controller.abort();
        activeRequests.delete(id);
      }
      activeCount = Math.max(0, activeCount - 1);
    }
    task.status = 'paused';
    task.speed = 0;
    processQueue();
    res.json({ success: true, message: `Paused task ${id}` });
  } else {
    res.status(400).json({ error: 'Task cannot be paused' });
  }
});

// 5. Resume task
app.post('/api/tasks/resume', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }
  const task = tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status === 'paused' || task.status === 'failed' || task.status === 'cancelled') {
    task.status = 'queued';
    processQueue();
    res.json({ success: true, message: `Resumed task ${id}` });
  } else {
    res.status(400).json({ error: 'Task is not in a resumeable state' });
  }
});

// 6. Redownload task
app.post('/api/tasks/redownload', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }
  const task = tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status === 'downloading') {
    const controller = activeRequests.get(id);
    if (controller) {
      controller.abort();
      activeRequests.delete(id);
    }
    activeCount = Math.max(0, activeCount - 1);
  }

  // Reset progress and state
  task.status = 'queued';
  task.progress = 0;
  task.downloadedBytes = 0;
  task.totalBytes = 0;
  task.speed = 0;
  task.error = undefined;

  // Attempt to delete any half-finished/completed files
  const safeTitle = (task.videoTitle || task.bvid).replace(/[\\/:*?"<>|]/g, '_').trim();
  const folderDir = path.join(getDownloadsDir(), safeTitle);
  const safePart = task.part.replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${task.page}_${safePart}.mp4`;
  const filePath = path.join(folderDir, filename);
  const tempPath = filePath + '.tmp';

  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (fs.existsSync(folderDir)) {
      const files = fs.readdirSync(folderDir);
      const segs = files.filter(f => f.startsWith(filename + '.tmp_seg_'));
      for (const s of segs) {
        fs.unlinkSync(path.join(folderDir, s));
      }
    }
  } catch (err) {
    console.error('Error cleaning files for redownload:', err);
  }

  processQueue();
  res.json({ success: true, message: `Restarted task ${id}` });
});

// 7. Cancel task(s)
app.post('/api/tasks/cancel', (req, res) => {
  const { id, cancelAll } = req.body;

  if (cancelAll) {
    for (const [id, task] of tasks.entries()) {
      if (task.status === 'queued' || task.status === 'downloading') {
        if (task.status === 'downloading') {
          const controller = activeRequests.get(id);
          if (controller) {
            controller.abort();
            activeRequests.delete(id);
          }
        }
        task.status = 'cancelled';
        task.speed = 0;
      }
    }
    activeCount = 0;
    res.json({ success: true, message: 'Cancelled all running tasks' });
  } else {
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }
    const task = tasks.get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'downloading') {
      const controller = activeRequests.get(id);
      if (controller) {
        controller.abort();
        activeRequests.delete(id);
      }
      activeCount = Math.max(0, activeCount - 1);
    }
    task.status = 'cancelled';
    task.speed = 0;
    processQueue();
    res.json({ success: true, message: `Cancelled task ${id}` });
  }
});

// 8. Remove task record from the task list (with option to delete files on disk)
app.post('/api/tasks/remove', (req, res) => {
  const { id, deleteFile } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }
  const task = tasks.get(id);
  if (task) {
    if (task.status === 'downloading' || task.status === 'queued') {
      return res.status(400).json({ error: 'Cannot remove an active task. Pause it first.' });
    }

    if (deleteFile) {
      const safeTitle = (task.videoTitle || task.bvid).replace(/[\\/:*?"<>|]/g, '_').trim();
      const folderDir = path.join(getDownloadsDir(), safeTitle);
      const safePart = task.part.replace(/[\\/:*?"<>|]/g, '_');
      const filename = `${task.page}_${safePart}.mp4`;
      const filePath = path.join(folderDir, filename);
      const tempPath = filePath + '.tmp';

      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        if (fs.existsSync(folderDir)) {
          // clean segment fragments
          const files = fs.readdirSync(folderDir);
          const segs = files.filter(f => f.startsWith(filename + '.tmp_seg_'));
          for (const s of segs) {
            fs.unlinkSync(path.join(folderDir, s));
          }
          // if folder is empty, delete folder
          const remaining = fs.readdirSync(folderDir);
          if (remaining.length === 0) {
            fs.rmdirSync(folderDir);
          }
        }
      } catch (err) {
        console.error('Failed to delete files on remove:', err);
      }
    }

    tasks.delete(id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// Helper for scanning directories recursively
function getFilesRecursively(dir: string, baseDir: string = dir): any[] {
  let results: any[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, baseDir));
    } else if (file.endsWith('.mp4') && !file.endsWith('.tmp')) {
      const relativePath = path.relative(baseDir, filePath);
      const folderName = path.dirname(relativePath);
      const isFlat = folderName === '.';
      
      let bvid: string | undefined;
      let page: number | undefined;
      let title = file.replace(/\.mp4$/, '');

      // Check flat style naming: ${bvid}_p${page}_${part}.mp4
      const flatMatch = file.match(/^([a-zA-Z0-9]+)_p(\d+)_(.+)\.mp4$/);
      if (flatMatch) {
        bvid = flatMatch[1];
        page = parseInt(flatMatch[2], 10);
        title = flatMatch[3].replace(/_/g, ' ');
      } else {
        // Check folder structured naming: ${page}_${part}.mp4
        const folderMatch = file.match(/^(\d+)_(.+)\.mp4$/);
        if (folderMatch) {
          page = parseInt(folderMatch[1], 10);
          title = folderMatch[2].replace(/_/g, ' ');
        }
      }

      results.push({
        filename: relativePath, // relative path used for streaming
        size: stat.size,
        createdAt: stat.birthtimeMs,
        bvid,
        page,
        title,
        folder: isFlat ? undefined : folderName
      });
    }
  }
  return results;
}

// 9. List downloaded files (recursively scans directory!)
app.get('/api/files', (req, res) => {
  try {
    const mp4Files = getFilesRecursively(getDownloadsDir());
    mp4Files.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ files: mp4Files });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list files' });
  }
});
// 10. Stream file (supports Range headers for HTML5 video seeker!)
app.get('/api/files/stream', (req, res) => {
  const file = req.query.file;
  if (!file || typeof file !== 'string') {
    return res.status(400).send('file parameter is required');
  }

  const filePath = path.join(getDownloadsDir(), file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(getDownloadsDir()))) {
    return res.status(403).send('Forbidden');
  }

  res.sendFile(filePath);
});

// 11. Download file directly
app.get('/api/files/download', (req, res) => {
  const file = req.query.file;
  if (!file || typeof file !== 'string') {
    return res.status(400).send('file parameter is required');
  }

  const filePath = path.join(getDownloadsDir(), file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(getDownloadsDir()))) {
    return res.status(403).send('Forbidden');
  }

  res.download(filePath, path.basename(filePath));
});

// 12. Delete file
app.delete('/api/files', (req, res) => {
  const file = req.query.file;
  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'file parameter is required' });
  }

  const filePath = path.join(getDownloadsDir(), file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(getDownloadsDir()))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    fs.unlinkSync(filePath);
    // Also recursively clean up parent folder if empty
    const parentDir = path.dirname(filePath);
    if (parentDir !== getDownloadsDir() && fs.existsSync(parentDir)) {
      const remaining = fs.readdirSync(parentDir);
      if (remaining.length === 0) {
        fs.rmdirSync(parentDir);
      }
    }
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete file' });
  }
});

// 10. Bilibili QR Code Login Integration
app.get('/api/login/qr/generate', async (req, res) => {
  try {
    const response = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });
    const data = await response.json() as any;
    if (data.code !== 0) {
      return res.status(400).json({ error: data.message || 'Failed to generate QR code' });
    }
    res.json(data.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to request Bilibili QR code generation API' });
  }
});

app.get('/api/login/qr/poll', async (req, res) => {
  const { qrcode_key } = req.query;
  if (!qrcode_key || typeof qrcode_key !== 'string') {
    return res.status(400).json({ error: 'qrcode_key is required' });
  }

  try {
    const response = await fetch(`https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrcode_key}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });
    const data = await response.json() as any;
    if (data.code !== 0) {
      return res.status(400).json({ error: data.message || 'Failed to poll QR code' });
    }

    if (data.data && data.data.code === 0 && data.data.url) {
      try {
        const parsedUrl = new URL(data.data.url);
        const extractedSessdata = parsedUrl.searchParams.get('SESSDATA');
        if (extractedSessdata) {
          sessdata = extractedSessdata.trim();
          saveSettings();
          console.log('Successfully logged in and saved SESSDATA through Bilibili QR code scan!');
        }
      } catch (parseErr) {
        console.error('Failed to parse Bilibili redirect URL params:', parseErr);
      }
    }

    res.json(data.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to poll login state' });
  }
});

// 11. Settings API
app.get('/api/settings', (req, res) => {
  res.json({
    sessdata: sessdata ? '******' + sessdata.slice(-4) : '',
    hasSessdata: !!sessdata,
    concurrencyLimit,
    downloadsDir: downloadsDir || 'downloads'
  });
});

app.post('/api/settings', (req, res) => {
  const { sessdata: newSessdata, concurrency, downloadsDir: newDownloadsDir } = req.body;
  if (newSessdata !== undefined) {
    // If user inputs '******', keep the old one, else set new
    if (newSessdata && !newSessdata.startsWith('******')) {
      sessdata = newSessdata.trim();
    } else if (newSessdata === '') {
      sessdata = '';
    }
  }
  if (concurrency !== undefined && typeof concurrency === 'number') {
    concurrencyLimit = Math.max(1, Math.min(10, concurrency));
  }
  if (newDownloadsDir !== undefined && typeof newDownloadsDir === 'string') {
    downloadsDir = newDownloadsDir.trim() || 'downloads';
  }
  
  saveSettings();

  res.json({
    success: true,
    sessdata: sessdata ? '******' + sessdata.slice(-4) : '',
    hasSessdata: !!sessdata,
    concurrencyLimit,
    downloadsDir: downloadsDir || 'downloads'
  });
});


// 12. Directory Browsing API
app.get('/api/dirs/browse', (req, res) => {
  try {
    let targetPath = (req.query.path as string) || '';
    if (!targetPath) {
      targetPath = process.cwd();
    } else {
      if (!path.isAbsolute(targetPath)) {
        targetPath = path.resolve(process.cwd(), targetPath);
      }
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: '目录不存在' });
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: '该路径不是一个目录' });
    }

    const items = fs.readdirSync(targetPath, { withFileTypes: true });
    const subdirs = items
      .filter(item => item.isDirectory() && !item.name.startsWith('.'))
      .map(item => item.name)
      .sort();

    const parentPath = path.dirname(targetPath);

    res.json({
      currentPath: targetPath,
      parentPath: parentPath === targetPath ? null : parentPath,
      subdirs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '无法浏览目录' });
  }
});

app.post('/api/dirs/create', (req, res) => {
  try {
    const { parentPath, folderName } = req.body;
    if (!parentPath || !folderName) {
      return res.status(400).json({ error: '缺少必需参数' });
    }

    let targetParent = parentPath;
    if (!path.isAbsolute(targetParent)) {
      targetParent = path.resolve(process.cwd(), targetParent);
    }

    const newDirPath = path.join(targetParent, folderName.replace(/[\\/:*?"<>|]/g, '_'));
    if (!fs.existsSync(newDirPath)) {
      fs.mkdirSync(newDirPath, { recursive: true });
    }

    res.json({ success: true, path: newDirPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '无法创建目录' });
  }
});


// 13. Search Bilibili Videos
let cachedBuvid3 = '';
let cachedBuvid4 = '';

async function ensureBuvid() {
  if (cachedBuvid3) return { buvid3: cachedBuvid3, buvid4: cachedBuvid4 };
  try {
    const res = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });
    if (res.ok) {
      const json = await res.json() as any;
      if (json.code === 0 && json.data) {
        cachedBuvid3 = json.data.b_3 || '';
        cachedBuvid4 = json.data.b_4 || '';
      }
    }
  } catch (err) {
    console.error('Failed to fetch anonymous buvid:', err);
  }
  return { buvid3: cachedBuvid3, buvid4: cachedBuvid4 };
}

app.get('/api/search', async (req, res) => {
  const keyword = (req.query.keyword as string || '').trim();
  if (!keyword) {
    return res.json({ success: true, results: [] });
  }

  try {
    const { buvid3, buvid4 } = await ensureBuvid();
    
    // Construct cookie string
    let cookieStr = '';
    if (sessdata) {
      cookieStr += `SESSDATA=${sessdata}; `;
    }
    if (buvid3) {
      cookieStr += `buvid3=${buvid3}; `;
    }
    if (buvid4) {
      cookieStr += `buvid4=${buvid4}; `;
    }

    const searchUrl = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(keyword)}&page=1`;
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://search.bilibili.com',
        'Cookie': cookieStr.trim()
      }
    });

    const json = await searchRes.json() as any;
    
    if (json.code !== 0) {
      console.warn('Bilibili search returned code:', json.code, json.message);
      return res.json({ 
        success: false, 
        error: json.message || 'Bilibili 搜索接口返回错误',
        code: json.code,
        results: [] 
      });
    }

    const rawList = json.data?.result || [];
    const results = rawList.map((item: any) => {
      // Strip html tags like <em class="keyword">Vite</em> from title
      const cleanTitle = (item.title || '').replace(/<[^>]+>/g, '');
      const picUrl = item.pic ? (item.pic.startsWith('//') ? 'https:' + item.pic : item.pic) : '';
      
      return {
        bvid: item.bvid,
        title: cleanTitle,
        pic: picUrl,
        author: item.author,
        duration: item.duration, // e.g. "12:34" or "754"
        play: item.play, // number
        description: item.description,
        pubdate: item.pubdate,
        favorites: item.favorites,
        review: item.review
      };
    });

    res.json({
      success: true,
      results
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || '搜索接口发生内部错误', results: [] });
  }
});


// --- INTEGRATE VITE FOR HOT PREVIEW ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
