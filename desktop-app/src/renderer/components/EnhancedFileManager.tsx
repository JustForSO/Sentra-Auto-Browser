import React, { useState, useEffect, useRef } from 'react';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  size?: string;
  modified: string;
  path: string;
  extension?: string;
  content?: string;
}

interface EnhancedFileManagerProps {
  initialPath?: string;
}

const EnhancedFileManager: React.FC<EnhancedFileManagerProps> = ({ initialPath = '/' }) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true); // 初始加载状态为true
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 实际的项目文件结构模拟
  const projectFiles: Record<string, FileItem[]> = {
    '/': [
      { name: 'desktop-app', type: 'folder', modified: '2024-01-10', path: '/desktop-app' },
      { name: 'src', type: 'folder', modified: '2024-01-10', path: '/src' },
      { name: 'examples', type: 'folder', modified: '2024-01-10', path: '/examples' },
      { name: 'docs', type: 'folder', modified: '2024-01-10', path: '/docs' },
      { name: 'package.json', type: 'file', size: '2.1 KB', modified: '2024-01-10', path: '/package.json', extension: 'json',
        content: `{
  "name": "sentra-browser",
  "version": "1.0.0",
  "description": "智能浏览器自动化平台",
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "playwright": "^1.40.0",
    "openai": "^4.20.0",
    "typescript": "^5.0.0"
  }
}` },
      { name: 'README.md', type: 'file', size: '4.8 KB', modified: '2024-01-10', path: '/README.md', extension: 'md',
        content: `# Sentra Browser - 智能浏览器自动化平台

## 简介
Sentra Browser 是一个基于AI的智能浏览器自动化平台，支持自然语言控制网页操作。

## 特性
- 🤖 AI驱动的网页自动化
- 🎯 自然语言指令解析
- 🔧 可视化桌面环境
- 📱 多平台支持

## 快速开始
\`\`\`bash
npm install
npm run dev
\`\`\`

## 文档
请查看 docs/ 目录下的详细文档。
` },
      { name: '.env.example', type: 'file', size: '856 B', modified: '2024-01-10', path: '/.env.example', extension: 'env',
        content: `# OpenAI API配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic API配置
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google API配置
GOOGLE_API_KEY=your_google_api_key_here

# 通用配置
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.1
` }
    ],
    '/desktop-app': [
      { name: '..', type: 'folder', modified: '', path: '/' },
      { name: 'src', type: 'folder', modified: '2024-01-10', path: '/desktop-app/src' },
      { name: 'public', type: 'folder', modified: '2024-01-10', path: '/desktop-app/public' },
      { name: 'package.json', type: 'file', size: '1.8 KB', modified: '2024-01-10', path: '/desktop-app/package.json', extension: 'json',
        content: `{
  "name": "sentra-desktop",
  "version": "1.0.0",
  "main": "dist/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "electron .",
    "electron:build": "electron-builder"
  },
  "dependencies": {
    "react": "^18.0.0",
    "electron": "^27.0.0",
    "vite": "^5.0.0"
  }
}` },
      { name: 'vite.config.ts', type: 'file', size: '645 B', modified: '2024-01-10', path: '/desktop-app/vite.config.ts', extension: 'ts',
        content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 3003,
    host: true
  }
});` }
    ],
    '/desktop-app/src': [
      { name: '..', type: 'folder', modified: '', path: '/desktop-app' },
      { name: 'renderer', type: 'folder', modified: '2024-01-10', path: '/desktop-app/src/renderer' },
      { name: 'main.ts', type: 'file', size: '3.2 KB', modified: '2024-01-10', path: '/desktop-app/src/main.ts', extension: 'ts',
        content: `const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow: BrowserWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('dist/index.html');
};

