import express from 'express';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

app.use(express.json());

// Memory-based state
interface DownloadTask {
  id: string; // e.g. "BV1MTQAY4EdP-1"
  bvid: string;
  page: number;
  cid: number;
  part: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
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
let concurrencyLimit = 2;
let sessdata = process.env.SESSDATA || '';

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

// Perform the actual download
async function startDownload(task: DownloadTask) {
  activeCount++;
  task.status = 'downloading';
  task.startedAt = Date.now();
  task.error = undefined;
  
  const controller = new AbortController();
  activeRequests.set(task.id, controller);

  try {
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

    const downloadUrl = playurlJson.data.durl[0].url;
    const fileLength = playurlJson.data.durl[0].size || 0;
    task.totalBytes = fileLength;

    // Ensure safe file name
    const safePart = task.part.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${task.bvid}_p${task.page}_${safePart}.mp4`;
    const filePath = path.join(DOWNLOADS_DIR, filename);
    const tempPath = filePath + '.tmp';

    // 2. Fetch video file stream
    const videoRes = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com',
        'Cookie': sessdata ? `SESSDATA=${sessdata}` : ''
      },
      signal: controller.signal
    });

    if (!videoRes.ok) {
      throw new Error(`Bilibili CDN stream error: ${videoRes.statusText} (${videoRes.status})`);
    }

    const realTotalBytes = Number(videoRes.headers.get('content-length')) || fileLength;
    task.totalBytes = realTotalBytes;

    const fileWriteStream = fs.createWriteStream(tempPath);
    const readableWebStream = videoRes.body;
    if (!readableWebStream) {
      throw new Error('Video stream is empty');
    }

    const reader = readableWebStream.getReader();
    let lastReportedTime = Date.now();
    let lastReportedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fileWriteStream.write(Buffer.from(value));
      task.downloadedBytes += value.length;
      
      if (task.totalBytes > 0) {
        task.progress = Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100));
      }

      const now = Date.now();
      const duration = (now - lastReportedTime) / 1000;
      if (duration >= 0.5) { // Update speed calculation every 0.5 seconds
        const chunkBytes = task.downloadedBytes - lastReportedBytes;
        task.speed = Math.round(chunkBytes / duration);
        lastReportedBytes = task.downloadedBytes;
        lastReportedTime = now;
      }
    }

    fileWriteStream.end();
    activeRequests.delete(task.id);

    // If file has size 0, throw an error
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
    
    if (err.name === 'AbortError') {
      task.status = 'cancelled';
    } else {
      task.status = 'failed';
      task.error = err.message || 'Unknown network error';
      console.error(`Task ${task.id} download failed:`, err);
    }
    
    // Clean up temp file
    const safePart = task.part.replace(/[\\/:*?"<>|]/g, '_');
    const tempPath = path.join(DOWNLOADS_DIR, `${task.bvid}_p${task.page}_${safePart}.mp4.tmp`);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
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
  const { bvid, pages, concurrency } = req.body;
  if (!bvid || !pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: 'bvid and pages are required' });
  }

  if (concurrency && typeof concurrency === 'number' && concurrency > 0) {
    concurrencyLimit = Math.min(10, concurrency); // cap at 10 to protect server / avoid ban
  }

  for (const p of pages) {
    const id = `${bvid}-${p.page}`;
    
    // Add or reset task in queue
    const task: DownloadTask = {
      id,
      bvid,
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

// 4. Cancel task(s)
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

// 5. Remove task record from the task list (only for completed/failed/cancelled tasks)
app.post('/api/tasks/remove', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }
  const task = tasks.get(id);
  if (task) {
    if (task.status === 'downloading' || task.status === 'queued') {
      return res.status(400).json({ error: 'Cannot remove an active task. Cancel it first.' });
    }
    tasks.delete(id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// 6. List downloaded files
app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const mp4Files = files
      .filter(f => f.endsWith('.mp4'))
      .map(filename => {
        const filePath = path.join(DOWNLOADS_DIR, filename);
        const stats = fs.statSync(filePath);
        
        // Parse filename to extract bvid, page number and title if possible
        // Format: ${bvid}_p${page}_${part}.mp4
        const match = filename.match(/^([a-zA-Z0-9]+)_p(\d+)_(.+)\.mp4$/);
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtimeMs,
          bvid: match ? match[1] : undefined,
          page: match ? parseInt(match[2], 10) : undefined,
          title: match ? match[3].replace(/_/g, ' ') : filename.replace(/\.mp4$/, '')
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({ files: mp4Files });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list files' });
  }
});

// 7. Stream file (supports Range headers for HTML5 video seeker!)
app.get('/api/files/stream/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(DOWNLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  // Check if it is a directory or path traversal attempt
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(DOWNLOADS_DIR))) {
    return res.status(403).send('Forbidden');
  }

  // Express res.sendFile automatically handles:
  // - Range headers (206 partial content)
  // - Content-Type (video/mp4)
  // - Proper streaming behavior
  res.sendFile(filePath);
});

// 8. Download file directly
app.get('/api/files/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(DOWNLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(DOWNLOADS_DIR))) {
    return res.status(403).send('Forbidden');
  }

  res.download(filePath, filename);
});

// 9. Delete file
app.delete('/api/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(DOWNLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(DOWNLOADS_DIR))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    fs.unlinkSync(filePath);
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
    concurrencyLimit
  });
});

app.post('/api/settings', (req, res) => {
  const { sessdata: newSessdata, concurrency } = req.body;
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
  res.json({
    success: true,
    sessdata: sessdata ? '******' + sessdata.slice(-4) : '',
    hasSessdata: !!sessdata,
    concurrencyLimit
  });
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
