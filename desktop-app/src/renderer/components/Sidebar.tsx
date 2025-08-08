import React from 'react';

type TabType = 'config' | 'commands' | 'system';

interface SystemInfo {
  version?: string;
  platform?: string;
  arch?: string;
  nodeVersion?: string;
  electronVersion?: string;
}

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  systemInfo: SystemInfo | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, systemInfo }) => {
  const navItems = [
    {
      id: 'config' as TabType,
      label: '环境配置',
      description: '管理 .env 配置文件和环境变量'
    },
    {
      id: 'commands' as TabType,
      label: '命令执行',
      description: '运行 CLI 命令和脚本'
    },
    {
      id: 'system' as TabType,
      label: '系统信息',
      description: '查看系统状态和运行环境'
    }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <h1>Sentra</h1>
          <div className="subtitle">桌面管理器</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <div className="nav-content">
              <div className="nav-label">{item.label}</div>
              <div className="nav-description">{item.description}</div>
            </div>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="version-info">
          {systemInfo && (
            <>
              <div className="version-item">
                <span className="version-label">平台</span>
                <span className="version-value">{systemInfo.platform || 'Unknown'}</span>
              </div>
              <div className="version-item">
                <span className="version-label">架构</span>
                <span className="version-value">{systemInfo.arch || 'Unknown'}</span>
              </div>
              <div className="version-item">
                <span className="version-label">Node.js</span>
                <span className="version-value">{systemInfo.nodeVersion || 'Unknown'}</span>
              </div>
              <div className="version-item">
                <span className="version-label">Electron</span>
                <span className="version-value">{systemInfo.electronVersion || 'Unknown'}</span>
              </div>
            </>
          )}
        </div>
        <div className="app-version">
          版本 {systemInfo?.version || '1.0.0'}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
