import React, { useState, useEffect, useRef } from 'react';
import '../styles/windows-desktop.css';

// 应用窗口类型定义
interface AppWindow {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  isOpen: boolean;
  isMaximized: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

// 桌面图标定义
interface DesktopIcon {
  id: string;
  name: string;
  icon: string;
  color?: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

// 导入现有组件

import WorkflowStudio from './WorkflowStudio';
import SystemInfo from './SystemInfo';
import WallpaperManager from './WallpaperManager';
import StartMenu from './StartMenu';
import WindowsFileManager from './WindowsFileManager';
import NotificationCenter from './NotificationCenter';
import BrowserMonitor from './BrowserMonitor';
import SentraHelpApp from './SentraHelpApp';
import ApiSettings from './ApiSettings';
import PluginManager from './PluginManager';
import PortManager from './PortManager';

const TASKBAR_HEIGHT = 40; // centralised taskbar height, keep in sync with CSS

const WindowsDesktop: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const [dragWindow, setDragWindow] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [nextZIndex, setNextZIndex] = useState(1000);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, show: boolean}>({
    x: 0, y: 0, show: false
  });
  const [wallpaper, setWallpaper] = useState(() => {
    // 从localStorage加载保存的壁纸
    const savedWallpaper = localStorage.getItem('sentra-desktop-wallpaper');
    return savedWallpaper || 'linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #6c5ce7 100%)';
  });
  const [resizing, setResizing] = useState<{windowId: string, direction: string} | null>(null);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [wifiPanelOpen, setWifiPanelOpen] = useState(false);
  const [volumePanelOpen, setVolumePanelOpen] = useState(false);
  const [batteryPanelOpen, setBatteryPanelOpen] = useState(false);
  const [calendarPanelOpen, setCalendarPanelOpen] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(75);
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});

  // 壁纸变更处理函数
  const handleWallpaperChange = (newWallpaper: string) => {
    setWallpaper(newWallpaper);
    // 保存到localStorage
    localStorage.setItem('sentra-desktop-wallpaper', newWallpaper);
  };

  // 桌面图标配置
  const desktopIcons: DesktopIcon[] = [
    {
      id: 'browser-monitor',
      name: '浏览器监控',
      icon: 'fab fa-chrome',
      color: '#00b894',
      component: BrowserMonitor
    },
    {
      id: 'workflow',
      name: '智能工作流',
      icon: 'fas fa-project-diagram',
      color: '#107c10',
      component: WorkflowStudio
    },
    {
      id: 'system',
      name: '系统信息',
      icon: 'fas fa-info-circle',
      color: '#ff8c00',
      component: SystemInfo
    },
    {
      id: 'port-manager',
      name: '端口管理器',
      icon: 'fas fa-plug',
      color: '#1f883d',
      component: PortManager
    },
    {
      id: 'plugins',
      name: '插件管理',
      icon: 'fas fa-puzzle-piece',
      color: '#6c5ce7',
      component: PluginManager
    },
    {
      id: 'personalization',
      name: '个性化',
      icon: 'fas fa-palette',
      color: '#fd79a8',
      component: WallpaperManager,
      props: {
        onWallpaperChange: handleWallpaperChange,
        onClose: () => closeApp('personalization')
      }
    },
    {
      id: 'api-settings',
      name: 'API 设置',
      icon: 'fas fa-cog',
      color: '#74b9ff',
      component: ApiSettings
    },
    {
      id: 'help',
      name: 'Sentra 帮助文档',
      icon: 'fas fa-question-circle',
      color: '#0078d4',
      component: SentraHelpApp
    },
    {
      id: 'files',
      name: '文件管理器',
      icon: 'fas fa-folder',
      color: '#ff7675',
      component: WindowsFileManager
    }
  ];

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 打开应用
  const openApp = (iconId: string) => {
    const icon = desktopIcons.find(i => i.id === iconId);
    if (!icon) return;

    const existingWindow = windows.find(w => w.id === iconId);
    if (existingWindow) {
      if (existingWindow.isMinimized) {
        setWindows(prev => prev.map(w => 
          w.id === iconId 
            ? { ...w, isMinimized: false, zIndex: nextZIndex }
            : w
        ));
        setNextZIndex(prev => prev + 1);
        setVisibleMap(prev => ({ ...prev, [iconId]: true }));
      } else {
        bringToFront(iconId);
      }
      return;
    }

    const newWindow: AppWindow = {
      id: iconId,
      title: icon.name,
      icon: icon.icon,
      component: icon.component,
      props: { ...(icon.props || {}), visible: true },
      isOpen: true,
      isMaximized: false,
      isMinimized: false,
      position: { 
        x: Math.max(50, (window.innerWidth - 1000) / 2 + (windows.length * 20)), 
        y: Math.max(50, (window.innerHeight - 700) / 2 + (windows.length * 20)) 
      },
      size: { width: 1000, height: 700 },
      zIndex: nextZIndex
    };

    setWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
    setVisibleMap(prev => ({ ...prev, [iconId]: true }));

    // 添加图标启动动画
    const iconElement = document.querySelector(`[data-icon-id="${iconId}"]`);
    if (iconElement) {
      iconElement.classList.add('icon-launching');
      setTimeout(() => {
        iconElement.classList.remove('icon-launching');
      }, 600);
    }
  };

  // 关闭应用
  const closeApp = (windowId: string) => {
    setWindows(prev => prev.filter(w => w.id !== windowId));
    setVisibleMap(prev => ({ ...prev, [windowId]: false }));
  };

  // 最小化应用
  const minimizeApp = (windowId: string) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isMinimized: true } : w
    ));
    setVisibleMap(prev => ({ ...prev, [windowId]: false }));
  };

  // 最大化/还原应用
  const toggleMaximize = (windowId: string) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isMaximized: !w.isMaximized } : w
    ));
  };

  // 置顶窗口
  const bringToFront = (windowId: string) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, zIndex: nextZIndex } : w
    ));
    setNextZIndex(prev => prev + 1);
    setVisibleMap(prev => ({ ...prev, [windowId]: true }));
  };

  // 开始拖拽窗口
  const startDrag = (windowId: string, e: React.MouseEvent) => {
    const window = windows.find(w => w.id === windowId);
    if (!window) return;

    setDragWindow(windowId);
    setDragOffset({
      x: e.clientX - window.position.x,
      y: e.clientY - window.position.y
    });
    bringToFront(windowId);
  };

  // 处理鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragWindow) return;

      setWindows(prev => prev.map(w => 
        w.id === dragWindow 
          ? { 
              ...w, 
              position: { 
                x: Math.max(0, Math.min(window.innerWidth - w.size.width, e.clientX - dragOffset.x)),
                y: Math.max(0, Math.min(window.innerHeight - TASKBAR_HEIGHT - w.size.height, e.clientY - dragOffset.y))
              }
            }
          : w
      ));
    };

    const handleMouseUp = () => {
      setDragWindow(null);
    };

    if (dragWindow) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragWindow, dragOffset]);

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    // 检查是否在文件管理器内部
    const target = e.target as HTMLElement;
    const fileManagerElement = target.closest('.windows-file-manager');
    
    // 如果在文件管理器内部，不显示桌面右键菜单
    if (fileManagerElement) {
      return;
    }
    
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      show: true
    });
  };

  // 处理右键菜单项点击
  const handleContextMenuClick = (action: string) => {
    setContextMenu(prev => ({ ...prev, show: false }));
    
    switch (action) {
      case 'refresh':
        // 刷新桌面 - 提供更友好的体验
        if (confirm('确定要刷新桌面环境吗？\n\n这将重新加载所有组件和设置。')) {
          // 显示刷新动画
          const refreshOverlay = document.createElement('div');
          refreshOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 120, 212, 0.1);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.3s ease-out;
          `;
          refreshOverlay.innerHTML = `
            <div style="text-align: center; color: var(--win-text-primary); font-size: 18px;">
              <i class="fas fa-sync-alt fa-spin" style="font-size: 48px; margin-bottom: 16px; color: var(--win-blue);"></i>
              <div>正在刷新桌面环境...</div>
            </div>
          `;
          document.body.appendChild(refreshOverlay);
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
        break;
      case 'paste':
        // 粘贴功能
        if (navigator.clipboard) {
          navigator.clipboard.readText().then(text => {
            if (text.trim()) {
              alert(`粘贴内容: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
            } else {
              alert('剪贴板为空');
            }
          }).catch(() => {
            alert('无法访问剪贴板内容');
          });
        } else {
          alert('浏览器不支持剪贴板API');
        }
        break;
      case 'personalize':
        // 打开个性化设置
        openApp('personalization');
        break;
      case 'display':
        // 显示设置
        alert('显示设置:\n• 当前分辨率: ' + window.screen.width + 'x' + window.screen.height + '\n• 颜色深度: ' + window.screen.colorDepth + '位\n• 像素比: ' + window.devicePixelRatio + '\n\n更多设置功能正在开发中...');
        break;
      case 'new-folder':
        // 新建文件夹 - 只能在文件管理器中操作
        alert('新建文件夹功能只能在文件管理器中使用。\n\n请打开文件管理器应用，然后右键空白区域选择"新建文件夹"。');
        break;
      case 'new-file':
        // 新建文件 - 只能在文件管理器中操作
        alert('新建文件功能只能在文件管理器中使用。\n\n请打开文件管理器应用，然后右键空白区域选择"新建文件"。');
        break;
      default:
        break;
    }
  };

  // 开始调整窗口大小
  const handleResizeMouseDown = (windowId: string, direction: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing({ windowId, direction });
    bringToFront(windowId);
  };

  // 处理窗口调整大小
  useEffect(() => {
    const handleResizeMouseMove = (e: MouseEvent) => {
      if (!resizing) return;

      setWindows(prevWindows => prevWindows.map(win => {
        if (win.id === resizing.windowId) {
          let newWidth = win.size.width;
          let newHeight = win.size.height;
          let newX = win.position.x;
          let newY = win.position.y;

          switch (resizing.direction) {
            case 'n':
              newHeight = win.size.height - (e.clientY - win.position.y);
              newY = e.clientY;
              break;
            case 's':
              newHeight = e.clientY - win.position.y;
              break;
            case 'w':
              newWidth = win.size.width - (e.clientX - win.position.x);
              newX = e.clientX;
              break;
            case 'e':
              newWidth = e.clientX - win.position.x;
              break;
            case 'nw':
              newWidth = win.size.width - (e.clientX - win.position.x);
              newX = e.clientX;
              newHeight = win.size.height - (e.clientY - win.position.y);
              newY = e.clientY;
              break;
            case 'ne':
              newWidth = e.clientX - win.position.x;
              newHeight = win.size.height - (e.clientY - win.position.y);
              newY = e.clientY;
              break;
            case 'sw':
              newWidth = win.size.width - (e.clientX - win.position.x);
              newX = e.clientX;
              newHeight = e.clientY - win.position.y;
              break;
            case 'se':
              newWidth = e.clientX - win.position.x;
              newHeight = e.clientY - win.position.y;
              break;
          }

          // 确保最小尺寸
          newWidth = Math.max(newWidth, 400);
          newHeight = Math.max(newHeight, 300);

          return { 
            ...win, 
            size: { width: newWidth, height: newHeight },
            position: { x: newX, y: newY }
          };
        }
        return win;
      }));
    };

    const handleResizeMouseUp = () => {
      setResizing(null);
    };

    if (resizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleResizeMouseUp);
    };
  }, [resizing]);

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(prev => ({ ...prev, show: false }));
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClick);
    }

    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.show]);

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', { 
      month: 'numeric', 
      day: 'numeric' 
    });
  };

  return (
    <div className="windows-desktop" onContextMenu={handleContextMenu}>
      {/* 桌面背景 */}
      <div 
        className="desktop-background"
        style={{ background: wallpaper }}
      ></div>

      {/* 桌面图标 */}
      <div className="desktop-icons">
        {desktopIcons.map((icon) => (
          <div
            key={icon.id}
            className={`desktop-icon ${selectedIcon === icon.id ? 'selected' : ''}`}
            data-icon-id={icon.id}
            onClick={() => setSelectedIcon(icon.id)}
            onDoubleClick={() => openApp(icon.id)}
          >
            <div className="icon-image" style={{ color: icon.color }}>
              <i className={icon.icon}></i>
            </div>
            <div className="icon-label">{icon.name}</div>
          </div>
        ))}
      </div>

      {/* 应用窗口 */}
      {windows.map((window) => (
        <div
          key={window.id}
          className={`app-window ${window.isMaximized ? 'maximized' : ''} ${window.isMinimized ? 'minimized' : ''} window-opening`}
          style={{
            left: window.isMaximized ? 0 : window.position.x,
            top: window.isMaximized ? 0 : window.position.y,
            width: window.isMaximized ? '100vw' : window.size.width,
            height: window.isMaximized ? `calc(100vh - ${TASKBAR_HEIGHT}px)` : window.size.height,
            zIndex: window.zIndex
          }}
        >
          {/* 调整大小句柄 */}
          {!window.isMaximized && (
            <>
              <div className="resize-handle nw" onMouseDown={handleResizeMouseDown(window.id, 'nw')}></div>
              <div className="resize-handle n" onMouseDown={handleResizeMouseDown(window.id, 'n')}></div>
              <div className="resize-handle ne" onMouseDown={handleResizeMouseDown(window.id, 'ne')}></div>
              <div className="resize-handle w" onMouseDown={handleResizeMouseDown(window.id, 'w')}></div>
              <div className="resize-handle e" onMouseDown={handleResizeMouseDown(window.id, 'e')}></div>
              <div className="resize-handle sw" onMouseDown={handleResizeMouseDown(window.id, 'sw')}></div>
              <div className="resize-handle s" onMouseDown={handleResizeMouseDown(window.id, 's')}></div>
              <div className="resize-handle se" onMouseDown={handleResizeMouseDown(window.id, 'se')}></div>
            </>
          )}

          {/* 窗口标题栏 */}
          <div 
            className="window-titlebar"
            onMouseDown={(e) => !window.isMaximized && startDrag(window.id, e)}
            onDoubleClick={() => toggleMaximize(window.id)}
          >
            <div className="window-title">
              <i className={window.icon}></i>
              {window.title}
            </div>
            <div className="window-controls">
              <button 
                className="window-control minimize"
                onClick={() => minimizeApp(window.id)}
                title="最小化"
              >
              </button>
              <button 
                className={`window-control ${window.isMaximized ? 'restore' : 'maximize'}`}
                onClick={() => toggleMaximize(window.id)}
                title={window.isMaximized ? "还原" : "最大化"}
              >
              </button>
              <button 
                className="window-control close"
                onClick={() => closeApp(window.id)}
                title="关闭"
              >
              </button>
            </div>
          </div>

          {/* 窗口内容 */}
          <div className="window-content">
            <window.component
              {...(window.props || {})}
              visible={visibleMap[window.id] !== false && !window.isMinimized && window.isOpen}
            />
          </div>
        </div>
      ))}

      {/* 任务栏 */}
      <div className="taskbar">
        {/* 开始按钮 */}
        <button 
          className="start-button" 
          title="开始"
          onClick={() => setStartMenuOpen(!startMenuOpen)}
        >
          <i className="fab fa-windows"></i>
        </button>

        {/* 任务栏应用 */}
        <div className="taskbar-apps">
          {windows.map((window) => (
            <button
              key={window.id}
              className={`taskbar-app ${!window.isMinimized ? 'active' : ''}`}
              onClick={() => {
                if (window.isMinimized) {
                  setWindows(prev => prev.map(w => 
                    w.id === window.id 
                      ? { ...w, isMinimized: false, zIndex: nextZIndex }
                      : w
                  ));
                  setNextZIndex(prev => prev + 1);
                  // 通过任务栏还原时，确保可见，触发 BrowserView 重建
                  setVisibleMap(prev => ({ ...prev, [window.id]: true }));
                } else {
                  minimizeApp(window.id);
                }
              }}
              title={window.title}
            >
              <i className={window.icon}></i>
            </button>
          ))}
        </div>

        {/* 系统托盘 */}
        <div className="system-tray">
          {/* WiFi 网络状态 */}
          <div className="tray-item-container">
            <button 
              className={`tray-icon ${wifiPanelOpen ? 'active' : ''}`}
              title="网络和Internet设置"
              onClick={() => {
                setWifiPanelOpen(!wifiPanelOpen);
                setVolumePanelOpen(false);
                setBatteryPanelOpen(false);
                setCalendarPanelOpen(false);
              }}
            >
              <i className="fas fa-wifi"></i>
            </button>
            {wifiPanelOpen && (
              <div className="tray-panel wifi-panel">
                <div className="panel-content">
                  <div className="network-list">
                    <div className="network-item connected">
                      <i className="fas fa-wifi"></i>
                      <div className="network-info">
                        <div className="network-name">CMCC-V79V</div>
                        <div className="network-status">已连接，安全</div>
                      </div>
                      <button className="network-btn">断开连接</button>
                    </div>
                    <div className="network-item">
                      <i className="fas fa-wifi"></i>
                      <div className="network-info">
                        <div className="network-name">CMCC-V79V_5G</div>
                      </div>
                    </div>
                    <div className="network-item">
                      <i className="fas fa-wifi"></i>
                      <div className="network-info">
                        <div className="network-name">ZY-206670</div>
                      </div>
                    </div>
                    <div className="network-item">
                      <i className="fas fa-wifi"></i>
                      <div className="network-info">
                        <div className="network-name">HUAWEI-UKVJFU</div>
                      </div>
                    </div>
                    <div className="network-item">
                      <i className="fas fa-wifi"></i>
                      <div className="network-info">
                        <div className="network-name">TP-LINK_9216</div>
                      </div>
                    </div>
                    <div className="network-item">
                      <i className="fas fa-wifi"></i>
                      <div className="network-info">
                        <div className="network-name">隐藏的网络</div>
                      </div>
                    </div>
                  </div>
                  <div className="panel-footer">
                    <div className="quick-actions">
                      <button className="quick-btn">
                        <i className="fas fa-wifi"></i>
                        <span>WLAN</span>
                      </button>
                      <button className="quick-btn">
                        <i className="fas fa-plane"></i>
                        <span>飞行模式</span>
                      </button>
                      <button className="quick-btn">
                        <i className="fas fa-mobile-alt"></i>
                        <span>移动热点</span>
                      </button>
                    </div>
                    <button className="settings-btn">
                      网络和Internet设置
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 音量控制 */}
          <div className="tray-item-container">
            <button 
              className={`tray-icon ${volumePanelOpen ? 'active' : ''}`}
              title="音量混合器"
              onClick={() => {
                setVolumePanelOpen(!volumePanelOpen);
                setWifiPanelOpen(false);
                setBatteryPanelOpen(false);
                setCalendarPanelOpen(false);
              }}
            >
              <i className="fas fa-volume-up"></i>
            </button>
            {volumePanelOpen && (
              <div className="tray-panel volume-panel">
                <div className="panel-content">
                  <div className="volume-header">
                    <span>Q24G4 (NVIDIA High Definition Audio)</span>
                    <span className="volume-number">{currentVolume}</span>
                  </div>
                  <div className="volume-slider-container">
                    <i className="fas fa-volume-down"></i>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={currentVolume} 
                      onChange={(e) => setCurrentVolume(parseInt(e.target.value))}
                      className="main-volume-slider" 
                    />
                    <i className="fas fa-volume-up"></i>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 电池状态 */}
          <div className="tray-item-container">
            <button 
              className={`tray-icon ${batteryPanelOpen ? 'active' : ''}`}
              title="电池设置"
              onClick={() => {
                setBatteryPanelOpen(!batteryPanelOpen);
                setWifiPanelOpen(false);
                setVolumePanelOpen(false);
                setCalendarPanelOpen(false);
              }}
            >
              <i className="fas fa-battery-three-quarters"></i>
              <span className="battery-percentage">85%</span>
            </button>
            {batteryPanelOpen && (
              <div className="tray-panel battery-panel">
                <div className="panel-content">
                  <div className="battery-header">
                    <div className="battery-visual">
                      <div className="battery-icon-container">
                        <div className="battery-outline">
                          <div className="battery-fill" style={{width: '100%'}}></div>
                        </div>
                        <div className="battery-tip"></div>
                      </div>
                      <span className="battery-text">85%</span>
                    </div>
                    <div className="battery-status">电池已几乎充满</div>
                  </div>
                  <div className="power-mode-section">
                    <div className="power-mode-label">电源模式（已连接电源）：更长的续航</div>
                    <div className="power-mode-slider-container">
                      <span className="slider-label">电池节省程度</span>
                      <input type="range" min="0" max="100" defaultValue="30" className="power-mode-slider" />
                      <span className="slider-label">最佳性能</span>
                    </div>
                  </div>
                  <div className="battery-settings">
                    <button className="battery-settings-btn">电池设置</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 时间和日历 */}
          <div className="tray-item-container">
            <div 
              className={`system-time ${calendarPanelOpen ? 'active' : ''}`}
              title="日期和时间设置"
              onClick={() => {
                setCalendarPanelOpen(!calendarPanelOpen);
                setWifiPanelOpen(false);
                setVolumePanelOpen(false);
                setBatteryPanelOpen(false);
              }}
            >
              <div className="time-display">{formatTime(currentTime)}</div>
              <div className="date-display">{formatDate(currentTime)}</div>
            </div>
            {calendarPanelOpen && (
              <div className="tray-panel calendar-panel">
                <div className="panel-header">
                  <h3>日期和时间</h3>
                  <button className="panel-close" onClick={() => setCalendarPanelOpen(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="panel-content">
                  <div className="current-datetime">
                    <div className="current-time">{formatTime(currentTime)}</div>
                    <div className="current-date">
                      {currentTime.toLocaleDateString('zh-CN', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="calendar-header">
                    <button className="calendar-nav"><i className="fas fa-chevron-up"></i></button>
                    <span className="calendar-month">
                      {currentTime.getFullYear()}年{currentTime.getMonth() + 1}月
                    </span>
                    <button className="calendar-nav"><i className="fas fa-chevron-down"></i></button>
                  </div>
                  <div className="calendar-grid">
                    <div className="calendar-weekdays">
                      {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                        <div key={day} className="weekday">{day}</div>
                      ))}
                    </div>
                    <div className="calendar-days">
                      {Array.from({length: 42}, (_, i) => {
                        const firstDayOfMonth = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1);
                        const firstDayWeekday = firstDayOfMonth.getDay();
                        const daysInMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
                        const daysInPrevMonth = new Date(currentTime.getFullYear(), currentTime.getMonth(), 0).getDate();
                        
                        let date, isCurrentMonth, isToday;
                        
                        if (i < firstDayWeekday) {
                          // 上个月的日期
                          date = daysInPrevMonth - firstDayWeekday + i + 1;
                          isCurrentMonth = false;
                        } else if (i < firstDayWeekday + daysInMonth) {
                          // 当前月的日期
                          date = i - firstDayWeekday + 1;
                          isCurrentMonth = true;
                        } else {
                          // 下个月的日期
                          date = i - firstDayWeekday - daysInMonth + 1;
                          isCurrentMonth = false;
                        }
                        
                        isToday = isCurrentMonth && date === currentTime.getDate();
                        
                        return (
                          <div 
                            key={i} 
                            className={`calendar-day ${
                              isToday ? 'today' : ''
                            } ${
                              !isCurrentMonth ? 'other-month' : ''
                            }`}
                          >
                            <div className="date-number">{date}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 通知中心按钮 */}
          <button 
            className="tray-icon notification-btn"
            title="通知中心"
            onClick={() => setNotificationCenterOpen(!notificationCenterOpen)}
          >
            <i className="fas fa-bell"></i>
            <span className="notification-badge">3</span>
          </button>
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu.show && (
        <div 
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="context-menu-item" onClick={() => handleContextMenuClick('refresh')}>
            <i className="fas fa-sync-alt"></i>
            刷新
          </div>
          <div className="context-menu-separator"></div>
          <div className="context-menu-item" onClick={() => handleContextMenuClick('paste')}>
            <i className="fas fa-paste"></i>
            粘贴
            <span className="shortcut">Ctrl+V</span>
          </div>
          <div className="context-menu-separator"></div>
          <div className="context-menu-item" onClick={() => handleContextMenuClick('personalize')}>
            <i className="fas fa-palette"></i>
            个性化
          </div>
          <div className="context-menu-item" onClick={() => handleContextMenuClick('display')}>
            <i className="fas fa-desktop"></i>
            显示设置
          </div>
          <div className="context-menu-separator"></div>
          <div className="context-menu-item" onClick={() => handleContextMenuClick('new-folder')}>
            <i className="fas fa-folder-plus"></i>
            新建文件夹
          </div>
          <div className="context-menu-item" onClick={() => handleContextMenuClick('new-file')}>
            <i className="fas fa-file"></i>
            新建文档
          </div>
        </div>
      )}

      {/* 开始菜单 */}
      <StartMenu
        isOpen={startMenuOpen}
        onClose={() => setStartMenuOpen(false)}
        onAppOpen={openApp}
        desktopIcons={desktopIcons}
      />

      {/* 通知中心 */}
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        onAppOpen={openApp}
      />
    </div>
  );
};

export default WindowsDesktop;