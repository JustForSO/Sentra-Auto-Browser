import React, { useState, useEffect } from 'react';
import AppContainer from './AppContainer';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  baseCommand: string;
  parameters: TaskParameter[];
  examples: string[];
}

interface TaskParameter {
  name: string;
  displayName: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  description: string;
  required?: boolean;
  default?: string;
  options?: string[];
  placeholder?: string;
  argument?: string; // CLI参数名称
}

interface TaskExecution {
  id: string;
  templateId: string;
  name: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output: string;
  errorOutput: string;
  startTime: Date;
  endTime?: Date;
  progress: number;
}

const SmartCLIRunner: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'queue' | 'history'>('tasks');
  const [searchTerm, setSearchTerm] = useState('');

  // 任务模板定义
  const taskTemplates: TaskTemplate[] = [
    {
      id: 'run-automation',
      name: '浏览器自动化',
      description: '执行智能浏览器自动化任务',
      category: '自动化任务',
      icon: 'fas fa-robot',
      color: '#3498db',
      baseCommand: 'npm run cli -- run',
      parameters: [
        {
          name: 'task',
          displayName: '任务描述',
          type: 'textarea',
          description: '描述要执行的任务',
          required: true,
          placeholder: '例如：打开百度搜索人工智能',
          argument: ''
        },
        {
          name: 'provider',
          displayName: 'AI提供商',
          type: 'select',
          description: '选择AI模型提供商',
          options: ['openai', 'anthropic', 'google'],
          default: 'openai',
          argument: '--provider'
        },
        {
          name: 'model',
          displayName: 'AI模型',
          type: 'select',
          description: '选择AI模型',
          options: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'gemini-2.5-pro'],
          default: 'gpt-4o-mini',
          argument: '--model'
        },
        {
          name: 'maxSteps',
          displayName: '最大步数',
          type: 'number',
          description: '最大执行步数',
          default: '10',
          argument: '--max-steps'
        },
        {
          name: 'visible',
          displayName: '可视化模式',
          type: 'boolean',
          description: '在可见的浏览器窗口中执行',
          argument: '--visible'
        },
        {
          name: 'debug',
          displayName: '调试模式',
          type: 'boolean',
          description: '启用详细调试日志',
          argument: '--debug'
        }
      ],
      examples: [
        '打开百度搜索人工智能',
        '访问淘宝搜索iPhone',
        '在bilibili搜索编程教程并播放第一个视频'
      ]
    },
    {
      id: 'config-view',
      name: '查看配置',
      description: '查看当前环境配置信息',
      category: '配置管理',
      icon: 'fas fa-cogs',
      color: '#e74c3c',
      baseCommand: 'npm run cli -- config',
      parameters: [
        {
          name: 'all',
          displayName: '显示所有配置',
          type: 'boolean',
          description: '显示完整的配置信息',
          argument: '--all'
        },
        {
          name: 'env',
          displayName: '环境变量详情',
          type: 'boolean',
          description: '显示环境变量详细信息',
          argument: '--env'
        }
      ],
      examples: [
        '查看基本配置信息',
        '查看所有配置详情',
        '查看环境变量状态'
      ]
    },
    {
      id: 'test-connection',
      name: '测试连接',
      description: '测试AI服务连接状态',
      category: '系统测试',
      icon: 'fas fa-heartbeat',
      color: '#27ae60',
      baseCommand: 'npm run cli -- test',
      parameters: [
        {
          name: 'provider',
          displayName: '测试提供商',
          type: 'select',
          description: '选择要测试的AI提供商',
          options: ['', 'openai', 'anthropic', 'google'],
          argument: '--provider'
        }
      ],
      examples: [
        '测试所有AI服务连接',
        '测试OpenAI连接',
        '测试Anthropic连接'
      ]
    },
    {
      id: 'build-project',
      name: '构建项目',
      description: '编译TypeScript项目',
      category: '开发工具',
      icon: 'fas fa-hammer',
      color: '#f39c12',
      baseCommand: 'npm run build',
      parameters: [],
      examples: [
        '编译项目到dist目录'
      ]
    },
    {
      id: 'install-deps',
      name: '安装依赖',
      description: '安装项目依赖包',
      category: '包管理',
      icon: 'fas fa-download',
      color: '#e67e22',
      baseCommand: 'npm install',
      parameters: [
        {
          name: 'force',
          displayName: '强制重装',
          type: 'boolean',
          description: '强制重新安装所有依赖',
          argument: '--force'
        },
        {
          name: 'legacyPeerDeps',
          displayName: '兼容模式',
          type: 'boolean',
          description: '使用旧版依赖解析算法',
          argument: '--legacy-peer-deps'
        }
      ],
      examples: [
        '安装所有依赖',
        '强制重新安装依赖',
        '兼容模式安装'
      ]
    }
  ];

  // 构建命令
  const buildCommand = (template: TaskTemplate, params: Record<string, string>) => {
    let command = template.baseCommand;
    
    // 添加任务描述（特殊处理）
    if (params.task && template.id === 'run-automation') {
      command += ` "${params.task}"`;
    }
    
    // 添加其他参数
    template.parameters.forEach(param => {
      if (param.name === 'task') return; // 任务描述已处理
      
      const value = params[param.name];
      if (value && param.argument) {
        if (param.type === 'boolean') {
          if (value === 'true') {
            command += ` ${param.argument}`;
          }
        } else {
          command += ` ${param.argument} ${value}`;
        }
      }
    });
    
    return command;
  };

  // 创建任务执行
  const createExecution = (template: TaskTemplate, params: Record<string, string>): TaskExecution => {
    const command = buildCommand(template, params);
    const taskName = params.task || template.name;
    
    return {
      id: Date.now().toString(),
      templateId: template.id,
      name: taskName,
      command,
      status: 'pending',
      output: '',
      errorOutput: '',
      startTime: new Date(),
      progress: 0
    };
  };

  // 执行任务
  const executeTask = async () => {
    if (!selectedTemplate) return;
    
    // 验证必需参数
    const missingRequired = selectedTemplate.parameters
      .filter(param => param.required && !parameterValues[param.name])
      .map(param => param.displayName);
    
    if (missingRequired.length > 0) {
      alert(`请填写必需参数：${missingRequired.join(', ')}`);
      return;
    }

    const execution = createExecution(selectedTemplate, parameterValues);
    setExecutions(prev => [execution, ...prev]);
    setIsExecuting(true);
    
    try {
      // 更新状态为运行中
      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id 
          ? { ...exec, status: 'running' as const, progress: 10 }
          : exec
      ));

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setExecutions(prev => prev.map(exec => 
          exec.id === execution.id && exec.status === 'running'
            ? { ...exec, progress: Math.min(exec.progress + Math.random() * 20, 90) }
            : exec
        ));
      }, 1000);

      const result = await window.electronAPI.executeCommand(execution.command);
      
      clearInterval(progressInterval);
      
      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id 
          ? {
              ...exec,
              status: result.success ? 'completed' as const : 'error' as const,
              output: result.output,
              errorOutput: result.errorOutput,
              endTime: new Date(),
              progress: 100
            }
          : exec
      ));
    } catch (error: any) {
      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id 
          ? {
              ...exec,
              status: 'error' as const,
              errorOutput: error?.message || 'Unknown error',
              endTime: new Date(),
              progress: 100
            }
          : exec
      ));
    } finally {
      setIsExecuting(false);
    }
  };

  // 更新参数值
  const updateParameter = (paramName: string, value: string) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  // 选择模板时重置参数
  const selectTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    const defaultValues: Record<string, string> = {};
    template.parameters.forEach(param => {
      if (param.default) {
        defaultValues[param.name] = param.default;
      }
    });
    setParameterValues(defaultValues);
  };

  // 过滤模板
  const filteredTemplates = taskTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 按分类分组
  const groupedTemplates = filteredTemplates.reduce((groups, template) => {
    const category = template.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {} as Record<string, TaskTemplate[]>);

  // 获取状态图标和颜色
  const getStatusIcon = (status: TaskExecution['status']) => {
    switch (status) {
      case 'pending': return { icon: 'fas fa-clock', color: '#95a5a6' };
      case 'running': return { icon: 'fas fa-spinner fa-spin', color: '#3498db' };
      case 'completed': return { icon: 'fas fa-check-circle', color: '#27ae60' };
      case 'error': return { icon: 'fas fa-exclamation-circle', color: '#e74c3c' };
    }
  };

  // 渲染参数输入
  const renderParameterInput = (param: TaskParameter) => {
    const value = parameterValues[param.name] || '';
    
    const baseStyle = {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid var(--win-border)',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      backgroundColor: 'var(--win-bg-window)'
    };

    switch (param.type) {
      case 'boolean':
        return (
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name={param.name}
                checked={value === 'true'}
                onChange={() => updateParameter(param.name, 'true')}
              />
              是
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name={param.name}
                checked={value === 'false' || value === ''}
                onChange={() => updateParameter(param.name, 'false')}
              />
              否
            </label>
          </div>
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            style={baseStyle}
          >
            <option value="">请选择...</option>
            {param.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            placeholder={param.placeholder}
            rows={3}
            style={{
              ...baseStyle,
              resize: 'vertical',
              minHeight: '80px'
            }}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            placeholder={param.placeholder}
            style={baseStyle}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            placeholder={param.placeholder}
            style={baseStyle}
          />
        );
    }
  };

  return (
    <AppContainer
      appId="cli"
      title="智能任务执行器"
      icon="fas fa-play-circle"
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
            { key: 'tasks', label: '任务模板', icon: 'fas fa-tasks' },
            { key: 'queue', label: '执行队列', icon: 'fas fa-list-ol' },
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
          {activeTab === 'tasks' && (
            <>
              {/* 左侧：任务模板 */}
              <div style={{
                width: '35%',
                borderRight: '1px solid var(--win-border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
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
                      placeholder="搜索任务模板..."
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
                          key={template.id}
                          onClick={() => selectTemplate(template)}
                          style={{
                            padding: '12px',
                            background: selectedTemplate?.id === template.id ? 'var(--win-bg-selected)' : 'var(--win-bg-card)',
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
              </div>

              {/* 右侧：参数配置 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedTemplate ? (
                  <>
                    {/* 模板信息 */}
                    <div style={{
                      padding: '20px',
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

                      {/* 参数配置 */}
                      {selectedTemplate.parameters.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {selectedTemplate.parameters.map(param => (
                            <div key={param.name}>
                              <label style={{
                                display: 'block',
                                marginBottom: '6px',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}>
                                {param.displayName}
                                {param.required && <span style={{ color: '#e74c3c' }}>*</span>}
                              </label>
                              <p style={{
                                margin: '0 0 8px 0',
                                fontSize: '12px',
                                color: 'var(--win-text-muted)'
                              }}>
                                {param.description}
                              </p>
                              {renderParameterInput(param)}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 命令预览 */}
                      <div style={{ marginTop: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                          命令预览:
                        </label>
                        <div style={{
                          padding: '12px',
                          background: '#1e1e1e',
                          color: '#d4d4d4',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontFamily: 'Consolas, Monaco, monospace',
                          wordBreak: 'break-all',
                          border: '1px solid var(--win-border)'
                        }}>
                          {buildCommand(selectedTemplate, parameterValues)}
                        </div>
                      </div>

                      {/* 执行按钮 */}
                      <button
                        onClick={executeTask}
                        disabled={isExecuting}
                        style={{
                          width: '100%',
                          padding: '12px 24px',
                          background: isExecuting ? '#95a5a6' : selectedTemplate.color,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: isExecuting ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          marginTop: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: '600'
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
                            执行任务
                          </>
                        )}
                      </button>
                    </div>

                    {/* 示例展示 */}
                    <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>使用示例:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedTemplate.examples.map((example, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '12px',
                              background: 'var(--win-bg-card)',
                              border: '1px solid var(--win-border)',
                              borderRadius: '6px',
                              fontSize: '14px',
                              cursor: 'pointer',
                              transition: 'var(--win-transition)'
                            }}
                            onClick={() => {
                              if (selectedTemplate.id === 'run-automation') {
                                updateParameter('task', example);
                              }
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--win-bg-hover)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--win-bg-card)'}
                          >
                            <i className="fas fa-lightbulb" style={{ color: '#f39c12', marginRight: '8px' }}></i>
                            {example}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: 'var(--win-text-muted)'
                  }}>
                    <i className="fas fa-hand-pointer" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
                    <p>请选择一个任务模板开始配置</p>
                  </div>
                )}
              </div>
            </>
          )}

          {(activeTab === 'queue' || activeTab === 'history') && (
            <div style={{ 
              flex: 1, 
              padding: '20px', 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>
                {activeTab === 'queue' ? '执行队列' : '执行历史'}
              </h3>
              
              {executions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px',
                  color: 'var(--win-text-muted)'
                }}>
                  <i className="fas fa-tasks" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
                  <p>暂无执行记录</p>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  flex: 1,
                  overflow: 'auto'
                }}>
                  {executions.map(execution => {
                    const statusInfo = getStatusIcon(execution.status);
                    const duration = execution.endTime 
                      ? Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)
                      : 0;

                    return (
                      <div
                        key={execution.id}
                        style={{
                          padding: '16px',
                          background: 'var(--win-bg-card)',
                          border: '1px solid var(--win-border)',
                          borderRadius: '8px'
                        }}
                      >
                        {/* 执行信息头部 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <i className={statusInfo.icon} style={{ color: statusInfo.color, fontSize: '16px' }}></i>
                            <div>
                              <strong style={{ fontSize: '16px' }}>{execution.name}</strong>
                              <div style={{ fontSize: '12px', color: 'var(--win-text-muted)' }}>
                                {execution.startTime.toLocaleString()}
                                {execution.endTime && ` • 耗时 ${duration}秒`}
                              </div>
                            </div>
                          </div>
                          <div style={{
                            padding: '4px 8px',
                            background: statusInfo.color,
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {execution.status === 'pending' ? '等待中' :
                             execution.status === 'running' ? '执行中' :
                             execution.status === 'completed' ? '已完成' : '失败'}
                          </div>
                        </div>

                        {/* 进度条 */}
                        {execution.status === 'running' && (
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: '#f0f0f0',
                            borderRadius: '3px',
                            marginBottom: '12px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${execution.progress}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #3498db, #2980b9)',
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                        )}

                        {/* 命令 */}
                        <div style={{
                          padding: '8px 12px',
                          background: '#1e1e1e',
                          color: '#d4d4d4',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'Consolas, Monaco, monospace',
                          marginBottom: '12px',
                          wordBreak: 'break-all'
                        }}>
                          $ {execution.command}
                        </div>

                        {/* 输出 */}
                        {(execution.output || execution.errorOutput) && (
                          <div style={{
                            maxHeight: '200px',
                            overflow: 'auto',
                            padding: '8px 12px',
                            background: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'Consolas, Monaco, monospace'
                          }}>
                            {execution.output && (
                              <div style={{ color: '#28a745', whiteSpace: 'pre-wrap' }}>
                                {execution.output}
                              </div>
                            )}
                            {execution.errorOutput && (
                              <div style={{ color: '#dc3545', whiteSpace: 'pre-wrap' }}>
                                {execution.errorOutput}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppContainer>
  );
};

export default SmartCLIRunner;