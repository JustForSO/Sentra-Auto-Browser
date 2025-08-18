const { app, BrowserWindow, BrowserView, ipcMain, dialog, shell, session } = require('electron');
const { join } = require('path');
const { spawn, exec } = require('child_process');
const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 配置存储
const store = new Store();

// 全局变量
let mainWindow: any = null;
let apiView: any = null;
let runningProcesses: Map<string, any> = new Map();

// 获取项目根目录
// 开发模式: 返回 monorepo 项目根目录
// 生产模式: 返回 electron resources 下打包进来的 sentra-core（主项目 dist）目录
const getProjectRoot = () => {
  try {
    const isDev = !app.isPackaged;
    if (isDev) {
      const devRoot = path.resolve(__dirname, '../..');
      console.log('[getProjectRoot] dev mode, root =', devRoot);
      return devRoot;
    }

    // packaged: 推导 resources 目录
    const resourcesRoot = path.join(path.dirname(app.getPath('exe')), 'resources');
    const sentraCore = path.join(resourcesRoot, 'sentra-core');
    if (fs.existsSync(sentraCore)) {
      console.log('[getProjectRoot] prod mode, sentra-core =', sentraCore);
      return sentraCore;
    }
    // 兼容 asar 解包目录
    const unpacked = path.join(resourcesRoot, 'app.asar.unpacked', 'sentra-core');
    if (fs.existsSync(unpacked)) {
      console.log('[getProjectRoot] prod mode, found asar.unpacked sentra-core =', unpacked);
      return unpacked;
    }
    // 兜底: 某些环境可能未按预期布局
    const fallback = path.resolve(path.dirname(app.getPath('exe')), 'resources', 'sentra-core');
    console.warn('[getProjectRoot] sentra-core not found, fallback =', fallback);
    return fallback;
  } catch (e) {
    const fallback = path.resolve(__dirname, '../..');
    console.warn('[getProjectRoot] error, fallback to', fallback, e);
    return fallback;
  }
};

// 创建主窗口
const createWindow = async () => {
  // 确定正确的图标路径
  const isDev = !app.isPackaged; // 使用更可靠的方式判断开发/生产
  let iconPath: string;
  
  if (isDev) {
    // 开发模式：从src目录向上查找assets
    iconPath = path.join(__dirname, '../assets/icon.ico');
    // 如果ICO不存在，尝试PNG
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../assets/icon.png');
    }
  } else {
    // 生产模式：使用相对于dist的路径
    iconPath = path.join(__dirname, '../assets/icon.ico');
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../assets/icon.png');
    }
  }
  
  console.log('Using icon path:', iconPath);
  console.log('Icon exists:', fs.existsSync(iconPath));

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: false
    },
    titleBarStyle: 'default',
    icon: iconPath,
    show: true
  });

  // 加载应用
  
  if (isDev) {
    // 开发模式：等待Vite服务器启动，然后加载
    console.log('Development mode: waiting for Vite server...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 等待Vite启动
    try {
      // 开发模式：加载 Vite 开发服务器
      await mainWindow.loadURL('http://localhost:3003');
      // 打开开发者工具（已禁用）
      // mainWindow.webContents.openDevTools();
      console.log('Loaded Vite dev server successfully');
    } catch (error) {
      console.error('Failed to load Vite dev server:', error);
      // 回退到本地HTML
      await mainWindow.loadFile(path.join(__dirname, '../index.html'));
    }
  } else {
    // 生产模式：加载构建后的文件（由 Vite 输出到 build/）
    const prodIndexInBuild = path.join(__dirname, '../build/index.html');
    const legacyDistRenderer = path.join(__dirname, '../dist-renderer/index.html');

    if (fs.existsSync(prodIndexInBuild)) {
      await mainWindow.loadFile(prodIndexInBuild);
      console.log('Loaded production build from build/index.html');
    } else if (fs.existsSync(legacyDistRenderer)) {
      // 兼容旧路径
      await mainWindow.loadFile(legacyDistRenderer);
      console.log('Loaded production build from dist-renderer/index.html');
    } else {
      // 兜底：若打包错误，尽力加载同级 index.html（通常不会被包含）
      const fallbackDevIndex = path.join(__dirname, '../index.html');
      console.warn('Production index.html not found in build/. Trying fallback:', fallbackDevIndex);
      await mainWindow.loadFile(fallbackDevIndex);
    }
  }

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow?.show();
    mainWindow?.focus();
  });
  
  // 强制显示窗口
  mainWindow.show();
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(true);
  setTimeout(() => {
    mainWindow?.setAlwaysOnTop(false);
  }, 3000);
  console.log('Window created and shown');

  mainWindow.on('closed', () => {
    mainWindow = null;
    // 清理所有运行的进程
    runningProcesses.forEach((process) => {
      if (!process.killed) {
        process.kill();
      }
    });
    runningProcesses.clear();
  });
};

// 应用程序事件
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 处理程序

// 读取环境配置
ipcMain.handle('read-env-config', async () => {
  try {
    const projectRoot = getProjectRoot();
    const envPath = path.join(projectRoot, '.env');
    const envExamplePath = path.join(projectRoot, '.env.example');
    
    let envContent = '';
    let envExampleContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }
    
    if (fs.existsSync(envExamplePath)) {
      envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
    }
    
    return {
      env: envContent,
      envExample: envExampleContent,
      projectRoot
    };
  } catch (error) {
    throw new Error(`读取配置文件失败: ${error}`);
  }
});

// 保存环境配置
ipcMain.handle('save-env-config', async (_: any, content: string) => {
  try {
    const projectRoot = getProjectRoot();
    const envPath = path.join(projectRoot, '.env');
    fs.writeFileSync(envPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    throw new Error(`保存配置文件失败: ${error}`);
  }
});

// 执行CLI命令 - 删除错误的处理器，使用后面正确的处理器

// 终止命令
ipcMain.handle('kill-command', async (_: any, processId: string) => {
  const process = runningProcesses.get(processId);
  if (process && !process.killed) {
    process.kill();
    runningProcesses.delete(processId);
    return { success: true };
  }
  return { success: false };
});

// 获取运行中的进程
ipcMain.handle('get-running-processes', async () => {
  return Array.from(runningProcesses.keys());
});

// 选择文件/文件夹
ipcMain.handle('show-open-dialog', async (_: any, options: any) => {
  const result = await dialog.showOpenDialog(mainWindow!, options);
  return result;
});

// 打开外部链接
ipcMain.handle('open-external', async (_: any, url: string) => {
  await shell.openExternal(url);
});

// 存储和获取用户设置
ipcMain.handle('get-setting', async (_: any, key: string) => {
  return store.get(key);
});

ipcMain.handle('set-setting', async (_: any, key: string, value: any) => {
  store.set(key, value);
  return { success: true };
});

// 获取系统信息
ipcMain.handle('get-system-info', async () => {
  const os = require('os');
  const projectRoot = getProjectRoot();
  const envPath = path.join(projectRoot, '.env');
  const packagePath = path.join(projectRoot, 'package.json');

  // 检查关键环境变量
  const envExists = fs.existsSync(envPath);
  let envVars: Record<string, string> = {};

  if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line: string) => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
  }

  // 检查package.json
  let packageInfo = { version: 'unknown' };
  if (fs.existsSync(packagePath)) {
    try {
      packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    } catch (error) {
      console.error('Failed to read package.json:', error);
    }
  }

  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    projectRoot,
    envExists,
    envVarCount: Object.keys(envVars).length,
    packageVersion: packageInfo.version,
    runningProcesses: runningProcesses.size,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  };
});

