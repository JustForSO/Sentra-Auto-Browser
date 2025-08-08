import React from 'react';

interface AppContainerProps {
  appId: string;
  title: string;
  icon: string;
  color?: string;
  children: React.ReactNode;
  showMenuBar?: boolean;
  showStatusBar?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  defaultWidth?: number;
  defaultHeight?: number;
}

const AppContainer: React.FC<AppContainerProps> = ({ 
  appId, 
  title, 
  icon, 
  color = '#0078d4',
  children, 
  showMenuBar = true,
  showStatusBar = true,
  theme = 'light',
  defaultWidth = 1000,
  defaultHeight = 700
}) => {
  
  const getAppMenus = () => {
    switch (appId) {
      case 'config':
        return [
          { label: '文件', items: ['新建配置', '打开配置', '保存配置', '导出配置'] },
          { label: '编辑', items: ['撤销', '重做', '查找', '替换'] },
          { label: '视图', items: ['刷新', '显示隐藏项', '排序方式'] },
          { label: '工具', items: ['验证配置', '测试连接', '清理缓存'] },
          { label: '帮助', items: ['使用指南', '键盘快捷键', '关于'] }
        ];
      case 'files':
        return [
          { label: '文件', items: ['新建', '打开', '保存', '另存为', '打印'] },
          { label: '编辑', items: ['撤销', '重做', '剪切', '复制', '粘贴'] },
          { label: '视图', items: ['刷新', '列表视图', '网格视图', '详细信息'] },
          { label: '工具', items: ['搜索', '属性', '选项'] },
          { label: '帮助', items: ['帮助主题', '关于文件管理器'] }
        ];
      case 'commands':
        return [
          { label: '文件', items: ['新建脚本', '打开脚本', '保存', '运行'] },
          { label: '编辑', items: ['撤销', '重做', '查找', '替换'] },
          { label: '视图', items: ['清屏', '自动换行', '字体设置'] },
          { label: '终端', items: ['新建标签', '分割窗口', '会话管理'] },
          { label: '帮助', items: ['命令帮助', '快捷键', '关于'] }
        ];
      case 'system-info':
        return [
          { label: '查看', items: ['刷新', '实时监控', '历史记录'] },
          { label: '工具', items: ['系统诊断', '性能测试', '清理'] },
          { label: '设置', items: ['监控间隔', '警告阈值', '导出设置'] },
          { label: '帮助', items: ['系统帮助', '故障排除', '关于'] }
        ];
      default:
        return [
          { label: '文件', items: ['新建', '打开', '保存', '退出'] },
          { label: '编辑', items: ['撤销', '重做', '剪切', '复制'] },
          { label: '视图', items: ['刷新', '全屏', '缩放'] },
          { label: '帮助', items: ['帮助', '关于'] }
        ];
    }
  };

  const getStatusBarContent = () => {
    switch (appId) {
      case 'config':
        return [
          { label: '配置项: 12/15', icon: 'fas fa-cogs' },
          { label: '已验证', icon: 'fas fa-check-circle', color: '#27ae60' },
          { label: '最后保存: 14:32', icon: 'fas fa-clock' }
        ];
      case 'files':
        return [
          { label: '64 项', icon: 'fas fa-folder' },
          { label: '总大小: 2.4 GB', icon: 'fas fa-hdd' },
          { label: '已选择: 0 项', icon: 'fas fa-mouse-pointer' }
        ];
      case 'commands':
        return [
          { label: '会话活跃', icon: 'fas fa-circle', color: '#27ae60' },
          { label: 'bash 5.1.8', icon: 'fas fa-terminal' },
          { label: '工作目录: /desktop-app', icon: 'fas fa-folder-open' }
        ];
      case 'system-info':
        return [
          { label: 'CPU: 15%', icon: 'fas fa-microchip' },
          { label: '内存: 67%', icon: 'fas fa-memory' },
          { label: '更新时间: 1s', icon: 'fas fa-sync-alt' }
        ];
      default:
        return [
          { label: '就绪', icon: 'fas fa-check' },
          { label: new Date().toLocaleTimeString(), icon: 'fas fa-clock' }
        ];
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: theme === 'dark' ? '#1e1e1e' : 'var(--win-bg-window)',
      color: theme === 'dark' ? '#ffffff' : 'var(--win-text-primary)',
      fontFamily: 'var(--win-font-family)',
      overflow: 'hidden'
    }}>
      {/* 菜单栏 */}
      {showMenuBar && (
        <div style={{
          height: '30px',
          background: theme === 'dark' ? '#2d2d30' : '#f6f6f6',
          borderBottom: `1px solid ${theme === 'dark' ? '#3e3e42' : 'var(--win-border)'}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          fontSize: '13px'
        }}>
          {getAppMenus().map((menu, index) => (
            <div
              key={index}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = theme === 'dark' ? '#404040' : '#e0e0e0';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onClick={() => {
                // 显示下拉菜单的逻辑
                console.log(`点击了菜单: ${menu.label}`);
              }}
            >
              {menu.label}
            </div>
          ))}
          
          {/* 应用图标和标题 */}
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: theme === 'dark' ? '#cccccc' : 'var(--win-text-muted)'
          }}>
            <i className={icon} style={{ color }}></i>
            <span>{title}</span>
          </div>
        </div>
      )}

      {/* 应用内容区域 */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {children}
      </div>

      {/* 状态栏 */}
      {showStatusBar && (
        <div style={{
          height: '24px',
          background: theme === 'dark' ? '#007acc' : '#0078d4',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          fontSize: '12px',
          gap: '16px'
        }}>
          {getStatusBarContent().map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <i 
                className={item.icon} 
                style={{ 
                  fontSize: '11px',
                  color: item.color || 'white'
                }}
              ></i>
              <span>{item.label}</span>
            </div>
          ))}
          
          {/* 右侧信息 */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px' }}>
            <span>Sentra Desktop</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppContainer;