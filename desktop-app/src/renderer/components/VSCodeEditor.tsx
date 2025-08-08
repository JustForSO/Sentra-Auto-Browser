import React, { useState, useEffect, useRef } from 'react';

interface VSCodeEditorProps {
  content: string;
  fileName: string;
  onSave: (content: string) => void;
  onClose: () => void;
  language: string;
}

const VSCodeEditor: React.FC<VSCodeEditorProps> = ({ content, fileName, onSave, onClose, language }) => {
  const [editorContent, setEditorContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // 更新行号
  useEffect(() => {
    const lines = editorContent.split('\n');
    setLineNumbers(Array.from({ length: lines.length }, (_, i) => i + 1));
  }, [editorContent]);

  // 同步滚动
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // 处理内容变化
  const handleContentChange = (newContent: string) => {
    setEditorContent(newContent);
    setHasChanges(newContent !== content);
  };

  // 保存文件
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editorContent);
      setHasChanges(false);
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = editorContent.substring(0, start) + '  ' + editorContent.substring(end);
      setEditorContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // 获取语言对应的颜色
  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      'javascript': '#f7df1e',
      'typescript': '#3178c6',
      'json': '#858585',
      'css': '#1572b6',
      'html': '#e34f26',
      'markdown': '#083fa1',
      'python': '#3776ab',
      'txt': '#666666',
      'env': '#4caf50',
      'config': '#ff9800'
    };
    return colors[lang.toLowerCase()] || '#007acc';
  };

  // 获取文件类型图标
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      'js': 'fab fa-js-square',
      'ts': 'fab fa-js-square',
      'json': 'fas fa-code',
      'css': 'fab fa-css3-alt',
      'html': 'fab fa-html5',
      'md': 'fab fa-markdown',
      'py': 'fab fa-python',
      'txt': 'fas fa-file-alt',
      'env': 'fas fa-cog',
      'yml': 'fas fa-file-code',
      'yaml': 'fas fa-file-code'
    };
    return icons[ext || ''] || 'fas fa-file';
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: '#1e1e1e', 
      color: '#d4d4d4',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
    }}>
      {/* 顶部标签栏 */}
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
            {language.toUpperCase()}
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
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
          disabled={!hasChanges || isSaving}
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
          {isSaving ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-save"></i>
          )}
          {isSaving ? '保存中...' : '保存'}
          <span style={{ fontSize: '10px', opacity: 0.7 }}>(Ctrl+S)</span>
        </button>
        
        <div style={{ height: '16px', width: '1px', background: '#464647' }}></div>
        
        <span style={{ fontSize: '11px', color: '#858585' }}>
          行 {editorContent.substring(0, textareaRef.current?.selectionStart || 0).split('\n').length}, 
          列 {(textareaRef.current?.selectionStart || 0) - editorContent.lastIndexOf('\n', (textareaRef.current?.selectionStart || 0) - 1)}
        </span>
        
        <div style={{ flex: 1 }}></div>
        
        <span style={{ fontSize: '11px', color: '#858585' }}>
          {editorContent.length} 字符
        </span>
      </div>

      {/* 编辑器主体 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 行号 */}
        <div 
          ref={lineNumbersRef}
          style={{
            width: '60px',
            background: '#1e1e1e',
            borderRight: '1px solid #3e3e42',
            overflow: 'hidden',
            fontSize: '13px',
            lineHeight: '20px',
            padding: '16px 8px',
            color: '#858585',
            textAlign: 'right',
            userSelect: 'none'
          }}
        >
          {lineNumbers.map(num => (
            <div key={num} style={{ height: '20px' }}>{num}</div>
          ))}
        </div>

        {/* 代码编辑区 */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <textarea
            ref={textareaRef}
            value={editorContent}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            style={{
              width: '100%',
              height: '100%',
              background: '#1e1e1e',
              color: '#d4d4d4',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '14px',
              lineHeight: '20px',
              padding: '16px',
              fontFamily: 'inherit',
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              tabSize: 2
            }}
            spellCheck={false}
            placeholder="开始编写代码..."
          />
        </div>
      </div>

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
        <span>{language}</span>
        <span>UTF-8</span>
        <span>LF</span>
      </div>
    </div>
  );
};

export default VSCodeEditor;