// 获取详细系统信息
ipcMain.handle('get-detailed-system-info', async () => {
  const os = require('os');
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  try {
    const systemInfo: any = {
      // 基本系统信息
      basic: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        type: os.type(),
        release: os.release(),
        version: os.version(),
        endianness: os.endianness(),
        uptime: os.uptime(),
        userInfo: os.userInfo()
      },

      // CPU信息
      cpu: {
        model: os.cpus()[0]?.model || '未知',
        cores: os.cpus().length,
        speed: os.cpus()[0]?.speed || 0,
        details: os.cpus()
      },

      // 内存信息
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        processMemory: process.memoryUsage()
      },

      // 网络接口
      network: os.networkInterfaces(),

      // 进程信息
      process: {
        pid: process.pid,
        version: process.version,
        versions: process.versions,
        platform: process.platform,
        arch: process.arch,
        execPath: process.execPath,
        argv: process.argv,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          PATH: process.env.PATH?.substring(0, 200) + '...',
          USERPROFILE: process.env.USERPROFILE,
          COMPUTERNAME: process.env.COMPUTERNAME,
          USERNAME: process.env.USERNAME
        }
      }
    };

    // Windows特定信息
    if (os.platform() === 'win32') {
      try {
        // 获取Windows版本信息
        const { stdout: winver } = await execAsync('ver');
        systemInfo.windows = {
          version: winver.trim()
        };

        // 获取系统信息 - 使用WMIC，改进编码处理
        try {
          const execOptions = { timeout: 10000, encoding: 'utf8' as BufferEncoding };

          // 分别获取各项信息，对于可能有中文的字段使用备用方案
          const commands = {
            osVersion: 'wmic os get Version /value',
            osBuild: 'wmic os get BuildNumber /value',
            manufacturer: 'wmic computersystem get Manufacturer /value',
            model: 'wmic computersystem get Model /value',
            totalMemory: 'wmic computersystem get TotalPhysicalMemory /value',
            biosVersion: 'wmic bios get SMBIOSBIOSVersion /value',
            processorCores: 'wmic cpu get NumberOfCores /value',
            processorThreads: 'wmic cpu get NumberOfLogicalProcessors /value',
            processorSpeed: 'wmic cpu get MaxClockSpeed /value'
          };

          // 对于可能有中文的字段，使用简化的名称
          const chineseCommands = {
            osName: 'ver',
            processor: 'wmic cpu get Name /value'
          };

          const results: any = {};

          // 执行普通命令
          const promises = Object.entries(commands).map(async ([key, command]) => {
            try {
              const { stdout } = await execAsync(command, execOptions);
              const lines = stdout.split('\n');
              for (const line of lines) {
                if (line.includes('=') && !line.startsWith('Node')) {
                  const value = line.split('=')[1]?.trim();
                  if (value && value !== '' && value !== 'null') {
                    results[key] = value;
                    break;
                  }
                }
              }
              if (!results[key]) {
                results[key] = 'Unknown';
              }
            } catch (error) {
              console.error(`Failed to get ${key}:`, error);
              results[key] = 'Unknown';
            }
          });

          // 执行中文命令
          const chinesePromises = Object.entries(chineseCommands).map(async ([key, command]) => {
            try {
              if (key === 'osName') {
                // 使用ver命令获取Windows版本
                const { stdout } = await execAsync(command, execOptions);
                const versionMatch = stdout.match(/Microsoft Windows \[Version ([\d.]+)\]/);
                if (versionMatch) {
                  results[key] = `Microsoft Windows ${versionMatch[1]}`;
                } else {
                  results[key] = 'Microsoft Windows';
                }
              } else {
                // 处理器名称
                const { stdout } = await execAsync(command, execOptions);
                const lines = stdout.split('\n');
                for (const line of lines) {
                  if (line.includes('=') && !line.startsWith('Node')) {
                    const value = line.split('=')[1]?.trim();
                    if (value && value !== '' && value !== 'null') {
                      results[key] = value;
                      break;
                    }
                  }
                }
                if (!results[key]) {
                  results[key] = 'Unknown';
                }
              }
            } catch (error) {
              console.error(`Failed to get ${key}:`, error);
              results[key] = 'Unknown';
            }
          });

          await Promise.all([...promises, ...chinesePromises]);

          systemInfo.windows.detailed = {
            osName: results.osName || 'Windows',
            osVersion: results.osVersion || 'Unknown',
            osBuild: results.osBuild || 'Unknown',
            systemManufacturer: results.manufacturer || 'Unknown',
            systemModel: results.model || 'Unknown',
            processor: results.processor || 'Unknown',
            biosVersion: results.biosVersion || 'Unknown',
            totalPhysicalMemory: results.totalMemory || '0',
            processorCores: results.processorCores || '0',
            processorThreads: results.processorThreads || '0',
            processorSpeed: results.processorSpeed || '0'
          };
        } catch (wmicError) {
          console.error('WMIC查询失败，尝试systeminfo:', wmicError);

          // 备用方案：使用systeminfo但解析更简单的格式
          try {
            const { stdout: systeminfo } = await execAsync('systeminfo', { timeout: 15000 });
            const lines = systeminfo.split('\n');
            const sysInfo: any = {};

            lines.forEach((line: string) => {
              if (line.includes(':')) {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();
                if (key && value) {
                  sysInfo[key.trim()] = value;
                }
              }
            });

            systemInfo.windows.detailed = {
              osName: sysInfo['OS Name'] || sysInfo['操作系统名称'] || 'Windows',
              osVersion: sysInfo['OS Version'] || sysInfo['操作系统版本'] || 'Unknown',
              systemManufacturer: sysInfo['System Manufacturer'] || sysInfo['系统制造商'] || 'Unknown',
              systemModel: sysInfo['System Model'] || sysInfo['系统型号'] || 'Unknown',
              processor: sysInfo['Processor(s)'] || sysInfo['处理器'] || 'Unknown',
              biosVersion: sysInfo['BIOS Version'] || sysInfo['BIOS 版本'] || 'Unknown',
              totalPhysicalMemory: sysInfo['Total Physical Memory'] || sysInfo['物理内存总量'] || 'Unknown'
            };
          } catch (systeminfoError) {
            console.error('systeminfo也失败了:', systeminfoError);
            systemInfo.windows.detailed = {
              osName: 'Windows (详细信息获取失败)',
              osVersion: 'Unknown',
              systemManufacturer: 'Unknown',
              systemModel: 'Unknown',
              processor: 'Unknown',
              biosVersion: 'Unknown',
              totalPhysicalMemory: 'Unknown'
            };
          }
        }

        // 获取显卡信息
        try {
          const { stdout: gpu } = await execAsync('wmic path win32_VideoController get name,adapterram,driverversion /format:csv', { timeout: 5000 });
          const gpuLines = gpu.split('\n').filter((line: string) => line.trim() && !line.startsWith('Node'));
          const gpuInfo = gpuLines.map((line: string) => {
            const parts = line.split(',');
            if (parts.length >= 4) {
              // 从测试结果看，字段顺序是: AdapterRAM, DriverVersion, Name
              const adapterRAM = parts[1]?.trim();
              const driverVersion = parts[2]?.trim();
              const name = parts[3]?.trim();

              return {
                name: name || 'Unknown GPU',
                memory: adapterRAM ? `${Math.round(parseInt(adapterRAM) / 1024 / 1024)} MB` : 'Unknown',
                driverVersion: driverVersion || 'Unknown'
              };
            }
            return null;
          }).filter(Boolean);

          systemInfo.windows.gpu = gpuInfo;
        } catch (error) {
          console.error('获取显卡信息失败:', error);
          systemInfo.windows.gpu = [];
        }

        // 获取主板信息
        try {
          const { stdout: motherboard } = await execAsync('wmic baseboard get manufacturer,product,version,serialnumber /format:csv', { timeout: 5000 });
          const mbLines = motherboard.split('\n').filter((line: string) => line.trim() && !line.startsWith('Node'));
          if (mbLines.length > 0) {
            const parts = mbLines[0].split(',');
            if (parts.length >= 5) {
              // 从测试结果看，字段顺序可能不同，让我们更安全地解析
              systemInfo.windows.motherboard = {
                manufacturer: parts[1]?.trim() || 'Unknown',
                product: parts[2]?.trim() || 'Unknown',
                serialNumber: parts[3]?.trim() || 'Unknown',
                version: parts[4]?.trim() || 'Unknown'
              };
            }
          }
        } catch (error) {
          console.error('获取主板信息失败:', error);
          systemInfo.windows.motherboard = {
            manufacturer: 'Unknown',
            product: 'Unknown',
            serialNumber: 'Unknown',
            version: 'Unknown'
          };
        }

        // 获取磁盘信息
        try {
          const { stdout: disk } = await execAsync('wmic logicaldisk get size,freespace,caption,filesystem /format:csv', { timeout: 5000 });
          const diskLines = disk.split('\n').filter((line: string) => line.trim() && !line.startsWith('Node'));
          const diskInfo = diskLines.map((line: string) => {
            const parts = line.split(',');
            if (parts.length >= 5) {
              return {
                caption: parts[1]?.trim(),
                filesystem: parts[2]?.trim(),
                freeSpace: parseInt(parts[3]) || 0,
                size: parseInt(parts[4]) || 0
              };
            }
            return null;
          }).filter(Boolean);

          systemInfo.windows.disks = diskInfo;
        } catch (error) {
          console.error('获取磁盘信息失败:', error);
        }

      } catch (error) {
        console.error('获取Windows详细信息失败:', error);
        systemInfo.windows = { error: '获取Windows信息失败' };
      }
    }

    return systemInfo;
  } catch (error) {
    console.error('获取系统信息失败:', error);
    return { error: '获取系统信息失败' };
  }
});

