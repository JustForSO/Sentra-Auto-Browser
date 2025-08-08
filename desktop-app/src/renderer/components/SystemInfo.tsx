import React, { useState, useEffect } from 'react';
import '../styles/SystemInfo.css';

interface SystemInfoProps {
  systemInfo: {
    version?: string;
    platform?: string;
    arch?: string;
    nodeVersion?: string;
    electronVersion?: string;
  } | null;
}

interface DetailedSystemInfo {
  basic: {
    platform: string;
    arch: string;
    hostname: string;
    type: string;
    release: string;
    version: string;
    uptime: number;
    userInfo: any;
  };
  cpu: {
    model: string;
    cores: number;
    speed: number;
    details: any[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    processMemory: any;
  };
  network: any;
  process: {
    pid: number;
    version: string;
    versions: any;
    platform: string;
    arch: string;
    execPath: string;
    env: any;
  };
  windows?: {
    version?: string;
    detailed?: any;
    gpu?: any[];
    motherboard?: any;
    disks?: any[];
    error?: string;
  };
}

const SystemInfo: React.FC<SystemInfoProps> = ({ systemInfo }) => {
  const [detailedInfo, setDetailedInfo] = useState<DetailedSystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (window.electronAPI?.getDetailedSystemInfo) {
        const data = await window.electronAPI.getDetailedSystemInfo();
        if (data.error) {
          setError(data.error);
        } else {
          setDetailedInfo(data);
        }
      } else if (window.electronAPI?.getSystemInfo) {
        // 如果详细API不可用，尝试使用基本API
        const basicData = await window.electronAPI.getSystemInfo();
        const fallbackData: DetailedSystemInfo = {
          basic: {
            platform: basicData.platform || 'unknown',
            arch: basicData.arch || 'unknown',
            hostname: 'localhost',
            type: basicData.platform || 'unknown',
            release: 'unknown',
            version: 'unknown',
            uptime: basicData.uptime || 0,
            userInfo: { username: 'user' }
          },
          cpu: {
            model: 'Unknown CPU',
            cores: 1,
            speed: 0,
            details: []
          },
          memory: {
            total: 0,
            free: 0,
            used: 0,
            processMemory: basicData.memoryUsage || {}
          },
          network: {},
          process: {
            pid: 0,
            version: basicData.nodeVersion || 'unknown',
            versions: {
              electron: basicData.electronVersion || 'unknown',
              chrome: 'unknown',
              v8: 'unknown'
            },
            platform: basicData.platform || 'unknown',
            arch: basicData.arch || 'unknown',
            execPath: 'unknown',
            env: {}
          }
        };
        setDetailedInfo(fallbackData);
        setError('使用基本系统信息（详细API不可用）');
      } else {
        setError('系统信息API不可用');
      }
    } catch (err: any) {
      console.error('加载系统信息失败:', err);
      setError(err.message || '加载系统信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化字节数
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化运行时间
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}天 ${hours}小时 ${minutes}分钟`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分钟`;
  };

  // 获取网络接口信息
  const getNetworkInfo = () => {
    if (!detailedInfo?.network) return [];

    return Object.entries(detailedInfo.network)
      .filter(([name, interfaces]: [string, any]) =>
        interfaces && interfaces.length > 0 && !name.includes('Loopback')
      )
      .map(([name, interfaces]: [string, any]) => ({
        name,
        addresses: interfaces
          .filter((iface: any) => !iface.internal)
          .map((iface: any) => `${iface.address} (${iface.family})`)
      }));
  };

