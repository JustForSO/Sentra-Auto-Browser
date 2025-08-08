import React, { useState, useEffect } from 'react';

interface CommandTemplate {
  id: string;
  name: string;
  description: string;
  command: string;
  category: string;
  args?: Array<{
    name: string;
    description: string;
    required?: boolean;
    type?: 'text' | 'boolean' | 'number';
    default?: string;
  }>;
}

interface CommandHistory {
  id: string;
  command: string;
  timestamp: Date;
  status: 'running' | 'success' | 'error';
  output: string;
  error: string;
  duration?: number;
}

const CommandRunner: React.FC = () => {
  const [selectedCommand, setSelectedCommand] = useState<string>('');
  const [customCommand, setCustomCommand] = useState<string>('');
  const [commandArgs, setCommandArgs] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 监听命令输出
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.onCommandOutput) {
      const handleCommandOutput = (data: { processId: string; type: 'stdout' | 'stderr'; data: string }) => {
        setHistory(prev => prev.map(item => {
          if (item.id === data.processId) {
            return {
              ...item,
              output: data.type === 'stdout' ? item.output + data.data : item.output,
              error: data.type === 'stderr' ? item.error + data.data : item.error
            };
          }
          return item;
        }));
      };
      
      window.electronAPI.onCommandOutput(handleCommandOutput);
    }
  }, []);

  // 真实的CLI命令模板
  const commandTemplates: CommandTemplate[] = [
    // 基础命令
    {
      id: 'run',
      name: '执行任务',
      description: '执行自动化浏览器任务',
      command: 'sentra-auto run',
      category: '基础命令',
      args: [
        { name: 'task', description: '任务描述', required: true, type: 'text' },
        { name: 'headless', description: '无头模式', type: 'boolean', default: 'true' },
        { name: 'visible', description: '可见模式', type: 'boolean' },
        { name: 'debug', description: '调试模式', type: 'boolean' },
        { name: 'max-steps', description: '最大步数', type: 'number', default: '50' }
      ]
    },
    {
      id: 'test',
      name: '测试连接',
      description: '测试浏览器和LLM连接',
      command: 'sentra-auto test',
      category: '基础命令'
    },
    {
      id: 'config',
      name: '查看配置',
      description: '显示当前配置信息',
      command: 'sentra-auto config',
      category: '基础命令',
      args: [
        { name: 'all', description: '显示所有环境变量', type: 'boolean' },
        { name: 'env', description: '显示环境变量详情', type: 'boolean' }
      ]
    },

    // 插件命令
    {
      id: 'plugin-list',
      name: '插件列表',
      description: '列出所有可用插件',
      command: 'sentra-auto plugin --list',
      category: '插件管理'
    },
    {
      id: 'plugin-install',
      name: '安装插件',
      description: '安装指定插件',
      command: 'sentra-auto plugin --install',
      category: '插件管理',
      args: [
        { name: 'name', description: '插件名称', required: true, type: 'text' }
      ]
    },
    {
      id: 'plugin-remove',
      name: '移除插件',
      description: '移除指定插件',
      command: 'sentra-auto plugin --remove',
      category: '插件管理',
      args: [
        { name: 'name', description: '插件名称', required: true, type: 'text' }
      ]
    },

    // 调试命令
    {
      id: 'debug-browser',
      name: '调试浏览器',
      description: '启动浏览器调试模式',
      command: 'sentra-auto run --debug --visible',
      category: '调试工具',
      args: [
        { name: 'task', description: '调试任务', required: true, type: 'text' },
        { name: 'port', description: '调试端口', type: 'number', default: '9222' }
      ]
    },
    {
      id: 'debug-llm',
      name: '调试LLM',
      description: '测试LLM响应',
      command: 'sentra-auto test --llm-debug',
      category: '调试工具'
    },

    // 高级命令
    {
      id: 'batch-run',
      name: '批量执行',
      description: '批量执行多个任务',
      command: 'sentra-auto batch',
      category: '高级功能',
      args: [
        { name: 'file', description: '任务文件路径', required: true, type: 'text' },
        { name: 'parallel', description: '并行执行', type: 'boolean' },
        { name: 'max-concurrent', description: '最大并发数', type: 'number', default: '3' }
      ]
    },
    {
      id: 'export-config',
      name: '导出配置',
      description: '导出当前配置到文件',
      command: 'sentra-auto config --export',
      category: '高级功能',
      args: [
        { name: 'output', description: '输出文件路径', type: 'text', default: './sentra-config.json' }
      ]
    },
    {
      id: 'import-config',
      name: '导入配置',
      description: '从文件导入配置',
      command: 'sentra-auto config --import',
      category: '高级功能',
      args: [
        { name: 'file', description: '配置文件路径', required: true, type: 'text' }
      ]
    }
  ];

  const categories = ['all', ...Array.from(new Set(commandTemplates.map(cmd => cmd.category)))];

  const filteredCommands = commandTemplates.filter(cmd => 
    selectedCategory === 'all' || cmd.category === selectedCategory
  );

  const buildCommand = (template: CommandTemplate): string => {
    let command = template.command;
    
    if (template.args) {
      template.args.forEach(arg => {
        const value = commandArgs[arg.name];
        if (value) {
          if (arg.type === 'boolean') {
            if (value === 'true') {
              command += ` --${arg.name}`;
            }
          } else {
            command += ` --${arg.name} "${value}"`;
          }
        }
      });
    }

    return command;
  };

  const executeCommand = async (command: string) => {
    const historyItem: CommandHistory = {
      id: Date.now().toString(),
      command,
      timestamp: new Date(),
      status: 'running',
      output: '',
      error: ''
    };

    setHistory(prev => [historyItem, ...prev]);
    setIsRunning(true);

    const startTime = Date.now();

    try {
      if (window.electronAPI?.executeCommand) {
        // 真实命令执行
        const result = await window.electronAPI.executeCommand(command);
        const duration = Date.now() - startTime;
        
        setHistory(prev => prev.map(item => 
          item.id === historyItem.id 
            ? { 
                ...item, 
                status: result.success ? 'success' : 'error',
                output: result.output || '',
                error: result.errorOutput || '',
                duration 
              }
            : item
        ));
      } else {
        // 模拟命令执行
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        const duration = Date.now() - startTime;
        const isSuccess = Math.random() > 0.3; // 70% 成功率

        setHistory(prev => prev.map(item => 
          item.id === historyItem.id 
            ? { 
                ...item, 
                status: isSuccess ? 'success' : 'error',
                output: isSuccess 
                  ? `命令执行成功: ${command}\n执行时间: ${duration}ms\n输出: 任务完成` 
                  : '',
                error: isSuccess 
                  ? '' 
                  : `命令执行失败: ${command}\n错误: 模拟错误信息`,
                duration 
              }
            : item
        ));
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      setHistory(prev => prev.map(item => 
        item.id === historyItem.id 
          ? { 
              ...item, 
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
              duration 
            }
          : item
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCommand = () => {
    const template = commandTemplates.find(cmd => cmd.id === selectedCommand);
    const command = template ? buildCommand(template) : customCommand;
    
    if (command.trim()) {
      executeCommand(command);
    }
  };

  const clearHistory = () => {
    if (confirm('确定要清空命令历史吗？')) {
      setHistory([]);
    }
  };

  const getStatusColor = (status: CommandHistory['status']) => {
    switch (status) {
      case 'running': return 'var(--warning)';
      case 'success': return 'var(--success)';
      case 'error': return 'var(--error)';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusText = (status: CommandHistory['status']) => {
    switch (status) {
      case 'running': return '运行中';
      case 'success': return '成功';
      case 'error': return '失败';
      default: return '未知';
    }
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">命令执行器</h2>
            <p className="card-subtitle">执行 Sentra Auto Browser CLI 命令</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-danger btn-sm" onClick={clearHistory}>
              清空历史
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleRunCommand}
              disabled={isRunning || (!selectedCommand && !customCommand.trim())}
            >
              {isRunning ? '执行中...' : '执行命令'}
            </button>
          </div>
        </div>

        <div className="config-section">
          <h3>命令选择</h3>
          
          <div className="flex gap-4 mb-4">
            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? '所有分类' : category}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <select
              className="input"
              value={selectedCommand}
              onChange={(e) => {
                setSelectedCommand(e.target.value);
                setCommandArgs({});
              }}
            >
              <option value="">选择预设命令...</option>
              {filteredCommands.map(cmd => (
                <option key={cmd.id} value={cmd.id}>
                  {cmd.name} - {cmd.description}
                </option>
              ))}
            </select>
          </div>

          {selectedCommand && (() => {
            const template = commandTemplates.find(cmd => cmd.id === selectedCommand);
            return template && template.args && (
              <div className="mb-4">
                <h4 className="mb-3">命令参数</h4>
                {template.args.map(arg => (
                  <div key={arg.name} className="config-item">
                    <div>
                      <div className="config-key">
                        --{arg.name}
                        {arg.required && <span className="tag" style={{ marginLeft: '8px', background: 'var(--error)' }}>必需</span>}
                      </div>
                      <div className="config-description">{arg.description}</div>
                    </div>
                    {arg.type === 'boolean' ? (
                      <select
                        className="input"
                        value={commandArgs[arg.name] || ''}
                        onChange={(e) => setCommandArgs(prev => ({
                          ...prev,
                          [arg.name]: e.target.value
                        }))}
                      >
                        <option value="">不设置</option>
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    ) : (
                      <input
                        className="input"
                        type={arg.type === 'number' ? 'number' : 'text'}
                        value={commandArgs[arg.name] || ''}
                        onChange={(e) => setCommandArgs(prev => ({
                          ...prev,
                          [arg.name]: e.target.value
                        }))}
                        placeholder={arg.default || arg.description}
                      />
                    )}
                    <div style={{ minWidth: '100px' }}>
                      {commandArgs[arg.name] ? (
                        <span className="tag status-good">已设置</span>
                      ) : arg.required ? (
                        <span className="tag status-error">必需</span>
                      ) : (
                        <span className="tag">可选</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="mb-4">
            <h4 className="mb-3">自定义命令</h4>
            <input
              className="input"
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              placeholder="输入自定义命令..."
              disabled={!!selectedCommand}
            />
          </div>

          {(selectedCommand || customCommand) && (
            <div className="mb-4">
              <h4 className="mb-3">预览命令</h4>
              <div className="config-item">
                <code className="text-mono" style={{ 
                  background: 'var(--surface)', 
                  padding: 'var(--space-3)', 
                  borderRadius: 'var(--radius)',
                  display: 'block',
                  color: 'var(--primary)'
                }}>
                  {selectedCommand 
                    ? buildCommand(commandTemplates.find(cmd => cmd.id === selectedCommand)!)
                    : customCommand
                  }
                </code>
              </div>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">执行历史</h3>
              <p className="card-subtitle">最近执行的命令记录</p>
            </div>
          </div>

          <div className="config-section">
            {history.map(item => (
              <div key={item.id} className="config-item" style={{ gridTemplateColumns: '1fr', gap: 'var(--space-3)' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="config-key">{item.command}</div>
                    <div className="config-description">
                      {item.timestamp.toLocaleString()}
                      {item.duration && ` • 耗时: ${item.duration}ms`}
                    </div>
                  </div>
                  <span 
                    className="tag"
                    style={{ color: getStatusColor(item.status) }}
                  >
                    {getStatusText(item.status)}
                  </span>
                </div>
                
                {item.output && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <div className="text-sm font-medium mb-2">输出:</div>
                    <pre className="text-mono text-xs" style={{ 
                      background: 'var(--surface)', 
                      padding: 'var(--space-3)', 
                      borderRadius: 'var(--radius)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}>
                      {item.output}
                    </pre>
                  </div>
                )}
                
                {item.error && (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <div className="text-sm font-medium mb-2" style={{ color: 'var(--error)' }}>错误:</div>
                    <pre className="text-mono text-xs" style={{ 
                      background: 'var(--surface)', 
                      padding: 'var(--space-3)', 
                      borderRadius: 'var(--radius)',
                      whiteSpace: 'pre-wrap',
                      color: 'var(--error)',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}>
                      {item.error}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandRunner;