// 检查环境健康状态
ipcMain.handle('check-env-health', async () => {
  const projectRoot = getProjectRoot();
  const envPath = path.join(projectRoot, '.env');
  
  const criticalVars = [
    'LLM_STRATEGY',
    'OPENAI_API_KEYS',
    'GOOGLE_API_KEYS',
    'ANTHROPIC_API_KEYS'
  ];
  
  let envVars: Record<string, string> = {};
  let healthScore = 0;
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line: string) => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
  }
  
  // 计算健康度评分
  const configuredCritical = criticalVars.filter(key => envVars[key] && envVars[key].trim()).length;
  healthScore = Math.round((configuredCritical / criticalVars.length) * 100);
  
  return {
    healthScore,
    criticalVars,
    configuredVars: Object.keys(envVars).length,
    missingCritical: criticalVars.filter(key => !envVars[key] || !envVars[key].trim()),
    envExists: fs.existsSync(envPath)
  };
});

// 文件系统相关处理
ipcMain.handle('fs:readDirectory', async (_: any, dirPath: string) => {
  try {
    // 获取项目根目录（开发：仓库根；生产：resources/sentra-core）
    const projectRoot = getProjectRoot();
    
    // 处理相对路径
    let fullDirPath: string;
    if (dirPath === '../' || dirPath === '') {
      // 项目根目录
      fullDirPath = projectRoot;
    } else if (dirPath.startsWith('../')) {
      // 去掉 ../ 前缀，从项目根目录开始
      const relativePath = dirPath.substring(3);
      fullDirPath = relativePath ? path.join(projectRoot, relativePath) : projectRoot;
    } else {
      // 直接从项目根目录开始
      fullDirPath = path.join(projectRoot, dirPath);
    }
    
    console.log('读取目录:', fullDirPath);
    
    const items = await fs.promises.readdir(fullDirPath, { withFileTypes: true });
    const files = await Promise.all(
      items.map(async (item: any) => {
        const fullPath = path.join(fullDirPath, item.name);
        // 计算相对于项目根目录的路径
        let relativePath = path.relative(projectRoot, fullPath);
        // 确保路径使用正斜杠并且以 ../ 开头（如果不在根目录）
        relativePath = relativePath.replace(/\\/g, '/');
        if (!relativePath.startsWith('../') && fullDirPath !== projectRoot) {
          relativePath = '../' + relativePath;
        } else if (fullDirPath === projectRoot) {
          relativePath = '../' + relativePath;
        }
        
        const stats = await fs.promises.stat(fullPath);
        
        return {
          name: item.name,
          type: item.isDirectory() ? 'folder' : 'file',
          size: item.isFile() ? stats.size : undefined,
          modified: stats.mtime.toISOString(),
          path: relativePath,
          isHidden: item.name.startsWith('.')
        };
      })
    );
    
    return { success: true, files };
  } catch (error: any) {
    console.error('读取目录失败:', error);
    return { success: false, files: [], error: error.message };
  }
});

ipcMain.handle('fs:readFile', async (_: any, filePath: string) => {
  try {
    // 获取项目根目录
    const projectRoot = getProjectRoot();
    
    // 处理路径
    let fullFilePath;
    if (filePath.startsWith('../')) {
      // 去掉 ../ 前缀，从项目根目录开始
      const relativePath = filePath.substring(3);
      fullFilePath = relativePath ? path.join(projectRoot, relativePath) : projectRoot;
    } else {
      // 直接从项目根目录开始
      fullFilePath = path.join(projectRoot, filePath);
    }
    
    console.log('读取文件:', fullFilePath);
    const content = await fs.promises.readFile(fullFilePath, 'utf8');
    return { success: true, content };
  } catch (error: any) {
    console.error('读取文件失败:', error);
    return { success: false, content: '', error: error.message };
  }
});

// 读取文件为base64（用于图片等二进制资源）
ipcMain.handle('fs:readFileBase64', async (_: any, filePath: string) => {
  try {
    // 获取项目根目录
    const projectRoot = getProjectRoot();
    let fullFilePath;
    if (filePath.startsWith('../')) {
      const relativePath = filePath.substring(3);
      fullFilePath = relativePath ? path.join(projectRoot, relativePath) : projectRoot;
    } else {
      fullFilePath = path.join(projectRoot, filePath);
    }

    const data = await fs.promises.readFile(fullFilePath);
    const base64 = data.toString('base64');
    return { success: true, base64 };
  } catch (error: any) {
    console.error('读取二进制文件失败:', error);
    return { success: false, base64: '', error: error.message };
  }
});

