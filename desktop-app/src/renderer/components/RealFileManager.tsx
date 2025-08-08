import React, { useState, useEffect, useRef } from 'react';
import AdvancedCodeEditor from './AdvancedCodeEditor';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified: Date;
  path: string;
  extension?: string;
  isHidden?: boolean;
}

interface RealFileManagerProps {
  initialPath?: string;
}

const RealFileManager: React.FC<RealFileManagerProps> = ({ initialPath }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取文件图标
  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') return 'fas fa-folder';
    
    switch (file.extension?.toLowerCase()) {
      case 'js':
      case 'jsx':
        return 'fab fa-js-square';
      case 'ts':
      case 'tsx':
        return 'fas fa-file-code';
      case 'json':
        return 'fas fa-brackets-curly';
      case 'md':
      case 'markdown':
        return 'fab fa-markdown';
      case 'css':
      case 'scss':
      case 'sass':
        return 'fab fa-css3-alt';
      case 'html':
      case 'htm':
        return 'fab fa-html5';
      case 'env':
        return 'fas fa-cog';
      case 'txt':
        return 'fas fa-file-alt';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'fas fa-image';
      case 'pdf':
        return 'fas fa-file-pdf';
      case 'zip':
      case 'rar':
      case '7z':
        return 'fas fa-file-archive';
      case 'mp4':
      case 'avi':
      case 'mov':
        return 'fas fa-file-video';
      case 'mp3':
      case 'wav':
      case 'flac':
        return 'fas fa-file-audio';
      default:
        return 'fas fa-file';
    }
  };

  // 获取文件颜色
  const getFileColor = (file: FileItem) => {
    if (file.type === 'folder') return '#ffa502';
    
    switch (file.extension?.toLowerCase()) {
      case 'js':
      case 'jsx':
        return '#f39c12';
      case 'ts':
      case 'tsx':
        return '#3498db';
      case 'json':
        return '#e74c3c';
      case 'md':
      case 'markdown':
        return '#2c3e50';
      case 'css':
      case 'scss':
      case 'sass':
        return '#9b59b6';
      case 'html':
      case 'htm':
        return '#e67e22';
      case 'env':
        return '#27ae60';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return '#8e44ad';
      case 'pdf':
        return '#c0392b';
      case 'zip':
      case 'rar':
      case '7z':
        return '#7f8c8d';
      default:
        return '#95a5a6';
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '--';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 加载文件列表
  const loadFiles = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.readDirectory(path);
      if (result.success) {
        let fileList = result.files.map((file: any) => ({
          ...file,
          modified: new Date(file.modified),
          extension: file.name.includes('.') ? file.name.split('.').pop() : undefined
        }));

        // 过滤隐藏文件
        if (!showHidden) {
          fileList = fileList.filter((file: FileItem) => !file.name.startsWith('.'));
        }

        // 排序：文件夹在前，然后按名称排序
        fileList.sort((a: FileItem, b: FileItem) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        setFiles(fileList);
        setCurrentPath(path);
      } else {
        setError(result.error || '读取目录失败');
      }
    } catch (err) {
      console.error('加载文件列表失败:', err);
      setError('读取目录失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化默认路径
  useEffect(() => {
    const defaultPath = '../'; // 项目根目录
    setCurrentPath(defaultPath);
  }, []);

  // 加载文件当路径改变时
  useEffect(() => {
    if (currentPath) {
      loadFiles(currentPath);
    }
  }, [currentPath, showHidden]);

  // 处理文件点击
  const handleFileClick = async (file: FileItem) => {
    if (file.type === 'folder') {
      setCurrentPath(file.path);
      setSelectedFiles([]);
    } else {
      // 读取文件内容
      try {
        const result = await window.electronAPI.readFile(file.path);
        if (result.success) {
          setEditingFile(file.path);
          setFileContent(result.content);
        } else {
          alert(`无法打开文件: ${result.error}`);
        }
      } catch (err) {
        console.error('读取文件失败:', err);
        alert('读取文件失败');
      }
    }
  };

  // 保存文件内容
  const saveFileContent = async (newContent?: string) => {
    if (!editingFile) return;
    
    const contentToSave = newContent !== undefined ? newContent : fileContent;
    
    try {
      const result = await window.electronAPI.writeFile(editingFile, contentToSave);
      if (result.success) {
        showNotification('文件保存成功！', 'success');
        if (newContent !== undefined) {
          setFileContent(newContent);
        }
        // 刷新文件列表以更新修改时间
        loadFiles(currentPath);
      } else {
        showNotification(`保存失败: ${result.error}`, 'error');
      }
    } catch (err) {
      console.error('保存文件失败:', err);
      showNotification('保存文件失败', 'error');
    }
  };

  // 创建新文件
  const createNewFile = async () => {
    if (!newFileName.trim()) return;
    
    try {
      const filePath = `${currentPath}/${newFileName.trim()}`;
      const result = await window.electronAPI.writeFile(filePath, '');
      
      if (result.success) {
        setNewFileName('');
        setShowNewFileDialog(false);
        loadFiles(currentPath); // 刷新文件列表
        
        // 显示成功通知
        showNotification(`文件创建成功: ${newFileName.trim()}`, 'success');
      } else {
        alert(`创建文件失败: ${result.error}`);
      }
    } catch (err) {
      console.error('创建文件失败:', err);
      alert('创建文件失败');
    }
  };

  // 创建新文件夹
  const createNewFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const folderPath = `${currentPath}/${newFolderName.trim()}`;
      const result = await window.electronAPI.createDirectory(folderPath);
      
      if (result.success) {
        setNewFolderName('');
        setShowNewFolderDialog(false);
        loadFiles(currentPath); // 刷新文件列表
        
        // 显示成功通知
        showNotification(`文件夹创建成功: ${newFolderName.trim()}`, 'success');
      } else {
        alert(`创建文件夹失败: ${result.error}`);
      }
    } catch (err) {
      console.error('创建文件夹失败:', err);
      alert('创建文件夹失败');
    }
  };

  // 删除选中的文件
  const deleteSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    if (confirm(`确定要删除选中的 ${selectedFiles.length} 个项目吗？\n\n注意：此操作不可撤销！`)) {
      try {
        for (const fileName of selectedFiles) {
          const file = files.find(f => f.name === fileName);
          if (file) {
            const result = await window.electronAPI.deleteFileOrFolder(file.path);
            if (!result.success) {
              alert(`删除 ${fileName} 失败: ${result.error}`);
              return;
            }
          }
        }
        
        setSelectedFiles([]);
        loadFiles(currentPath); // 刷新文件列表
        showNotification(`成功删除 ${selectedFiles.length} 个项目`, 'success');
      } catch (err) {
        console.error('删除文件失败:', err);
        alert('删除文件失败');
      }
    }
  };

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : 'var(--win-blue)'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
      max-width: 300px;
    `;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}" 
         style="margin-right: 8px;"></i>
      ${message}
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  // 获取面包屑导航
  const getBreadcrumbs = () => {
    const pathParts = currentPath.split(/[/\\]/).filter(Boolean);
    const breadcrumbs = [];
    
    // 判断操作系统类型
    const isWindows = navigator.userAgent.includes('Windows');
    
    // 添加根目录
    breadcrumbs.push({ 
      name: isWindows ? '根目录' : '/', 
      path: '.' 
    });
    
    let currentBuildPath = '';
    pathParts.forEach((part, index) => {
      if (part === '.') return; // 跳过当前目录标识
      
      currentBuildPath += (currentBuildPath ? '/' : '') + part;
      breadcrumbs.push({ name: part, path: currentBuildPath });
    });
    
    return breadcrumbs;
  };

  // 处理文件选择
  const handleFileSelect = (fileName: string, isCtrlClick: boolean) => {
    if (isCtrlClick) {
      setSelectedFiles(prev => 
        prev.includes(fileName) 
          ? prev.filter(f => f !== fileName)
          : [...prev, fileName]
      );
    } else {
      setSelectedFiles([fileName]);
    }
  };

  // 过滤文件
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 错误状态
  if (error && !loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '20px',
        background: 'var(--win-bg-window)',
        color: 'var(--win-text-primary)'
      }}>
        <i className="fas fa-exclamation-triangle" style={{ 
          fontSize: '48px', 
          color: '#e74c3c', 
          marginBottom: '16px' 
        }}></i>
        <h3 style={{ margin: '0 0 8px 0', color: '#e74c3c' }}>文件管理器出错</h3>
        <p style={{ margin: '0 0 16px 0', textAlign: 'center' }}>{error}</p>
        <button 
          onClick={() => {
            setError(null);
            loadFiles(process.cwd());
          }}
          style={{
            padding: '8px 16px',
            background: 'var(--win-blue)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '0', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--win-bg-window)',
      color: 'var(--win-text-primary)',
      fontFamily: 'var(--win-font-family)'
    }}>
      {/* 文件编辑器模态框 */}
      {editingFile && (
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
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid #3e3e42'
          }}>
            <AdvancedCodeEditor
              content={fileContent}
              fileName={editingFile.split(/[/\\]/).pop() || 'untitled'}
              language={editingFile.split('.').pop() || 'txt'}
              onSave={(content) => saveFileContent(content)}
              onClose={() => setEditingFile(null)}
            />
          </div>
        </div>
      )}

      {/* 新建文件对话框 */}
      {showNewFileDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--win-bg-window)',
            padding: '24px',
            borderRadius: '12px',
            minWidth: '400px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>新建文件</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="输入文件名（如：test.js, README.md）"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--win-border)',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                outline: 'none'
              }}
              onKeyPress={(e) => e.key === 'Enter' && createNewFile()}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewFileDialog(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--win-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={createNewFile}
                style={{
                  padding: '8px 16px',
                  background: 'var(--win-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建文件夹对话框 */}
      {showNewFolderDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--win-bg-window)',
            padding: '24px',
            borderRadius: '12px',
            minWidth: '400px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>新建文件夹</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="输入文件夹名称"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--win-border)',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                outline: 'none'
              }}
              onKeyPress={(e) => e.key === 'Enter' && createNewFolder()}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewFolderDialog(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--win-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={createNewFolder}
                style={{
                  padding: '8px 16px',
                  background: 'var(--win-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

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
              const parentPath = breadcrumbs[breadcrumbs.length - 2].path;
              setCurrentPath(parentPath);
            }
          }}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--win-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          disabled={getBreadcrumbs().length <= 1}
        >
          <i className="fas fa-arrow-left"></i>
          返回
        </button>

        <button
          onClick={() => loadFiles(currentPath)}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--win-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fas fa-sync-alt"></i>
          刷新
        </button>

        <button
          onClick={() => setShowNewFileDialog(true)}
          style={{
            padding: '6px 12px',
            background: 'var(--win-blue)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fas fa-file"></i>
          新建文件
        </button>

        <button
          onClick={() => setShowNewFolderDialog(true)}
          style={{
            padding: '6px 12px',
            background: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fas fa-folder-plus"></i>
          新建文件夹
        </button>

        {selectedFiles.length > 0 && (
          <button
            onClick={deleteSelectedFiles}
            style={{
              padding: '6px 12px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-trash"></i>
            删除 ({selectedFiles.length})
          </button>
        )}

        <div style={{ flex: 1 }}></div>

        {/* 显示隐藏文件切换 */}
        <button
          onClick={() => setShowHidden(!showHidden)}
          style={{
            padding: '6px 12px',
            background: showHidden ? 'var(--win-blue)' : 'transparent',
            color: showHidden ? 'white' : 'var(--win-text-primary)',
            border: '1px solid var(--win-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fas fa-eye"></i>
          {showHidden ? '隐藏' : '显示'}隐藏文件
        </button>

        {/* 搜索框 */}
        <div style={{ position: 'relative' }}>
          <i className="fas fa-search" style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--win-text-muted)',
            fontSize: '14px'
          }}></i>
          <input
            type="text"
            placeholder="搜索文件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px 8px 40px',
              border: '1px solid var(--win-border)',
              borderRadius: '20px',
              fontSize: '14px',
              width: '200px',
              outline: 'none'
            }}
          />
        </div>

        {/* 视图切换 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px',
              background: viewMode === 'list' ? 'var(--win-blue)' : 'transparent',
              color: viewMode === 'list' ? 'white' : 'var(--win-text-primary)',
              border: '1px solid var(--win-border)',
              borderRadius: '4px',
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
              borderRadius: '4px',
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
          <i className="fas fa-folder-open" style={{ color: 'var(--win-blue)', marginRight: '8px' }}></i>
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
                  fontWeight: index === getBreadcrumbs().length - 1 ? '600' : '400',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--win-bg-hover)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
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
        ) : filteredFiles.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'var(--win-text-muted)'
          }}>
            <i className="fas fa-folder-open" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>{searchTerm ? '没有找到匹配的文件' : '此文件夹为空'}</p>
          </div>
        ) : viewMode === 'list' ? (
          // 列表视图
          <div>
            {/* 表头 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 120px 80px',
              gap: '16px',
              padding: '8px 12px',
              background: 'var(--win-bg-card)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--win-text-secondary)',
              marginBottom: '8px'
            }}>
              <div>名称</div>
              <div>大小</div>
              <div>修改日期</div>
              <div>操作</div>
            </div>

            {/* 文件项 */}
            {filteredFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleFileSelect(file.name, false);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 120px 80px',
                  gap: '16px',
                  padding: '8px 12px',
                  background: selectedFiles.includes(file.name) ? 'var(--win-bg-selected)' : 'transparent',
                  borderRadius: '6px',
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
                  <i className={getFileIcon(file)} style={{ 
                    fontSize: '16px',
                    color: getFileColor(file)
                  }}></i>
                  <span>{file.name}</span>
                  {file.extension && (
                    <span style={{
                      fontSize: '10px',
                      background: getFileColor(file),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      marginLeft: '8px'
                    }}>
                      {file.extension.toUpperCase()}
                    </span>
                  )}
                  {file.isHidden && (
                    <span style={{
                      fontSize: '10px',
                      background: '#95a5a6',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      marginLeft: '4px'
                    }}>
                      隐藏
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--win-text-muted)' }}>
                  {formatFileSize(file.size)}
                </div>
                <div style={{ color: 'var(--win-text-muted)' }}>
                  {file.modified.toLocaleDateString()} {file.modified.toLocaleTimeString()}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {file.type === 'file' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileClick(file);
                      }}
                      style={{
                        padding: '4px',
                        background: 'transparent',
                        border: '1px solid var(--win-border)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="编辑"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 网格视图
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '16px'
          }}>
            {filteredFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleFileSelect(file.name, false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px 12px',
                  background: selectedFiles.includes(file.name) ? 'var(--win-bg-selected)' : 'transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'var(--win-transition)',
                  textAlign: 'center',
                  position: 'relative'
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
                <i className={getFileIcon(file)} style={{ 
                  fontSize: '32px',
                  color: getFileColor(file),
                  marginBottom: '8px'
                }}></i>
                <span style={{
                  fontSize: '12px',
                  wordBreak: 'break-word',
                  lineHeight: '1.2',
                  maxWidth: '100%'
                }}>
                  {file.name}
                </span>
                {file.extension && (
                  <span style={{
                    fontSize: '9px',
                    background: getFileColor(file),
                    color: 'white',
                    padding: '1px 4px',
                    borderRadius: '6px',
                    marginTop: '4px'
                  }}>
                    {file.extension.toUpperCase()}
                  </span>
                )}
                {file.isHidden && (
                  <span style={{
                    fontSize: '9px',
                    background: '#95a5a6',
                    color: 'white',
                    padding: '1px 4px',
                    borderRadius: '6px',
                    marginTop: '2px'
                  }}>
                    隐藏
                  </span>
                )}
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
          {filteredFiles.length} 项 {selectedFiles.length > 0 && `(已选择 ${selectedFiles.length} 项)`}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span>当前路径: {currentPath}</span>
          <span>视图: {viewMode === 'list' ? '列表' : '网格'}</span>
          {showHidden && <span>显示隐藏文件</span>}
        </div>
      </div>
    </div>
  );
};

export default RealFileManager;