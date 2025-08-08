import React, { useState, useEffect, useRef } from 'react';
import AdvancedCodeEditor from './AdvancedCodeEditor';
import '../styles/WindowsFileManager.css';
import '../styles/dialog.css';
import '../styles/properties-dialog.css';

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

type SortField = 'name' | 'type' | 'size' | 'modified';
type SortOrder = 'asc' | 'desc';

const WindowsFileManager: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, file?: FileItem} | null>(null);
  const [showInputDialog, setShowInputDialog] = useState<{type: 'folder' | 'file', show: boolean}>({type: 'folder', show: false});
  const [inputValue, setInputValue] = useState('');
  const [showPropertiesDialog, setShowPropertiesDialog] = useState<{show: boolean, file?: FileItem}>({show: false});

  const sortMenuRef = useRef<HTMLDivElement>(null);

  // 统一的导航函数，避免竞态条件
  const navigateToPath = async (newPath: string) => {
    try {
      setLoading(true);
      setError('');
      
      const requestPath = newPath === '' ? '../' : `../${newPath}`;
      console.log('导航到路径:', newPath, '请求路径:', requestPath);
      
      const result = await window.electronAPI.readDirectory(requestPath);
      
      if (result.success) {
        // 只有在成功加载文件后才更新路径状态
        setCurrentPath(newPath);
        setFiles(result.files);
        setSelectedFiles([]); // 清空选中状态
      } else {
        setError(result.error || '加载文件失败');
        console.error('导航失败:', result.error);
      }
    } catch (err: any) {
      setError(err?.message || '未知错误');
      console.error('导航失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 加载文件列表（用于刷新当前目录）
  const loadFiles = async (path: string = currentPath) => {
    await navigateToPath(path);
  };

  // 初始化
  useEffect(() => {
    loadFiles('');
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
      
      // 检查是否点击在右键菜单外部
      const target = event.target as HTMLElement;
      const contextMenuElement = target.closest('.context-menu');
      if (!contextMenuElement && contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  // 处理文件/文件夹点击
  const handleItemClick = async (file: FileItem, event?: React.MouseEvent) => {
    if (event?.ctrlKey) {
      // Ctrl+点击多选
      setSelectedFiles(prev => 
        prev.includes(file.name) 
          ? prev.filter(name => name !== file.name)
          : [...prev, file.name]
      );
      return;
    }

    setSelectedFiles([file.name]);

    if (file.type === 'folder') {
      // 导航到文件夹
      const newPath = currentPath === '' ? file.name : `${currentPath}/${file.name}`;
      console.log('点击文件夹，导航到:', newPath);
      await navigateToPath(newPath);
    }
  };

  // 双击打开文件
  const handleItemDoubleClick = async (file: FileItem) => {
    if (file.type === 'file') {
      await openFileForEdit(file);
    } else {
      handleItemClick(file);
    }
  };

  // 右键菜单
  const handleContextMenu = (event: React.MouseEvent, file?: FileItem) => {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡，避免触发全局右键菜单
    
    // 获取文件管理器容器的位置
    const fileManagerElement = (event.currentTarget as HTMLElement).closest('.file-manager');
    const rect = fileManagerElement?.getBoundingClientRect();
    
    // 计算相对于文件管理器容器的坐标
    const x = rect ? event.clientX - rect.left : event.clientX;
    const y = rect ? event.clientY - rect.top : event.clientY;
    
    console.log('右键菜单位置:', { 
      clientX: event.clientX, 
      clientY: event.clientY, 
      rectLeft: rect?.left, 
      rectTop: rect?.top, 
      finalX: x, 
      finalY: y 
    });
    
    setContextMenu({ x, y, file });
  };

  // 新建文件夹
  const createNewFolder = async () => {
    setInputValue('新建文件夹');
    setShowInputDialog({type: 'folder', show: true});
    setContextMenu(null);
  };

  // 确认创建文件夹
  const confirmCreateFolder = async () => {
    if (!inputValue.trim()) {
      setShowInputDialog({type: 'folder', show: false});
      return;
    }

    try {
      const folderPath = currentPath === '' ? `../${inputValue.trim()}` : `../${currentPath}/${inputValue.trim()}`;
      const result = await window.electronAPI.createDirectory(folderPath);
      
      if (result.success) {
        showNotification(`文件夹 "${inputValue.trim()}" 创建成功`, 'success');
        loadFiles(currentPath); // 刷新文件列表
      } else {
        showNotification(`创建文件夹失败: ${result.error}`, 'error');
      }
    } catch (err: any) {
      console.error('创建文件夹失败:', err);
      showNotification('创建文件夹失败', 'error');
    }
    setShowInputDialog({type: 'folder', show: false});
  };

  // 新建文件
  const createNewFile = async () => {
    setInputValue('新建文档.txt');
    setShowInputDialog({type: 'file', show: true});
    setContextMenu(null);
  };

  // 确认创建文件
  const confirmCreateFile = async () => {
    if (!inputValue.trim()) {
      setShowInputDialog({type: 'file', show: false});
      return;
    }

    try {
      const filePath = currentPath === '' ? `../${inputValue.trim()}` : `../${currentPath}/${inputValue.trim()}`;
      const result = await window.electronAPI.writeFile(filePath, '');
      
      if (result.success) {
        showNotification(`文件 "${inputValue.trim()}" 创建成功`, 'success');
        loadFiles(currentPath); // 刷新文件列表
      } else {
        showNotification(`创建文件失败: ${result.error}`, 'error');
      }
    } catch (err: any) {
      console.error('创建文件失败:', err);
      showNotification('创建文件失败', 'error');
    }
    setShowInputDialog({type: 'file', show: false});
  };

  // 查看文件属性
  const showFileProperties = (file: FileItem) => {
    setShowPropertiesDialog({show: true, file});
    setContextMenu(null);
  };

  // 格式化文件大小（详细版）
  const formatFileSizeDetailed = (bytes?: number) => {
    if (!bytes) return '0 字节';
    const sizes = ['字节', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${size} ${sizes[i]} (${bytes.toLocaleString()} 字节)`;
  };

  // 获取文件扩展名
  const getFileExtension = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext ? `.${ext}` : '无扩展名';
  };



  // 删除文件/文件夹
  const deleteItem = async (file: FileItem) => {
    const confirmMessage = file.type === 'folder' 
      ? `确定要删除文件夹 "${file.name}" 吗？\n\n此操作不可撤销。`
      : `确定要删除文件 "${file.name}" 吗？\n\n此操作不可撤销。`;
    
    if (!confirm(confirmMessage)) return;

    try {
      const itemPath = currentPath === '' ? `../${file.name}` : `../${currentPath}/${file.name}`;
      const result = await window.electronAPI.deleteFileOrFolder(itemPath);
      
      if (result.success) {
        showNotification(`${file.type === 'folder' ? '文件夹' : '文件'} "${file.name}" 删除成功`, 'success');
        loadFiles(currentPath); // 刷新文件列表
        setSelectedFiles(prev => prev.filter(name => name !== file.name));
      } else {
        showNotification(`删除失败: ${result.error}`, 'error');
      }
    } catch (err: any) {
      console.error('删除失败:', err);
      showNotification('删除失败', 'error');
    }
    setContextMenu(null);
  };

  // 打开文件进行编辑
  const openFileForEdit = async (file: FileItem) => {
    try {
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
        setOpenFile(prev => prev ? { ...prev, content } : null);
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
    const breadcrumbs = [{ name: '根目录', path: '' }];
    
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

  // 排序文件
  const sortFiles = (files: FileItem[]): FileItem[] => {
    return [...files].sort((a, b) => {
      // 文件夹优先
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;

      let compareValue = 0;
      
      switch (sortField) {
        case 'name':
          compareValue = a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
          break;
        case 'type':
          const extA = a.name.split('.').pop()?.toLowerCase() || '';
          const extB = b.name.split('.').pop()?.toLowerCase() || '';
          compareValue = extA.localeCompare(extB);
          break;
        case 'size':
          compareValue = (a.size || 0) - (b.size || 0);
          break;
        case 'modified':
          compareValue = new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  };

  // 过滤和排序文件
  const getProcessedFiles = () => {
    let filtered = files.filter(file => {
      if (!showHidden && file.isHidden) return false;
      if (searchTerm && !file.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
    
    return sortFiles(filtered);
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
      'yaml': { icon: 'fas fa-code', color: '#cb171e' },
      'pdf': { icon: 'fas fa-file-pdf', color: '#dc3545' },
      'doc': { icon: 'fas fa-file-word', color: '#1f5582' },
      'docx': { icon: 'fas fa-file-word', color: '#1f5582' },
      'xls': { icon: 'fas fa-file-excel', color: '#0f6940' },
      'xlsx': { icon: 'fas fa-file-excel', color: '#0f6940' },
      'ppt': { icon: 'fas fa-file-powerpoint', color: '#c43e1c' },
      'pptx': { icon: 'fas fa-file-powerpoint', color: '#c43e1c' },
      'zip': { icon: 'fas fa-file-archive', color: '#6c757d' },
      'rar': { icon: 'fas fa-file-archive', color: '#6c757d' },
      '7z': { icon: 'fas fa-file-archive', color: '#6c757d' },
      'png': { icon: 'fas fa-file-image', color: '#e91e63' },
      'jpg': { icon: 'fas fa-file-image', color: '#e91e63' },
      'jpeg': { icon: 'fas fa-file-image', color: '#e91e63' },
      'gif': { icon: 'fas fa-file-image', color: '#e91e63' },
      'svg': { icon: 'fas fa-file-image', color: '#e91e63' },
      'mp3': { icon: 'fas fa-file-audio', color: '#9c27b0' },
      'wav': { icon: 'fas fa-file-audio', color: '#9c27b0' },
      'mp4': { icon: 'fas fa-file-video', color: '#ff5722' },
      'avi': { icon: 'fas fa-file-video', color: '#ff5722' }
    };

    return iconMap[ext || ''] || { icon: 'fas fa-file', color: '#6c757d' };
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

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 获取文件类型
  const getFileType = (fileName: string, isFolder: boolean) => {
    if (isFolder) return '文件夹';
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'js': 'JavaScript 文件',
      'ts': 'TypeScript 文件',
      'jsx': 'React JSX 文件',
      'tsx': 'React TSX 文件',
      'json': 'JSON 文件',
      'css': 'CSS 样式表',
      'html': 'HTML 文档',
      'md': 'Markdown 文档',
      'txt': '文本文件',
      'pdf': 'PDF 文档',
      'png': 'PNG 图像',
      'jpg': 'JPEG 图像',
      'jpeg': 'JPEG 图像',
      'gif': 'GIF 图像',
      'svg': 'SVG 矢量图',
      'mp4': 'MP4 视频',
      'mp3': 'MP3 音频',
      'wav': 'WAV 音频',
      'zip': 'ZIP 压缩包',
      'rar': 'RAR 压缩包',
      '7z': '7Z 压缩包',
      'exe': '可执行文件',
      'msi': 'Windows 安装包',
      'xml': 'XML 文档',
      'yml': 'YAML 文件',
      'yaml': 'YAML 文件'
    };
    
    return typeMap[ext || ''] || `${ext?.toUpperCase() || ''} 文件`;
  };

  const processedFiles = getProcessedFiles();

  return (
    <div className="windows-file-manager">
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
      <div className="file-manager-toolbar">
        <div className="toolbar-section">
          <button
            className="toolbar-button"
            onClick={goBack}
            disabled={currentPath === ''}
          >
            <i className="fas fa-arrow-left"></i>
            返回
          </button>
          
          <button
            className="toolbar-button"
            onClick={() => loadFiles(currentPath)}
          >
            <i className="fas fa-sync-alt"></i>
            刷新
          </button>
        </div>

        <div className="toolbar-separator"></div>

        {/* 面包屑导航 */}
        <div className="breadcrumb-nav">
          {getBreadcrumbs().map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="breadcrumb-separator">›</span>}
              <div
                className="breadcrumb-item"
                onClick={async () => {
                  console.log('点击面包屑，导航到:', crumb.path);
                  await navigateToPath(crumb.path);
                }}
              >
                {index === 0 && <i className="fas fa-home" style={{ fontSize: '12px' }}></i>}
                {crumb.name}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="搜索文件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search search-icon"></i>
        </div>

        <div className="toolbar-separator"></div>

        {/* 排序控制 */}
        <div className="sort-dropdown" ref={sortMenuRef}>
          <button
            className="sort-button"
            onClick={() => setShowSortMenu(!showSortMenu)}
          >
            <i className="fas fa-sort"></i>
            排序
            <i className="fas fa-chevron-down" style={{ fontSize: '10px' }}></i>
          </button>
          
          {showSortMenu && (
            <div className="sort-menu">
              {[
                { field: 'name' as SortField, label: '名称' },
                { field: 'type' as SortField, label: '类型' },
                { field: 'size' as SortField, label: '大小' },
                { field: 'modified' as SortField, label: '修改时间' }
              ].map(option => (
                <div
                  key={option.field}
                  className={`sort-option ${sortField === option.field ? 'active' : ''}`}
                  onClick={() => {
                    if (sortField === option.field) {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField(option.field);
                      setSortOrder('asc');
                    }
                    setShowSortMenu(false);
                  }}
                >
                  <span>{option.label}</span>
                  {sortField === option.field && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 视图控制 */}
        <div className="view-controls">
          <button
            className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <i className="fas fa-list"></i>
          </button>
          <button
            className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <i className="fas fa-th"></i>
          </button>
        </div>

        <div className="toolbar-separator"></div>

        {/* 显示隐藏文件 */}
        <div className="checkbox-container">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          <span>隐藏项目</span>
        </div>
      </div>

      {/* 文件列表容器 */}
      <div className="file-list-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>加载中...</span>
          </div>
        ) : error ? (
          <div className="error-container">
            <i className="error-icon fas fa-exclamation-triangle"></i>
            <div className="error-message">{error}</div>
            <button className="retry-button" onClick={() => loadFiles(currentPath)}>
              重试
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <>
            <div className="list-header">
              <div className="header-cell sortable">名称</div>
              <div className="header-cell sortable">类型</div>
              <div className="header-cell sortable">修改时间</div>
              <div className="header-cell sortable">大小</div>
            </div>
            <div 
              className="file-list"
              onContextMenu={(e) => {
                // 检查是否点击在空白区域
                const target = e.target as HTMLElement;
                const isFileItem = target.closest('.file-item');
                if (!isFileItem) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleContextMenu(e); // 空白区域右键菜单
                }
              }}
            >
              {processedFiles.map((file, index) => {
                const fileIcon = getFileIcon(file.name, file.type === 'folder');
                const isSelected = selectedFiles.includes(file.name);
                
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className={`file-item ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => handleItemClick(file, e)}
                    onDoubleClick={() => handleItemDoubleClick(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                  >
                    <div className="file-info">
                      <i className={`file-icon ${fileIcon.icon}`} style={{ color: fileIcon.color }}></i>
                      <span className="file-name">{file.name}</span>
                    </div>
                    <div className="file-type">{getFileType(file.name, file.type === 'folder')}</div>
                    <div className="file-date">{formatDate(file.modified)}</div>
                    <div className="file-size">{formatFileSize(file.size)}</div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div 
            className="file-grid"
            onContextMenu={(e) => {
              // 检查是否点击在空白区域
              const target = e.target as HTMLElement;
              const isGridItem = target.closest('.grid-item');
              if (!isGridItem) {
                e.preventDefault();
                e.stopPropagation();
                handleContextMenu(e); // 空白区域右键菜单
              }
            }}
          >
            {processedFiles.map((file, index) => {
              const fileIcon = getFileIcon(file.name, file.type === 'folder');
              const isSelected = selectedFiles.includes(file.name);
              
              return (
                <div
                  key={`${file.name}-${index}`}
                  className={`grid-item ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => handleItemClick(file, e)}
                  onDoubleClick={() => handleItemDoubleClick(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <i className={`grid-icon ${fileIcon.icon}`} style={{ color: fileIcon.color }}></i>
                  <div className="grid-name">{file.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="status-bar">
        <span>当前位置: {currentPath || '根目录'}</span>
        <span>{processedFiles.length} 个项目 {selectedFiles.length > 0 && `(已选择 ${selectedFiles.length} 个)`}</span>
      </div>

      {/* 输入对话框 */}
      {showInputDialog.show && (
        <div className="dialog-overlay">
          <div className="input-dialog">
            <div className="dialog-header">
              <h3>{showInputDialog.type === 'folder' ? '新建文件夹' : '新建文件'}</h3>
            </div>
            <div className="dialog-body">
              <label>请输入{showInputDialog.type === 'folder' ? '文件夹' : '文件'}名称:</label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    showInputDialog.type === 'folder' ? confirmCreateFolder() : confirmCreateFile();
                  } else if (e.key === 'Escape') {
                    setShowInputDialog({type: 'folder', show: false});
                  }
                }}
                autoFocus
                className="dialog-input"
              />
            </div>
            <div className="dialog-footer">
              <button 
                className="dialog-button primary"
                onClick={showInputDialog.type === 'folder' ? confirmCreateFolder : confirmCreateFile}
              >
                创建
              </button>
              <button 
                className="dialog-button"
                onClick={() => setShowInputDialog({type: 'folder', show: false})}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文件属性对话框 */}
      {showPropertiesDialog.show && showPropertiesDialog.file && (
        <div className="dialog-overlay">
          <div className="properties-dialog">
            <div className="dialog-header">
              <div className="properties-header-content">
                <i className={`properties-icon ${getFileIcon(showPropertiesDialog.file.name, showPropertiesDialog.file.type === 'folder').icon}`} 
                   style={{ color: getFileIcon(showPropertiesDialog.file.name, showPropertiesDialog.file.type === 'folder').color }}></i>
                <h3>{showPropertiesDialog.file.name}</h3>
              </div>
              <button 
                className="dialog-close-btn"
                onClick={() => setShowPropertiesDialog({show: false})}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="properties-body">
              <div className="properties-section">
                <h4>基本信息</h4>
                <div className="properties-grid">
                  <div className="property-item">
                    <span className="property-label">名称:</span>
                    <span className="property-value">{showPropertiesDialog.file.name}</span>
                  </div>
                  <div className="property-item">
                    <span className="property-label">类型:</span>
                    <span className="property-value">{getFileType(showPropertiesDialog.file.name, showPropertiesDialog.file.type === 'folder')}</span>
                  </div>
                  {showPropertiesDialog.file.type === 'file' && (
                    <>
                      <div className="property-item">
                        <span className="property-label">扩展名:</span>
                        <span className="property-value">{getFileExtension(showPropertiesDialog.file.name)}</span>
                      </div>
                      <div className="property-item">
                        <span className="property-label">大小:</span>
                        <span className="property-value">{formatFileSizeDetailed(showPropertiesDialog.file.size)}</span>
                      </div>
                    </>
                  )}
                  <div className="property-item">
                    <span className="property-label">修改时间:</span>
                    <span className="property-value">{formatDate(showPropertiesDialog.file.modified)}</span>
                  </div>
                  <div className="property-item">
                    <span className="property-label">位置:</span>
                    <span className="property-value">{currentPath || '根目录'}</span>
                  </div>
                </div>
              </div>
              
              <div className="properties-section">
                <h4>详细信息</h4>
                <div className="properties-grid">
                  <div className="property-item">
                    <span className="property-label">完整路径:</span>
                    <span className="property-value path-value">{showPropertiesDialog.file.path}</span>
                  </div>
                  {showPropertiesDialog.file.isHidden && (
                    <div className="property-item">
                      <span className="property-label">隐藏文件:</span>
                      <span className="property-value">是</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button 
                className="dialog-button primary"
                onClick={() => setShowPropertiesDialog({show: false})}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'absolute',
            left: Math.min(contextMenu.x, 800 - 220), // 限制在文件管理器容器内
            top: Math.min(contextMenu.y, 600 - 200),  // 限制在文件管理器容器内
            zIndex: 1000
          }}
        >
          {contextMenu.file ? (
            <>
              <div className="context-menu-item" onClick={() => {
                handleItemDoubleClick(contextMenu.file!);
                setContextMenu(null);
              }}>
                <i className="fas fa-folder-open"></i>
                打开
              </div>
              <div className="context-menu-separator"></div>
              <div className="context-menu-item disabled">
                <i className="fas fa-cut"></i>
                剪切
              </div>
              <div className="context-menu-item disabled">
                <i className="fas fa-copy"></i>
                复制
              </div>
              <div className="context-menu-separator"></div>
              <div className="context-menu-item" onClick={() => {
                deleteItem(contextMenu.file!);
                // deleteItem 已经包含 setContextMenu(null)
              }}>
                <i className="fas fa-trash"></i>
                删除
              </div>
              <div className="context-menu-separator"></div>
              <div className="context-menu-item" onClick={() => showFileProperties(contextMenu.file!)}>
                <i className="fas fa-info-circle"></i>
                属性
              </div>
            </>
          ) : (
            <>
              <div className="context-menu-item" onClick={() => {
                loadFiles(currentPath);
                setContextMenu(null);
              }}>
                <i className="fas fa-sync-alt"></i>
                刷新
              </div>
              <div className="context-menu-separator"></div>
              <div className="context-menu-item disabled">
                <i className="fas fa-paste"></i>
                粘贴
              </div>
              <div className="context-menu-separator"></div>
              <div className="context-menu-item" onClick={() => {
                createNewFolder();
                // createNewFolder 已经包含 setContextMenu(null)
              }}>
                <i className="fas fa-folder-plus"></i>
                新建文件夹
              </div>
              <div className="context-menu-item" onClick={() => {
                createNewFile();
                // createNewFile 已经包含 setContextMenu(null)
              }}>
                <i className="fas fa-file"></i>
                新建文件
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WindowsFileManager;