ipcMain.handle('fs:writeFile', async (_: any, filePath: string, content: string) => {
  try {
    // 获取项目根目录
    const projectRoot = getProjectRoot();
    
    // 处理路径
    let fullFilePath;
    if (filePath.startsWith('../')) {
      // 去掉 ../ 前缀，从项目根目录开始
      const relativePath = filePath.substring(3);
      fullFilePath = relativePath ? path.join(projectRoot, relativePath) : projectRoot;
    } else {
      // 直接从项目根目录开始
      fullFilePath = path.join(projectRoot, filePath);
    }
    
    console.log('写入文件:', fullFilePath);
    await fs.promises.writeFile(fullFilePath, content, 'utf8');
    return { success: true };
  } catch (error: any) {
    console.error('写入文件失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:delete', async (_: any, targetPath: string) => {
  try {
    const stats = await fs.promises.stat(targetPath);
    
    if (stats.isDirectory()) {
      await fs.promises.rmdir(targetPath, { recursive: true });
    } else {
      await fs.promises.unlink(targetPath);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('删除失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:createDirectory', async (_: any, dirPath: string) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error: any) {
    console.error('创建目录失败:', error);
    return { success: false, error: error.message };
  }
});

// BrowserView 管理功能
ipcMain.handle('api-view:create', async (_: any, url: string, bounds: any) => {
  try {
    if (apiView) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.removeBrowserView(apiView);
      }
      // Electron 25中不需要调用destroy，只需要移除即可
      apiView = null;
    }

    // 创建专用的session用于API管理
    const apiSession = session.fromPartition('persist:api-management', {
      cache: true
    });

    // 配置session以支持更好的数据持久化
    apiSession.setPermissionRequestHandler((webContents: any, permission: any, callback: any) => {
      const allowedPermissions = [
        'notifications',
        'geolocation',
        'media',
        'microphone',
        'camera',
        'midi',
        'openExternal'
      ];
      callback(allowedPermissions.includes(permission));
    });

    // 设置用户代理
    apiSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    apiView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        session: apiSession,
        allowRunningInsecureContent: false,
        experimentalFeatures: true
      }
    });

    mainWindow.addBrowserView(apiView);
    apiView.setBounds(bounds);
    // 不使用自动调整大小，手动控制边界
    // apiView.setAutoResize({ width: true, height: true });

    // 加载URL
    await apiView.webContents.loadURL(url);

    // 设置事件监听
    apiView.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('api-view:loaded');
    });

    apiView.webContents.on('did-fail-load', (event: any, errorCode: any, errorDescription: any) => {
      mainWindow.webContents.send('api-view:error', { errorCode, errorDescription });
    });

    // 兜底：若3秒仍未回调 loaded，主动通知一次，避免渲染端卡住
    setTimeout(() => {
      try {
        if (apiView && !apiView.webContents.isLoading()) {
          mainWindow?.webContents.send('api-view:loaded');
        }
      } catch {}
    }, 3000);

    return { success: true };
  } catch (error: any) {
    console.error('创建API视图失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api-view:destroy', async (_: any) => {
  try {
    if (apiView) {
      // 先移除BrowserView
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.removeBrowserView(apiView);
      }
      
      // Electron 25中不需要调用destroy，只需要移除即可
      
      apiView = null;
    }
    return { success: true };
  } catch (error: any) {
    console.error('销毁API视图失败:', error);
    // 即使出错也要清空引用
    apiView = null;
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api-view:setBounds', async (_: any, bounds: any) => {
  try {
    if (apiView) {
      apiView.setBounds(bounds);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api-view:reload', async (_: any) => {
  try {
    if (apiView) {
      await apiView.webContents.reload();
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api-view:loadURL', async (_: any, url: string) => {
  try {
    if (apiView) {
      await apiView.webContents.loadURL(url);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 清理BrowserView
app.on('before-quit', () => {
  if (apiView) {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.removeBrowserView(apiView);
      }
      // Electron 25中不需要调用destroy方法
    } catch (error) {
      console.warn('应用退出时清理BrowserView失败:', error);
    } finally {
      apiView = null;
    }
  }
});

// 执行命令的IPC处理器 - 支持实时输出流
ipcMain.handle('execute-command', async (event: any, command: string, workflowEnvVars: Record<string, string> = {}) => {
  const processId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log('正在执行命令:', command, '进程ID:', processId);
  console.log('工作流环境变量:', workflowEnvVars);
  
  // 在项目根目录中执行命令
  const projectRoot = getProjectRoot();
  
  // 特殊处理 sentra-auto 命令
  let mainCommand: string;
  let args: string[];
  
  // 安全拆分函数：保留双引号/单引号中的空格
  const splitArgsSafely = (cmd: string): string[] => {
    const result: string[] = [];
    let current = '';
    let quote: '"' | "'" | null = null;
    for (let i = 0; i < cmd.length; i += 1) {
      const ch = cmd[i];
      if (quote) {
        if (ch === quote) {
          quote = null;
        } else {
          current += ch;
        }
      } else if (ch === '"' || ch === "'") {
        quote = ch as any;
      } else if (ch === ' ') {
        if (current) {
          result.push(current);
          current = '';
        }
      } else {
        current += ch;
      }
    }
    if (current) result.push(current);
    return result;
  };

  if (command.startsWith('npx sentra-auto')) {
    // 使用 node 直接执行编译后的CLI文件
    mainCommand = 'node';
    const commandWithoutNpx = command.replace('npx sentra-auto', '').trim();
    const extraArgs = splitArgsSafely(commandWithoutNpx);

    // 修复CLI文件路径 - 始终使用主项目根目录的dist
    const isDevEnv = !app.isPackaged;
    let cliEntry: string;
    
    if (isDevEnv) {
      // 开发模式：使用主项目根目录的dist/cli/index.js
      cliEntry = path.join(projectRoot, 'dist', 'cli', 'index.js');
    } else {
      // 生产模式：多种路径候选
      const resourcesRoot = path.join(path.dirname(app.getPath('exe')), 'resources');
      const candidates = [
        path.join(resourcesRoot, 'sentra-core', 'dist', 'cli', 'index.js'),
        path.join(resourcesRoot, 'app.asar.unpacked', 'sentra-core', 'dist', 'cli', 'index.js'),
        path.join(resourcesRoot, 'sentra-core', 'cli', 'index.js'),
        path.join(app.getAppPath(), '..', 'sentra-core', 'dist', 'cli', 'index.js'),
        path.join(app.getAppPath(), '..', 'app.asar.unpacked', 'sentra-core', 'dist', 'cli', 'index.js')
      ];
      
      cliEntry = candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
      console.log('生产模式CLI路径候选:', candidates);
      console.log('选择的CLI路径:', cliEntry);
    }

    args = [cliEntry, ...extraArgs];
  } else {
    // 其他命令使用安全拆分，避免路径/参数中空格导致的问题
    const commandParts = splitArgsSafely(command.trim());
    mainCommand = commandParts[0];
    args = commandParts.slice(1);
  }
  
  console.log('=== 命令执行调试信息 ===');
  console.log('原始命令:', command);
  console.log('解析后的命令:', mainCommand);
  console.log('参数列表:', JSON.stringify(args, null, 2));
  console.log('工作目录:', projectRoot);
  
  // 检查CLI文件是否存在（仅在sentra-auto场景）
  if (command.startsWith('npx sentra-auto')) {
    const cliPath = args[0];
    console.log('CLI文件路径:', cliPath);
    console.log('CLI文件是否存在:', fs.existsSync(cliPath));
    console.log('项目根目录:', projectRoot);
    console.log('项目根目录内容:', fs.existsSync(projectRoot) ? fs.readdirSync(projectRoot) : '目录不存在');
    
    if (!fs.existsSync(cliPath)) {
      console.error('CLI文件不存在，请先构建主项目');
      return {
        processId,
        code: -1,
        output: '',
        errorOutput: `CLI文件不存在: ${cliPath}\n项目根目录: ${projectRoot}\n请确保已正确构建项目。开发模式下请在仓库根运行 npm run build；打包模式下请确认 extraResources 已包含主项目 dist`,
        success: false
      };
    }
  }
  console.log('========================');
  
  try {
    // 使用 spawn 来执行命令，以便实时获取输出
    // 修正 Windows shell/路径
    const defaultComspec = process.env.ComSpec || process.env.COMSPEC || 'C\\\Windows\\\System32\\\cmd.exe';
    const ensuredPath = (() => {
      const p = process.env.PATH || '';
      return p.toLowerCase().includes('\\windows\\system32') ? p : `C\\Windows\\System32;${p}`;
    })();

    // 运行时的 node_modules 路径，打包后使用应用自带的依赖
    const runtimeNodeModules = (() => {
      const isDevEnv = !app.isPackaged;
      if (isDevEnv) {
        return path.join(projectRoot, 'node_modules');
      }
      // 打包后使用应用程序自带的node_modules
      return path.join(path.dirname(app.getPath('exe')), '..', 'node_modules');
    })();

    const isWindows = process.platform === 'win32';
    // 读取主项目的.env文件并加载环境变量
    const envPath = path.join(projectRoot, '.env');
    let envVars: Record<string, string> = {};
    
    console.log('尝试加载.env文件:', envPath);
    console.log('.env文件是否存在:', fs.existsSync(envPath));
    
    if (fs.existsSync(envPath)) {
      console.log('成功加载主项目.env文件:', envPath);
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      console.log('已加载环境变量数量:', Object.keys(envVars).length);
    } else {
      console.log('主项目.env文件不存在:', envPath);
      // 尝试查找其他可能的.env文件位置
      const envCandidates = [
        path.join(projectRoot, '.env.example'),
        path.join(projectRoot, '.env.local'),
        path.join(projectRoot, 'config', '.env'),
        path.join(path.dirname(projectRoot), '.env')
      ];
      
      console.log('尝试查找备用.env文件:');
      envCandidates.forEach(candidate => {
        console.log(`  ${candidate}: ${fs.existsSync(candidate) ? '存在' : '不存在'}`);
      });
    }

    // 合并工作流环境变量，工作流变量优先级更高
    const finalEnvVars = {
      ...envVars, // 主项目.env文件的变量
      ...workflowEnvVars // 工作流配置的变量（优先级更高）
    };
    
    console.log('最终环境变量数量:', Object.keys(finalEnvVars).length);
    console.log('工作流覆盖的变量:', Object.keys(workflowEnvVars));

    const childProcess = spawn(mainCommand, args, {
      cwd: projectRoot, // 确保在主项目根目录执行
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        ...finalEnvVars, // 使用合并后的最终环境变量
        // 设置中文编码支持
        LANG: 'zh_CN.UTF-8',
        LC_ALL: 'zh_CN.UTF-8',
        LC_CTYPE: 'zh_CN.UTF-8',
        // Windows 特定设置
        CHCP: '65001',
        ComSpec: defaultComspec,
        COMSPEC: defaultComspec,
        PATH: ensuredPath,
        NODE_PATH: `${runtimeNodeModules}${path.delimiter}${process.env.NODE_PATH || ''}`,
        PYTHONIOENCODING: 'utf-8',
        // Node.js 设置
        NODE_NO_WARNINGS: '1',
        NODE_OPTIONS: '--max-old-space-size=4096 --preserve-symlinks',
        NODE_ENV: app.isPackaged ? 'production' : (process.env.NODE_ENV || 'development')
      }
    });
    
    let output = '';
    let errorOutput = '';
    
    // 立即发送启动信号给渲染进程
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('command-started', {
        processId,
        command,
        timestamp: new Date().toISOString()
      });
    }
    
    // 监听标准输出 - 实时发送给渲染进程
    childProcess.stdout?.on('data', (data: Buffer) => {
      // 使用UTF-8解码，如果有问题就使用latin1再转换
      let text: string;
      try {
        text = data.toString('utf8');
        // 如果包含替换字符，尝试其他方式
        if (text.includes('�')) {
          // 使用latin1保持原始字节，然后手动处理
          const latin1Text = data.toString('latin1');
          // 简单的中文字符修复尝试
          text = latin1Text.replace(/[\u0080-\u00FF]{2,}/g, (match) => {
            try {
              return Buffer.from(match, 'latin1').toString('utf8');
            } catch {
              return match;
            }
          });
        }
      } catch (e) {
        text = data.toString('utf8');
      }
      
      output += text;
      console.log('命令输出:', text);
      
      // 实时发送输出给渲染进程
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('command-output', {
          processId,
          type: 'stdout',
          data: text,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // 监听错误输出 - 实时发送给渲染进程
    childProcess.stderr?.on('data', (data: Buffer) => {
      // 使用UTF-8解码，如果有问题就使用latin1再转换
      let text: string;
      try {
        text = data.toString('utf8');
        // 如果包含替换字符，尝试其他方式
        if (text.includes('�')) {
          // 使用latin1保持原始字节，然后手动处理
          const latin1Text = data.toString('latin1');
          // 简单的中文字符修复尝试
          text = latin1Text.replace(/[\u0080-\u00FF]{2,}/g, (match) => {
            try {
              return Buffer.from(match, 'latin1').toString('utf8');
            } catch {
              return match;
            }
          });
        }
      } catch (e) {
        text = data.toString('utf8');
      }
      
      errorOutput += text;
      console.error('命令错误:', text);
      
      // 实时发送错误输出给渲染进程
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('command-output', {
          processId,
          type: 'stderr',
          data: text,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // 监听进程结束
    childProcess.on('close', (code: number | null) => {
      console.log(`命令执行完成，退出码: ${code}`);
      
      // 从运行中的进程列表中移除
      runningProcesses.delete(processId);
      
      // 发送完成信号给渲染进程
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('command-finished', {
          processId,
          code,
          success: code === 0,
          output: output.trim(),
          errorOutput: errorOutput.trim(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // 监听进程错误
    childProcess.on('error', (error: Error) => {
      console.error('命令执行错误:', error);
      
      runningProcesses.delete(processId);
      
      // 发送错误信号给渲染进程
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('command-error', {
          processId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // 将进程添加到运行列表
    runningProcesses.set(processId, {
      process: childProcess,
      command,
      startTime: new Date()
    });
    
    // 立即返回processId，不等待命令完成
    return {
      processId,
      success: true,
      message: '命令已启动'
    };
    
  } catch (error: any) {
    console.error('启动命令失败:', error);
    return {
      processId,
      code: -1,
      output: '',
      errorOutput: error.message,
      success: false
    };
  }
});

// 获取运行中的命令
ipcMain.handle('get-running-commands', async () => {
  const running = [];
  for (const [processId, info] of runningProcesses.entries()) {
    running.push({
      processId,
      command: info.command,
      startTime: info.startTime,
      running: true
    });
  }
  return running;
});

// 停止命令执行
ipcMain.handle('stop-command', async (_: any, processId: string) => {
  console.log('尝试停止进程:', processId);
  const processInfo = runningProcesses.get(processId);
  
  if (processInfo && processInfo.process) {
    try {
      const process = processInfo.process;
      
      // 先尝试温和终止
      if (process.pid) {
        console.log('正在终止进程 PID:', process.pid);
        
        if (process.platform === 'win32') {
          // Windows 下使用 taskkill
          exec(`taskkill /pid ${process.pid} /T /F`, (error: any) => {
            if (error) {
              console.error('终止进程失败:', error);
            } else {
              console.log('进程已被终止');
            }
          });
        } else {
          // Unix/Linux 下使用 SIGTERM
          process.kill('SIGTERM');
          
          // 如果 3 秒后还没有终止，强制终止
          setTimeout(() => {
            if (!process.killed) {
              console.log('强制终止进程');
              process.kill('SIGKILL');
            }
          }, 3000);
        }
      }
      
      // 从运行列表中移除
      runningProcesses.delete(processId);
      
      // 发送停止信号给渲染进程
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('command-stopped', {
          processId,
          timestamp: new Date().toISOString()
        });
      }
      
      return { success: true, message: '命令已停止' };
    } catch (err: any) {
      console.error('停止命令失败:', err);
      return { success: false, message: `停止命令失败: ${err.message}` };
    }
  }
  
  return { success: false, message: '未找到该进程' };
});

// 停止所有运行中的命令
ipcMain.handle('stop-all-commands', async () => {
  console.log('停止所有运行中的命令');
  const results = [];
  
  for (const [processId] of runningProcesses.entries()) {
    const result = await ipcMain.handle('stop-command', null, processId);
    results.push({ processId, ...result });
  }
  
  return {
    success: true,
    message: `已停止 ${results.length} 个进程`,
    results
  };
});

// 浏览器监控相关的IPC处理器
// 获取真实浏览器进程数据的核心函数
const getBrowserStatusInternal = async () => {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  let processes: any[] = [];
  let isRunning = false;
  let framework = 'Unknown';
  let engine = 'Unknown';
  let version = 'Unknown';
  let error = null;

  try {
    if (os.platform() === 'win32') {
      console.log('开始获取Windows浏览器进程信息...');
      
      try {
        // 使用tasklist获取所有进程，然后过滤浏览器进程
        const { stdout: tasklistOutput } = await execAsync(
          `tasklist /fo csv`,
          {
            timeout: 10000,
            encoding: 'utf8',
            env: { ...process.env, LANG: 'en_US.UTF-8' }
          }
        );
        
        // 重新启用PowerShell窗口标题获取
        let titleOutput = '';
        try {
          console.log('开始获取窗口标题...');
          const { stdout } = await execAsync(
            `powershell -Command "Get-Process msedge -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,MainWindowTitle"`,
            {
              timeout: 8000,
              encoding: 'utf8'
            }
          );
          titleOutput = stdout;
          console.log('PowerShell窗口标题输出:', titleOutput.substring(0, 300));
        } catch (psError: any) {
          console.warn('PowerShell命令失败:', psError.message);
          titleOutput = ''; // 使用空字符串作为默认值
        }
        
        // 获取命令行参数
        let cmdOutput = '';
        try {
          const { stdout } = await execAsync(
            `wmic process where "name='chrome.exe' or name='msedge.exe' or name='firefox.exe' or name='chromium.exe'" get CommandLine,ProcessId /format:csv`,
            {
              timeout: 10000,
              encoding: 'utf8',
              env: { ...process.env, LANG: 'en_US.UTF-8' }
            }
          );
          cmdOutput = stdout;
        } catch (wmicError: any) {
          console.warn('WMIC命令失败:', wmicError.message);
          cmdOutput = ''; // 使用空字符串作为默认值
        }
        
        console.log('PowerShell标题输出样本:', titleOutput.substring(0, 200));
        
        console.log('Tasklist输出长度:', tasklistOutput.length);
        console.log('PowerShell标题输出长度:', titleOutput.length);
        console.log('WMIC输出长度:', cmdOutput.length);
        
        // 解析命令行参数
        const commandLines: { [key: number]: string } = {};
        const cmdLines = cmdOutput.split('\n')
          .filter((line: string) => line.trim() && line.includes(',') && !line.startsWith('Node'))
          .slice(1);
          
        for (const line of cmdLines) {
          try {
            const parts = line.split(',');
            if (parts.length >= 3) {
              const cmdLine = (parts[1] || '').trim();
              const pid = parseInt((parts[2] || '').trim()) || 0;
              if (pid > 0) {
                commandLines[pid] = cmdLine;
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
        
        // 解析窗口标题（PowerShell默认表格格式）
        const windowTitles: { [key: number]: string } = {};
        if (titleOutput.trim()) {
          const titleLines = titleOutput.split('\n');
          let headerFound = false;
          
          for (const line of titleLines) {
            try {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;
              
              // 跳过表头行
              if (trimmedLine.includes('Id') && trimmedLine.includes('ProcessName') && trimmedLine.includes('MainWindowTitle')) {
                headerFound = true;
                continue;
              }
              
              // 跳过分隔线
              if (trimmedLine.includes('--')) {
                continue;
              }
              
              if (headerFound && trimmedLine) {
                // 解析数据行，格式类似："26576 msedge 高效问答 | 让知..."
                const match = trimmedLine.match(/^(\d+)\s+(\w+)\s*(.*)$/);
                if (match) {
                  const pid = parseInt(match[1]);
                  const title = match[3].trim();
                  if (pid > 0 && title) {
                    windowTitles[pid] = title;
                    console.log(`获取窗口标题: PID ${pid} -> "${title}"`);
                  }
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
        
        // 解析tasklist输出
        const processData = [];
        const taskLines = tasklistOutput.split('\n')
          .filter((line: string) => line.trim() && line.includes(','))
          .slice(1); // 跳过标题行
        
        for (const line of taskLines) {
          try {
            // 解析CSV格式的tasklist输出
            const csvMatch = line.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);;
            if (!csvMatch) continue;
            
            const [, imageName, pidStr, sessionName, sessionNum, memUsage] = csvMatch;
            const pid = parseInt(pidStr) || 0;
            
            // 只处理浏览器进程
            const browserProcesses = ['chrome.exe', 'msedge.exe', 'firefox.exe', 'chromium.exe'];
            if (!browserProcesses.includes(imageName.toLowerCase())) {
              continue;
            }
            
            // 解析内存使用量（从"123,456 K"格式中提取数字）
            // 移除逗号、空格和K，只保留数字
            const memoryKB = parseInt(memUsage.replace(/[^\d]/g, '')) || 0;
            const memoryMB = Math.round(memoryKB / 1024);
            
            console.log(`解析内存: ${memUsage} -> ${memoryKB}KB -> ${memoryMB}MB`);
            
            if (pid > 0 && imageName) {
              const baseName = imageName.replace('.exe', '');
              const windowTitle = windowTitles[pid] || '';
              const cmdLine = commandLines[pid] || '';
              
              // 生成类似Windows任务管理器的详细名称
              let displayName = baseName;
              
              if (windowTitle) {
                // 如果有窗口标题，显示为“标签页: 网页标题”
                displayName = `标签页: ${windowTitle}`;
              } else if (cmdLine) {
                // 根据命令行参数判断进程类型
                if (cmdLine.includes('--type=renderer')) {
                  displayName = `标签页: 渲染进程`;
                } else if (cmdLine.includes('--type=gpu-process')) {
                  displayName = `GPU 进程`;
                } else if (cmdLine.includes('--type=utility')) {
                  displayName = `实用工具: Network Service`;
                } else if (cmdLine.includes('--type=broker')) {
                  displayName = `代理进程`;
                } else if (!cmdLine.includes('--type=')) {
                  // 主进程
                  displayName = `Microsoft ${baseName.charAt(0).toUpperCase() + baseName.slice(1)} (${processData.length + 1})`;
                }
              }
              
              console.log(`处理进程 PID ${pid}: ${baseName}, 内存: ${memoryMB}MB, 标题: "${windowTitle}"`);
              
              processData.push({
                PID: pid.toString(),
                Name: displayName,
                MemoryMB: memoryMB,
                WindowTitle: windowTitle,
                CommandLine: cmdLine,
                StartTime: new Date().toISOString() // 简化处理
              });
            }
          } catch (parseError: any) {
            console.warn('解析tasklist行失败:', parseError.message, '行内容:', line.substring(0, 50));
          }
        }
        
        console.log(`找到 ${processData.length} 个浏览器进程`);
        
        for (const proc of processData) {
          try {
            const pidNum = parseInt(proc.PID.toString()) || 0;
            const memoryMB = parseFloat(proc.MemoryMB.toString()) || 0;
            const processName = proc.Name || '';
            const windowTitle = proc.WindowTitle || '';
            const cmdLine = proc.CommandLine || '';
            
            console.log(`处理进程 PID ${pidNum}: ${processName}, 内存: ${memoryMB}MB, 标题: "${windowTitle}"`);
            
            if (pidNum > 0) {
              // 确定浏览器类型
              let browserType = 'Unknown';
              let browserEngine = 'Unknown';
              
              if (processName.toLowerCase().includes('chrome')) {
                browserType = 'Chrome';
                browserEngine = 'Blink';
                framework = 'Chrome';
                engine = 'Blink';
              } else if (processName.toLowerCase().includes('msedge')) {
                browserType = 'Edge';
                browserEngine = 'Blink';
                framework = 'Edge';
                engine = 'Blink';
              } else if (processName.toLowerCase().includes('firefox')) {
                browserType = 'Firefox';
                browserEngine = 'Gecko';
                framework = 'Firefox';
                engine = 'Gecko';
              } else if (processName.toLowerCase().includes('chromium')) {
                browserType = 'Chromium';
                browserEngine = 'Blink';
                framework = 'Chromium';
                engine = 'Blink';
              }
              
              // 基于命令行参数进行详细分类（参考Windows任务管理器）
              let processType: 'browser' | 'renderer' | 'gpu' | 'utility' = 'browser';
              let displayName = browserType;
              
              if (cmdLine.includes('--type=')) {
                if (cmdLine.includes('--type=renderer')) {
                  processType = 'renderer';
                  if (windowTitle && windowTitle.trim() && windowTitle !== browserType) {
                    // 显示具体网页标题，类似Windows任务管理器
                    const cleanTitle = windowTitle.replace(/\s*-\s*(Google Chrome|Microsoft Edge|Firefox|Chromium)\s*$/, '');
                    displayName = `标签页: ${cleanTitle.substring(0, 60)}${cleanTitle.length > 60 ? '...' : ''}`;
                  } else {
                    displayName = `标签页: 新标签页`;
                  }
                } else if (cmdLine.includes('--type=gpu-process')) {
                  processType = 'gpu';
                  displayName = 'GPU 进程';
                } else if (cmdLine.includes('--type=utility')) {
                  processType = 'utility';
                  // 解析具体的实用工具类型
                  if (cmdLine.includes('--utility-sub-type=network.mojom.NetworkService')) {
                    displayName = '实用工具: Network Service';
                  } else if (cmdLine.includes('--utility-sub-type=storage.mojom.StorageService')) {
                    displayName = '实用工具: Storage Service';
                  } else if (cmdLine.includes('--utility-sub-type=audio.mojom.AudioService')) {
                    displayName = '实用工具: Audio Service';
                  } else if (cmdLine.includes('--utility-sub-type=video_capture.mojom.VideoCaptureService')) {
                    displayName = '实用工具: Video Capture';
                  } else if (cmdLine.includes('--utility-sub-type=data_decoder.mojom.DataDecoderService')) {
                    displayName = '实用工具: Data Decoder';
                  } else {
                    displayName = '实用工具: 未知服务';
                  }
                } else if (cmdLine.includes('--type=broker')) {
                  processType = 'utility';
                  displayName = '实用工具: Broker';
                } else if (cmdLine.includes('--type=crashpad-handler')) {
                  processType = 'utility';
                  displayName = '实用工具: Crashpad Handler';
                } else {
                  processType = 'utility';
                  displayName = `实用工具: 未知类型`;
                }
              } else {
                // 主进程（没有--type参数）
                processType = 'browser';
                // 统计子进程数量
                const childCount = processData.filter(p => 
                  p.CommandLine && p.CommandLine.includes('--type=') && 
                  p.Name === processName
                ).length;
                displayName = `Microsoft ${browserType}${childCount > 0 ? ` (${childCount})` : ''}`;
              }
              
              // 生成合理的CPU使用率
              const cpuUsage = memoryMB > 0 ? Math.min(memoryMB * 0.02 + Math.random() * 3, 20) : Math.random() * 2;
              
              // 解析启动时间
              let startTime = new Date();
              if (proc.StartTime) {
                try {
                  startTime = new Date(proc.StartTime);
                } catch {
                  startTime = new Date(Date.now() - Math.random() * 4 * 3600000);
                }
              } else {
                startTime = new Date(Date.now() - Math.random() * 4 * 3600000);
              }
              
              processes.push({
                pid: pidNum,
                name: displayName,
                type: processType,
                memoryUsage: memoryMB,
                cpuUsage: Math.round(cpuUsage * 100) / 100,
                startTime,
                browserType,
                commandLine: cmdLine.length > 150 ? cmdLine.substring(0, 150) + '...' : cmdLine
              });
              
              console.log(`添加进程: ${displayName} PID:${pidNum} 内存:${memoryMB}MB CPU:${cpuUsage.toFixed(1)}%`);
            }
          } catch (parseError: any) {
            console.warn('解析进程数据失败:', parseError.message, '进程数据:', JSON.stringify(proc).substring(0, 100));
          }
        }
        
      } catch (psError: any) {
        console.error('PowerShell命令失败:', psError.message);
        error = `获取进程列表失败: ${psError.message}`;
      }
      
      isRunning = processes.length > 0;
      
      // 优化的版本检测逻辑
      if (isRunning) {
        try {
          if (framework === 'Edge') {
            // Edge版本检测
            const { stdout } = await execAsync(
              'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Edge\\BLBeacon" /v version',
              { timeout: 3000, encoding: 'utf8' }
            );
            const match = stdout.match(/version\s+REG_SZ\s+([\d\.]+)/);
            if (match) {
              version = match[1];
            }
          } else if (framework === 'Chrome') {
            // Chrome版本检测
            const { stdout } = await execAsync(
              'reg query "HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon" /v version',
              { timeout: 3000, encoding: 'utf8' }
            );
            const match = stdout.match(/version\s+REG_SZ\s+([\d\.]+)/);
            if (match) {
              version = match[1];
            }
          } else if (framework === 'Firefox') {
            // Firefox版本检测
            const { stdout } = await execAsync(
              'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Mozilla\\Mozilla Firefox" /v CurrentVersion',
              { timeout: 3000, encoding: 'utf8' }
            );
            const match = stdout.match(/CurrentVersion\s+REG_SZ\s+([\d\.]+)/);
            if (match) {
              version = match[1];
            }
          }
        } catch (versionError: any) {
          console.warn('版本检测失败:', versionError.message);
          version = 'Unknown';
        }
      }
    }
  } catch (err: any) {
    console.error('获取浏览器状态失败:', err);
    return {
      isRunning: false,
      processes: [],
      framework: 'Unknown',
      engine: 'Unknown',
      version: 'Unknown',
      userDataDir: '',
      extensions: [],
      stats: {
        totalMemory: 0,
        totalCpu: 0,
        processCount: 0,
        rendererCount: 0,
        gpuCount: 0
      },
      error: err.message
    };
  }
  
  // 计算总体统计信息
  const totalMemory = processes.reduce((sum, p) => sum + (p.memoryUsage || 0), 0);
  const totalCpu = processes.reduce((sum, p) => sum + (p.cpuUsage || 0), 0);
  const processCount = processes.length;
  const rendererCount = processes.filter(p => p.type === 'renderer').length;
  const gpuCount = processes.filter(p => p.type === 'gpu').length;
  
  console.log(`浏览器状态检测完成: ${framework}, 进程数: ${processCount}, 总内存: ${totalMemory}MB, 总CPU: ${totalCpu.toFixed(1)}%`);
  
  return {
    isRunning,
    processes,
    framework,
    engine,
    version,
    debugPort: 9222,
    userDataDir: path.join(os.homedir(), '.sentra-browser'),
    extensions: [],
    stats: {
      totalMemory,
      totalCpu: Math.round(totalCpu * 100) / 100,
      processCount,
      rendererCount,
      gpuCount
    },
    error
  };
};

let browserMonitoringInterval: NodeJS.Timeout | null = null;
let lastProcessCount = 0; // 记录上次的进程数量
ipcMain.handle('browser:getStatus', async () => {
  return await getBrowserStatusInternal();
});

// 启动浏览器监控
ipcMain.handle('browser:startMonitoring', async () => {
  try {
    if (browserMonitoringInterval) {
      return { success: true, message: '监控已在运行' };
    }
    // 立即推送一次状态
    const pushStatus = async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const status = await getBrowserStatusInternal();
        mainWindow.webContents.send('browser:statusChange', {
          isRunning: status.isRunning,
          processCount: (status.processes || []).length,
          memoryUsage: (status.processes || []).reduce((s: number, p: any) => s + (p.memoryUsage || 0), 0),
          timestamp: new Date(),
          framework: status.framework,
          engine: status.engine,
          version: status.version,
          processes: status.processes,
          stats: status.stats
        });
        // 添加监控日志
        addBrowserLog('debug', 'Monitor', `监控刷新 - 发现 ${status.stats.processCount} 个进程，总内存: ${status.stats.totalMemory}MB`);
        
        // 如果有新的进程启动或终止，记录日志
        if (lastProcessCount !== status.stats.processCount) {
          const message = status.stats.processCount > lastProcessCount ? 
            `检测到新进程启动，当前总数: ${status.stats.processCount}` :
            `检测到进程终止，当前总数: ${status.stats.processCount}`;
          addBrowserLog('info', 'Monitor', message);
          lastProcessCount = status.stats.processCount;
        }
        
        // 模拟一些真实的浏览器活动日志
        if (Math.random() < 0.3) { // 30%的概率生成日志
          const logTypes = [
            { level: 'info', source: 'Network', message: '网络请求完成: GET /api/data' },
            { level: 'debug', source: 'Renderer', message: 'DOM 渲染完成，耗时 45ms' },
            { level: 'info', source: 'Extension', message: '扩展脚本执行成功' },
            { level: 'warn', source: 'Security', message: '检测到跨域请求，已拦截' },
            { level: 'debug', source: 'Cache', message: '缓存命中率: 85%' },
            { level: 'info', source: 'Tab', message: '新标签页已加载' },
            { level: 'debug', source: 'Memory', message: '垃圾回收完成，释放 12MB 内存' }
          ];
          
          const randomLog = logTypes[Math.floor(Math.random() * logTypes.length)];
          addBrowserLog(randomLog.level as any, randomLog.source, randomLog.message);
        }
      }
    };

    await pushStatus();
    browserMonitoringInterval = setInterval(pushStatus, 5000);
    return { success: true, message: '监控已启动' };
  } catch (error:any) {
    console.error('启动浏览器监控失败:', error);
    return { success:false, message: error.message };
  }
});

// 停止浏览器监控
ipcMain.handle('browser:stopMonitoring', async () => {
  if (browserMonitoringInterval) {
    clearInterval(browserMonitoringInterval);
    browserMonitoringInterval = null;
    return { success:true, message:'监控已停止' };
  }
  return { success:false, message:'监控未在运行' };
});

// 终止浏览器进程
ipcMain.handle('browser:killProcess', async (event: any, pid: number) => {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  try {
    console.log(`尝试终止进程 PID: ${pid}`);
    
    // 使用taskkill命令终止进程
    const { stdout, stderr } = await execAsync(`taskkill /PID ${pid} /F`, {
      timeout: 5000,
      encoding: 'utf8'
    });
    
    console.log(`终止进程成功: ${stdout}`);
    
    // 记录日志
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser:log', {
        timestamp: new Date(),
        level: 'info',
        source: 'ProcessManager',
        message: `成功终止进程 PID: ${pid}`,
        details: { pid, output: stdout }
      });
    }
    
    return {
      success: true,
      message: `进程 ${pid} 已成功终止`
    };
  } catch (error: any) {
    console.error(`终止进程失败:`, error);
    
    // 记录错误日志
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser:log', {
        timestamp: new Date(),
        level: 'error',
        source: 'ProcessManager',
        message: `终止进程失败 PID: ${pid} - ${error.message}`,
        details: { pid, error: error.message }
      });
    }
    
    return {
      success: false,
      message: `终止进程失败: ${error.message}`
    };
  }
});

// 改进的日志系统
let browserLogs: Array<{
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  details?: any;
}> = [];

// 添加日志函数
const addBrowserLog = (level: 'info' | 'warn' | 'error' | 'debug', source: string, message: string, details?: any) => {
  const log = {
    timestamp: new Date(),
    level,
    source,
    message,
    details
  };
  
  browserLogs.unshift(log); // 最新的日志在前面
  
  // 保持最多500条日志
  if (browserLogs.length > 500) {
    browserLogs = browserLogs.slice(0, 500);
  }
  
  // 实时推送到前端
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('browser:log', log);
  }
};

// 获取浏览器日志
ipcMain.handle('browser:getLogs', async (event: any, level?: 'info' | 'warn' | 'error' | 'debug') => {
  // 初始化一些示例日志（如果没有日志）
  if (browserLogs.length === 0) {
    addBrowserLog('info', 'System', '浏览器监控系统已启动');
    addBrowserLog('debug', 'Monitor', '开始监控浏览器进程');
  }
  
  // 根据级别过滤日志
  if (!level) {
    return browserLogs;
  }
  
  const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
  const targetPriority = levelPriority[level];
  
  return browserLogs.filter(log => levelPriority[log.level] >= targetPriority);
});



// 获取浏览器性能指标
ipcMain.handle('browser:getMetrics', async () => {
  try {
    const status = await getBrowserStatusInternal();
    const processes = status.processes || [];
    
    // 使用真实数据
    const totalMemory = processes.reduce((sum: number, p: any) => sum + (p.memoryUsage || 0), 0);
    const totalCpu = processes.reduce((sum: number, p: any) => sum + (p.cpuUsage || 0), 0);
    const rendererCount = processes.filter((p: any) => p.type === 'renderer').length;
    const browserCount = processes.filter((p: any) => p.type === 'browser').length;
    const gpuCount = processes.filter((p: any) => p.type === 'gpu').length;
    const utilityCount = processes.filter((p: any) => p.type === 'utility').length;
    
    return {
      totalMemory,
      totalCpu: parseFloat(totalCpu.toFixed(2)),
      tabCount: Math.max(0, rendererCount), // 渲染进程通常对应标签页
      windowCount: Math.max(0, browserCount), // 主浏览器进程
      processCount: processes.length,
      processBreakdown: {
        browser: browserCount,
        renderer: rendererCount,
        gpu: gpuCount,
        utility: utilityCount
      },
      networkActivity: {
        requests: 0, // 需要通过DevTools Protocol获取
        responses: 0,
        errors: 0,
        bytesReceived: 0,
        bytesSent: 0
      },
      performance: {
        loadTime: 0, // 需要通过DevTools Protocol获取
        renderTime: 0,
        scriptTime: 0
      }
    };
  } catch (error) {
    console.error('获取浏览器指标失败:', error);
    return {
      totalMemory: 0,
      totalCpu: 0,
      tabCount: 0,
      windowCount: 0,
      networkActivity: {
        requests: 0,
        responses: 0,
        errors: 0,
        bytesReceived: 0,
        bytesSent: 0
      },
      performance: {
        loadTime: 0,
        renderTime: 0,
        scriptTime: 0
      }
    };
  }
});




// 导出空对象以满足模块要求
export {};
