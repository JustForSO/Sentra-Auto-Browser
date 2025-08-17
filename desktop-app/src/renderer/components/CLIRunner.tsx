import React, { useState, useEffect, useRef } from 'react';
import AppContainer from './AppContainer';

interface CommandTemplate {
  name: string;
  description: string;
  command: string;
  args: string[];
  category: string;
  icon: string;
  color: string;
  examples: string[];
  parameters: Parameter[];
}

interface Parameter {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  description: string;
  required?: boolean;
  default?: string;
  options?: string[];
  placeholder?: string;
}

interface ExecutionResult {
  id: string;
  command: string;
  status: 'running' | 'completed' | 'error';
  output: string;
  errorOutput: string;
  startTime: Date;
  endTime?: Date;
  processId?: string;
}

const CLIRunner: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<CommandTemplate | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [customCommand, setCustomCommand] = useState('');
  const [executions, setExecutions] = useState<ExecutionResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'custom' | 'history'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  // 命令模板
  const commandTemplates: CommandTemplate[] = [
    {
      name: '运行自动化任务',
      description: '执行浏览器自动化任务',
      command: 'npm',
      args: ['run', 'cli', '--', 'run'],
      category: '浏览器自动化',
      icon: 'fas fa-robot',
      color: '#3498db',
      examples: [
        'npm run cli -- run "打开百度搜索人工智能"',
        'npm run cli -- run "淘宝搜索iPhone" --visible',
        'npm run cli -- run "bilibili搜索动漫视频并播放" --provider openai --model gpt-4o-mini'
      ],
      parameters: [
        {
          name: 'task',
          type: 'text',
          description: '要执行的任务描述',
          required: true,
          placeholder: '例如：打开百度搜索人工智能'
        },
        {
          name: 'provider',
          type: 'select',
          description: 'AI提供商',
          options: ['openai', 'anthropic', 'google'],
          default: 'openai'
        },
        {
          name: 'model',
          type: 'select',
          description: 'AI模型',
          options: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'gemini-2.5-pro'],
          default: 'gpt-4o-mini'
        },
        {
          name: 'max-steps',
          type: 'number',
          description: '最大执行步数',
          default: '10'
        },
        {
          name: 'visible',
          type: 'boolean',
          description: '可视化模式'
        },
        {
          name: 'headless',
          type: 'boolean',
          description: '无头模式'
        },
        {
          name: 'debug',
          type: 'boolean',
          description: '调试模式'
        }
      ]
    },
    {
      name: '查看配置',
      description: '查看当前环境配置',
      command: 'npm',
      args: ['run', 'cli', '--', 'config'],
      category: '配置管理',
      icon: 'fas fa-cogs',
      color: '#e74c3c',
      examples: [
        'npm run cli -- config',
        'npm run cli -- config --all',
        'npm run cli -- config --env'
      ],
      parameters: [
        {
          name: 'all',
          type: 'boolean',
          description: '显示所有配置'
        },
        {
          name: 'env',
          type: 'boolean',
          description: '显示环境变量详情'
        }
      ]
    },
    {
      name: '测试连接',
      description: '测试AI服务连接',
      command: 'npm',
      args: ['run', 'cli', '--', 'test'],
      category: '系统测试',
      icon: 'fas fa-heartbeat',
      color: '#27ae60',
      examples: [
        'npm run cli -- test',
        'npm run cli -- test --provider openai',
        'npm run cli -- test --provider anthropic'
      ],
      parameters: [
        {
          name: 'provider',
          type: 'select',
          description: '测试指定提供商',
          options: ['openai', 'anthropic', 'google']
        }
      ]
    },
    {
      name: '构建项目',
      description: '编译TypeScript项目',
      command: 'npm',
      args: ['run', 'build'],
      category: '开发工具',
      icon: 'fas fa-hammer',
      color: '#f39c12',
      examples: [
        'npm run build'
      ],
      parameters: []
    },
    {
      name: '运行开发模式',
      description: '启动开发模式',
      command: 'npm',
      args: ['run', 'dev'],
      category: '开发工具',
      icon: 'fas fa-code',
      color: '#9b59b6',
      examples: [
        'npm run dev'
      ],
      parameters: []
    },
    {
      name: '安装依赖',
      description: '安装项目依赖',
      command: 'npm',
      args: ['install'],
      category: '包管理',
      icon: 'fas fa-download',
      color: '#e67e22',
      examples: [
        'npm install',
        'npm install --force',
        'npm install --legacy-peer-deps'
      ],
      parameters: [
        {
          name: 'force',
          type: 'boolean',
          description: '强制重新安装'
        },
        {
          name: 'legacy-peer-deps',
          type: 'boolean',
          description: '使用旧版依赖解析'
        }
      ]
    },
    {
      name: '清理缓存',
      description: '清理npm缓存',
      command: 'npm',
      args: ['cache', 'clean', '--force'],
      category: '包管理',
      icon: 'fas fa-trash',
      color: '#95a5a6',
      examples: [
        'npm cache clean --force'
      ],
      parameters: []
    }
  ];

  // 构建完整命令
  const buildCommand = (template: CommandTemplate, params: Record<string, string>) => {
    let args = [...template.args];
    
    // 添加任务描述（如果有）
    if (params.task) {
      args.push(`"${params.task}"`);
    }
    
    // 添加其他参数
    template.parameters.forEach(param => {
      const value = params[param.name];
      if (value) {
        if (param.type === 'boolean') {
          if (value === 'true') {
            args.push(`--${param.name}`);
          }
        } else {
          args.push(`--${param.name}`);
          args.push(value);
        }
      }
    });
    
    return `${template.command} ${args.join(' ')}`;
  };

  // 执行命令（直接把完整命令字符串传给后端，避免空格/引号被错误拆分）
  const executeCommand = async (command: string) => {
    const executionId = Date.now().toString();
    const execution: ExecutionResult = {
      id: executionId,
      command,
      status: 'running',
      output: '',
      errorOutput: '',
      startTime: new Date()
    };
    
    setExecutions(prev => [execution, ...prev]);
    setIsExecuting(true);
    
    try {
      const result = await window.electronAPI.executeCommand(command);
      
      setExecutions(prev => prev.map(exec => 
        exec.id === executionId 
          ? {
              ...exec,
              status: result.success ? 'completed' : 'error',
              output: result.output,
              errorOutput: result.errorOutput,
              endTime: new Date(),
              processId: result.processId
            }
          : exec
      ));
    } catch (error: any) {
      setExecutions(prev => prev.map(exec => 
        exec.id === executionId 
          ? {
              ...exec,
              status: 'error',
              errorOutput: error?.message || 'Unknown error',
              endTime: new Date()
            }
          : exec
      ));
    } finally {
      setIsExecuting(false);
    }
  };

  // 执行模板命令
  const executeTemplate = () => {
    if (!selectedTemplate) return;
    
    const command = buildCommand(selectedTemplate, parameterValues);
    executeCommand(command);
  };

  // 执行自定义命令
  const executeCustom = () => {
    if (!customCommand.trim()) return;
    executeCommand(customCommand.trim());
  };

  // 更新参数值
  const updateParameter = (paramName: string, value: string) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  // 滚动到输出底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [executions]);

  // 过滤模板
  const filteredTemplates = commandTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 按分类分组模板
  const groupedTemplates = filteredTemplates.reduce((groups, template) => {
    const category = template.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {} as Record<string, CommandTemplate[]>);

  return (
    <AppContainer
      appId="commands"
      title="CLI 命令运行器"
      icon="fas fa-terminal"
      color="#107c10"
      theme="light"
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 标签栏 */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--win-border)',
          background: 'var(--win-bg-card)'
        }}>
          {[
            { key: 'templates', label: '命令模板', icon: 'fas fa-list' },
            { key: 'custom', label: '自定义命令', icon: 'fas fa-code' },
            { key: 'history', label: '执行历史', icon: 'fas fa-history' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '12px 20px',
                background: activeTab === tab.key ? 'var(--win-bg-window)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--win-blue)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: activeTab === tab.key ? 'var(--win-blue)' : 'var(--win-text-secondary)'
              }}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 左侧面板 */}
          <div style={{
            width: '40%',
            borderRight: '1px solid var(--win-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {activeTab === 'templates' && (
              <>
                {/* 搜索框 */}
                <div style={{ padding: '16px' }}>
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
                      placeholder="搜索命令模板..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 40px',
                        border: '1px solid var(--win-border)',
                        borderRadius: '20px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* 模板列表 */}
                <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
                  {Object.entries(groupedTemplates).map(([category, templates]) => (
                    <div key={category} style={{ marginBottom: '20px' }}>
                      <h3 style={{
                        margin: '0 0 12px 0',
                        fontSize: '16px',
                        color: 'var(--win-text-primary)',
                        borderBottom: '1px solid var(--win-border)',
                        paddingBottom: '8px'
                      }}>
                        {category}
                      </h3>
                      {templates.map(template => (
                        <div
                          key={template.name}
                          onClick={() => {
                            setSelectedTemplate(template);
                            // 重置参数值为默认值
                            const defaultValues: Record<string, string> = {};
                            template.parameters.forEach(param => {
                              if (param.default) {
                                defaultValues[param.name] = param.default;
                              }
                            });
                            setParameterValues(defaultValues);
                          }}
                          style={{
                            padding: '12px',
                            background: selectedTemplate?.name === template.name ? 'var(--win-bg-selected)' : 'var(--win-bg-card)',
                            border: '1px solid var(--win-border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginBottom: '8px',
                            transition: 'var(--win-transition)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <i className={template.icon} style={{ color: template.color, fontSize: '16px' }}></i>
                            <strong style={{ fontSize: '14px' }}>{template.name}</strong>
                          </div>
                          <p style={{
                            margin: '0',
                            fontSize: '12px',
                            color: 'var(--win-text-secondary)',
                            lineHeight: '1.4'
                          }}>
                            {template.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'custom' && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: '0', fontSize: '18px' }}>自定义命令</h3>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    命令:
                  </label>
                  <textarea
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    placeholder="输入要执行的命令，例如：npm run build"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--win-border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'Consolas, Monaco, monospace',
                      resize: 'vertical',
                      minHeight: '80px',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  onClick={executeCustom}
                  disabled={!customCommand.trim() || isExecuting}
                  style={{
                    padding: '12px 24px',
                    background: !customCommand.trim() || isExecuting ? '#95a5a6' : 'var(--win-blue)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: !customCommand.trim() || isExecuting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isExecuting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      执行中...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play"></i>
                      执行命令
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'history' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>执行历史</h3>
                {executions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--win-text-muted)', padding: '40px' }}>
                    <i className="fas fa-clock" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
                    <p>暂无执行历史</p>
                  </div>
                ) : (
                  executions.map(execution => (
                    <div
                      key={execution.id}
                      style={{
                        padding: '12px',
                        background: 'var(--win-bg-card)',
                        border: '1px solid var(--win-border)',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <i className={
                          execution.status === 'running' ? 'fas fa-spinner fa-spin' :
                          execution.status === 'completed' ? 'fas fa-check-circle' :
                          'fas fa-exclamation-circle'
                        } style={{
                          color: execution.status === 'running' ? '#3498db' :
                                execution.status === 'completed' ? '#27ae60' : '#e74c3c'
                        }}></i>
                        <span style={{ fontSize: '12px', color: 'var(--win-text-muted)' }}>
                          {execution.startTime.toLocaleString()}
                        </span>
                        {execution.endTime && (
                          <span style={{ fontSize: '12px', color: 'var(--win-text-muted)' }}>
                            耗时: {Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s
                          </span>
                        )}
                      </div>
                      <code style={{
                        display: 'block',
                        fontSize: '12px',
                        background: '#f8f9fa',
                        padding: '8px',
                        borderRadius: '4px',
                        fontFamily: 'Consolas, Monaco, monospace',
                        wordBreak: 'break-all'
                      }}>
                        {execution.command}
                      </code>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 右侧面板 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeTab === 'templates' && selectedTemplate && (
              <>
                {/* 参数配置 */}
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--win-border)',
                  background: 'var(--win-bg-card)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <i className={selectedTemplate.icon} style={{ 
                      color: selectedTemplate.color, 
                      fontSize: '24px' 
                    }}></i>
                    <div>
                      <h3 style={{ margin: '0', fontSize: '18px' }}>{selectedTemplate.name}</h3>
                      <p style={{ margin: '0', fontSize: '14px', color: 'var(--win-text-secondary)' }}>
                        {selectedTemplate.description}
                      </p>
                    </div>
                  </div>

                  {/* 参数输入 */}
                  {selectedTemplate.parameters.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedTemplate.parameters.map(param => (
                        <div key={param.name}>
                          <label style={{
                            display: 'block',
                            marginBottom: '6px',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}>
                            {param.description}
                            {param.required && <span style={{ color: '#e74c3c' }}>*</span>}
                          </label>
                          {param.type === 'boolean' ? (
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="radio"
                                  name={param.name}
                                  value="true"
                                  checked={parameterValues[param.name] === 'true'}
                                  onChange={(e) => updateParameter(param.name, e.target.value)}
                                />
                                是
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="radio"
                                  name={param.name}
                                  value="false"
                                  checked={parameterValues[param.name] === 'false'}
                                  onChange={(e) => updateParameter(param.name, e.target.value)}
                                />
                                否
                              </label>
                            </div>
                          ) : param.type === 'select' ? (
                            <select
                              value={parameterValues[param.name] || ''}
                              onChange={(e) => updateParameter(param.name, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid var(--win-border)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                outline: 'none'
                              }}
                            >
                              <option value="">选择...</option>
                              {param.options?.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={param.type}
                              value={parameterValues[param.name] || ''}
                              onChange={(e) => updateParameter(param.name, e.target.value)}
                              placeholder={param.placeholder}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid var(--win-border)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                outline: 'none'
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 预览命令 */}
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                      命令预览:
                    </label>
                    <code style={{
                      display: 'block',
                      padding: '12px',
                      background: '#f8f9fa',
                      border: '1px solid var(--win-border)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'Consolas, Monaco, monospace',
                      wordBreak: 'break-all'
                    }}>
                      {buildCommand(selectedTemplate, parameterValues)}
                    </code>
                  </div>

                  {/* 执行按钮 */}
                  <button
                    onClick={executeTemplate}
                    disabled={isExecuting}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      background: isExecuting ? '#95a5a6' : 'var(--win-blue)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isExecuting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      marginTop: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isExecuting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        执行中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-play"></i>
                        执行命令
                      </>
                    )}
                  </button>
                </div>

                {/* 示例命令 */}
                <div style={{ padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>使用示例:</h4>
                  {selectedTemplate.examples.map((example, index) => (
                    <code
                      key={index}
                      style={{
                        display: 'block',
                        padding: '8px 12px',
                        background: '#f8f9fa',
                        border: '1px solid var(--win-border)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'Consolas, Monaco, monospace',
                        marginBottom: '8px',
                        wordBreak: 'break-all'
                      }}
                    >
                      {example}
                    </code>
                  ))}
                </div>
              </>
            )}

            {/* 输出面板 */}
            {(activeTab === 'custom' || activeTab === 'history') && (
              <div style={{ flex: 1, padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>输出:</h4>
                <div
                  ref={outputRef}
                  style={{
                    height: '400px',
                    background: '#1e1e1e',
                    color: '#d4d4d4',
                    padding: '12px',
                    borderRadius: '6px',
                    overflow: 'auto',
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    border: '1px solid var(--win-border)'
                  }}
                >
                  {executions.length === 0 ? (
                    <div style={{ color: '#666' }}>等待命令执行...</div>
                  ) : (
                    executions.map(execution => (
                      <div key={execution.id} style={{ marginBottom: '16px' }}>
                        <div style={{ color: '#569cd6', marginBottom: '4px' }}>
                          $ {execution.command}
                        </div>
                        {execution.output && (
                          <div style={{ color: '#ce9178', whiteSpace: 'pre-wrap' }}>
                            {execution.output}
                          </div>
                        )}
                        {execution.errorOutput && (
                          <div style={{ color: '#f44747', whiteSpace: 'pre-wrap' }}>
                            {execution.errorOutput}
                          </div>
                        )}
                        <div style={{
                          color: execution.status === 'completed' ? '#4ec9b0' : 
                               execution.status === 'error' ? '#f44747' : '#dcdcaa',
                          fontSize: '11px',
                          marginTop: '4px'
                        }}>
                          状态: {execution.status}
                          {execution.endTime && (
                            ` | 耗时: ${Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}秒`
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppContainer>
  );
};

export default CLIRunner;