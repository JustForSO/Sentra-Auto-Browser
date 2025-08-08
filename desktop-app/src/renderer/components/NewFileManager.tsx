import React, { useState, useEffect } from 'react';
import AdvancedCodeEditor from './AdvancedCodeEditor';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified: string;
  path: string;
  isHidden?: boolean;
}

interface OpenFile {
  path: string;
  name: string;
  content: string;
}

const NewFileManager: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(''); // 相对于项目根目录的路径
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // 加载文件列表
  const loadFiles = async (path: string = currentPath) => {
    try {
      setLoading(true);
      setError('');
      
      // 发送给主进程的路径格式：空字符串表示根目录，或者相对路径
      const requestPath = path === '' ? '../' : `../${path}`;
      console.log('请求路径:', requestPath);
      
      const result = await window.electronAPI.readDirectory(requestPath);
      
      if (result.success) {
        setFiles(result.files);
      } else {
        setError(result.error || '加载文件失败');
      }
    } catch (err: any) {
      setError(err?.message || '未知错误');
      console.error('加载文件失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    loadFiles('');
  }, []);

  // 处理文件/文件夹点击
  const handleItemClick = async (file: FileItem) => {
    if (file.type === 'folder') {
      // 导航到文件夹
      const newPath = currentPath === '' ? file.name : `${currentPath}/${file.name}`;
      console.log('导航到:', newPath);
      setCurrentPath(newPath);
      loadFiles(newPath);
    } else {
      // 打开文件
      await openFileForEdit(file);
    }
  };

  // 打开文件进行编辑
  const openFileForEdit = async (file: FileItem) => {
    try {
      // 构建文件的完整路径
      const filePath = currentPath === '' ? `../${file.name}` : `../${currentPath}/${file.name}`;
      console.log('打开文件:', filePath);
      
      const result = await window.electronAPI.readFile(filePath);
      if (result.success) {
        setOpenFile({
          path: filePath,
          name: file.name,
          content: result.content
        });
      } else {
        showNotification(`无法打开文件: ${result.error}`, 'error');
      }
    } catch (err: any) {
      console.error('读取文件失败:', err);
      showNotification('读取文件失败', 'error');
    }
  };

  // 保存文件
  const saveFile = async (content: string) => {
    if (!openFile) return;
    
    try {
      const result = await window.electronAPI.writeFile(openFile.path, content);
      if (result.success) {
        showNotification('文件保存成功', 'success');
        // 更新打开文件的内容
        setOpenFile(prev => prev ? { ...prev, content } : null);
        // 刷新文件列表
        loadFiles(currentPath);
      } else {
        showNotification(`保存失败: ${result.error}`, 'error');
      }
    } catch (err: any) {
      console.error('保存文件失败:', err);
      showNotification('保存文件失败', 'error');
    }
  };

  // 返回上一级目录
  const goBack = () => {
    if (currentPath === '') return;
    
    const pathParts = currentPath.split('/');
    const newPath = pathParts.slice(0, -1).join('/');
    console.log('返回到:', newPath);
    setCurrentPath(newPath);
    loadFiles(newPath);
  };

  // 获取面包屑导航
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ name: '项目根目录', path: '' }];
    
    if (currentPath) {
      const parts = currentPath.split('/').filter(Boolean);
      let buildPath = '';
      
      parts.forEach(part => {
        buildPath = buildPath ? `${buildPath}/${part}` : part;
        breadcrumbs.push({ name: part, path: buildPath });
      });
    }
    
    return breadcrumbs;
  };

  // 获取文件图标和颜色
  const getFileIcon = (fileName: string, isFolder: boolean) => {
    if (isFolder) {
      return { icon: 'fas fa-folder', color: '#ffd700' };
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, { icon: string; color: string }> = {
      'js': { icon: 'fab fa-js-square', color: '#f7df1e' },
      'ts': { icon: 'fab fa-js-square', color: '#3178c6' },
      'jsx': { icon: 'fab fa-react', color: '#61dafb' },
      'tsx': { icon: 'fab fa-react', color: '#61dafb' },
      'json': { icon: 'fas fa-code', color: '#858585' },
      'css': { icon: 'fab fa-css3-alt', color: '#1572b6' },
      'html': { icon: 'fab fa-html5', color: '#e34f26' },
      'md': { icon: 'fab fa-markdown', color: '#083fa1' },
      'py': { icon: 'fab fa-python', color: '#3776ab' },
      'txt': { icon: 'fas fa-file-alt', color: '#666666' },
      'env': { icon: 'fas fa-cog', color: '#4caf50' },
      'yml': { icon: 'fas fa-code', color: '#cb171e' },
      'yaml': { icon: 'fas fa-code', color: '#cb171e' }
    };

    return iconMap[ext || ''] || { icon: 'fas fa-file', color: '#95a5a6' };
  };

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  // 过滤文件
  const filteredFiles = files.filter(file => {
    if (!showHidden && file.isHidden) return false;
    return true;
  });

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      fontFamily: 'Segoe UI, system-ui, sans-serif'
    }}>
      {/* 文件编辑器 */}
      {openFile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '95%',
            height: '90%',
            background: '#1e1e1e',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid #3e3e42'
          }}>
            <AdvancedCodeEditor
              content={openFile.content}
              fileName={openFile.name}
              language={openFile.name.split('.').pop() || 'txt'}
              onSave={saveFile}
              onClose={() => setOpenFile(null)}
            />
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div style={{
        background: '#f8f9fa',
        borderBottom: '1px solid #e9ecef',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* 导航按钮 */}
        <button
          onClick={goBack}
          disabled={currentPath === ''}
          style={{
            padding: '8px 12px',
            background: currentPath === '' ? '#e9ecef' : '#007bff',
            color: currentPath === '' ? '#6c757d' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentPath === '' ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          <i className="fas fa-arrow-left" style={{ marginRight: '6px' }}></i>
          返回
        </button>

        <button
          onClick={() => loadFiles(currentPath)}
          style={{
            padding: '8px 12px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i>
          刷新
        </button>

        {/* 面包屑导航 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          {getBreadcrumbs().map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <i className="fas fa-chevron-right" style={{ color: '#6c757d', fontSize: '12px' }}></i>}
              <button
                onClick={() => {
                  setCurrentPath(crumb.path);
                  loadFiles(crumb.path);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007bff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'underline'
                }}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* 视图控制 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '8px',
              background: viewMode === 'list' ? '#007bff' : '#e9ecef',
              color: viewMode === 'list' ? 'white' : '#6c757d',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-list"></i>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '8px',
              background: viewMode === 'grid' ? '#007bff' : '#e9ecef',
              color: viewMode === 'grid' ? 'white' : '#6c757d',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-th"></i>
          </button>
        </div>

        {/* 显示隐藏文件 */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          显示隐藏文件
        </label>
      </div>

      {/* 文件列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#007bff' }}></i>
            <span style={{ color: '#6c757d' }}>加载中...</span>
          </div>
        ) : error ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '24px', color: '#dc3545' }}></i>
            <span style={{ color: '#dc3545' }}>{error}</span>
            <button
              onClick={() => loadFiles(currentPath)}
              style={{
                padding: '8px 16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              重试
            </button>
          </div>
        ) : (
          <div style={{
            display: viewMode === 'grid' ? 'grid' : 'block',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(120px, 1fr))' : undefined,
            gap: viewMode === 'grid' ? '12px' : '0'
          }}>
            {filteredFiles.map((file, index) => {
              const fileIcon = getFileIcon(file.name, file.type === 'folder');

              return (
                <div
                  key={`${file.name}-${index}`}
                  onClick={() => handleItemClick(file)}
                  style={{
                    padding: viewMode === 'grid' ? '12px' : '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: viewMode === 'grid' ? 'column' : 'row',
                    alignItems: viewMode === 'grid' ? 'center' : 'center',
                    gap: viewMode === 'grid' ? '8px' : '12px',
                    textAlign: viewMode === 'grid' ? 'center' : 'left'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <i className={fileIcon.icon} style={{
                    fontSize: viewMode === 'grid' ? '32px' : '18px',
                    color: fileIcon.color,
                    minWidth: viewMode === 'grid' ? 'auto' : '20px'
                  }}></i>
                  <div style={{
                    flex: viewMode === 'grid' ? 'none' : 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: viewMode === 'grid' ? 'normal' : 'nowrap'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#212529',
                      wordBreak: viewMode === 'grid' ? 'break-word' : 'normal'
                    }}>
                      {file.name}
                    </div>
                    {viewMode === 'list' && (
                      <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                        {file.type === 'file' && formatFileSize(file.size)} • {new Date(file.modified).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div style={{
        background: '#f8f9fa',
        borderTop: '1px solid #e9ecef',
        padding: '8px 16px',
        fontSize: '12px',
        color: '#6c757d',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>当前路径: {currentPath || '项目根目录'}</span>
        <span>{filteredFiles.length} 项</span>
      </div>
    </div>
  );
};

export default NewFileManager;