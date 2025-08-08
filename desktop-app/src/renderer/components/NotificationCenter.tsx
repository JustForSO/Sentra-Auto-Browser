import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onAppOpen?: (appId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, onAppOpen }) => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Sentra Desktop',
      message: '欢迎使用 Sentra Desktop！您的桌面环境已准备就绪。',
      type: 'success',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false
    },
    {
      id: '2',
      title: '配置提醒',
      message: '检测到部分必需的环境变量未配置，请及时完善配置信息。',
      type: 'warning',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      read: false,
      action: {
        label: '立即配置',
        callback: () => onAppOpen?.('config')
      }
    },
    {
      id: '3',
      title: '系统更新',
      message: '发现新版本 v1.2.0，包含性能优化和新功能。',
      type: 'info',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: true,
      action: {
        label: '查看详情',
        callback: () => onAppOpen?.('system-info')
      }
    }
  ]);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'error': return 'fas fa-times-circle';
      default: return 'fas fa-info-circle';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'var(--win-success)';
      case 'warning': return 'var(--win-warning)';
      case 'error': return 'var(--win-error)';
      default: return 'var(--win-blue)';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  const filteredNotifications = notifications.filter(notif => 
    filter === 'all' || !notif.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

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
          zIndex: 998
        }}
        onClick={onClose}
      />
      
      {/* 通知中心 */}
      <div style={{
        position: 'fixed',
        top: '60px',
        right: '16px',
        width: '380px',
        maxHeight: '600px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(40px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideInRight 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}>
        {/* 头部 */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{
              margin: '0',
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--win-text-primary)'
            }}>
              通知中心
            </h3>
            {unreadCount > 0 && (
              <span style={{
                fontSize: '12px',
                color: 'var(--win-blue)',
                fontWeight: '500'
              }}>
                {unreadCount} 条未读通知
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--win-text-muted)',
              fontSize: '16px',
              padding: '4px'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* 过滤和操作栏 */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '4px 12px',
                background: filter === 'all' ? 'var(--win-blue)' : 'transparent',
                color: filter === 'all' ? 'white' : 'var(--win-text-secondary)',
                border: '1px solid var(--win-border)',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                padding: '4px 12px',
                background: filter === 'unread' ? 'var(--win-blue)' : 'transparent',
                color: filter === 'unread' ? 'white' : 'var(--win-text-secondary)',
                border: '1px solid var(--win-border)',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              未读
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--win-blue)',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                全部标为已读
              </button>
            )}
            <button
              onClick={clearAllNotifications}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--win-text-muted)',
                fontSize: '12px'
              }}
            >
              清空
            </button>
          </div>
        </div>

        {/* 通知列表 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '400px'
        }}>
          {filteredNotifications.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--win-text-muted)'
            }}>
              <i className="fas fa-bell-slash" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
              <p style={{ margin: '0' }}>
                {filter === 'unread' ? '没有未读通知' : '暂无通知'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                  position: 'relative',
                  background: notification.read ? 'transparent' : 'rgba(0, 120, 212, 0.02)',
                  cursor: 'pointer'
                }}
                onClick={() => markAsRead(notification.id)}
              >
                {!notification.read && (
                  <div style={{
                    position: 'absolute',
                    left: '8px',
                    top: '20px',
                    width: '4px',
                    height: '4px',
                    background: 'var(--win-blue)',
                    borderRadius: '50%'
                  }}></div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <i 
                    className={getTypeIcon(notification.type)} 
                    style={{
                      fontSize: '16px',
                      color: getTypeColor(notification.type),
                      marginTop: '2px',
                      flexShrink: 0
                    }}
                  ></i>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '4px'
                    }}>
                      <h4 style={{
                        margin: '0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--win-text-primary)',
                        lineHeight: '1.2'
                      }}>
                        {notification.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--win-text-muted)',
                          fontSize: '12px',
                          padding: '2px',
                          flexShrink: 0
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '13px',
                      color: 'var(--win-text-secondary)',
                      lineHeight: '1.4'
                    }}>
                      {notification.message}
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--win-text-muted)'
                      }}>
                        {formatTime(notification.timestamp)}
                      </span>
                      
                      {notification.action && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            notification.action!.callback();
                          }}
                          style={{
                            padding: '4px 8px',
                            background: 'var(--win-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}
                        >
                          {notification.action.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部 */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(0, 0, 0, 0.05)',
          background: 'rgba(255, 255, 255, 0.5)',
          textAlign: 'center'
        }}>
          <button
            onClick={() => {
              onAppOpen?.('system-info');
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--win-blue)',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            打开系统设置
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;