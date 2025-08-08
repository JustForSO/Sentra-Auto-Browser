import React, { useRef, useEffect, useState, useCallback } from 'react';

interface AdvancedCodeEditorProps {
  content: string;
  fileName: string;
  onSave: (content: string) => void;
  onClose: () => void;
  language: string;
}

const AdvancedCodeEditor: React.FC<AdvancedCodeEditorProps> = ({ 
  content, 
  fileName, 
  onSave, 
  onClose, 
  language 
}) => {
  const [currentContent, setCurrentContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);

  // 更新行号
  const updateLineNumbers = useCallback((text: string) => {
    const lines = text.split('\n');
    setLineNumbers(Array.from({ length: lines.length }, (_, i) => i + 1));
  }, []);

  // 更新光标位置
  const updateCursorPosition = useCallback((textarea: HTMLTextAreaElement) => {
    const text = textarea.value;
    const selectionStart = textarea.selectionStart;
    const textBeforeCursor = text.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    setCursorPosition({ line, column });
    setSelection({ start: textarea.selectionStart, end: textarea.selectionEnd });
  }, []);

  // 同步滚动
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // 处理内容变化
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setCurrentContent(newContent);
    setHasChanges(newContent !== content);
    updateLineNumbers(newContent);
    updateCursorPosition(e.target);
  }, [content, updateLineNumbers, updateCursorPosition]);

  // 处理选择变化
  const handleSelectionChange = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    updateCursorPosition(e.target as HTMLTextAreaElement);
  }, [updateCursorPosition]);

  // 保存文件
  const handleSave = useCallback(async () => {
    try {
      await onSave(currentContent);
      setHasChanges(false);
    } catch (error) {
      console.error('保存失败:', error);
    }
  }, [currentContent, onSave]);

  // 处理键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Tab键处理
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '  '; // 2个空格
      
      const newContent = currentContent.substring(0, start) + spaces + currentContent.substring(end);
      setCurrentContent(newContent);
      setHasChanges(newContent !== content);
      
      // 设置新的光标位置
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
        updateCursorPosition(textarea);
      }, 0);
      return;
    }

    // Shift+Tab 减少缩进
    if (e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // 查找行开始位置
      const beforeCursor = currentContent.substring(0, start);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const lineText = currentContent.substring(lineStart, start);
      
      // 如果行开始有空格，移除2个空格
      if (lineText.startsWith('  ')) {
        const newContent = currentContent.substring(0, lineStart) + 
                          lineText.substring(2) + 
                          currentContent.substring(start);
        setCurrentContent(newContent);
        setHasChanges(newContent !== content);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 2;
          updateCursorPosition(textarea);
        }, 0);
      }
      return;
    }

    // 自动缩进
    if (e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      
      // 获取当前行的缩进
      const beforeCursor = currentContent.substring(0, start);
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.match(/^\s*/)?.[0] || '';
      
      const newContent = currentContent.substring(0, start) + '\n' + indent + currentContent.substring(start);
      setCurrentContent(newContent);
      setHasChanges(newContent !== content);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
        updateCursorPosition(textarea);
      }, 0);
    }
  }, [currentContent, content, handleSave, updateCursorPosition]);

  // 初始化
  useEffect(() => {
    updateLineNumbers(currentContent);
    if (textareaRef.current) {
      updateCursorPosition(textareaRef.current);
    }
  }, [currentContent, updateLineNumbers, updateCursorPosition]);

  // 获取文件类型图标和颜色
  const getFileInfo = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const fileTypes: Record<string, { icon: string; color: string; lang: string }> = {
      'js': { icon: 'fab fa-js-square', color: '#f7df1e', lang: 'JavaScript' },
      'ts': { icon: 'fab fa-js-square', color: '#3178c6', lang: 'TypeScript' },
      'jsx': { icon: 'fab fa-react', color: '#61dafb', lang: 'React JSX' },
      'tsx': { icon: 'fab fa-react', color: '#61dafb', lang: 'React TSX' },
      'json': { icon: 'fas fa-code', color: '#858585', lang: 'JSON' },
      'css': { icon: 'fab fa-css3-alt', color: '#1572b6', lang: 'CSS' },
      'scss': { icon: 'fab fa-sass', color: '#cc6699', lang: 'SCSS' },
      'html': { icon: 'fab fa-html5', color: '#e34f26', lang: 'HTML' },
      'md': { icon: 'fab fa-markdown', color: '#083fa1', lang: 'Markdown' },
      'py': { icon: 'fab fa-python', color: '#3776ab', lang: 'Python' },
      'txt': { icon: 'fas fa-file-alt', color: '#666666', lang: 'Plain Text' },
      'env': { icon: 'fas fa-cog', color: '#4caf50', lang: 'Environment' },
      'yml': { icon: 'fas fa-code', color: '#cb171e', lang: 'YAML' },
      'yaml': { icon: 'fas fa-code', color: '#cb171e', lang: 'YAML' }
    };
    
    return fileTypes[ext || ''] || { icon: 'fas fa-file', color: '#95a5a6', lang: 'Text' };
  };

  const fileInfo = getFileInfo(fileName);
  const selectedText = currentContent.substring(selection.start, selection.end);

  return (
    <div style={{ 
      height: '100%', 
      background: '#1e1e1e', 
      color: '#d4d4d4',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Consolas, "Courier New", Monaco, monospace',
      fontSize: '14px'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <i className={fileInfo.icon} style={{ color: fileInfo.color, fontSize: '16px' }}></i>
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
            {fileInfo.lang}
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
            transition: 'all 0.2s'
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
        gap: '12px',
        fontSize: '12px'
      }}>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          style={{
            background: hasChanges ? '#0e639c' : '#383838',
            border: '1px solid #464647',
            color: hasChanges ? '#ffffff' : '#858585',
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '3px',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <i className="fas fa-save"></i>
          保存 <span style={{ opacity: 0.7 }}>(Ctrl+S)</span>
        </button>
        
        <div style={{ height: '16px', width: '1px', background: '#464647' }}></div>
        
        <span style={{ color: '#858585' }}>
          行 {cursorPosition.line}, 列 {cursorPosition.column}
        </span>
        
        {selectedText && (
          <span style={{ color: '#858585' }}>
            已选择 {selectedText.length} 个字符
          </span>
        )}
        
        <div style={{ flex: 1 }}></div>
        
        <span style={{ color: '#858585' }}>
          {currentContent.length} 字符, {lineNumbers.length} 行
        </span>
      </div>

      {/* 编辑器主体 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 行号栏 */}
        <div 
          ref={lineNumbersRef}
          style={{
            width: '60px',
            background: '#1e1e1e',
            borderRight: '1px solid #3e3e42',
            overflow: 'hidden',
            fontSize: '13px',
            lineHeight: '19px',
            padding: '10px 8px',
            color: '#858585',
            textAlign: 'right',
            userSelect: 'none',
            position: 'relative'
          }}
        >
          {lineNumbers.map((num, index) => (
            <div 
              key={num} 
              style={{ 
                height: '19px',
                background: cursorPosition.line === num ? '#094771' : 'transparent',
                color: cursorPosition.line === num ? '#ffffff' : '#858585',
                paddingRight: '8px'
              }}
            >
              {num}
            </div>
          ))}
        </div>

        {/* 代码编辑区 */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <textarea
            ref={textareaRef}
            value={currentContent}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onSelect={handleSelectionChange}
            onClick={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            style={{
              width: '100%',
              height: '100%',
              background: '#1e1e1e',
              color: '#d4d4d4',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '14px',
              lineHeight: '19px',
              padding: '10px 12px',
              fontFamily: 'inherit',
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              tabSize: 2,
              caretColor: '#ffffff'
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
          {hasChanges ? '已修改' : '已保存'}
        </span>
        
        <div style={{ flex: 1 }}></div>
        
        <span>{fileInfo.lang}</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span>空格: 2</span>
        
        {hasChanges && (
          <span style={{ 
            color: '#ffd700',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <i className="fas fa-circle" style={{ fontSize: '6px' }}></i>
            未保存
          </span>
        )}
      </div>
    </div>
  );
};

export default AdvancedCodeEditor;