app.whenReady().then(createWindow);` },
      { name: 'preload.ts', type: 'file', size: '1.1 KB', modified: '2024-01-10', path: '/desktop-app/src/preload.ts', extension: 'ts',
        content: `const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content: string) => ipcRenderer.invoke('dialog:saveFile', content),
  getFileContent: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  saveFileContent: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content)
});` }
    ]
  };

  // 获取文件图标
  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') return 'fas fa-folder';
    
    switch (file.extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return 'fab fa-js-square';
      case 'json':
        return 'fas fa-brackets-curly';
      case 'md':
        return 'fab fa-markdown';
      case 'css':
      case 'scss':
        return 'fab fa-css3-alt';
      case 'html':
        return 'fab fa-html5';
      case 'env':
        return 'fas fa-cog';
      case 'txt':
        return 'fas fa-file-alt';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return 'fas fa-image';
      default:
        return 'fas fa-file';
    }
  };

  // 获取文件颜色
  const getFileColor = (file: FileItem) => {
    if (file.type === 'folder') return '#ffa502';
    
    switch (file.extension) {
      case 'js':
      case 'jsx':
        return '#f39c12';
      case 'ts':
      case 'tsx':
        return '#3498db';
      case 'json':
        return '#e74c3c';
      case 'md':
        return '#2c3e50';
      case 'css':
      case 'scss':
        return '#9b59b6';
      case 'html':
        return '#e67e22';
      case 'env':
        return '#27ae60';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return '#8e44ad';
      default:
        return '#95a5a6';
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const timer = setTimeout(() => {
      try {
        const currentFiles = projectFiles[currentPath] || [];
        setFiles(currentFiles);
        setLoading(false);
      } catch (err) {
        console.error('文件加载错误:', err);
        setError('文件加载失败');
        setLoading(false);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentPath]);

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      setCurrentPath(file.path);
      setSelectedFiles([]);
    } else {
      // 打开文件编辑
      setEditingFile(file.path);
      setFileContent(file.content || '');
    }
  };

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

  const saveFileContent = () => {
    if (!editingFile) return;
    
    // 更新文件内容
    const updateFiles = (files: Record<string, FileItem[]>) => {
      for (const path in files) {
        files[path] = files[path].map(file => 
          file.path === editingFile 
            ? { ...file, content: fileContent, modified: new Date().toISOString().split('T')[0] }
            : file
        );
      }
      return files;
    };
    
    updateFiles(projectFiles);
    alert('文件保存成功！');
    setEditingFile(null);
  };

  const createNewFile = () => {
    if (!newFileName.trim()) return;
    
    const extension = newFileName.split('.').pop() || '';
    const newFile: FileItem = {
      name: newFileName,
      type: 'file',
      size: '0 B',
      modified: new Date().toISOString().split('T')[0],
      path: `${currentPath}/${newFileName}`,
      extension,
      content: ''
    };
    
    if (!projectFiles[currentPath]) {
      projectFiles[currentPath] = [];
    }
    
    projectFiles[currentPath].push(newFile);
    setFiles([...projectFiles[currentPath]]);
    setNewFileName('');
    setShowNewFileDialog(false);
  };

  const deleteSelectedFiles = () => {
    if (selectedFiles.length === 0) return;
    
    if (confirm(`确定要删除选中的 ${selectedFiles.length} 个文件吗？`)) {
      projectFiles[currentPath] = projectFiles[currentPath].filter(
        file => !selectedFiles.includes(file.name)
      );
      setFiles([...projectFiles[currentPath]]);
      setSelectedFiles([]);
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

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 错误状态
  if (error) {
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
            setCurrentPath('/');
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
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '90%',
            height: '80%',
            background: 'var(--win-bg-window)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            {/* 编辑器头部 */}
            <div style={{
              padding: '16px 20px',
              background: 'var(--win-bg-card)',
              borderBottom: '1px solid var(--win-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>
                <i className={getFileIcon(files.find(f => f.path === editingFile) || {} as FileItem)} 
                   style={{ marginRight: '8px', color: getFileColor(files.find(f => f.path === editingFile) || {} as FileItem) }}></i>
                编辑文件: {editingFile.split('/').pop()}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={saveFileContent}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--win-blue)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <i className="fas fa-save" style={{ marginRight: '6px' }}></i>
                  保存
                </button>
                <button
                  onClick={() => setEditingFile(null)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: 'var(--win-text-secondary)',
                    border: '1px solid var(--win-border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
            
            {/* 编辑器内容 */}
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              style={{
                flex: 1,
                padding: '20px',
                border: 'none',
                outline: 'none',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '14px',
                lineHeight: '1.5',
                background: '#1e1e1e',
                color: '#d4d4d4',
                resize: 'none'
              }}
              placeholder="在此编辑文件内容..."
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
            borderRadius: '6px',
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
          onClick={() => {
            setLoading(true);
            setTimeout(() => {
              setFiles([...projectFiles[currentPath] || []]);
              setLoading(false);
            }, 200);
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
          <i className="fas fa-plus"></i>
          新建
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
            删除
          </button>
        )}

        <div style={{ flex: 1 }}></div>

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
                key={file.name}
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
                </div>
                <div style={{ color: 'var(--win-text-muted)' }}>
                  {file.size || '--'}
                </div>
                <div style={{ color: 'var(--win-text-muted)' }}>
                  {file.modified || '--'}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {file.type === 'file' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFile(file.path);
                        setFileContent(file.content || '');
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
                {file.type === 'file' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFile(file.path);
                      setFileContent(file.content || '');
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                    title="编辑"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
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
        </div>
      </div>
    </div>
  );
};

export default EnhancedFileManager;