import React, { useRef, useEffect, useState } from 'react';

interface MonacoEditorProps {
  content: string;
  fileName: string;
  onSave: (content: string) => void;
  onClose: () => void;
  language: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ content, fileName, onSave, onClose, language }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentContent, setCurrentContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);

  // 获取文件语言映射
  const getMonacoLanguage = (lang: string) => {
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'md': 'markdown',
      'txt': 'plaintext',
      'env': 'shell',
      'dockerfile': 'dockerfile',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell'
    };
    return langMap[lang.toLowerCase()] || 'plaintext';
  };

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current) return;

    // 创建简单的代码编辑器（如果Monaco不可用，使用降级方案）
    const createSimpleEditor = () => {
      const container = editorRef.current!;
      container.innerHTML = '';
      
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.cssText = `
        width: 100%;
        height: 100%;
        background: #1e1e1e;
        color: #d4d4d4;
        border: none;
        outline: none;
        resize: none;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.5;
        padding: 20px;
        tab-size: 2;
      `;
      
      textarea.addEventListener('input', (e) => {
        const newContent = (e.target as HTMLTextAreaElement).value;
        setCurrentContent(newContent);
        setHasChanges(newContent !== content);
      });

      textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          handleSave();
        }
        
        // Tab键处理
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + 2;
          
          const newContent = textarea.value;
          setCurrentContent(newContent);
          setHasChanges(newContent !== content);
        }
      });

      container.appendChild(textarea);
      textarea.focus();
    };

    createSimpleEditor();
  }, [content, fileName]);

  const handleSave = () => {
    onSave(currentContent);
    setHasChanges(false);
  };

  // 获取文件类型图标
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      'js': 'fab fa-js-square',
      'ts': 'fab fa-js-square',
      'jsx': 'fab fa-react',
      'tsx': 'fab fa-react',
      'json': 'fas fa-code',
      'css': 'fab fa-css3-alt',
      'html': 'fab fa-html5',
      'md': 'fab fa-markdown',
      'py': 'fab fa-python',
      'txt': 'fas fa-file-alt',
      'env': 'fas fa-cog'
    };
    return icons[ext || ''] || 'fas fa-file';
  };

  // 获取语言颜色
  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      'javascript': '#f7df1e',
      'typescript': '#3178c6',
      'json': '#858585',
      'css': '#1572b6',
      'html': '#e34f26',
      'markdown': '#083fa1',
      'python': '#3776ab',
      'text': '#666666',
      'env': '#4caf50'
    };
    return colors[getMonacoLanguage(language)] || '#007acc';
  };

  return (
    <div style={{ 
      height: '100%', 
      background: '#1e1e1e', 
      color: '#d4d4d4',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
    }}>
      {/* 标签栏 */}
      <div style={{
        height: '35px',
        background: '#2d2d30',
        borderBottom: '1px solid #3e3e42',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1
        }}>
          <i className={getFileIcon(fileName)} style={{ 
            color: getLanguageColor(language),
            fontSize: '16px'
          }}></i>
          <span style={{ fontSize: '13px', color: hasChanges ? '#ffffff' : '#cccccc' }}>
            {fileName}
            {hasChanges && <span style={{ color: '#ffffff', marginLeft: '4px' }}>●</span>}
          </span>
          <span style={{
            fontSize: '11px',
            color: '#858585',
            background: '#3c3c3c',
            padding: '2px 6px',
            borderRadius: '3px',
            marginLeft: '8px'
          }}>
            {getMonacoLanguage(language).toUpperCase()}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#cccccc',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '3px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#e81123';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#cccccc';
          }}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* 工具栏 */}
      <div style={{
        height: '30px',
        background: '#383838',
        borderBottom: '1px solid #3e3e42',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '12px'
      }}>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          style={{
            background: hasChanges ? '#0e639c' : '#383838',
            border: '1px solid #464647',
            color: hasChanges ? '#ffffff' : '#858585',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '3px',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fas fa-save"></i>
          保存
          <span style={{ fontSize: '10px', opacity: 0.7 }}>(Ctrl+S)</span>
        </button>
        
        <div style={{ height: '16px', width: '1px', background: '#464647' }}></div>
        
        <span style={{ fontSize: '11px', color: '#858585' }}>
          {currentContent.length} 字符
        </span>
        
        <div style={{ flex: 1 }}></div>
        
        <span style={{ fontSize: '11px', color: '#858585' }}>
          {getMonacoLanguage(language)}
        </span>
      </div>

      {/* 编辑器容器 */}
      <div ref={editorRef} style={{ flex: 1, overflow: 'hidden' }}></div>

      {/* 状态栏 */}
      <div style={{
        height: '22px',
        background: '#007acc',
        color: '#ffffff',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '16px'
      }}>
        <span>
          <i className="fas fa-check" style={{ marginRight: '6px' }}></i>
          就绪
        </span>
        <div style={{ flex: 1 }}></div>
        <span>{getMonacoLanguage(language)}</span>
        <span>UTF-8</span>
        <span>LF</span>
        {hasChanges && (
          <span style={{ color: '#ffd700' }}>
            <i className="fas fa-circle" style={{ fontSize: '8px', marginRight: '4px' }}></i>
            未保存
          </span>
        )}
      </div>
    </div>
  );
};

export default MonacoEditor;