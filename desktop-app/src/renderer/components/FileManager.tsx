import React, { useState, useEffect } from 'react';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  size?: string;
  modified: string;
  icon: string;
  path: string;
}

const FileManager: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/desktop-app');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [loading, setLoading] = useState(true);

  // 模拟文件系统
  const mockFiles: Record<string, FileItem[]> = {
    '/desktop-app': [
      { name: '..', type: 'folder', modified: '', icon: 'fas fa-arrow-left', path: '/' },
      { name: 'src', type: 'folder', modified: '2024-01-10', icon: 'fas fa-folder', path: '/desktop-app/src' },
      { name: 'public', type: 'folder', modified: '2024-01-10', icon: 'fas fa-folder', path: '/desktop-app/public' },
      { name: 'node_modules', type: 'folder', modified: '2024-01-10', icon: 'fas fa-folder', path: '/desktop-app/node_modules' },
      { name: 'package.json', type: 'file', size: '1.2 KB', modified: '2024-01-10', icon: 'fas fa-file-code', path: '/desktop-app/package.json' },
      { name: 'vite.config.ts', type: 'file', size: '417 B', modified: '2024-01-10', icon: 'fas fa-file-code', path: '/desktop-app/vite.config.ts' },
      { name: 'README.md', type: 'file', size: '4.8 KB', modified: '2024-01-10', icon: 'fas fa-file-text', path: '/desktop-app/README.md' },
      { name: 'tsconfig.json', type: 'file', size: '635 B', modified: '2024-01-10', icon: 'fas fa-file-code', path: '/desktop-app/tsconfig.json' }
    ],
    '/desktop-app/src': [
      { name: '..', type: 'folder', modified: '', icon: 'fas fa-arrow-left', path: '/desktop-app' },
      { name: 'renderer', type: 'folder', modified: '2024-01-10', icon: 'fas fa-folder', path: '/desktop-app/src/renderer' },
      { name: 'main.ts', type: 'file', size: '2.1 KB', modified: '2024-01-10', icon: 'fas fa-file-code', path: '/desktop-app/src/main.ts' },
      { name: 'preload.ts', type: 'file', size: '1.5 KB', modified: '2024-01-10', icon: 'fas fa-file-code', path: '/desktop-app/src/preload.ts' }
    ],
    '/desktop-app/src/renderer': [
      { name: '..', type: 'folder', modified: '', icon: 'fas fa-arrow-left', path: '/desktop-app/src' },
      { name: 'components', type: 'folder', modified: '2024-01-10', icon: 'fas fa-folder', path: '/desktop-app/src/renderer/components' },
      { name: 'styles', type: 'folder', modified: '2024-01-10', icon: 'fas fa-folder', path: '/desktop-app/src/renderer/styles' },
      { name: 'App.tsx', type: 'file', size: '3.2 KB', modified: '2024-01-10', icon: 'fas fa-file-code', path: '/desktop-app/src/renderer/App.tsx' },
      { name: 'index.tsx', type: 'file', size: '891 B', modified: '2024-01-10', icon: 'fas fa-file-code', path: '/desktop-app/src/renderer/index.tsx' }
    ]
  };

  useEffect(() => {
    // 添加延迟加载，避免阻塞UI
    setLoading(true);
    const timer = setTimeout(() => {
      const currentFiles = mockFiles[currentPath] || [];
      setFiles(currentFiles);
      setLoading(false);
    }, 200);
    
    return () => clearTimeout(timer);
  }, [currentPath]);

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      setCurrentPath(file.path);
      setSelectedFiles([]);
    }
  };

  const handleFileSelect = (fileName: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      setSelectedFiles(prev => 
        prev.includes(fileName) 
          ? prev.filter(f => f !== fileName)
          : [...prev, fileName]
      );
    } else {
      setSelectedFiles([fileName]);
    }
  };

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: '根目录', path: '/' }];
    
    let pathBuilder = '';
    parts.forEach(part => {
      pathBuilder += '/' + part;
      breadcrumbs.push({ name: part, path: pathBuilder });
    });
    
    return breadcrumbs;
  };

  const formatFileSize = (size?: string) => {
    return size || '--';
  };

  const formatDate = (date: string) => {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div style={{ 
      padding: '0', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--win-bg-window)',
      color: 'var(--win-text-primary)'
    }}>
      {/* 工具栏 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--win-border)',
        background: 'var(--win-bg-card)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          onClick={() => {
            const breadcrumbs = getBreadcrumbs();
            if (breadcrumbs.length > 1) {
              setCurrentPath(breadcrumbs[breadcrumbs.length - 2].path);
            }
          }}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--win-border)',
            borderRadius: 'var(--win-radius)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          disabled={currentPath === '/'}
        >
          <i className="fas fa-arrow-left"></i>
          返回
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--win-border)',
            borderRadius: 'var(--win-radius)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fas fa-sync-alt"></i>
          刷新
        </button>

        <div style={{ flex: 1 }}></div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px',
              background: viewMode === 'list' ? 'var(--win-blue)' : 'transparent',
              color: viewMode === 'list' ? 'white' : 'var(--win-text-primary)',
              border: '1px solid var(--win-border)',
              borderRadius: 'var(--win-radius)',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-list"></i>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px',
              background: viewMode === 'grid' ? 'var(--win-blue)' : 'transparent',
              color: viewMode === 'grid' ? 'white' : 'var(--win-text-primary)',
              border: '1px solid var(--win-border)',
              borderRadius: 'var(--win-radius)',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-th"></i>
          </button>
        </div>
      </div>

      {/* 地址栏 */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--win-border)',
        background: 'var(--win-bg-window)',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {getBreadcrumbs().map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--win-text-muted)' }}></i>}
              <button
                onClick={() => setCurrentPath(crumb.path)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: index === getBreadcrumbs().length - 1 ? 'var(--win-blue)' : 'var(--win-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: index === getBreadcrumbs().length - 1 ? '600' : '400'
                }}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 文件列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'var(--win-text-muted)'
          }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
            <p>正在加载文件...</p>
          </div>
        ) : viewMode === 'list' ? (
          // 列表视图
          <div>
            {/* 表头 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 120px',
              gap: '16px',
              padding: '8px 12px',
              background: 'var(--win-bg-card)',
              borderRadius: 'var(--win-radius)',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--win-text-secondary)',
              marginBottom: '8px'
            }}>
              <div>名称</div>
              <div>大小</div>
              <div>修改日期</div>
            </div>

            {/* 文件项 */}
            {files.map((file) => (
              <div
                key={file.name}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleFileSelect(file.name, false);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 120px',
                  gap: '16px',
                  padding: '8px 12px',
                  background: selectedFiles.includes(file.name) ? 'var(--win-bg-selected)' : 'transparent',
                  borderRadius: 'var(--win-radius)',
                  cursor: 'pointer',
                  transition: 'var(--win-transition)',
                  fontSize: '14px',
                  marginBottom: '2px'
                }}
                onMouseOver={(e) => {
                  if (!selectedFiles.includes(file.name)) {
                    e.currentTarget.style.background = 'var(--win-bg-hover)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!selectedFiles.includes(file.name)) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className={file.icon} style={{ 
                    fontSize: '16px',
                    color: file.type === 'folder' ? '#ffa502' : '#3742fa'
                  }}></i>
                  <span>{file.name}</span>
                </div>
                <div style={{ color: 'var(--win-text-muted)' }}>
                  {formatFileSize(file.size)}
                </div>
                <div style={{ color: 'var(--win-text-muted)' }}>
                  {formatDate(file.modified)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 网格视图
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '16px'
          }}>
            {files.map((file) => (
              <div
                key={file.name}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleFileSelect(file.name, false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '12px',
                  background: selectedFiles.includes(file.name) ? 'var(--win-bg-selected)' : 'transparent',
                  borderRadius: 'var(--win-radius)',
                  cursor: 'pointer',
                  transition: 'var(--win-transition)',
                  textAlign: 'center'
                }}
                onMouseOver={(e) => {
                  if (!selectedFiles.includes(file.name)) {
                    e.currentTarget.style.background = 'var(--win-bg-hover)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!selectedFiles.includes(file.name)) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <i className={file.icon} style={{ 
                  fontSize: '32px',
                  color: file.type === 'folder' ? '#ffa502' : '#3742fa',
                  marginBottom: '8px'
                }}></i>
                <span style={{
                  fontSize: '12px',
                  wordBreak: 'break-word',
                  lineHeight: '1.2'
                }}>
                  {file.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid var(--win-border)',
        background: 'var(--win-bg-card)',
        fontSize: '12px',
        color: 'var(--win-text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {files.length} 项 {selectedFiles.length > 0 && `(已选择 ${selectedFiles.length} 项)`}
        </div>
        <div>
          当前路径: {currentPath}
        </div>
      </div>
    </div>
  );
};

export default FileManager;