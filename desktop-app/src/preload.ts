const { contextBridge, ipcRenderer } = require('electron');

// 定义API接口
export interface ElectronAPI {
  // 配置管理
  readEnvConfig: () => Promise<{
    env: string;
    envExample: string;
    projectRoot: string;
  }>;
  saveEnvConfig: (content: string) => Promise<{ success: boolean }>;
  
  // 命令执行
  executeCommand: (command: string, envVars?: Record<string, string>) => Promise<{
    processId: string;
    code: number | null;
    output: string;
    errorOutput: string;
    success: boolean | null;
    running?: boolean;
  }>;
  killCommand: (processId: string) => Promise<{ success: boolean }>;
  getRunningProcesses: () => Promise<Array<{
    processId: string;
    command: string;
    startTime: Date;
    running: boolean;
  }>>;
  
  // 事件监听
  onCommandOutput: (callback: (data: {
    processId: string;
    type: 'stdout' | 'stderr';
    data: string;
    timestamp: string;
  }) => void) => void;
  onCommandFinished: (callback: (data: {
    processId: string;
    code: number | null;
    success: boolean;
    timestamp: string;
  }) => void) => void;
  onCommandError: (callback: (data: {
    processId: string;
    error: string;
    timestamp: string;
  }) => void) => void;
  onCommandStopped: (callback: (data: {
    processId: string;
    timestamp: string;
  }) => void) => void;
  onCommandStarted: (callback: (data: {
    processId: string;
    command: string;
    timestamp: string;
  }) => void) => void;
  
  // 停止命令
  stopCommand: (processId: string) => Promise<{ success: boolean; message: string }>;
  stopAllCommands: () => Promise<{ success: boolean; message: string; results: any[] }>;
  
