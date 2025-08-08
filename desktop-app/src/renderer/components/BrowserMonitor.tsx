import React, { useState, useEffect, useRef } from 'react';
import AppContainer from './AppContainer';

// 类型定义
interface BrowserProcess {
  pid: number;
  name: string;
  type: 'browser' | 'renderer' | 'gpu' | 'utility';
  memoryUsage: number;
  cpuUsage: number;
  startTime: Date;
}

interface BrowserStatus {
  isRunning: boolean;
  processes: BrowserProcess[];
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
}

interface BrowserMetrics {
  totalMemory: number;
  totalCpu: number;
  processCount: number;
  rendererCount: number;
  gpuCount: number;
}

interface BrowserLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  details?: any;
}

const BrowserMonitor: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus>({
    isRunning: false,
    processes: [],
    framework: 'Unknown',
    engine: 'Unknown',
    version: 'Unknown',
    userDataDir: '',
    extensions: []
  });
  const [browserMetrics, setBrowserMetrics] = useState<BrowserMetrics>({
    totalMemory: 0,
    totalCpu: 0,
    processCount: 0,
    rendererCount: 0,
    gpuCount: 0
  });
  const [browserLogs, setBrowserLogs] = useState<BrowserLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } else if (type === 'error') {
      setError(message);
      setSuccess('');
      setTimeout(() => setError(''), 5000);
    }
  };

  // 加载浏览器状态
  const loadBrowserStatus = async () => {
    try {
      setIsLoading(true);
      if (window.electronAPI?.getBrowserStatus) {
        const status = await window.electronAPI.getBrowserStatus();
        if (status.error) {
          showNotification(status.error, 'error');
          setBrowserStatus(prev => ({ ...prev, isRunning: false, processes: [] }));
          // 清空指标数据
          setBrowserMetrics({
            totalMemory: 0,
            totalCpu: 0,
            processCount: 0,
            rendererCount: 0,
            gpuCount: 0
          });
        } else {
          setBrowserStatus(status);
          // 更新指标数据
          updateBrowserMetrics(status);
        }
      }
    } catch (err: any) {
      console.error('获取浏览器状态失败:', err);
      showNotification('获取浏览器状态失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 从浏览器状态中提取指标数据
  const updateBrowserMetrics = (status: BrowserStatus) => {
    const totalMemory = status.processes.reduce((sum, p) => sum + (p.memoryUsage || 0), 0);
    const totalCpu = status.processes.reduce((sum, p) => sum + (p.cpuUsage || 0), 0);
    const processCount = status.processes.length;
    const rendererCount = status.processes.filter(p => p.type === 'renderer').length;
    const gpuCount = status.processes.filter(p => p.type === 'gpu').length;
    
    setBrowserMetrics({
      totalMemory,
      totalCpu: Math.round(totalCpu * 100) / 100,
      processCount,
      rendererCount,
      gpuCount
    });
  };

  // 加载浏览器日志
  const loadBrowserLogs = async (level?: string) => {
    try {
      if (window.electronAPI?.getBrowserLogs) {
        const logs = await window.electronAPI.getBrowserLogs(
          level && level !== 'all' ? level as any : undefined
        );
        setBrowserLogs(logs);
      }
    } catch (err: any) {
      console.error('获取浏览器日志失败:', err);
    }
  };

  // 终止浏览器进程
  const killBrowserProcess = async (pid: number) => {
    try {
      if (window.electronAPI?.killBrowserProcess) {
        const result = await window.electronAPI.killBrowserProcess(pid);
        if (result.success) {
          showNotification(result.message, 'success');
          await loadBrowserStatus();
        } else {
          showNotification(result.message, 'error');
        }
      }
    } catch (err: any) {
      console.error('终止进程失败:', err);
      showNotification('终止进程失败', 'error');
    }
  };

  // 开始监控
  const startMonitoring = async () => {
    try {
      if (window.electronAPI?.startBrowserMonitoring) {
        const result = await window.electronAPI.startBrowserMonitoring();
        if (result.success) {
          setIsMonitoring(true);
          showNotification('浏览器监控已启动', 'success');
        } else {
          showNotification(result.message, 'error');
        }
      }
    } catch (err: any) {
      console.error('启动监控失败:', err);
      showNotification('启动监控失败', 'error');
    }
  };

  // 停止监控
  const stopMonitoring = async () => {
    try {
      if (window.electronAPI?.stopBrowserMonitoring) {
        const result = await window.electronAPI.stopBrowserMonitoring();
        if (result.success) {
          setIsMonitoring(false);
          showNotification('浏览器监控已停止', 'success');
        } else {
          showNotification(result.message, 'error');
        }
      }
    } catch (err: any) {
      console.error('停止监控失败:', err);
      showNotification('停止监控失败', 'error');
    }
  };

  // 刷新所有数据
  const refreshAll = async () => {
    await Promise.all([
      loadBrowserStatus(), // 这个函数已经包含了更新指标数据
      loadBrowserLogs(selectedLogLevel)
    ]);
  };

  // 格式化字节数
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 获取进程类型图标
  const getProcessTypeIcon = (type: string) => {
    switch (type) {
      case 'browser': return 'fas fa-globe';
      case 'renderer': return 'fas fa-window-maximize';
      case 'gpu': return 'fas fa-microchip';
      case 'utility': return 'fas fa-cogs';
      default: return 'fas fa-question-circle';
    }
  };

  // 获取日志级别颜色
  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#ff4757';
      case 'warn': return '#ffa502';
      case 'info': return '#3742fa';
      case 'debug': return '#747d8c';
      default: return '#2f3542';
    }
  };

  // 组件挂载时初始化
  useEffect(() => {
    refreshAll();

    // 设置事件监听器
    const statusCleanup = window.electronAPI?.onBrowserStatusChange?.((status) => {
      setBrowserStatus(prev => ({
        ...prev,
        isRunning: status.isRunning,
        processes: prev.processes,
        framework: status.framework || prev.framework,
        engine: status.engine || prev.engine,
        version: status.version || prev.version,
      }));
    });

    const logCleanup = window.electronAPI?.onBrowserLog?.((log) => {
      setBrowserLogs(prev => [log as BrowserLog, ...prev.slice(0, 99)]);
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      statusCleanup?.();
      logCleanup?.();
    };
  }, []);

  // 自动刷新数据（优化版）
  useEffect(() => {
    if (isMonitoring) {
      const refreshData = () => {
        // 检查应用是否可见
        if (document.hidden || !document.hasFocus()) {
          console.log('应用不可见，跳过刷新');
          return;
        }
        
        loadBrowserStatus();
        loadBrowserLogs(selectedLogLevel);
      };
      
      // 立即刷新一次
      refreshData();
      
      // 设置30秒间隔刷新
      const interval = setInterval(refreshData, 30000);
      
      // 监听窗口可见性变化
      const handleVisibilityChange = () => {
        if (!document.hidden && document.hasFocus()) {
          console.log('应用变为可见，立即刷新');
          refreshData();
        }
      };
      
      const handleFocus = () => {
        console.log('应用获得焦点，立即刷新');
        refreshData();
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [isMonitoring, selectedLogLevel]);



  // 日志级别变化时重新加载
  useEffect(() => {
    loadBrowserLogs(selectedLogLevel);
  }, [selectedLogLevel]);

  return (
    <AppContainer 
      appId="browser-monitor"
      title="Sentra Auto Browser 监控"
      icon="fas fa-desktop"
      color="#0078d4"
    >
      <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 通知区域 */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#16a34a',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        {/* 控制栏 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: browserStatus.isRunning ? '#dcfce7' : '#fee2e2',
              borderRadius: '8px',
              border: `1px solid ${browserStatus.isRunning ? '#bbf7d0' : '#fecaca'}`
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: browserStatus.isRunning ? '#16a34a' : '#dc2626'
              }}></div>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: browserStatus.isRunning ? '#16a34a' : '#dc2626'
              }}>
                {browserStatus.isRunning ? '浏览器运行中' : '浏览器未运行'}
              </span>
            </div>

            <div style={{ fontSize: '14px', color: '#64748b' }}>
              框架: <strong>{browserStatus.framework}</strong> | 
              引擎: <strong>{browserStatus.engine}</strong> | 
              版本: <strong>{browserStatus.version}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ margin: 0 }}
              />
              自动刷新
            </label>

            <button
              onClick={refreshAll}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
              刷新
            </button>

            {isMonitoring ? (
              <button
                onClick={stopMonitoring}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-stop"></i>
                停止监控
              </button>
            ) : (
              <button
                onClick={startMonitoring}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-play"></i>
                开始监控
              </button>
            )}
          </div>
        </div>

        {/* 标签页导航 */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          {[
            { id: 'overview', name: '概览', icon: 'fas fa-tachometer-alt' },
            { id: 'processes', name: '进程', icon: 'fas fa-list' },
            { id: 'performance', name: '性能', icon: 'fas fa-chart-line' },
            { id: 'logs', name: '日志', icon: 'fas fa-file-alt' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={tab.icon}></i>
              {tab.name}
            </button>
          ))}
        </div>

        {/* 标签页内容 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* 基本信息卡片 */}
              <div style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                  基本信息
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>运行状态:</span>
                    <span style={{ 
                      fontWeight: '600',
                      color: browserStatus.isRunning ? '#16a34a' : '#dc2626'
                    }}>
                      {browserStatus.isRunning ? '运行中' : '未运行'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>浏览器框架:</span>
                    <span style={{ fontWeight: '600' }}>{browserStatus.framework}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>渲染引擎:</span>
                    <span style={{ fontWeight: '600' }}>{browserStatus.engine}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>版本:</span>
                    <span style={{ fontWeight: '600' }}>{browserStatus.version}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>调试端口:</span>
                    <span style={{ fontWeight: '600' }}>{browserStatus.debugPort || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>进程数量:</span>
                    <span style={{ fontWeight: '600' }}>{browserStatus.processes.length}</span>
                  </div>
                </div>
              </div>

              {/* 性能指标卡片 */}
              <div style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>
                  <i className="fas fa-chart-bar" style={{ marginRight: '8px', color: '#10b981' }}></i>
                  性能指标
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>总内存使用:</span>
                    <span style={{ fontWeight: '600' }}>{browserMetrics.totalMemory} MB</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>CPU使用率:</span>
                    <span style={{ fontWeight: '600' }}>{browserMetrics.totalCpu.toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>进程总数:</span>
                    <span style={{ fontWeight: '600' }}>{browserMetrics.processCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>渲染进程:</span>
                    <span style={{ fontWeight: '600' }}>{browserMetrics.rendererCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>GPU进程:</span>
                    <span style={{ fontWeight: '600' }}>{browserMetrics.gpuCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>浏览器版本:</span>
                    <span style={{ fontWeight: '600' }}>{browserStatus.version}</span>
                  </div>
                </div>
              </div>

              {/* 浏览器信息卡片 */}
              <div style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                  浏览器信息
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>浏览器类型:</span>
                    <span style={{ fontWeight: '600' }}>{browserStatus.framework}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>渲染引擎:</span>
                    <span style={{ fontWeight: '600' }}>{browserStatus.engine}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>运行状态:</span>
                    <span style={{ fontWeight: '600', color: browserStatus.isRunning ? '#10b981' : '#ef4444' }}>
                      {browserStatus.isRunning ? '正在运行' : '未运行'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>调试端口:</span>
                    <span style={{ fontWeight: '600' }}>{browserStatus.debugPort || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'processes' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                  <i className="fas fa-list" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                  浏览器进程列表 ({browserStatus.processes.length})
                </h3>
              </div>
              
              {browserStatus.processes.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#64748b'
                }}>
                  <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                  <p style={{ margin: 0, fontSize: '16px' }}>未检测到浏览器进程</p>
                </div>
              ) : (
                <div style={{ overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>PID</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>进程名</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>类型</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>内存</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>CPU</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>启动时间</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {browserStatus.processes.map((process, index) => (
                        <tr key={process.pid} style={{ 
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                        }}>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'monospace' }}>
                            {process.pid}
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className={getProcessTypeIcon(process.type)} style={{ color: '#64748b' }}></i>
                              <span style={{ 
                                maxWidth: '200px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {process.name}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: process.type === 'browser' ? '#dbeafe' : 
                                             process.type === 'renderer' ? '#dcfce7' : 
                                             process.type === 'gpu' ? '#fef3c7' : '#f3f4f6',
                              color: process.type === 'browser' ? '#1d4ed8' : 
                                     process.type === 'renderer' ? '#16a34a' : 
                                     process.type === 'gpu' ? '#d97706' : '#6b7280'
                            }}>
                              {process.type.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'monospace' }}>
                            {process.memoryUsage} MB
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontFamily: 'monospace' }}>
                            {process.cpuUsage.toFixed(1)}%
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                            {new Date(process.startTime).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                            <button
                              onClick={() => killBrowserProcess(process.pid)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="终止进程"
                            >
                              <i className="fas fa-times"></i>
                              终止
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
              {/* 内存使用图表 */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>
                  <i className="fas fa-memory" style={{ marginRight: '8px', color: '#10b981' }}></i>
                  内存使用情况
                </h3>
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
                      {browserMetrics.totalMemory}
                    </div>
                    <div style={{ fontSize: '18px', color: '#64748b' }}>MB</div>
                    <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>总内存使用</div>
                  </div>
                </div>
                
                {/* 进程内存分布 */}
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b' }}>进程内存分布</h4>
                  {browserStatus.processes.slice(0, 5).map((process, index) => (
                    <div key={process.pid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className={getProcessTypeIcon(process.type)} style={{ color: '#64748b', fontSize: '12px' }}></i>
                        <span style={{ fontSize: '14px', color: '#374151' }}>PID {process.pid}</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{process.memoryUsage} MB</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CPU使用图表 */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>
                  <i className="fas fa-microchip" style={{ marginRight: '8px', color: '#f59e0b' }}></i>
                  CPU使用情况
                </h3>
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
                      {browserMetrics.totalCpu.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '18px', color: '#64748b' }}>%</div>
                    <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>CPU使用率</div>
                  </div>
                </div>
                
                {/* 进程统计 */}
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b' }}>进程统计</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#64748b' }}>进程总数:</span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{browserMetrics.processCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#64748b' }}>渲染进程:</span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{browserMetrics.rendererCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#64748b' }}>GPU进程:</span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{browserMetrics.gpuCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#64748b' }}>工具进程:</span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{browserMetrics.processCount - browserMetrics.rendererCount - browserMetrics.gpuCount - 1}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '14px', color: '#64748b' }}>平均CPU:</span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{browserMetrics.processCount > 0 ? (browserMetrics.totalCpu / browserMetrics.processCount).toFixed(1) : '0'}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                  <i className="fas fa-file-alt" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                  浏览器日志 ({browserLogs.length})
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    value={selectedLogLevel}
                    onChange={(e) => setSelectedLogLevel(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="all">所有级别</option>
                    <option value="debug">调试</option>
                    <option value="info">信息</option>
                    <option value="warn">警告</option>
                    <option value="error">错误</option>
                  </select>
                  
                  <button
                    onClick={() => setBrowserLogs([])}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-trash"></i>
                    清空日志
                  </button>
                </div>
              </div>
              
              <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                {browserLogs.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b'
                  }}>
                    <i className="fas fa-file-alt" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                    <p style={{ margin: 0, fontSize: '16px' }}>暂无日志记录</p>
                  </div>
                ) : (
                  <div>
                    {browserLogs.map((log, index) => (
                      <div key={index} style={{
                        padding: '12px 20px',
                        borderBottom: index < browserLogs.length - 1 ? '1px solid #f1f5f9' : 'none',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getLogLevelColor(log.level),
                          marginTop: '6px',
                          flexShrink: 0
                        }}></div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: getLogLevelColor(log.level),
                              textTransform: 'uppercase'
                            }}>
                              {log.level}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {log.source}
                            </span>
                            <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto' }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          
                          <div style={{
                            fontSize: '14px',
                            color: '#1e293b',
                            lineHeight: '1.5',
                            wordBreak: 'break-word'
                          }}>
                            {log.message}
                          </div>
                          
                          {log.details && (
                            <div style={{
                              marginTop: '8px',
                              padding: '8px 12px',
                              backgroundColor: '#f8fafc',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#64748b',
                              fontFamily: 'monospace',
                              overflow: 'auto'
                            }}>
                              {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppContainer>
  );
};

export default BrowserMonitor;
