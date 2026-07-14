# Bento Pro - 本地桌面应用打包与运行指南 (Win & Mac)

Bento Pro 是一个 100% 本地化运行、无需云端服务器、免除本地存储负担的极速本地影音管理器。

为了让您能够获得**原生的桌面应用体验**（支持独立的窗口、沉浸式状态栏，并完全支持 Windows 和 macOS 平台），我们已经为您在项目中完美集成了 **Electron** 桌面包装环境。

---

## 🚀 准备工作

请按照以下步骤，在您本地的 Windows 或 Mac 电脑上运行和打包本项目：

### 1. 下载并解压项目
1. 在 AI Studio 界面右上角的 **设置 (Settings) / 导出 (Export)** 菜单中，选择 **Export as ZIP**（导出为 ZIP 压缩包）或 **Export to GitHub**（导出到 GitHub）。
2. 将压缩包解压到您的本地电脑目录。

### 2. 安装 Node.js
如果您的电脑上还没有安装 Node.js，请前往 [Node.js 官方网站 (https://nodejs.org/)](https://nodejs.org/) 下载并安装长期支持版本（LTS，推荐 18+ 或 20+ 版本）。

### 3. 安装本地依赖
打开您的命令行终端（Windows 使用 `CMD` 或 `PowerShell`，Mac 使用 `Terminal`），进入项目解压后的根目录，运行以下命令安装所需依赖项：

```bash
npm install
```

---

## 💻 本地调试运行 (Desktop Developer Mode)

在本地以独立的桌面客户端窗口启动并进行实时调试：

```bash
npm run desktop:dev
```

* **运行效果：** 启动本地多线程流媒体后台，同时自动弹出一个优雅的、无边框风格（Mac 平台下为沉浸式红绿灯）的原生客户端窗口。

---

## 📦 打包为原生可执行文件 (Build for Win / Mac)

您可以轻松将项目一键编译打包为 `.exe`（Windows 安装程序）或 `.dmg`/`.app`（macOS 独立应用）可执行文件：

```bash
npm run desktop:build
```

### 编译输出位置
* 编译打包流程完成后，您会在项目根目录下看到一个名为 **`dist-desktop/`** 的文件夹。
* **Windows 平台：** 在 `dist-desktop/` 内将生成 `.exe` 安装程序和绿色免安装版的压缩包。
* **macOS 平台：** 在 `dist-desktop/` 内将生成原生的 `.dmg` 磁盘映像以及可以直接双击启动的 `.app` 文件。

---

## 🛠 功能特点
1. **沉浸式窗口：** macOS 系统下自动启用原生 titleBarStyle 沉浸式风格。
2. **多进程架构：** 主进程全权代理本地 Express 多线程下载与流媒体解析，安全沙箱模式完美集成。
3. **极速下载与边下边播：** 所有缓存、视频流与引擎数据都处于 100% 内存管道中，不需要您手动解压，极大降低硬盘损耗。