  // 文件系统操作
  readDirectory: (path: string) => Promise<{
    success: boolean;
    files: Array<{
      name: string;
      type: 'file' | 'folder';
      size?: number;
      modified: string;
      path: string;
      isHidden?: boolean;
    }>;
    error?: string;
  }>;
  readFile: (path: string) => Promise<{
    success: boolean;
    content: string;
    error?: string;
  }>;
  readFileBase64: (path: string) => Promise<{
    success: boolean;
    base64: string;
    error?: string;
  }>;
  writeFile: (path: string, content: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  deleteFileOrFolder: (path: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  createDirectory: (path: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  
  // 对话框
  showOpenDialog: (options: any) => Promise<any>;
  openExternal: (url: string) => Promise<void>;
  
  // 设置存储
  getSetting: (key: string) => Promise<any>;
  setSetting: (key: string, value: any) => Promise<{ success: boolean }>;
  
  // 系统信息
  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    nodeVersion: string;
    electronVersion: string;
    projectRoot: string;
    envExists: boolean;
    envVarCount: number;
    packageVersion: string;
    runningProcesses: number;
    memoryUsage: any;
    uptime: number;
  }>;

  // 详细系统信息
  getDetailedSystemInfo: () => Promise<any>;
  
  // 环境健康检查
  checkEnvHealth: () => Promise<{
    healthScore: number;
    criticalVars: string[];
    configuredVars: number;
    missingCritical: string[];
    envExists: boolean;
  }>;
  
  // BrowserView API管理
  createApiView: (url: string, bounds: { x: number, y: number, width: number, height: number }) => Promise<{ success: boolean, error?: string }>;
  destroyApiView: () => Promise<{ success: boolean, error?: string }>;
  setApiViewBounds: (bounds: { x: number, y: number, width: number, height: number }) => Promise<{ success: boolean, error?: string }>;
  reloadApiView: () => Promise<{ success: boolean, error?: string }>;
  loadApiViewURL: (url: string) => Promise<{ success: boolean, error?: string }>;
  onApiViewLoaded: (callback: () => void) => void;
  onApiViewError: (callback: (error: { errorCode: number, errorDescription: string }) => void) => void;
  removeApiViewListeners: () => void;
  
  // 浏览器监控API
  getBrowserStatus: () => Promise<{
    isRunning: boolean;
    processes: Array<{
      pid: number;
      name: string;
      type: 'browser' | 'renderer' | 'gpu' | 'utility';
      memoryUsage: number;
      cpuUsage: number;
      startTime: Date;
      browserType?: string;
      commandLine?: string;
    }>;
    framework: string;
    engine: string;
    version: string;
    debugPort?: number;
    userDataDir: string;
    extensions: Array<{
      id: string;
      name: string;
      version: string;
      enabled: boolean;
    }>;
    error?: string;
    stats?: {
      totalMemory: number;
      totalCpu: number;
      processCount: number;
      rendererCount: number;
      gpuCount: number;
    };
  }>;
  
  getBrowserMetrics: () => Promise<{
    totalMemory: number;
    totalCpu: number;
    tabCount: number;
    windowCount: number;
    processCount: number;
    processBreakdown: {
      browser: number;
      renderer: number;
      gpu: number;
      utility: number;
    };
    networkActivity: {
      requests: number;
      responses: number;
      errors: number;
      bytesReceived: number;
      bytesSent: number;
    };
    performance: {
      loadTime: number;
      renderTime: number;
      scriptTime: number;
    };
  }>;
  
  getBrowserLogs: (level?: 'info' | 'warn' | 'error' | 'debug') => Promise<Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'debug';
    source: string;
    message: string;
    details?: any;
  }>>;
  
  killBrowserProcess: (pid: number) => Promise<{ success: boolean; message: string }>;
  
  startBrowserMonitoring: () => Promise<{ success: boolean; message: string }>;
  stopBrowserMonitoring: () => Promise<{ success: boolean; message: string }>;
  
  onBrowserStatusChange: (callback: (status: {
    isRunning: boolean;
    processCount: number;
    memoryUsage: number;
    timestamp: Date;
    framework: string;
    engine: string;
    version: string;
  }) => void) => () => void;
  
  onBrowserLog: (callback: (log: {
    timestamp: Date;
    level: string;
    source: string;
    message: string;
  }) => void) => () => void;
}

// 暴露API到渲染进程
const electronAPI: ElectronAPI = {
  readEnvConfig: () => ipcRenderer.invoke('read-env-config'),
  saveEnvConfig: (content: string) => ipcRenderer.invoke('save-env-config', content),
  
  executeCommand: (command: string, envVars?: Record<string, string>) => 
    ipcRenderer.invoke('execute-command', command, envVars),
  killCommand: (processId: string) => ipcRenderer.invoke('stop-command', processId),
  getRunningProcesses: () => ipcRenderer.invoke('get-running-commands'),
  
  onCommandOutput: (callback) => {
    ipcRenderer.on('command-output', (event: any, data: any) => callback(data));
  },
  onCommandFinished: (callback) => {
    ipcRenderer.on('command-finished', (event: any, data: any) => callback(data));
  },
  onCommandError: (callback) => {
    ipcRenderer.on('command-error', (event: any, data: any) => callback(data));
  },
  onCommandStopped: (callback) => {
    ipcRenderer.on('command-stopped', (event: any, data: any) => callback(data));
  },
  onCommandStarted: (callback) => {
    ipcRenderer.on('command-started', (event: any, data: any) => callback(data));
  },
  
  stopCommand: (processId: string) => {
    return ipcRenderer.invoke('stop-command', processId);
  },
  stopAllCommands: () => {
    return ipcRenderer.invoke('stop-all-commands');
  },
  
  // 文件系统操作
  readDirectory: (path: string) => ipcRenderer.invoke('fs:readDirectory', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  readFileBase64: (path: string) => ipcRenderer.invoke('fs:readFileBase64', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  deleteFileOrFolder: (path: string) => ipcRenderer.invoke('fs:delete', path),
  createDirectory: (path: string) => ipcRenderer.invoke('fs:createDirectory', path),
  
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', key, value),
  
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getDetailedSystemInfo: () => ipcRenderer.invoke('get-detailed-system-info'),
  checkEnvHealth: () => ipcRenderer.invoke('check-env-health'),
  
  // BrowserView API管理实现
  createApiView: (url: string, bounds: { x: number, y: number, width: number, height: number }) => 
    ipcRenderer.invoke('api-view:create', url, bounds),
  destroyApiView: () => ipcRenderer.invoke('api-view:destroy'),
  setApiViewBounds: (bounds: { x: number, y: number, width: number, height: number }) => 
    ipcRenderer.invoke('api-view:setBounds', bounds),
  reloadApiView: () => ipcRenderer.invoke('api-view:reload'),
  loadApiViewURL: (url: string) => ipcRenderer.invoke('api-view:loadURL', url),
  onApiViewLoaded: (callback: () => void) => {
    ipcRenderer.on('api-view:loaded', (_: any) => callback());
  },
  onApiViewError: (callback: (error: { errorCode: number, errorDescription: string }) => void) => {
    ipcRenderer.on('api-view:error', (_: any, error: any) => callback(error));
  },
  removeApiViewListeners: () => {
    ipcRenderer.removeAllListeners('api-view:loaded');
    ipcRenderer.removeAllListeners('api-view:error');
  },
  
  // 浏览器监控API实现
  getBrowserStatus: () => ipcRenderer.invoke('browser:getStatus'),
  getBrowserMetrics: () => ipcRenderer.invoke('browser:getMetrics'),
  getBrowserLogs: (level?: 'info' | 'warn' | 'error' | 'debug') => 
    ipcRenderer.invoke('browser:getLogs', level),
  killBrowserProcess: (pid: number) => ipcRenderer.invoke('browser:killProcess', pid),
  startBrowserMonitoring: () => ipcRenderer.invoke('browser:startMonitoring'),
  stopBrowserMonitoring: () => ipcRenderer.invoke('browser:stopMonitoring'),
  
  onBrowserStatusChange: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('browser:statusChange', handler);
    return () => ipcRenderer.removeListener('browser:statusChange', handler);
  },
  onBrowserLog: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('browser:log', handler);
    return () => ipcRenderer.removeListener('browser:log', handler);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型声明
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
