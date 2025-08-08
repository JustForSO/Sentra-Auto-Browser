import React, { useState } from 'react';

interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAppOpen: (appId: string) => void;
  desktopIcons: Array<{
    id: string;
    name: string;
    icon: string;
    color?: string;
  }>;
}

const StartMenu: React.FC<StartMenuProps> = ({ isOpen, onClose, onAppOpen, desktopIcons }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pinned' | 'all' | 'recent'>('pinned');

  // 固定应用
  const pinnedApps = desktopIcons.slice(0, 6);

  // 最近使用的应用
  const recentApps = [
  
    { id: 'commands', name: '命令执行', icon: 'fas fa-terminal', color: '#107c10' },
    { id: 'personalization', name: '个性化', icon: 'fas fa-palette', color: '#fd79a8' }
  ];

  // 系统快捷操作
  const quickActions = [
    { id: 'shutdown', name: '关机', icon: 'fas fa-power-off', color: '#e81123' },
    { id: 'restart', name: '重启', icon: 'fas fa-redo', color: '#0078d4' },
    { id: 'settings', name: '设置', icon: 'fas fa-cog', color: '#107c10' },
    { id: 'files', name: '文件', icon: 'fas fa-folder', color: '#ff8c00' }
  ];

  const filteredApps = desktopIcons.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAppClick = (appId: string) => {
    onAppOpen(appId);
    onClose();
  };

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'shutdown':
        if (confirm('确定要关闭应用吗？')) {
          window.close();
        }
        break;
      case 'restart':
        if (confirm('确定要重新加载应用吗？')) {
          window.location.reload();
        }
        break;
      case 'settings':
        onAppOpen('personalization');
        break;
      case 'files':
        onAppOpen('files');
        break;
      default:
        break;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent',
          zIndex: 999
        }}
        onClick={onClose}
      />
      
      {/* 开始菜单 */}
      <div style={{
        position: 'fixed',
        bottom: '48px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '650px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(40px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'startMenuOpen 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}>
        {/* 搜索框 */}
        <div style={{
          padding: '20px 20px 16px 20px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--win-text-muted)',
              fontSize: '14px'
            }} />
            <input
              type="text"
              placeholder="输入应用名称进行搜索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'rgba(255, 255, 255, 0.8)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* 标签页 */}
        <div style={{
          display: 'flex',
          padding: '0 20px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
        }}>
          {[
            { id: 'pinned', label: '固定' },
            { id: 'all', label: '所有应用' },
            { id: 'recent', label: '最近使用' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--win-blue)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                color: activeTab === tab.id ? 'var(--win-blue)' : 'var(--win-text-secondary)',
                transition: 'var(--win-transition)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 应用列表 */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto'
        }}>
          {searchTerm ? (
            // 搜索结果
            <div>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                color: 'var(--win-text-primary)'
              }}>
                搜索结果
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: '16px'
              }}>
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => handleAppClick(app.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'var(--win-transition)',
                      background: 'transparent'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '8px',
                      color: app.color || 'var(--win-blue)',
                      fontSize: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}>
                      <i className={app.icon} />
                    </div>
                    <span style={{
                      fontSize: '12px',
                      textAlign: 'center',
                      color: 'var(--win-text-primary)',
                      lineHeight: '1.2'
                    }}>
                      {app.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 标签页内容
            <div>
              {activeTab === 'pinned' && (
                <div>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    color: 'var(--win-text-primary)'
                  }}>
                    固定的应用
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '16px'
                  }}>
                    {pinnedApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => handleAppClick(app.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'var(--win-transition)',
                          background: 'transparent'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '8px',
                          color: app.color || 'var(--win-blue)',
                          fontSize: '24px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          <i className={app.icon} />
                        </div>
                        <span style={{
                          fontSize: '12px',
                          textAlign: 'center',
                          color: 'var(--win-text-primary)',
                          lineHeight: '1.2'
                        }}>
                          {app.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'all' && (
                <div>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    color: 'var(--win-text-primary)'
                  }}>
                    所有应用
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '16px'
                  }}>
                    {desktopIcons.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => handleAppClick(app.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'var(--win-transition)',
                          background: 'transparent'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '8px',
                          color: app.color || 'var(--win-blue)',
                          fontSize: '24px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          <i className={app.icon} />
                        </div>
                        <span style={{
                          fontSize: '12px',
                          textAlign: 'center',
                          color: 'var(--win-text-primary)',
                          lineHeight: '1.2'
                        }}>
                          {app.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'recent' && (
                <div>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    color: 'var(--win-text-primary)'
                  }}>
                    最近使用
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '16px'
                  }}>
                    {recentApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => handleAppClick(app.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'var(--win-transition)',
                          background: 'transparent'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '8px',
                          color: app.color || 'var(--win-blue)',
                          fontSize: '24px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          <i className={app.icon} />
                        </div>
                        <span style={{
                          fontSize: '12px',
                          textAlign: 'center',
                          color: 'var(--win-text-primary)',
                          lineHeight: '1.2'
                        }}>
                          {app.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部快捷操作 */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(0, 0, 0, 0.05)',
          background: 'rgba(255, 255, 255, 0.5)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'transparent',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'var(--win-transition)',
                    color: action.color,
                    fontSize: '16px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  title={action.name}
                >
                  <i className={action.icon} />
                </button>
              ))}
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--win-text-muted)'
            }}>
              <i className="fas fa-user-circle" style={{ fontSize: '20px' }} />
              <span>当前用户</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StartMenu;