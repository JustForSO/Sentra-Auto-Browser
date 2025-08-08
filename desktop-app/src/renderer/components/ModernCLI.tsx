import React, { useState, useEffect } from 'react';
import AppContainer from './AppContainer';

interface TaskConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  command: string;
  fields: TaskField[];
  quickActions?: QuickAction[];
}

interface TaskField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'boolean' | 'number' | 'tags';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  default?: string;
  validation?: (value: string) => string | null;
  description?: string;
}

interface QuickAction {
  name: string;
  icon: string;
  values: Record<string, string>;
}

interface TaskExecution {
  id: string;
  taskId: string;
  name: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  output: string;
  errorOutput: string;
  startTime: Date;
  endTime?: Date;
  progress: number;
}

const ModernCLI: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<TaskConfig | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeView, setActiveView] = useState<'tasks' | 'executions'>('tasks');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 任务配置
  const taskConfigs: TaskConfig[] = [
    {
      id: 'browser-automation',
      name: '浏览器自动化',
      description: '使用AI执行智能浏览器操作任务',
      icon: 'fas fa-robot',
      color: '#4CAF50',
      category: '自动化',
      command: 'npm run cli -- run',
      fields: [
        {
          id: 'task',
          label: '任务描述',
          type: 'textarea',
          required: true,
          placeholder: '描述您希望AI执行的任务，例如：打开百度搜索人工智能',
          description: '用自然语言描述您希望浏览器执行的操作'
        },
        {
          id: 'provider',
          label: 'AI 提供商',
          type: 'select',
          options: ['openai', 'anthropic', 'google'],
          default: 'openai',
          description: '选择用于理解和执行任务的AI模型提供商'
        },
        {
          id: 'model',
          label: 'AI 模型',
          type: 'select',
          options: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'gemini-2.5-pro'],
          default: 'gpt-4o-mini',
          description: '选择具体的AI模型'
        },
        {
          id: 'maxSteps',
          label: '最大步数',
          type: 'number',
          default: '10',
          description: '限制AI执行的最大操作步数'
        },
        {
          id: 'visible',
          label: '可视化模式',
          type: 'boolean',
          description: '在可见的浏览器窗口中执行（便于观察过程）'
        },
        {
          id: 'debug',
          label: '调试模式',
          type: 'boolean',
          description: '输出详细的执行日志'
        }
      ],
      quickActions: [
        {
          name: '搜索任务',
          icon: 'fas fa-search',
          values: {
            task: '打开百度搜索人工智能',
            visible: 'true',
            maxSteps: '5'
          }
        },
        {
          name: '购物任务',
          icon: 'fas fa-shopping-cart',
          values: {
            task: '访问淘宝搜索iPhone',
            visible: 'true',
            maxSteps: '8'
          }
        },
        {
          name: '视频任务',
          icon: 'fas fa-play',
          values: {
            task: '在bilibili搜索编程教程并播放第一个视频',
            visible: 'true',
            maxSteps: '10'
          }
        }
      ]
    },
    {
      id: 'system-config',
      name: '系统配置',
      description: '查看和管理系统配置信息',
      icon: 'fas fa-cogs',
      color: '#FF9800',
      category: '系统',
      command: 'npm run cli -- config',
      fields: [
        {
          id: 'showAll',
          label: '显示所有配置',
          type: 'boolean',
          description: '显示完整的配置信息而不是简要信息'
        },
        {
          id: 'showEnv',
          label: '显示环境变量',
          type: 'boolean',
          description: '显示环境变量的详细信息'
        }
      ]
    },
    {
      id: 'connection-test',
      name: '连接测试',
      description: '测试各种服务的连接状态',
      icon: 'fas fa-heartbeat',
      color: '#2196F3',
      category: '测试',
      command: 'npm run cli -- test',
      fields: [
        {
          id: 'provider',
          label: '测试提供商',
          type: 'select',
          options: ['', 'openai', 'anthropic', 'google'],
          description: '选择要测试的特定AI提供商，留空则测试所有'
        }
      ]
    },
    {
      id: 'project-build',
      name: '项目构建',
      description: '编译和构建项目',
      icon: 'fas fa-hammer',
      color: '#795548',
      category: '开发',
      command: 'npm run build',
      fields: []
    },
    {
      id: 'install-deps',
      name: '依赖管理',
      description: '安装和管理项目依赖',
      icon: 'fas fa-download',
      color: '#9C27B0',
      category: '开发',
      command: 'npm install',
      fields: [
        {
          id: 'force',
          label: '强制重装',
          type: 'boolean',
          description: '强制重新安装所有依赖包'
        },
        {
          id: 'production',
          label: '生产模式',
          type: 'boolean',
          description: '只安装生产环境依赖'
        }
      ]
    }
  ];

  // 构建命令
  const buildCommand = (task: TaskConfig, values: Record<string, string>) => {
    let command = task.command;
    
    // 特殊处理任务描述
    if (values.task && task.id === 'browser-automation') {
      command += ` "${values.task}"`;
    }
    
    // 添加其他参数
    task.fields.forEach(field => {
      if (field.id === 'task') return;
      
      const value = values[field.id];
      if (value) {
        if (field.type === 'boolean') {
          if (value === 'true') {
            command += ` --${field.id}`;
          }
        } else {
          command += ` --${field.id} ${value}`;
        }
      }
    });
    
    return command;
  };

  // 应用快速操作
  const applyQuickAction = (action: QuickAction) => {
    setFieldValues(prev => ({ ...prev, ...action.values }));
  };

  // 执行任务
  const executeTask = async () => {
    if (!selectedTask) return;
    
    // 验证必填字段
    const missingFields = selectedTask.fields
      .filter(field => field.required && !fieldValues[field.id])
      .map(field => field.label);
    
    if (missingFields.length > 0) {
      alert(`请填写必填字段：${missingFields.join(', ')}`);
      return;
    }

    const execution: TaskExecution = {
      id: Date.now().toString(),
      taskId: selectedTask.id,
      name: fieldValues.task || selectedTask.name,
      command: buildCommand(selectedTask, fieldValues),
      status: 'pending',
      output: '',
      errorOutput: '',
      startTime: new Date(),
      progress: 0
    };

    setExecutions(prev => [execution, ...prev]);
    setIsExecuting(true);
    setActiveView('executions');

    try {
      // 更新为运行状态
      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id 
          ? { ...exec, status: 'running' as const, progress: 5 }
          : exec
      ));

      // 解析命令
      const parts = execution.command.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);

      // 模拟进度
      const progressInterval = setInterval(() => {
        setExecutions(prev => prev.map(exec => 
          exec.id === execution.id && exec.status === 'running'
            ? { ...exec, progress: Math.min(exec.progress + Math.random() * 15, 85) }
            : exec
        ));
      }, 1000);

      const result = await window.electronAPI.executeCommand(cmd, args);
      
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

  // 更新字段值
  const updateFieldValue = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // 选择任务时重置字段
  const selectTask = (task: TaskConfig) => {
    setSelectedTask(task);
    const defaults: Record<string, string> = {};
    task.fields.forEach(field => {
      if (field.default) {
        defaults[field.id] = field.default;
      }
    });
    setFieldValues(defaults);
  };

  // 获取分类
  const categories = ['all', ...new Set(taskConfigs.map(task => task.category))];

  // 过滤任务
  const filteredTasks = taskConfigs.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 渲染字段输入
  const renderField = (field: TaskField) => {
    const value = fieldValues[field.id] || '';
    
    const inputStyle = {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease',
      backgroundColor: '#fafafa'
    };

    const focusStyle = {
      borderColor: selectedTask?.color || '#2196F3',
      backgroundColor: '#fff',
      boxShadow: `0 0 0 3px ${selectedTask?.color || '#2196F3'}20`
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: '100px',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.backgroundColor = '#fafafa';
              e.target.style.boxShadow = 'none';
            }}
          />
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.backgroundColor = '#fafafa';
              e.target.style.boxShadow = 'none';
            }}
          >
            <option value="">请选择...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'boolean':
        return (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <input
                type="radio"
                name={field.id}
                checked={value === 'true'}
                onChange={() => updateFieldValue(field.id, 'true')}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  accentColor: selectedTask?.color || '#2196F3'
                }}
              />
              启用
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <input
                type="radio"
                name={field.id}
                checked={value === 'false' || value === ''}
                onChange={() => updateFieldValue(field.id, 'false')}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  accentColor: selectedTask?.color || '#2196F3'
                }}
              />
              禁用
            </label>
          </div>
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.backgroundColor = '#fafafa';
              e.target.style.boxShadow = 'none';
            }}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.backgroundColor = '#fafafa';
              e.target.style.boxShadow = 'none';
            }}
          />
        );
    }
  };

  // 获取状态样式
  const getStatusStyle = (status: TaskExecution['status']) => {
    switch (status) {
      case 'pending': return { color: '#FF9800', icon: 'fas fa-clock' };
      case 'running': return { color: '#2196F3', icon: 'fas fa-spinner fa-spin' };
      case 'completed': return { color: '#4CAF50', icon: 'fas fa-check-circle' };
      case 'error': return { color: '#F44336', icon: 'fas fa-exclamation-circle' };
      case 'cancelled': return { color: '#9E9E9E', icon: 'fas fa-ban' };
    }
  };

  return (
    <AppContainer
      appId="cli"
      title="现代化任务中心"
      icon="fas fa-rocket"
      color="#2196F3"
      theme="light"
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        {/* 顶部导航 */}
        <div style={{ 
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '700',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              智能任务执行中心
            </h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setActiveView('tasks')}
                style={{
                  padding: '8px 16px',
                  background: activeView === 'tasks' ? '#2196F3' : 'transparent',
                  color: activeView === 'tasks' ? 'white' : '#666',
                  border: '2px solid #2196F3',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fas fa-tasks" style={{ marginRight: '6px' }}></i>
                任务配置
              </button>
              <button
                onClick={() => setActiveView('executions')}
                style={{
                  padding: '8px 16px',
                  background: activeView === 'executions' ? '#2196F3' : 'transparent',
                  color: activeView === 'executions' ? 'white' : '#666',
                  border: '2px solid #2196F3',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <i className="fas fa-history" style={{ marginRight: '6px' }}></i>
                执行历史
                {executions.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#F44336',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {executions.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 搜索和过滤 */}
          {activeView === 'tasks' && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <i className="fas fa-search" style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999',
                  fontSize: '16px'
                }}></i>
                <input
                  type="text"
                  placeholder="搜索任务..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 48px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '25px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '25px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white',
                  minWidth: '120px'
                }}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? '所有分类' : category}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 主内容区 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeView === 'tasks' ? (
            <>
              {/* 任务列表 */}
              <div style={{ 
                width: '350px', 
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '20px',
                overflow: 'auto',
                borderRight: '1px solid rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {filteredTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => selectTask(task)}
                      style={{
                        padding: '20px',
                        background: selectedTask?.id === task.id 
                          ? `linear-gradient(135deg, ${task.color}20, ${task.color}10)` 
                          : 'white',
                        border: selectedTask?.id === task.id 
                          ? `2px solid ${task.color}` 
                          : '2px solid #f0f0f0',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: selectedTask?.id === task.id 
                          ? `0 8px 25px ${task.color}30` 
                          : '0 2px 8px rgba(0, 0, 0, 0.1)',
                        transform: selectedTask?.id === task.id ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: `linear-gradient(135deg, ${task.color}, ${task.color}80)`,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '20px'
                        }}>
                          <i className={task.icon}></i>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700' }}>
                            {task.name}
                          </h3>
                          <span style={{
                            fontSize: '12px',
                            background: task.color,
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: '600'
                          }}>
                            {task.category}
                          </span>
                        </div>
                      </div>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        color: '#666', 
                        lineHeight: '1.4' 
                      }}>
                        {task.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 任务配置 */}
              <div style={{ 
                flex: 1, 
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '30px',
                overflow: 'auto'
              }}>
                {selectedTask ? (
                  <div>
                    {/* 任务头部 */}
                    <div style={{ 
                      background: `linear-gradient(135deg, ${selectedTask.color}, ${selectedTask.color}80)`,
                      padding: '24px',
                      borderRadius: '16px',
                      color: 'white',
                      marginBottom: '30px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <i className={selectedTask.icon} style={{ fontSize: '32px' }}></i>
                        <div>
                          <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700' }}>
                            {selectedTask.name}
                          </h2>
                          <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
                            {selectedTask.description}
                          </p>
                        </div>
                      </div>

                      {/* 快速操作 */}
                      {selectedTask.quickActions && (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {selectedTask.quickActions.map(action => (
                            <button
                              key={action.name}
                              onClick={() => applyQuickAction(action)}
                              style={{
                                padding: '8px 16px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                transition: 'all 0.2s ease',
                                backdropFilter: 'blur(10px)'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                              }}
                            >
                              <i className={action.icon} style={{ marginRight: '6px' }}></i>
                              {action.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 配置字段 */}
                    <div style={{ display: 'grid', gap: '24px' }}>
                      {selectedTask.fields.map(field => (
                        <div key={field.id}>
                          <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#333'
                          }}>
                            {field.label}
                            {field.required && (
                              <span style={{ color: '#F44336', marginLeft: '4px' }}>*</span>
                            )}
                          </label>
                          {field.description && (
                            <p style={{
                              margin: '0 0 12px 0',
                              fontSize: '14px',
                              color: '#666',
                              lineHeight: '1.4'
                            }}>
                              {field.description}
                            </p>
                          )}
                          {renderField(field)}
                        </div>
                      ))}
                    </div>

                    {/* 命令预览 */}
                    <div style={{ marginTop: '30px' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333'
                      }}>
                        命令预览
                      </label>
                      <div style={{
                        padding: '16px',
                        background: '#1e1e1e',
                        color: '#00ff00',
                        borderRadius: '8px',
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: '14px',
                        border: '2px solid #333',
                        wordBreak: 'break-all'
                      }}>
                        $ {buildCommand(selectedTask, fieldValues)}
                      </div>
                    </div>

                    {/* 执行按钮 */}
                    <div style={{ marginTop: '30px', textAlign: 'center' }}>
                      <button
                        onClick={executeTask}
                        disabled={isExecuting}
                        style={{
                          padding: '16px 32px',
                          background: isExecuting 
                            ? '#ccc' 
                            : `linear-gradient(135deg, ${selectedTask.color}, ${selectedTask.color}80)`,
                          color: 'white',
                          border: 'none',
                          borderRadius: '25px',
                          cursor: isExecuting ? 'not-allowed' : 'pointer',
                          fontSize: '18px',
                          fontWeight: '700',
                          transition: 'all 0.3s ease',
                          boxShadow: isExecuting 
                            ? 'none' 
                            : `0 4px 15px ${selectedTask.color}40`,
                          transform: isExecuting ? 'none' : 'translateY(-2px)',
                          minWidth: '200px'
                        }}
                        onMouseOver={(e) => {
                          if (!isExecuting) {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = `0 8px 25px ${selectedTask.color}60`;
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isExecuting) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 15px ${selectedTask.color}40`;
                          }
                        }}
                      >
                        {isExecuting ? (
                          <>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                            执行中...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-rocket" style={{ marginRight: '8px' }}></i>
                            启动任务
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: '#666'
                  }}>
                    <i className="fas fa-hand-pointer" style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.5 }}></i>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>选择一个任务</h3>
                    <p style={{ margin: 0, fontSize: '16px', textAlign: 'center' }}>
                      从左侧选择一个任务来配置和执行
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* 执行历史 */
            <div style={{ 
              flex: 1, 
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '30px',
              overflow: 'auto'
            }}>
              {executions.length === 0 ? (
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#666'
                }}>
                  <i className="fas fa-history" style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.5 }}></i>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>暂无执行记录</h3>
                  <p style={{ margin: 0, fontSize: '16px', textAlign: 'center' }}>
                    执行任务后，记录将显示在这里
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {executions.map(execution => {
                    const statusStyle = getStatusStyle(execution.status);
                    const duration = execution.endTime 
                      ? Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)
                      : 0;

                    return (
                      <div
                        key={execution.id}
                        style={{
                          padding: '24px',
                          background: 'white',
                          border: `2px solid ${statusStyle.color}20`,
                          borderRadius: '16px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        {/* 执行头部 */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: '16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <i className={statusStyle.icon} style={{ 
                              color: statusStyle.color, 
                              fontSize: '20px' 
                            }}></i>
                            <div>
                              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>
                                {execution.name}
                              </h3>
                              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                                {execution.startTime.toLocaleString()}
                                {execution.endTime && ` • 耗时 ${duration}秒`}
                              </p>
                            </div>
                          </div>
                          <div style={{
                            padding: '6px 12px',
                            background: statusStyle.color,
                            color: 'white',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {execution.status === 'pending' && '等待中'}
                            {execution.status === 'running' && '执行中'}
                            {execution.status === 'completed' && '已完成'}
                            {execution.status === 'error' && '失败'}
                            {execution.status === 'cancelled' && '已取消'}
                          </div>
                        </div>

                        {/* 进度条 */}
                        {execution.status === 'running' && (
                          <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#f0f0f0',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            marginBottom: '16px'
                          }}>
                            <div style={{
                              width: `${execution.progress}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${statusStyle.color}, ${statusStyle.color}80)`,
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                        )}

                        {/* 命令 */}
                        <div style={{
                          padding: '12px 16px',
                          background: '#1e1e1e',
                          color: '#00ff00',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontFamily: 'Consolas, Monaco, monospace',
                          marginBottom: '16px',
                          wordBreak: 'break-all'
                        }}>
                          $ {execution.command}
                        </div>

                        {/* 输出 */}
                        {(execution.output || execution.errorOutput) && (
                          <div style={{
                            maxHeight: '200px',
                            overflow: 'auto',
                            padding: '16px',
                            background: '#f8f9fa',
                            border: '2px solid #e9ecef',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontFamily: 'Consolas, Monaco, monospace'
                          }}>
                            {execution.output && (
                              <div style={{ color: '#28a745', whiteSpace: 'pre-wrap', marginBottom: '8px' }}>
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

export default ModernCLI;