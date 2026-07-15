const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let serverProcess = null;
let mainWindow = null;

function startExpressServer() {
  const isProd = app.isPackaged;
  
  if (isProd) {
    process.env.NODE_ENV = 'production';
    // In packaged app, we directly require dist/server.cjs inside Electron's main thread.
    // This avoids needing a separate Node.js installation on the user's computer and handles ASAR seamlessly!
    let serverLoaded = false;
    
    // Check for hot update server in userData
    const userDataPath = app.getPath('userData');
    const hotUpdateServerPath = path.join(userDataPath, 'update', 'server.cjs');
    
    const pathsToTry = [];
    if (fs.existsSync(hotUpdateServerPath)) {
      pathsToTry.push(hotUpdateServerPath);
    }
    
    pathsToTry.push(
      path.join(process.resourcesPath, 'app.asar', 'dist', 'server.cjs'),
      path.join(process.resourcesPath, 'app', 'dist', 'server.cjs'),
      path.join(__dirname, 'dist', 'server.cjs')
    );
    
    for (const serverPath of pathsToTry) {
      try {
        console.log(`Attempting to load Express server directly from: ${serverPath}`);
        require(serverPath);
        serverLoaded = true;
        console.log(`Successfully loaded Express server from: ${serverPath}`);
        break;
      } catch (err) {
        console.warn(`Could not load server from ${serverPath}:`, err.message);
      }
    }
    
    if (!serverLoaded) {
      console.error('CRITICAL: Failed to load Express server in production!');
    }
  } else {
    // In development mode, spawn tsx server.ts
    const serverPath = path.join(__dirname, 'server.ts');
    console.log(`Starting background Express server in development: npx tsx ${serverPath}`);
    
    serverProcess = spawn('npx', ['tsx', serverPath], {
      env: { 
        ...process.env, 
        NODE_ENV: 'development',
        PORT: '3000'
      },
      shell: true
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Server]: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error]: ${data}`);
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 830,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, 'assets/icons/icon.icns'),
    title: "BiliArchiver - 哔哩智能归档器",
    show: false,
    backgroundColor: '#0A0C10',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Load Express server address
  mainWindow.loadURL('http://localhost:3000');

  // Show window when page is ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in user's default browser instead of Electron frame
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock to prevent spawning multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    startExpressServer();
    
    // Allow Express server a small window to start binding to port 3000
    setTimeout(createWindow, 1000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  // Gracefully terminate child Express process on window close
  if (serverProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.error('Failed to kill Express process:', err);
    }
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