  // 获取磁盘使用率颜色类
  const getDiskUsageClass = (usagePercent: number): string => {
    if (usagePercent >= 90) return 'usage-critical';
    if (usagePercent >= 75) return 'usage-high';
    if (usagePercent >= 50) return 'usage-medium';
    return 'usage-low';
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <div className="loading-text">正在加载系统信息...</div>
      </div>
    );
  }

  if (error && !detailedInfo) {
    return (
      <div className="error-message">
        <div className="error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <div className="error-text">{error}</div>
        <button className="retry-button" onClick={loadSystemData}>
          重新加载
        </button>
      </div>
    );
  }

  if (!detailedInfo) {
    return (
      <div className="error-message">
        <div className="error-text">无法获取系统信息</div>
        <button className="retry-button" onClick={loadSystemData}>
          重新加载
        </button>
      </div>
    );
  }

  const networkInfo = getNetworkInfo();

  return (
    <div className="system-info-container">
      {/* 标题区域 */}
      <div className="system-header">
        <h1 className="system-title">系统信息</h1>
        <p className="system-subtitle">
          查看有关计算机的基本信息
          {error && (
            <span style={{ color: '#d73a49', marginLeft: '16px' }}>
              ⚠️ {error}
            </span>
          )}
        </p>
      </div>

      {/* 主要内容区域 */}
      <div className="system-content">

        {/* Windows 版本信息 */}
        <div className="info-group">
          <div className="info-group-header">Windows 版本</div>
          <div className="info-group-content">
            <div className="info-item">
              <div className="info-label">版本:</div>
              <div className="info-value">
                {detailedInfo.windows?.detailed?.osName || detailedInfo.basic.type}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">版本号:</div>
              <div className="info-value">
                {detailedInfo.windows?.detailed?.osVersion || detailedInfo.basic.version}
                {detailedInfo.windows?.detailed?.osBuild && ` (内部版本 ${detailedInfo.windows.detailed.osBuild})`}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">系统类型:</div>
              <div className="info-value">
                {detailedInfo.basic.arch === 'x64' ? '64 位操作系统，基于 x64 的处理器' : detailedInfo.basic.arch}
              </div>
            </div>
          </div>
        </div>

        {/* 计算机信息 */}
        <div className="info-group">
          <div className="info-group-header">计算机</div>
          <div className="info-group-content">
            <div className="info-item">
              <div className="info-label">计算机名:</div>
              <div className="info-value">{detailedInfo.basic.hostname}</div>
            </div>
            <div className="info-item">
              <div className="info-label">处理器:</div>
              <div className="info-value">
                {detailedInfo.windows?.detailed?.processor || detailedInfo.cpu.model}
              </div>
            </div>
            {detailedInfo.windows?.detailed?.processorCores && (
              <>
                <div className="info-item">
                  <div className="info-label">处理器核心数:</div>
                  <div className="info-value">{detailedInfo.windows.detailed.processorCores} 个核心</div>
                </div>
                <div className="info-item">
                  <div className="info-label">逻辑处理器:</div>
                  <div className="info-value">{detailedInfo.windows.detailed.processorThreads} 个</div>
                </div>
                <div className="info-item">
                  <div className="info-label">处理器频率:</div>
                  <div className="info-value">{detailedInfo.windows.detailed.processorSpeed} MHz</div>
                </div>
              </>
            )}
            <div className="info-item">
              <div className="info-label">安装的内存 (RAM):</div>
              <div className="info-value">{formatBytes(detailedInfo.memory.total)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">系统制造商:</div>
              <div className="info-value">{detailedInfo.windows?.detailed?.systemManufacturer || '未知'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">系统型号:</div>
              <div className="info-value">{detailedInfo.windows?.detailed?.systemModel || '未知'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">BIOS 版本:</div>
              <div className="info-value">{detailedInfo.windows?.detailed?.biosVersion || '未知'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">系统运行时间:</div>
              <div className="info-value">{formatUptime(detailedInfo.basic.uptime)}</div>
            </div>
          </div>
        </div>

        {/* 内存使用情况 */}
        <div className="memory-info">
          <div className="memory-header">物理内存使用情况</div>
          <div className="memory-content">
            <div className="memory-details">
              <div className="memory-item">
                <div className="memory-label">总计:</div>
                <div className="memory-value">{formatBytes(detailedInfo.memory.total)}</div>
              </div>
              <div className="memory-item">
                <div className="memory-label">已用:</div>
                <div className="memory-value">{formatBytes(detailedInfo.memory.used)}</div>
              </div>
              <div className="memory-item">
                <div className="memory-label">可用:</div>
                <div className="memory-value">{formatBytes(detailedInfo.memory.free)}</div>
              </div>
              <div className="memory-item">
                <div className="memory-label">使用率:</div>
                <div className="memory-value">{((detailedInfo.memory.used / detailedInfo.memory.total) * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div className="memory-bar">
              <div
                className="memory-segment memory-used"
                style={{ width: `${(detailedInfo.memory.used / detailedInfo.memory.total) * 100}%` }}
              >
                {((detailedInfo.memory.used / detailedInfo.memory.total) * 100) > 20 ? '已用' : ''}
              </div>
              <div
                className="memory-segment memory-free"
                style={{ width: `${(detailedInfo.memory.free / detailedInfo.memory.total) * 100}%` }}
              >
                {((detailedInfo.memory.free / detailedInfo.memory.total) * 100) > 20 ? '可用' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* 网络适配器信息 */}
        {networkInfo.length > 0 && (
          <div className="info-group">
            <div className="info-group-header">网络适配器</div>
            <div className="info-group-content">
              {networkInfo.map((network, index) => (
                <div key={index} className="info-item">
                  <div className="info-label">{network.name}:</div>
                  <div className="info-value">
                    {network.addresses.map((addr: string, i: number) => (
                      <div key={i}>{addr}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Windows特定信息 */}
        {detailedInfo.windows && !detailedInfo.windows.error && (
          <>
            {/* 显卡信息 */}
            {detailedInfo.windows.gpu && detailedInfo.windows.gpu.length > 0 && (
              <div className="info-group">
                <div className="info-group-header">显示适配器</div>
                <div className="info-group-content">
                  {detailedInfo.windows.gpu.map((gpu, index) => (
                    <div key={index} style={{ marginBottom: '12px' }}>
                      <div className="info-item">
                        <div className="info-label">显示适配器 {index + 1}:</div>
                        <div className="info-value">{gpu.name}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">显存:</div>
                        <div className="info-value">{gpu.memory}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">驱动版本:</div>
                        <div className="info-value">{gpu.driverVersion}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 主板信息 */}
            {detailedInfo.windows.motherboard && (
              <div className="info-group">
                <div className="info-group-header">主板</div>
                <div className="info-group-content">
                  <div className="info-item">
                    <div className="info-label">制造商:</div>
                    <div className="info-value">{detailedInfo.windows.motherboard.manufacturer}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">型号:</div>
                    <div className="info-value">{detailedInfo.windows.motherboard.product}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">版本:</div>
                    <div className="info-value">{detailedInfo.windows.motherboard.version}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 磁盘信息 */}
            {detailedInfo.windows.disks && detailedInfo.windows.disks.length > 0 && (
              <>
                {detailedInfo.windows.disks.map((disk, index) => (
                  <div key={index} className="disk-info">
                    <div className="disk-header">
                      <div className="disk-name">本地磁盘 ({disk.caption})</div>
                      <div className="disk-filesystem">{disk.filesystem}</div>
                    </div>
                    <div className="disk-content">
                      <div className="disk-details">
                        <div className="disk-item">
                          <div className="disk-label">总计:</div>
                          <div className="disk-value">{formatBytes(disk.size)}</div>
                        </div>
                        <div className="disk-item">
                          <div className="disk-label">已用:</div>
                          <div className="disk-value">{formatBytes(disk.size - disk.freeSpace)}</div>
                        </div>
                        <div className="disk-item">
                          <div className="disk-label">可用:</div>
                          <div className="disk-value">{formatBytes(disk.freeSpace)}</div>
                        </div>
                        <div className="disk-item">
                          <div className="disk-label">使用率:</div>
                          <div className="disk-value">{(((disk.size - disk.freeSpace) / disk.size) * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="disk-bar">
                        <div
                          className={`disk-used ${getDiskUsageClass(((disk.size - disk.freeSpace) / disk.size) * 100)}`}
                          style={{ width: `${((disk.size - disk.freeSpace) / disk.size) * 100}%` }}
                        ></div>
                        <div
                          className="disk-free"
                          style={{ width: `${(disk.freeSpace / disk.size) * 100}%` }}
                        ></div>
                      </div>
                      <div className="disk-usage-text">
                        磁盘健康状态: {((disk.size - disk.freeSpace) / disk.size) * 100 < 75 ? '良好' :
                                     ((disk.size - disk.freeSpace) / disk.size) * 100 < 90 ? '注意' : '警告'}
                        {((disk.size - disk.freeSpace) / disk.size) * 100 >= 90 && (
                          <span className="disk-warning">⚠️ 磁盘空间不足</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* 运行时信息 */}
        <div className="info-group">
          <div className="info-group-header">运行时信息</div>
          <div className="info-group-content">
            <div className="info-item">
              <div className="info-label">进程 ID:</div>
              <div className="info-value">{detailedInfo.process.pid}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Node.js 版本:</div>
              <div className="info-value">{detailedInfo.process.version}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Electron 版本:</div>
              <div className="info-value">{detailedInfo.process.versions.electron}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Chrome 版本:</div>
              <div className="info-value">{detailedInfo.process.versions.chrome}</div>
            </div>
            <div className="info-item">
              <div className="info-label">V8 引擎版本:</div>
              <div className="info-value">{detailedInfo.process.versions.v8}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 刷新按钮 */}
      <button className="refresh-button" onClick={loadSystemData} title="刷新系统信息">
        ↻
      </button>
    </div>
  );
};

export default SystemInfo;
