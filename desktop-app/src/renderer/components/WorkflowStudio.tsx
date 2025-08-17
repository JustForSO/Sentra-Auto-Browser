import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  BrowserIcon, DataIcon, OutputIcon, PlayIcon, PauseIcon, SettingsIcon,
  ZoomInIcon, ZoomOutIcon, LogIcon, DesignIcon, ExecuteIcon, AddIcon, DeleteIcon
} from '../assets/icons';

// 添加CSS样式支持骨架式连线效果
const workflowStyles = `
  @keyframes dataFlow {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: -40;
    }
  }
  
  @keyframes connectionPulse {
    0%, 100% { 
      stroke-width: 2;
      filter: drop-shadow(0 0 2px currentColor);
    }
    50% { 
      stroke-width: 3;
      filter: drop-shadow(0 0 8px currentColor);
    }
  }
  
  .connection-line {
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    stroke-dasharray: 8 4;
    animation: dataFlow 2s linear infinite;
  }
  
  .connection-line:hover {
    animation: connectionPulse 1s ease-in-out infinite;
    stroke-dasharray: none;
  }
  
  .connection-line.active {
    stroke-width: 3;
    filter: drop-shadow(0 0 6px currentColor);
    animation: connectionPulse 1.5s ease-in-out infinite;
  }
  
  .workflow-node {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.1));
  }
  
  .workflow-node:hover {
    transform: translateY(-3px) scale(1.02);
    filter: drop-shadow(0 8px 25px rgba(0,0,0,0.2));
  }
  
  .workflow-node.connected {
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
    border: 2px solid rgba(6, 214, 160, 0.3);
  }
  
  .port-dot {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    stroke-width: 2;
  }
  
  .port-dot:hover {
    transform: scale(1.4);
    filter: drop-shadow(0 0 8px currentColor);
    stroke-width: 3;
  }
  
  .port-dot.connected {
    transform: scale(1.2);
    filter: drop-shadow(0 0 4px currentColor);
    animation: connectionPulse 2s ease-in-out infinite;
  }
`;

// 在组件加载时添加样式
if (typeof document !== 'undefined' && !document.getElementById('workflow-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'workflow-styles';
  styleElement.textContent = workflowStyles;
  document.head.appendChild(styleElement);
}

// 节点端口类型
interface NodePort {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  defaultValue?: any;
  connected?: boolean;
}

// 节点连接
interface NodeConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

// 工作流节点
interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  inputs: NodePort[];
  outputs: NodePort[];
  config: Record<string, any>;
  collapsed?: boolean;
}

// 工作流数据
interface WorkflowData {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  version: string;
  createdAt: string;
  updatedAt: string;
}

// 执行状态
interface WorkflowExecution {
  id: string;
  processId?: string; // 添加进程ID用于停止命令
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress: number;
  logs: { id: string; message: string; level: string; timestamp: Date; type?: 'stdout' | 'stderr' | 'info' | 'error' | 'success' }[];
  currentNodeId?: string;
  startTime?: Date;
  endTime?: Date;
}

// 基于项目CLI参数的细粒度节点模板
const nodeTemplates: Record<string, Omit<WorkflowNode, 'id' | 'position'>[]> = {
  '[START] 开始': [{
    type: 'start',
    name: '开始节点',
    description: '工作流的起始点',
    icon: <PlayIcon size={16} color="white" />,
    color: '#10b981',
    size: { width: 150, height: 80 },
    inputs: [],
    outputs: [{
      id: 'start_output',
      name: '开始',
      type: 'output',
      dataType: 'any'
    }],
    config: {}
  }],
  
  '[TASK] 任务描述': [{
    type: 'task-description',
    name: '任务描述',
    description: '要执行的自然语言任务',
    icon: <DataIcon size={16} color="white" />,
    color: '#ef4444',
    size: { width: 250, height: 120 },
    inputs: [],
    outputs: [{
      id: 'task_output',
      name: '任务',
      type: 'output',
      dataType: 'string'
    }],
    config: {
      task: '请输入要执行的任务描述，例如：bilibili搜索阴阳师须佐之男，并且播放人气高的视频，然后点赞'
    }
  }],
  
  '[AI] AI提供商': [{
    type: 'ai-provider',
    name: 'OpenAI',
    description: 'OpenAI GPT系列模型',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#10a37f',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'provider_output',
      name: 'provider',
      type: 'output',
      dataType: 'string'
    }],
    config: {
      provider: 'openai'
    }
  }, {
    type: 'ai-provider',
    name: 'Anthropic',
    description: 'Anthropic Claude系列模型',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#d97706',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'provider_output',
      name: 'provider',
      type: 'output',
      dataType: 'string'
    }],
    config: {
      provider: 'anthropic'
    }
  }, {
    type: 'ai-provider',
    name: 'Google',
    description: 'Google Gemini系列模型',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#4285f4',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'provider_output',
      name: 'provider',
      type: 'output',
      dataType: 'string'
    }],
    config: {
      provider: 'google'
    }
  }],
  
  '[MODEL] AI模型': [{
    type: 'ai-model',
    name: 'GPT-4o',
    description: 'OpenAI最新旗舰模型',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#8b5cf6',
    size: { width: 160, height: 90 },
    inputs: [{
      id: 'provider_input',
      name: 'provider',
      type: 'input',
      dataType: 'string'
    }],
    outputs: [{
      id: 'model_output',
      name: 'model',
      type: 'output',
      dataType: 'string'
    }],
    config: {
      model: 'gpt-4o'
    }
  }, {
    type: 'ai-model',
    name: 'GPT-4o-mini',
    description: 'OpenAI高性价比模型',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#8b5cf6',
    size: { width: 160, height: 90 },
    inputs: [{
      id: 'provider_input',
      name: 'provider',
      type: 'input',
      dataType: 'string'
    }],
    outputs: [{
      id: 'model_output',
      name: 'model',
      type: 'output',
      dataType: 'string'
    }],
    config: {
      model: 'gpt-4o-mini'
    }
  }, {
    type: 'ai-model',
    name: 'Claude-3.5-Sonnet',
    description: 'Anthropic高性能模型',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#8b5cf6',
    size: { width: 160, height: 90 },
    inputs: [{
      id: 'provider_input',
      name: 'provider',
      type: 'input',
      dataType: 'string'
    }],
    outputs: [{
      id: 'model_output',
      name: 'model',
      type: 'output',
      dataType: 'string'
    }],
    config: {
      model: 'claude-3-5-sonnet-20241022'
    }
  }, {
    type: 'ai-model',
    name: 'Gemini-Pro',
    description: 'Google Gemini专业版',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#8b5cf6',
    size: { width: 160, height: 90 },
    inputs: [{
      id: 'provider_input',
      name: 'provider',
      type: 'input',
      dataType: 'string'
    }],
    outputs: [{
      id: 'model_output',
      name: 'model',
      type: 'output',
      dataType: 'string'
    }],
    config: {
      model: 'gemini-pro'
    }
  }],
  
  '[EXEC] 执行参数': [{
    type: 'max-steps',
    name: '最大步数',
    description: '设置执行的最大步数 (--max-steps)',
    icon: <ExecuteIcon size={16} color="white" />,
    color: '#f59e0b',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'steps_output',
      name: 'max-steps',
      type: 'output',
      dataType: 'number'
    }],
    config: {
      maxSteps: 100
    }
  }, {
    type: 'temperature',
    name: '温度参数',
    description: 'AI模型温度参数 (--temperature)',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#f59e0b',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'temperature_output',
      name: 'temperature',
      type: 'output',
      dataType: 'number'
    }],
    config: {
      temperature: 0
    }
  }],
  
  '[BROWSER] 浏览器模式': [{
    type: 'headless-mode',
    name: '无头模式',
    description: '无头模式运行 (--headless)',
    icon: <BrowserIcon size={16} color="white" />,
    color: '#6366f1',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'headless_output',
      name: 'headless',
      type: 'output',
      dataType: 'boolean'
    }],
    config: {
      headless: true
    }
  }, {
    type: 'visible-mode',
    name: '可视化模式',
    description: '可视化模式运行 (--visible)',
    icon: <BrowserIcon size={16} color="white" />,
    color: '#6366f1',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'visible_output',
      name: 'visible',
      type: 'output',
      dataType: 'boolean'
    }],
    config: {
      visible: true
    }
  }, {
    type: 'no-vision',
    name: '禁用视觉',
    description: '禁用视觉/截图功能 (--no-vision)',
    icon: <BrowserIcon size={16} color="white" />,
    color: '#6366f1',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'novision_output',
      name: 'no-vision',
      type: 'output',
      dataType: 'boolean'
    }],
    config: {
      noVision: false
    }
  }],
  
  '[SYS] 系统选项': [{
    type: 'debug-mode',
    name: '调试模式',
    description: '启用调试日志 (--debug)',
    icon: <LogIcon size={16} color="white" />,
    color: '#ec4899',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'debug_output',
      name: 'debug',
      type: 'output',
      dataType: 'boolean'
    }],
    config: {
      debug: false
    }
  }, {
    type: 'enable-plugins',
    name: '启用插件',
    description: '启用插件系统 (--enable-plugins)',
    icon: <AddIcon size={16} color="white" />,
    color: '#ec4899',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'plugins_output',
      name: 'enable-plugins',
      type: 'output',
      dataType: 'boolean'
    }],
    config: {
      enablePlugins: true
    }
  }, {
    type: 'disable-plugins',
    name: '禁用插件',
    description: '禁用插件系统 (--disable-plugins)',
    icon: <DeleteIcon size={16} color="white" />,
    color: '#ec4899',
    size: { width: 160, height: 90 },
    inputs: [],
    outputs: [{
      id: 'noplugins_output',
      name: 'disable-plugins',
      type: 'output',
      dataType: 'boolean'
    }],
    config: {
      disablePlugins: false
    }
  }],
  
  '[OUTPUT] 输出': [{
    type: 'command-output',
    name: 'CLI命令生成器',
    description: '生成最终的CLI命令并执行',
    icon: <OutputIcon size={16} color="white" />,
    color: '#6b7280',
    size: { width: 280, height: 200 },
    inputs: [{
      id: 'task_input',
      name: 'task',
      type: 'input',
      dataType: 'string',
      required: true
    }, {
      id: 'provider_input',
      name: 'provider',
      type: 'input',
      dataType: 'string'
    }, {
      id: 'model_input',
      name: 'model',
      type: 'input',
      dataType: 'string'
    }, {
      id: 'steps_input',
      name: 'max-steps',
      type: 'input',
      dataType: 'number'
    }, {
      id: 'temperature_input',
      name: 'temperature',
      type: 'input',
      dataType: 'number'
    }, {
      id: 'headless_input',
      name: 'headless',
      type: 'input',
      dataType: 'boolean'
    }, {
      id: 'visible_input',
      name: 'visible',
      type: 'input',
      dataType: 'boolean'
    }, {
      id: 'novision_input',
      name: 'no-vision',
      type: 'input',
      dataType: 'boolean'
    }, {
      id: 'debug_input',
      name: 'debug',
      type: 'input',
      dataType: 'boolean'
    }, {
      id: 'plugins_input',
      name: 'enable-plugins',
      type: 'input',
      dataType: 'boolean'
    }, {
      id: 'noplugins_input',
      name: 'disable-plugins',
      type: 'input',
      dataType: 'boolean'
    }],
    outputs: [],
    config: {}
  }]
};

const WorkflowStudio: React.FC = () => {
  // 初始化状态 - 包含细粒度节点示例工作流
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    // 任务描述节点
    {
      id: 'example-task-1',
      type: 'task-description',
      name: '任务描述',
      description: '要执行的自然语言任务',
      icon: <DataIcon size={16} color="white" />,
      color: '#ef4444',
      position: { x: 50, y: 50 },
      size: { width: 250, height: 120 },
      inputs: [],
      outputs: [{
        id: 'task_output',
        name: '任务',
        type: 'output',
        dataType: 'string'
      }],
      config: {
        task: 'bilibili搜索阴阳师须佐之男，并且播放人气高的视频，然后点赞'
      }
    },
    // AI提供商节点
    {
      id: 'example-provider-1',
      type: 'ai-provider',
      name: 'OpenAI',
      description: 'OpenAI GPT系列模型',
      icon: <SettingsIcon size={16} color="white" />,
      color: '#10a37f',
      position: { x: 50, y: 200 },
      size: { width: 160, height: 90 },
      inputs: [],
      outputs: [{
        id: 'provider_output',
        name: 'provider',
        type: 'output',
        dataType: 'string'
      }],
      config: {
        provider: 'openai'
      }
    },
    // AI模型节点
    {
      id: 'example-model-1',
      type: 'ai-model',
      name: 'GPT-4o-mini',
      description: 'OpenAI高性价比模型',
      icon: <SettingsIcon size={16} color="white" />,
      color: '#8b5cf6',
      position: { x: 250, y: 200 },
      size: { width: 160, height: 90 },
      inputs: [{
        id: 'provider_input',
        name: 'provider',
        type: 'input',
        dataType: 'string'
      }],
      outputs: [{
        id: 'model_output',
        name: 'model',
        type: 'output',
        dataType: 'string'
      }],
      config: {
        model: 'gpt-4o-mini'
      }
    },
    // 最大步数节点
    {
      id: 'example-steps-1',
      type: 'max-steps',
      name: '最大步数',
      description: '设置执行的最大步数',
      icon: <ExecuteIcon size={16} color="white" />,
      color: '#f59e0b',
      position: { x: 450, y: 200 },
      size: { width: 160, height: 90 },
      inputs: [],
      outputs: [{
        id: 'steps_output',
        name: 'max-steps',
        type: 'output',
        dataType: 'number'
      }],
      config: {
        maxSteps: 7
      }
    },
    // 可视化模式节点
    {
      id: 'example-visible-1',
      type: 'visible-mode',
      name: '可视化模式',
      description: '可视化模式运行',
      icon: <BrowserIcon size={16} color="white" />,
      color: '#6366f1',
      position: { x: 50, y: 320 },
      size: { width: 160, height: 90 },
      inputs: [],
      outputs: [{
        id: 'visible_output',
        name: 'visible',
        type: 'output',
        dataType: 'boolean'
      }],
      config: {
        visible: true
      }
    },
    // 调试模式节点
    {
      id: 'example-debug-1',
      type: 'debug-mode',
      name: '调试模式',
      description: '启用调试日志',
      icon: <LogIcon size={16} color="white" />,
      color: '#ec4899',
      position: { x: 250, y: 320 },
      size: { width: 160, height: 90 },
      inputs: [],
      outputs: [{
        id: 'debug_output',
        name: 'debug',
        type: 'output',
        dataType: 'boolean'
      }],
      config: {
        debug: true
      }
    },
    // CLI命令生成器节点
    {
      id: 'example-output-1',
      type: 'command-output',
      name: 'CLI命令生成器',
      description: '生成最终的CLI命令并执行',
      icon: <OutputIcon size={16} color="white" />,
      color: '#6b7280',
      position: { x: 450, y: 320 },
      size: { width: 280, height: 200 },
      inputs: [{
        id: 'task_input',
        name: 'task',
        type: 'input',
        dataType: 'string',
        required: true
      }, {
        id: 'provider_input',
        name: 'provider',
        type: 'input',
        dataType: 'string'
      }, {
        id: 'model_input',
        name: 'model',
        type: 'input',
        dataType: 'string'
      }, {
        id: 'steps_input',
        name: 'max-steps',
        type: 'input',
        dataType: 'number'
      }, {
        id: 'visible_input',
        name: 'visible',
        type: 'input',
        dataType: 'boolean'
      }, {
        id: 'debug_input',
        name: 'debug',
        type: 'input',
        dataType: 'boolean'
      }],
      outputs: [],
      config: {}
    }
  ]);
  const [connections, setConnections] = useState<NodeConnection[]>([
    // 任务描述 -> CLI命令生成器
    {
      id: 'conn-task-output',
      sourceNodeId: 'example-task-1',
      sourcePortId: 'task_output',
      targetNodeId: 'example-output-1',
      targetPortId: 'task_input'
    },
    // AI提供商 -> AI模型
    {
      id: 'conn-provider-model',
      sourceNodeId: 'example-provider-1',
      sourcePortId: 'provider_output',
      targetNodeId: 'example-model-1',
      targetPortId: 'provider_input'
    },
    // AI模型 -> CLI命令生成器
    {
      id: 'conn-model-output',
      sourceNodeId: 'example-model-1',
      sourcePortId: 'model_output',
      targetNodeId: 'example-output-1',
      targetPortId: 'model_input'
    },
    // 最大步数 -> CLI命令生成器
    {
      id: 'conn-steps-output',
      sourceNodeId: 'example-steps-1',
      sourcePortId: 'steps_output',
      targetNodeId: 'example-output-1',
      targetPortId: 'steps_input'
    },
    // 可视化模式 -> CLI命令生成器
    {
      id: 'conn-visible-output',
      sourceNodeId: 'example-visible-1',
      sourcePortId: 'visible_output',
      targetNodeId: 'example-output-1',
      targetPortId: 'visible_input'
    },
    // 调试模式 -> CLI命令生成器
    {
      id: 'conn-debug-output',
      sourceNodeId: 'example-debug-1',
      sourcePortId: 'debug_output',
      targetNodeId: 'example-output-1',
      targetPortId: 'debug_input'
    }
  ]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<NodeConnection | null>(null);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [draggedNodeTemplate, setDraggedNodeTemplate] = useState<Omit<WorkflowNode, 'id' | 'position'> | null>(null);
  const [connectingPort, setConnectingPort] = useState<{nodeId: string, portId: string, portType: 'input' | 'output'} | null>(null);
  const [activeTab, setActiveTab] = useState<'design' | 'execute' | 'logs'>('design');
  const [zoom, setZoom] = useState(1);
  const [workflowName, setWorkflowName] = useState('示例工作流 - 浏览器自动化');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 拖拽和连接功能
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 生成唯一ID
  const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const generateConnectionId = () => `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;



  // 拖拽节点模板到画布
  const handleDragStart = useCallback((e: React.DragEvent, template: Omit<WorkflowNode, 'id' | 'position'>) => {
    setDraggedNodeTemplate(template);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', template.type);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedNodeTemplate(null);
    setIsDragging(false);
  }, []);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNodeTemplate || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    
    const newNode: WorkflowNode = {
      ...draggedNodeTemplate,
      id: generateId(),
      position: { 
        x: Math.max(10, x - draggedNodeTemplate.size.width / 2), 
        y: Math.max(10, y - draggedNodeTemplate.size.height / 2) 
      }
    };
    
    setNodes(prev => [...prev, newNode]);
    setDraggedNodeTemplate(null);
    setIsDragging(false);
  }, [draggedNodeTemplate, zoom, panOffset]);

  // 节点连接功能
  const handlePortClick = useCallback((nodeId: string, portId: string, portType: 'input' | 'output') => {
    if (!connectingPort) {
      // 开始连接
      setConnectingPort({ nodeId, portId, portType });
    } else {
      // 完成连接
      if (connectingPort.nodeId !== nodeId && connectingPort.portType !== portType) {
        const newConnection: NodeConnection = {
          id: generateConnectionId(),
          sourceNodeId: connectingPort.portType === 'output' ? connectingPort.nodeId : nodeId,
          sourcePortId: connectingPort.portType === 'output' ? connectingPort.portId : portId,
          targetNodeId: connectingPort.portType === 'input' ? connectingPort.nodeId : nodeId,
          targetPortId: connectingPort.portType === 'input' ? connectingPort.portId : portId
        };
        setConnections(prev => [...prev, newConnection]);
      }
      setConnectingPort(null);
    }
  }, [connectingPort]);

  // 删除连接
  const deleteConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  }, []);

  // 删除节点
  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setConnections(prev => prev.filter(conn => 
      conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
    ));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);



  // 节点拖拽事件处理
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    // 只有在节点主体区域才允许拖拽，端口点击不触发拖拽
    if (e.target !== e.currentTarget && (e.target as HTMLElement).style.cursor === 'crosshair') {
      return; // 如果点击的是端口，不触发拖拽
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    if (e.button === 0) { // 只处理左键
      setDraggedNodeId(nodeId);
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDragStartPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  }, []);

  // 使用原生事件监听器处理滚轮缩放，完全隔离画布区域
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      const target = e.target as Element;
      
      // 只有在画布区域内才处理滚轮事件
      if (canvas.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(3, zoom * zoomFactor));
        
        // 以鼠标位置为中心缩放
        const zoomRatio = newZoom / zoom;
        const newPanOffset = {
          x: panOffset.x + (mouseX - panOffset.x) * (1 - zoomRatio),
          y: panOffset.y + (mouseY - panOffset.y) * (1 - zoomRatio)
        };
        
        setZoom(newZoom);
        setPanOffset(newPanOffset);
      }
    };

    // 添加非passive的事件监听器到document
    document.addEventListener('wheel', handleNativeWheel, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', handleNativeWheel);
    };
  }, [zoom, panOffset]);

  // 空格键状态
  const [spacePressed, setSpacePressed] = useState(false);

  // 全局鼠标事件监听器支持平移
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - lastPanPoint.x;
        const deltaY = e.clientY - lastPanPoint.y;
        setPanOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        setLastPanPoint({ x: e.clientX, y: e.clientY });
        e.preventDefault();
      }
    };

    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        setSpacePressed(true);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
        e.preventDefault();
      }
    };

    if (isPanning) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPanning, lastPanPoint, spacePressed]);

  // 处理鼠标按下开始平移
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey) || (e.button === 0 && spacePressed)) { // 中键、Ctrl+左键或空格+左键平移
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, [spacePressed]);





  const handleNodeMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNodeId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const deltaX = (currentX - dragStartPos.x) / zoom;
      const deltaY = (currentY - dragStartPos.y) / zoom;
      
      setNodes(prev => prev.map(node => 
        node.id === draggedNodeId 
          ? { ...node, position: { 
              x: Math.max(0, node.position.x + deltaX), 
              y: Math.max(0, node.position.y + deltaY) 
            }}
          : node
      ));
      
      setDragStartPos({ x: currentX, y: currentY });
    }
  }, [draggedNodeId, dragStartPos, zoom]);

  const handleNodeMouseUp = useCallback(() => {
    setDraggedNodeId(null);
  }, []);



  // 修复连线功能 - 确保端口位置计算正确
  const getPortPosition = useCallback((nodeId: string, portId: string, portType: 'input' | 'output') => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    const ports = portType === 'input' ? node.inputs : node.outputs;
    const portIndex = ports.findIndex(p => p.id === portId);
    
    const nodeX = (node.position.x + panOffset.x) * zoom;
    const nodeY = (node.position.y + panOffset.y) * zoom;
    const headerHeight = 32 * zoom; // 节点头部高度
    const portHeight = 24 * zoom; // 每个端口高度
    
    const portY = nodeY + headerHeight + (portIndex + 0.5) * portHeight;
    const portX = portType === 'input' 
      ? nodeX 
      : nodeX + node.size.width * zoom;
    
    return { x: portX, y: portY };
  }, [nodes, panOffset, zoom]);

  // JSON导入导出功能
  const exportWorkflow = useCallback(() => {
    // 创建安全的数据结构，避免循环引用
    const safeNodes = nodes.map(node => ({
      id: node.id,
      type: node.type,
      name: node.name,
      description: node.description,
      color: node.color,
      position: node.position,
      size: node.size,
      inputs: node.inputs,
      outputs: node.outputs,
      config: node.config,
      collapsed: node.collapsed
    }));
    
    const safeConnections = connections.map(conn => ({
      id: conn.id,
      sourceNodeId: conn.sourceNodeId,
      sourcePortId: conn.sourcePortId,
      targetNodeId: conn.targetNodeId,
      targetPortId: conn.targetPortId
    }));
    
    const workflowData = {
      id: `workflow-${Date.now()}`,
      name: workflowName,
      description: '通过工作流设计器创建的自动化流程',
      nodes: safeNodes,
      connections: safeConnections,
      panOffset,
      zoom,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(workflowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${workflowName}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, workflowName]);

  const importWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflowData = JSON.parse(e.target?.result as string);
        
        // 设置节点和连接
        setNodes(workflowData.nodes || []);
        setConnections(workflowData.connections || []);
        setWorkflowName(workflowData.name || '新工作流');
        
        // 恢复视图状态
        if (workflowData.panOffset) {
          setPanOffset(workflowData.panOffset);
        }
        if (workflowData.zoom) {
          setZoom(workflowData.zoom);
        }
        
        // 清空选中状态
        setSelectedNode(null);
        setConnectingPort(null);
        
        console.log('工作流导入成功:', workflowData.name);
      } catch (error) {
        console.error('导入错误:', error);
        alert('导入失败：JSON格式错误');
      }
    };
    reader.readAsText(file);
    // 清空input值，允许重复导入同一文件
    event.target.value = '';
  }, []);

  const clearWorkflow = useCallback(() => {
    if (window.confirm('确定要清空当前工作流吗？此操作不可撤销。')) {
      setNodes([]);
      setConnections([]);
      setSelectedNode(null);
      setConnectingPort(null);
      setWorkflowName('新工作流');
    }
  }, []);

  const loadExampleWorkflow = useCallback(() => {
    if (nodes.length > 0 && !window.confirm('加载示例工作流将覆盖当前内容，确定继续吗？')) {
      return;
    }
    
    // 使用新的细粒度节点创建示例工作流
    setNodes([
      // 1. 任务描述节点
      {
        id: 'example-task-1',
        type: 'task-description',
        name: '任务描述',
        description: '要执行的自然语言任务',
        icon: <DataIcon size={16} color="white" />,
        color: '#ef4444',
        position: { x: 50, y: 50 },
        size: { width: 250, height: 120 },
        inputs: [],
        outputs: [{
          id: 'task_output',
          name: '任务',
          type: 'output',
          dataType: 'string'
        }],
        config: {
          task: 'bilibili搜索阴阳师须佐之男，并且播放人气高的视频，然后点赞'
        }
      },
      // 2. AI提供商节点
      {
        id: 'example-provider-1',
        type: 'ai-provider',
        name: 'OpenAI',
        description: 'OpenAI GPT系列模型',
        icon: <SettingsIcon size={16} color="white" />,
        color: '#10a37f',
        position: { x: 50, y: 200 },
        size: { width: 160, height: 90 },
        inputs: [],
        outputs: [{
          id: 'provider_output',
          name: 'provider',
          type: 'output',
          dataType: 'string'
        }],
        config: {
          provider: 'openai'
        }
      },
      // 3. AI模型节点
      {
        id: 'example-model-1',
        type: 'ai-model',
        name: 'GPT-4o-mini',
        description: 'OpenAI高性价比模型',
        icon: <SettingsIcon size={16} color="white" />,
        color: '#8b5cf6',
        position: { x: 250, y: 200 },
        size: { width: 160, height: 90 },
        inputs: [{
          id: 'provider_input',
          name: 'provider',
          type: 'input',
          dataType: 'string'
        }],
        outputs: [{
          id: 'model_output',
          name: 'model',
          type: 'output',
          dataType: 'string'
        }],
        config: {
          model: 'gpt-4o-mini'
        }
      },
      // 4. 最大步数节点
      {
        id: 'example-steps-1',
        type: 'max-steps',
        name: '最大步数',
        description: '设置执行的最大步数 (--max-steps)',
        icon: <ExecuteIcon size={16} color="white" />,
        color: '#f59e0b',
        position: { x: 450, y: 200 },
        size: { width: 160, height: 90 },
        inputs: [],
        outputs: [{
          id: 'steps_output',
          name: 'max-steps',
          type: 'output',
          dataType: 'number'
        }],
        config: {
          maxSteps: 7
        }
      },
      // 5. 可视化模式节点
      {
        id: 'example-visible-1',
        type: 'visible-mode',
        name: '可视化模式',
        description: '可视化模式运行 (--visible)',
        icon: <BrowserIcon size={16} color="white" />,
        color: '#6366f1',
        position: { x: 50, y: 320 },
        size: { width: 160, height: 90 },
        inputs: [],
        outputs: [{
          id: 'visible_output',
          name: 'visible',
          type: 'output',
          dataType: 'boolean'
        }],
        config: {
          visible: true
        }
      },
      // 6. 调试模式节点
      {
        id: 'example-debug-1',
        type: 'debug-mode',
        name: '调试模式',
        description: '启用调试日志 (--debug)',
        icon: <LogIcon size={16} color="white" />,
        color: '#ec4899',
        position: { x: 250, y: 320 },
        size: { width: 160, height: 90 },
        inputs: [],
        outputs: [{
          id: 'debug_output',
          name: 'debug',
          type: 'output',
          dataType: 'boolean'
        }],
        config: {
          debug: true
        }
      },
      // 7. CLI命令生成器节点
      {
        id: 'example-output-1',
        type: 'command-output',
        name: 'CLI命令生成器',
        description: '生成最终的CLI命令并执行',
        icon: <OutputIcon size={16} color="white" />,
        color: '#6b7280',
        position: { x: 500, y: 50 },
        size: { width: 280, height: 200 },
        inputs: [{
          id: 'task_input',
          name: 'task',
          type: 'input',
          dataType: 'string',
          required: true
        }, {
          id: 'provider_input',
          name: 'provider',
          type: 'input',
          dataType: 'string'
        }, {
          id: 'model_input',
          name: 'model',
          type: 'input',
          dataType: 'string'
        }, {
          id: 'steps_input',
          name: 'max-steps',
          type: 'input',
          dataType: 'number'
        }, {
          id: 'visible_input',
          name: 'visible',
          type: 'input',
          dataType: 'boolean'
        }, {
          id: 'debug_input',
          name: 'debug',
          type: 'input',
          dataType: 'boolean'
        }],
        outputs: [],
        config: {}
      }
    ]);
    
    // 设置节点连接
    setConnections([
      // 任务描述 -> CLI命令生成器
      {
        id: 'conn-task-output',
        sourceNodeId: 'example-task-1',
        sourcePortId: 'task_output',
        targetNodeId: 'example-output-1',
        targetPortId: 'task_input'
      },
      // AI提供商 -> AI模型
      {
        id: 'conn-provider-model',
        sourceNodeId: 'example-provider-1',
        sourcePortId: 'provider_output',
        targetNodeId: 'example-model-1',
        targetPortId: 'provider_input'
      },
      // AI提供商 -> CLI命令生成器
      {
        id: 'conn-provider-output',
        sourceNodeId: 'example-provider-1',
        sourcePortId: 'provider_output',
        targetNodeId: 'example-output-1',
        targetPortId: 'provider_input'
      },
      // AI模型 -> CLI命令生成器
      {
        id: 'conn-model-output',
        sourceNodeId: 'example-model-1',
        sourcePortId: 'model_output',
        targetNodeId: 'example-output-1',
        targetPortId: 'model_input'
      },
      // 最大步数 -> CLI命令生成器
      {
        id: 'conn-steps-output',
        sourceNodeId: 'example-steps-1',
        sourcePortId: 'steps_output',
        targetNodeId: 'example-output-1',
        targetPortId: 'steps_input'
      },
      // 可视化模式 -> CLI命令生成器
      {
        id: 'conn-visible-output',
        sourceNodeId: 'example-visible-1',
        sourcePortId: 'visible_output',
        targetNodeId: 'example-output-1',
        targetPortId: 'visible_input'
      },
      // 调试模式 -> CLI命令生成器
      {
        id: 'conn-debug-output',
        sourceNodeId: 'example-debug-1',
        sourcePortId: 'debug_output',
        targetNodeId: 'example-output-1',
        targetPortId: 'debug_input'
      }
    ]);
    
    setWorkflowName('细粒度示例工作流');
    setSelectedNode(null);
    setConnectingPort(null);
  }, [nodes]);

  // 管理事件监听器的生命周期
  useEffect(() => {
    console.log('设置事件监听器...');
    
    const handleCommandOutput = (data: any) => {
      console.log('收到命令输出:', data);
      if (data.processId) {
        setExecution(prev => {
          if (!prev) return prev;
          if (prev.processId && prev.processId !== data.processId) return prev;
          
          const newLog = {
            id: `log-${Date.now()}-${Math.random()}`,
            message: data.data,
            level: data.type === 'stderr' ? 'error' : 'info',
            type: data.type,
            timestamp: new Date(data.timestamp)
          };
          
          console.log('添加日志:', newLog);
          
          return {
            ...prev,
            processId: prev.processId || data.processId,
            logs: [...prev.logs, newLog]
          };
        });
      }
    };
    
    const handleCommandFinished = (data: any) => {
      console.log('收到命令完成:', data);
      if (data.processId) {
        setExecution(prev => {
          if (!prev) return prev;
          if (prev.processId && prev.processId !== data.processId) return prev;
          
          return {
            ...prev,
            processId: prev.processId || data.processId,
            status: data.success ? 'completed' : 'error',
            progress: 100,
            endTime: new Date(),
            logs: [...prev.logs, {
              id: `log-${Date.now()}-finish`,
              message: data.success ? '✅ 命令执行成功' : '❌ 命令执行失败',
              level: data.success ? 'success' : 'error',
              type: data.success ? 'success' : 'error',
              timestamp: new Date()
            }]
          };
        });
      }
    };
    
    const handleCommandError = (data: any) => {
      console.log('收到命令错误:', data);
      if (data.processId) {
        setExecution(prev => {
          if (!prev) return prev;
          if (prev.processId && prev.processId !== data.processId) return prev;
          
          return {
            ...prev,
            processId: prev.processId || data.processId,
            status: 'error',
            endTime: new Date(),
            logs: [...prev.logs, {
              id: `log-${Date.now()}-error`,
              message: `❌ 命令执行错误: ${data.error}`,
              level: 'error',
              type: 'error',
              timestamp: new Date()
            }]
          };
        });
      }
    };
    
    const handleCommandStopped = (data: any) => {
      console.log('收到命令停止:', data);
      if (data.processId) {
        setExecution(prev => {
          if (!prev) return prev;
          if (prev.processId && prev.processId !== data.processId) return prev;
          
          return {
            ...prev,
            processId: prev.processId || data.processId,
            status: 'stopped',
            endTime: new Date(),
            logs: [...prev.logs, {
              id: `log-${Date.now()}-stopped`,
              message: '⏹️ 命令已停止',
              level: 'info',
              type: 'info',
              timestamp: new Date()
            }]
          };
        });
      }
    };
    
    const handleCommandStarted = (data: any) => {
      console.log('收到命令启动:', data);
      if (data.processId) {
        setExecution(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            processId: data.processId,
            status: 'running',
            progress: 20,
            logs: [...prev.logs, {
              id: `log-${Date.now()}-started`,
              message: `🚀 命令已启动 (进程ID: ${data.processId})`,
              level: 'info',
              type: 'info',
              timestamp: new Date()
            }]
          };
        });
      }
    };
    
    // 注册事件监听器
    if (window.electronAPI) {
      console.log('注册事件监听器...');
      window.electronAPI.onCommandOutput?.(handleCommandOutput);
      window.electronAPI.onCommandFinished?.(handleCommandFinished);
      window.electronAPI.onCommandError?.(handleCommandError);
      window.electronAPI.onCommandStopped?.(handleCommandStopped);
      window.electronAPI.onCommandStarted?.(handleCommandStarted);
    }
    
    // 清理函数
    return () => {
      console.log('清理事件监听器...');
      // 注意：由于没有实现removeCommandListeners方法，
      // 这里只是记录日志。实际上，Electron事件监听器会在组件卸载时自动清理
    };
  }, []); // 空依赖数组，只在组件挂载时执行一次

  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      window.alert('请先添加节点到工作流中');
      return;
    }

    // 查找 CLI 命令生成器节点
    const outputNode = nodes.find(n => n.type === 'command-output');
    if (!outputNode) {
      window.alert('请添加 CLI 命令生成器节点到工作流中');
      return;
    }

    const executionId = `exec-${Date.now()}`;
    
    setExecution({
      id: executionId,
      status: 'running',
      progress: 0,
      startTime: new Date(),
      logs: [{
        id: `log-${Date.now()}-start`,
        message: '🚀 开始执行工作流...',
        level: 'info',
        type: 'info',
        timestamp: new Date()
      }]
    });

    try {
      // 收集所有连接到 CLI 命令生成器的参数
      const connectedInputs = new Map<string, any>();
      
      console.log('开始收集参数...');
      console.log('CLI命令生成器ID:', outputNode.id);
      console.log('总连接数:', connections.length);
      
      // 遍历所有连接，找到连接到 CLI 命令生成器的连接
      connections.forEach((conn, index) => {
        console.log(`连接 ${index + 1}:`, conn);
        
        if (conn.targetNodeId === outputNode.id) {
          console.log('找到连接到CLI命令生成器的连接:', conn);
          
          const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
          if (sourceNode) {
            console.log('源节点:', sourceNode.name, sourceNode.type, sourceNode.config);
            
            const sourcePort = sourceNode.outputs.find(p => p.id === conn.sourcePortId);
            const targetPort = outputNode.inputs.find(p => p.id === conn.targetPortId);
            
            console.log('源端口:', sourcePort);
            console.log('目标端口:', targetPort);
            
            if (sourcePort && targetPort) {
              // 根据节点类型获取值
              let value = sourceNode.config;
              
              switch (sourceNode.type) {
                case 'task-description':
                  value = sourceNode.config.task;
                  break;
                case 'ai-provider':
                  value = sourceNode.config.provider;
                  break;
                case 'ai-model':
                  value = sourceNode.config.model;
                  break;
                case 'max-steps':
                  value = sourceNode.config.maxSteps;
                  break;
                case 'temperature':
                  value = sourceNode.config.temperature;
                  break;
                case 'headless-mode':
                  value = sourceNode.config.headless;
                  break;
                case 'visible-mode':
                  value = sourceNode.config.visible;
                  break;
                case 'no-vision':
                  value = sourceNode.config.noVision;
                  break;
                case 'debug-mode':
                  value = sourceNode.config.debug;
                  break;
                case 'enable-plugins':
                  value = sourceNode.config.enablePlugins;
                  break;
                case 'disable-plugins':
                  value = sourceNode.config.disablePlugins;
                  break;
                default:
                  value = sourceNode.config;
              }
              
              console.log(`设置参数 ${targetPort.name} = ${value}`);
              connectedInputs.set(targetPort.name, value);
            } else {
              console.log('未找到对应的端口');
            }
          } else {
            console.log('未找到源节点:', conn.sourceNodeId);
          }
        }
      });
      
      // 检查是否有任务描述
      const taskDescription = connectedInputs.get('task');
      if (!taskDescription) {
        throw new Error('未找到任务描述。请连接任务描述节点到 CLI 命令生成器。');
      }
      
      // 构建 CLI 命令
      let command = `npx sentra-auto run "${taskDescription}"`;
      
      // 调试信息：显示所有连接的输入
      console.log('连接的输入参数:', Object.fromEntries(connectedInputs));
      
      // 添加参数
      const provider = connectedInputs.get('provider');
      if (provider) {
        command += ` --provider ${provider}`;
      }
      
      const model = connectedInputs.get('model');
      if (model) {
        command += ` --model ${model}`;
      }
      
      const maxSteps = connectedInputs.get('max-steps');
      if (maxSteps) {
        command += ` --max-steps ${maxSteps}`;
      }
      
      const temperature = connectedInputs.get('temperature');
      if (temperature !== undefined) {
        command += ` --temperature ${temperature}`;
      }
      
      const headless = connectedInputs.get('headless');
      if (headless === true) {
        command += ' --headless';
      }
      
      const visible = connectedInputs.get('visible');
      if (visible === true) {
        command += ' --visible';
      }
      
      const noVision = connectedInputs.get('no-vision');
      if (noVision === true) {
        command += ' --no-vision';
      }
      
      const debug = connectedInputs.get('debug');
      if (debug === true) {
        command += ' --debug';
      }
      
      const enablePlugins = connectedInputs.get('enable-plugins');
      if (enablePlugins === true) {
        command += ' --enable-plugins';
      }
      
      const disablePlugins = connectedInputs.get('disable-plugins');
      if (disablePlugins === true) {
        command += ' --disable-plugins';
      }

      // 调试信息：显示最终命令
      console.log('最终生成的命令:', command);
      console.log('命令长度:', command.length);
      console.log('CLI命令生成器节点:', outputNode);
      console.log('所有连接:', connections);
      console.log('所有节点:', nodes);

      // 显示将要执行的命令
      setExecution(prev => prev ? {
        ...prev,
        progress: 10,
        logs: [...prev.logs, {
          id: `log-${Date.now()}-command`,
          message: `📝 生成的CLI命令:`,
          level: 'info',
          timestamp: new Date()
        }, {
          id: `log-${Date.now()}-cmd`,
          message: command,
          level: 'info',
          timestamp: new Date()
        }]
      } : null);

      // 执行命令
      setExecution(prev => prev ? {
        ...prev,
        progress: 20,
        logs: [...prev.logs, {
          id: `log-${Date.now()}-exec`,
          message: `⚡ 正在执行命令...`,
          level: 'info',
          timestamp: new Date()
        }]
      } : null);
      
      try {
        // 使用 Electron 的 IPC 来执行完整命令
        const result = await window.electronAPI?.executeCommand(command);
        
        if (result?.success) {
          console.log('命令启动成功:', result);
          // processId将通过command-started事件设置
          // 实时输出通过command-output事件处理
          // 完成状态通过command-finished事件处理
        } else {
          // 启动失败
          setExecution(prev => prev ? {
            ...prev,
            status: 'error',
            endTime: new Date(),
            logs: [...prev.logs, {
              id: `log-${Date.now()}-error`,
              message: `❌ 命令启动失败: ${result?.errorOutput || '未知错误'}`,
              level: 'error',
              timestamp: new Date()
            }]
          } : null);
        }
        
      } catch (cmdError) {
        console.error('执行命令异常:', cmdError);
        setExecution(prev => prev ? {
          ...prev,
          status: 'error',
          endTime: new Date(),
          logs: [...prev.logs, {
            id: `log-${Date.now()}-error`,
            message: `❌ 命令执行异常: ${cmdError instanceof Error ? cmdError.message : String(cmdError)}`,
            level: 'error',
            timestamp: new Date()
          }]
        } : null);
        return; // 执行失败时直接返回
      }
      
    } catch (error) {
      // 错误处理
      setExecution(prev => prev ? {
        ...prev,
        status: 'error',
        logs: [...prev.logs, {
          id: `log-${Date.now()}-error`,
          message: `❌ 执行失败: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error',
          timestamp: new Date()
        }]
      } : null);
    }
  }, [nodes]);

  // 停止执行工作流
  const stopExecution = useCallback(async () => {
    if (!execution || execution.status !== 'running') return;
    
    try {
      // 获取所有运行中的命令
      const runningCommands = await window.electronAPI?.getRunningProcesses();
      
      if (runningCommands && runningCommands.length > 0) {
        // 停止所有运行中的命令
        for (const cmd of runningCommands) {
          await window.electronAPI?.killCommand(cmd.processId);
        }
      }
      
      setExecution(prev => prev ? {
        ...prev,
        status: 'stopped',
        logs: [...prev.logs, {
          id: `log-${Date.now()}-stopped`,
          message: '⛔ 工作流执行已停止',
          level: 'warning',
          timestamp: new Date()
        }]
      } : null);
    } catch (error) {
      setExecution(prev => prev ? {
        ...prev,
        status: 'error',
        logs: [...prev.logs, {
          id: `log-${Date.now()}-stop-error`,
          message: `❌ 停止执行失败: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error',
          timestamp: new Date()
        }]
      } : null);
    }
  }, [execution]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* 顶部工具栏 */}
      <div style={{
        height: '60px',
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 工作流名称 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>工作流:</span>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '120px'
              }}
            />
          </div>

          {/* 导入导出按钮 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importWorkflow}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <AddIcon size={14} color="#64748b" />
              导入
            </button>
            <button
              onClick={exportWorkflow}
              disabled={nodes.length === 0}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: nodes.length === 0 ? '#f3f4f6' : 'white',
                cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <OutputIcon size={14} color={nodes.length === 0 ? '#9ca3af' : '#64748b'} />
              导出
            </button>
            <button
              onClick={loadExampleWorkflow}
              style={{
                padding: '8px 12px',
                border: '1px solid #10b981',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              <DesignIcon size={14} color="white" />
              加载示例
            </button>
          </div>

          {/* 执行控制按钮 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {execution && execution.status === 'running' ? (
              <button
                onClick={stopExecution}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                <PauseIcon size={14} color="white" />
                停止执行
              </button>
            ) : (
              <button
                onClick={executeWorkflow}
                disabled={nodes.length === 0}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  background: nodes.length === 0 ? '#f3f4f6' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: nodes.length === 0 ? '#9ca3af' : 'white',
                  cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                <PlayIcon size={14} color={nodes.length === 0 ? '#9ca3af' : 'white'} />
                执行工作流
              </button>
            )}
            
            <button
              onClick={clearWorkflow}
              style={{
                padding: '8px 12px',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#ef4444'
              }}
            >
              <DeleteIcon size={14} color="#ef4444" />
              清空
            </button>
          </div>

          {/* 标签页 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { key: 'design', label: '设计', tab: 'design', icon: <DesignIcon size={16} color={activeTab === 'design' ? 'white' : '#666'} /> },
              { key: 'execute', label: '执行', tab: 'execute', icon: <ExecuteIcon size={16} color={activeTab === 'execute' ? 'white' : '#666'} /> },
              { key: 'logs', label: '日志', tab: 'logs', icon: <LogIcon size={16} color={activeTab === 'logs' ? 'white' : '#666'} /> }
            ].map(({ key, label, tab, icon }) => (
              <button key={key} onClick={() => setActiveTab(tab as 'design' | 'execute' | 'logs')} style={{
                padding: '10px 16px', border: 'none', borderRadius: '8px',
                background: activeTab === tab ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: activeTab === tab ? 'white' : '#64748b',
                fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 执行状态显示 */}
          {execution && (
            <div style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: execution.status === 'running' ? '#fef3c7' : 
                         execution.status === 'completed' ? '#d1fae5' :
                         execution.status === 'error' ? '#fee2e2' :
                         execution.status === 'stopped' ? '#f3f4f6' : '#f8fafc',
              color: execution.status === 'running' ? '#92400e' :
                     execution.status === 'completed' ? '#065f46' :
                     execution.status === 'error' ? '#991b1b' :
                     execution.status === 'stopped' ? '#6b7280' : '#374151',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {execution.status === 'running' && '⚡ 正在执行...'}
              {execution.status === 'completed' && '✅ 执行完成'}
              {execution.status === 'error' && '❌ 执行失败'}
              {execution.status === 'stopped' && '⛔ 已停止'}
              {execution.status === 'running' && (
                <span style={{ fontSize: '10px' }}>({Math.round(execution.progress)}%)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* 左侧节点面板 */}
        <div style={{ 
          width: '320px', 
          background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)', 
          borderRight: '1px solid #444', 
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'inset -1px 0 0 0 #333, 2px 0 10px rgba(0,0,0,0.3)',
          maxHeight: '100vh'
        }}>
          {/* 面板头部 */}
          <div style={{ 
            padding: '20px', 
            borderBottom: '1px solid #444',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AddIcon size={18} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>节点库</h3>
                <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>拖拽节点到画布创建工作流</p>
              </div>
            </div>
          </div>
          
          {/* 可滚动内容区域 */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: '#1a1a1a'
            }}
            onWheel={(e) => e.stopPropagation()} // 阻止滚轮事件冒泡到画布
          >
            {Object.entries(nodeTemplates).map(([category, templates]) => (
              <div key={category} style={{ marginBottom: '28px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #2a2a2a 0%, #333 100%)',
                  borderRadius: '8px',
                  border: '1px solid #444'
                }}>
                  <div style={{
                    width: '4px',
                    height: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '2px'
                  }} />
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#e5e7eb',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{category}</h4>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {templates.map((template, index) => (
                    <div 
                      key={`${category}-${template.type}-${index}`} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, template)}
                      onDragEnd={handleDragEnd}
                      style={{
                        padding: '16px', 
                        background: 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)', 
                        border: '1px solid #444',
                        borderRadius: '12px', 
                        cursor: 'grab', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '14px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                        e.currentTarget.style.boxShadow = `0 8px 25px rgba(0,0,0,0.4), 0 0 20px ${template.color}30`;
                        e.currentTarget.style.borderColor = template.color;
                        e.currentTarget.style.background = `linear-gradient(135deg, #333 0%, #2a2a2a 100%)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                        e.currentTarget.style.borderColor = '#444';
                        e.currentTarget.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)';
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.cursor = 'grabbing';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.cursor = 'grab';
                      }}
                    >
                      <div style={{
                        width: '40px', 
                        height: '40px', 
                        background: `linear-gradient(135deg, ${template.color} 0%, ${template.color}dd 100%)`,
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: `0 2px 8px ${template.color}30`
                      }}>
                        {template.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#ffffff',
                          marginBottom: '4px'
                        }}>{template.name}</div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#d1d5db',
                          lineHeight: '1.4'
                        }}>{template.description}</div>
                      </div>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: template.color,
                        borderRadius: '50%',
                        opacity: 0.6
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 主内容区域 */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {activeTab === 'design' && (
            /* 设计模式 - 画布区域 */
            <div 
              ref={canvasRef} 
              style={{
                width: '100%',
                height: '100%',
                position: 'relative', 
                overflow: 'hidden',
                background: `
                  radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 40%),
                  radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 40%),
                  linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), 
                  linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                  linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)
                `,
                backgroundSize: `600px 600px, 600px 600px, ${20 * zoom}px ${20 * zoom}px, ${20 * zoom}px ${20 * zoom}px, 100% 100%`,
                minHeight: '100vh',
                cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : draggedNodeId ? 'grabbing' : 'default'
              }} 
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleNodeMouseMove}
              onMouseUp={handleNodeMouseUp}
            >
          {/* SVG连线层 */}
          <svg 
            ref={svgRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            {connections.map(connection => {
              const sourceNode = nodes.find(n => n.id === connection.sourceNodeId);
              const targetNode = nodes.find(n => n.id === connection.targetNodeId);
              const sourcePort = sourceNode?.outputs.find(p => p.id === connection.sourcePortId);
              const targetPort = targetNode?.inputs.find(p => p.id === connection.targetPortId);
              
              if (!sourceNode || !targetNode || !sourcePort || !targetPort) return null;
              
              // 直接计算端口位置，不重复应用变换
              const sourceOutputIndex = sourceNode.outputs.findIndex(p => p.id === connection.sourcePortId);
              const targetInputIndex = targetNode.inputs.findIndex(p => p.id === connection.targetPortId);
              
              const sourcePos = {
                x: (sourceNode.position.x + sourceNode.size.width + panOffset.x) * zoom,
                y: (sourceNode.position.y + 30 + sourceOutputIndex * 25 + panOffset.y) * zoom
              };
              
              const targetPos = {
                x: (targetNode.position.x + panOffset.x) * zoom,
                y: (targetNode.position.y + 30 + targetInputIndex * 25 + panOffset.y) * zoom
              };
              
              // 计算更平滑的贝塞尔曲线控制点
              const distance = Math.sqrt(
                Math.pow(targetPos.x - sourcePos.x, 2) + 
                Math.pow(targetPos.y - sourcePos.y, 2)
              );
              const controlPointOffset = Math.max(100, Math.min(300, distance * 0.6));
              
              // 使用更平滑的曲线路径
              const pathData = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + controlPointOffset} ${sourcePos.y}, ${targetPos.x - controlPointOffset} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
              
              // 根据数据类型选择颜色，使用更现代的配色方案
              const getConnectionColor = (dataType: string) => {
                switch (dataType) {
                  case 'string': return '#06d6a0'; // 绿色系
                  case 'number': return '#118ab2'; // 蓝色系
                  case 'boolean': return '#ffd166'; // 黄色系
                  case 'object': return '#f72585'; // 紫红色系
                  case 'array': return '#f77f00'; // 橙色系
                  default: return '#8d99ae'; // 灰色系
                }
              };
              
              const connectionColor = getConnectionColor(sourcePort.dataType);
              const glowColor = connectionColor + '40'; // 添加透明度
              
              return (
                <g key={connection.id}>
                  {/* 外发光效果 */}
                  <defs>
                    <filter id={`glow-${connection.id}`} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/> 
                      </feMerge>
                    </filter>
                    <linearGradient id={`gradient-${connection.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={connectionColor} stopOpacity="0.8"/>
                      <stop offset="50%" stopColor={connectionColor} stopOpacity="1"/>
                      <stop offset="100%" stopColor={connectionColor} stopOpacity="0.8"/>
                    </linearGradient>
                  </defs>
                  
                  {/* 背景支撑层 */}
                  <path
                    d={pathData}
                    stroke={connectionColor}
                    strokeWidth="4"
                    fill="none"
                    opacity="0.3"
                  />
                  
                  {/* 主连线，骨架式连接 */}
                  <path
                    d={pathData}
                    stroke={connectionColor}
                    strokeWidth="2"
                    fill="none"
                    style={{ 
                      cursor: 'pointer',
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round'
                    }}
                    className="connection-line"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConnection(connection.id);
                    }}
                  />
                  
                  {/* 不可见的点击区域 */}
                  <path
                    d={pathData}
                    stroke="transparent"
                    strokeWidth="16"
                    fill="none"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConnection(connection.id);
                    }}
                  />
                  

                  
                  {/* 连线上的数据类型标签，优化样式 */}
                  <g transform={`translate(${(sourcePos.x + targetPos.x) / 2}, ${(sourcePos.y + targetPos.y) / 2 - 15})`}>
                    {/* 标签背景 */}
                    <rect
                      x="-20"
                      y="-8"
                      width="40"
                      height="16"
                      rx="8"
                      fill={connectionColor}
                      opacity="0.9"
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                      }}
                    />
                    {/* 标签文本 */}
                    <text
                      x="0"
                      y="3"
                      fill="white"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      style={{
                        pointerEvents: 'none',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                      }}
                    >
                      {sourcePort.dataType}
                    </text>
                  </g>
                </g>
              );
            })}
            
            {/* 正在连接的临时线 */}
            {connectingPort && (
              <line
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
          </svg>
          {/* 空状态提示 */}
          {nodes.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '16px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '2px dashed #d1d5db'
              }}>
                <AddIcon size={32} color="#9ca3af" />
              </div>
              <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>拖拽节点到这里开始创建</p>
              <p style={{ margin: 0, fontSize: '14px' }}>从左侧节点库选择适合的节点</p>
            </div>
          )}
          
          {/* ComfyUI风格节点渲染 */}
          {nodes.map(node => (
            <div 
              key={node.id} 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(node);
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              style={{
                position: 'absolute', 
                left: (node.position.x + panOffset.x) * zoom, 
                top: (node.position.y + panOffset.y) * zoom,
                width: `${node.size.width * zoom}px`,
                minHeight: `${node.size.height * zoom}px`,
                background: 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)',
                border: selectedNode?.id === node.id 
                  ? `2px solid ${node.color}` 
                  : '1px solid #555',
                borderRadius: `${8 * zoom}px`, 
                cursor: draggedNodeId === node.id ? 'grabbing' : 'grab',
                boxShadow: selectedNode?.id === node.id 
                  ? `0 0 0 ${3 * zoom}px ${node.color}30, 0 ${6 * zoom}px ${20 * zoom}px rgba(0,0,0,0.4), 0 0 ${15 * zoom}px ${node.color}20` 
                  : `0 ${3 * zoom}px ${10 * zoom}px rgba(0,0,0,0.3)`,
                transition: draggedNodeId === node.id ? 'none' : 'all 0.2s ease',
                zIndex: selectedNode?.id === node.id ? 100 : (draggedNodeId === node.id ? 99 : 10),
                fontSize: `${12 * zoom}px`,
                color: '#ffffff',
                userSelect: 'none',
                transform: selectedNode?.id === node.id ? `scale(${1.02})` : 'scale(1)'
              }}
            >
              {/* 节点标题 */}
              <div style={{
                background: node.color,
                padding: `${8 * zoom}px ${12 * zoom}px`,
                borderRadius: `${6 * zoom}px ${6 * zoom}px 0 0`,
                display: 'flex',
                alignItems: 'center',
                gap: `${8 * zoom}px`,
                fontSize: `${11 * zoom}px`,
                fontWeight: '600',
                color: 'white'
              }}>
                <div style={{
                  width: `${16 * zoom}px`,
                  height: `${16 * zoom}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {node.icon}
                </div>
                <span>{node.name}</span>
                
                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  style={{
                    marginLeft: 'auto',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: `${20 * zoom}px`,
                    height: `${20 * zoom}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: `${10 * zoom}px`,
                    color: 'white'
                  }}
                >
                  ×
                </button>
              </div>
              
              {/* 输入端口 */}
              {node.inputs.map((input, index) => (
                <div key={input.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: `${4 * zoom}px ${12 * zoom}px`,
                  borderBottom: index < node.inputs.length - 1 ? '1px solid #555' : 'none',
                  position: 'relative'
                }}>
                  {/* 输入端口圆点 */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePortClick(node.id, input.id, 'input');
                    }}
                    onMouseEnter={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      left: `${-8 * zoom}px`,
                      width: `${16 * zoom}px`,
                      height: `${16 * zoom}px`,
                      borderRadius: '50%',
                      background: connectingPort?.nodeId === node.id && connectingPort?.portId === input.id 
                        ? '#3b82f6' 
                        : hoveredNodeId === node.id || connectingPort 
                        ? '#10b981' 
                        : '#666',
                      border: `${2 * zoom}px solid #2a2a2a`,
                      cursor: 'crosshair',
                      zIndex: 10,
                      opacity: hoveredNodeId === node.id || connectingPort ? 1 : 0.6,
                      transform: hoveredNodeId === node.id ? `scale(1.2)` : 'scale(1)',
                      transition: 'all 0.2s ease',
                      boxShadow: hoveredNodeId === node.id ? `0 0 8px ${input.dataType === 'string' ? '#10b981' : input.dataType === 'number' ? '#f59e0b' : '#8b5cf6'}` : 'none'
                    }}
                  />
                  
                  <span style={{
                    fontSize: `${10 * zoom}px`,
                    color: '#ccc',
                    marginLeft: `${8 * zoom}px`
                  }}>
                    {input.name}
                    {input.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </span>
                  
                  <span style={{
                    fontSize: `${9 * zoom}px`,
                    color: '#888',
                    marginLeft: 'auto'
                  }}>
                    {input.dataType}
                  </span>
                </div>
              ))}
              
              {/* 输出端口 */}
              {node.outputs.map((output, index) => (
                <div key={output.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: `${4 * zoom}px ${12 * zoom}px`,
                  borderBottom: index < node.outputs.length - 1 ? '1px solid #555' : 'none',
                  position: 'relative',
                  justifyContent: 'flex-end'
                }}>
                  <span style={{
                    fontSize: `${9 * zoom}px`,
                    color: '#888',
                    marginRight: 'auto'
                  }}>
                    {output.dataType}
                  </span>
                  
                  <span style={{
                    fontSize: `${10 * zoom}px`,
                    color: '#ccc',
                    marginRight: `${8 * zoom}px`
                  }}>
                    {output.name}
                  </span>
                  
                  {/* 输出端口圆点 */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePortClick(node.id, output.id, 'output');
                    }}
                    onMouseEnter={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      right: `${-8 * zoom}px`,
                      width: `${16 * zoom}px`,
                      height: `${16 * zoom}px`,
                      borderRadius: '50%',
                      background: connectingPort?.nodeId === node.id && connectingPort?.portId === output.id 
                        ? '#3b82f6' 
                        : hoveredNodeId === node.id || connectingPort 
                        ? node.color 
                        : '#666',
                      border: `${2 * zoom}px solid #2a2a2a`,
                      cursor: 'crosshair',
                      zIndex: 10,
                      opacity: hoveredNodeId === node.id || connectingPort ? 1 : 0.6,
                      transform: hoveredNodeId === node.id ? `scale(1.2)` : 'scale(1)',
                      transition: 'all 0.2s ease',
                      boxShadow: hoveredNodeId === node.id ? `0 0 8px ${node.color}` : 'none'
                    }}
                  />
                </div>
              ))}
              
              {/* 参数配置区域 */}
              {Object.keys(node.config).length > 0 && (
                <div style={{
                  padding: `${8 * zoom}px ${12 * zoom}px`,
                  borderTop: '1px solid #555',
                  background: '#2a2a2a'
                }}>
                  {Object.entries(node.config).slice(0, 3).map(([key, value]) => (
                    <div key={key} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: `${4 * zoom}px`,
                      fontSize: `${9 * zoom}px`
                    }}>
                      <span style={{ color: '#aaa' }}>{key}:</span>
                      <span style={{ 
                        color: '#fff',
                        maxWidth: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(node.config).length > 3 && (
                    <div style={{
                      fontSize: `${9 * zoom}px`,
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      +{Object.keys(node.config).length - 3} more...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* 缩放控制按钮 */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 1000
          }}>
            <button
              onClick={() => setZoom(prev => Math.min(2, prev + 0.2))}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid #555',
                background: 'rgba(42, 42, 42, 0.9)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              <ZoomInIcon size={20} color="#fff" />
            </button>
            
            <div style={{
              width: '40px',
              height: '30px',
              borderRadius: '15px',
              border: '1px solid #555',
              background: 'rgba(42, 42, 42, 0.9)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '600',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              {Math.round(zoom * 100)}%
            </div>
            
            <button
              onClick={() => setZoom(prev => Math.max(0.3, prev - 0.2))}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid #555',
                background: 'rgba(42, 42, 42, 0.9)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              <ZoomOutIcon size={20} color="#fff" />
            </button>
            
            <button
              onClick={() => setZoom(1)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid #555',
                background: 'rgba(42, 42, 42, 0.9)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              1:1
            </button>
            
            {/* 平移提示 */}
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(42, 42, 42, 0.9)',
              border: '1px solid #555',
              fontSize: '10px',
              color: '#ccc',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <div style={{ marginBottom: '4px', fontWeight: '600', color: spacePressed ? '#06d6a0' : '#fff' }}>
                🔄 平移控制
              </div>
              <div>空格 + 拖拽</div>
              <div>中键拖拽</div>
              <div>Ctrl + 拖拽</div>
            </div>
          </div>
            </div>
          )}

          {activeTab === 'execute' && (
            /* 执行模式 - 执行控制面板 */
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              padding: '20px',
              overflow: 'auto'
            }}>
              <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                color: '#ffffff'
              }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '20px',
                  color: '#ffffff'
                }}>
                  🚀 工作流执行
                </h2>
                
                {execution ? (
                  <div style={{
                    background: '#2a2a2a',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #444'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>执行状态</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: execution.status === 'running' ? '#fef3c7' : 
                                     execution.status === 'completed' ? '#d1fae5' :
                                     execution.status === 'error' ? '#fee2e2' :
                                     execution.status === 'stopped' ? '#f3f4f6' : '#f8fafc',
                          color: execution.status === 'running' ? '#92400e' :
                                 execution.status === 'completed' ? '#065f46' :
                                 execution.status === 'error' ? '#991b1b' :
                                 execution.status === 'stopped' ? '#6b7280' : '#374151',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {execution.status === 'running' && '⚡ 正在执行'}
                          {execution.status === 'completed' && '✅ 执行完成'}
                          {execution.status === 'error' && '❌ 执行失败'}
                          {execution.status === 'stopped' && '⛔ 已停止'}
                        </div>
                        {execution.status === 'running' && execution.processId && (
                          <button
                            onClick={async () => {
                              try {
                                await window.electronAPI?.stopCommand(execution.processId!);
                                setExecution(prev => prev ? {
                                  ...prev,
                                  logs: [...prev.logs, {
                                    id: `log-${Date.now()}-stop-request`,
                                    message: '⏹️ 正在停止命令...',
                                    level: 'info',
                                    timestamp: new Date()
                                  }]
                                } : null);
                              } catch (error) {
                                console.error('停止命令失败:', error);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#ef4444',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            ⏹️ 停止
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {execution.status === 'running' && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          background: '#1a1a1a',
                          borderRadius: '8px',
                          padding: '8px',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            height: '6px',
                            background: '#333',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              background: 'linear-gradient(90deg, #10b981, #059669)',
                              width: `${execution.progress}%`,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#9ca3af',
                          textAlign: 'center'
                        }}>
                          {Math.round(execution.progress)}% 完成
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    background: '#2a2a2a',
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center',
                    border: '1px solid #444'
                  }}>
                    <div style={{
                      fontSize: '48px',
                      marginBottom: '16px',
                      opacity: 0.5
                    }}>🚀</div>
                    <h3 style={{
                      fontSize: '18px',
                      marginBottom: '8px',
                      color: '#ffffff'
                    }}>尚未执行工作流</h3>
                    <p style={{
                      color: '#9ca3af',
                      margin: 0
                    }}>点击上方的“执行工作流”按钮开始执行</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            /* 日志模式 - 执行日志面板 */
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              padding: '20px',
              overflow: 'auto'
            }}>
              <div style={{
                maxWidth: '1000px',
                margin: '0 auto',
                color: '#ffffff'
              }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '20px',
                  color: '#ffffff'
                }}>
                  📜 执行日志
                </h2>
                
                {execution && execution.logs.length > 0 ? (
                  <div style={{
                    background: '#1a1a1a',
                    borderRadius: '12px',
                    border: '1px solid #333',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#2a2a2a',
                      padding: '12px 20px',
                      borderBottom: '1px solid #333',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff'
                    }}>
                      执行日志 ({execution.logs.length} 条记录)
                    </div>
                    <div style={{
                      maxHeight: '500px',
                      overflowY: 'auto',
                      padding: '0'
                    }}>
                      {execution.logs.map((log, index) => (
                        <div key={log.id} style={{
                          padding: '12px 20px',
                          borderBottom: index < execution.logs.length - 1 ? '1px solid #333' : 'none',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          background: log.level === 'error' ? '#fee2e2' :
                                     log.level === 'warning' ? '#fef3c7' :
                                     log.level === 'success' ? '#d1fae5' : 'transparent'
                        }}>
                          <div style={{
                            fontSize: '10px',
                            color: '#9ca3af',
                            minWidth: '60px',
                            fontFamily: 'monospace'
                          }}>
                            {log.timestamp.toLocaleTimeString()}
                          </div>
                          <div style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            minWidth: '50px',
                            textAlign: 'center',
                            background: log.level === 'error' ? '#ef4444' :
                                       log.level === 'warning' ? '#f59e0b' :
                                       log.level === 'success' ? '#10b981' : '#6b7280',
                            color: 'white'
                          }}>
                            {log.level}
                          </div>
                          <div style={{
                            flex: 1,
                            fontSize: '13px',
                            lineHeight: '1.5',
                            color: log.level === 'error' ? '#991b1b' :
                                   log.level === 'warning' ? '#92400e' :
                                   log.level === 'success' ? '#065f46' : '#ffffff',
                            fontFamily: log.message.includes('npx') ? 'monospace' : 'inherit'
                          }}>
                            {log.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: '#2a2a2a',
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center',
                    border: '1px solid #444'
                  }}>
                    <div style={{
                      fontSize: '48px',
                      marginBottom: '16px',
                      opacity: 0.5
                    }}>📜</div>
                    <h3 style={{
                      fontSize: '18px',
                      marginBottom: '8px',
                      color: '#ffffff'
                    }}>暂无执行日志</h3>
                    <p style={{
                      color: '#9ca3af',
                      margin: 0
                    }}>执行工作流后将在这里显示详细日志</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧参数面板 - ComfyUI风格 */}
        {(selectedNode || connectingPort) && (
          <div style={{ 
            width: '350px', 
            background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)', 
            borderLeft: '1px solid #444', 
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'inset 1px 0 0 0 #333, -2px 0 10px rgba(0,0,0,0.3)',
            maxHeight: '100vh'
          }}>
            {selectedNode && (
              <>
                {/* 面板头部 */}
                <div style={{
                  padding: '20px',
                  borderBottom: '1px solid #444',
                  background: `linear-gradient(135deg, ${selectedNode.color} 0%, ${selectedNode.color}80 100%)`,
                  color: 'white'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {selectedNode.icon}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        {selectedNode.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedNode(null)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                      title="关闭面板"
                    >
                      ×
                    </button>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '12px', 
                    opacity: 0.9,
                    fontStyle: 'italic'
                  }}>
                    {selectedNode.description}
                  </p>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '10px',
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {selectedNode.type} 节点
                  </div>
                </div>

                {/* 可滚动内容区域 */}
                <div 
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    background: '#1a1a1a'
                  }}
                  onWheel={(e) => e.stopPropagation()} // 阻止滚轮事件冒泡到画布
                >
                  {/* 节点参数配置 */}
                  <div style={{ padding: '20px' }}>
                    {/* 节点名称编辑 */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        color: '#ccc',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        节点名称
                      </label>
                      <input 
                        type="text" 
                        value={selectedNode?.name || ''} 
                        onChange={(e) => {
                          if (selectedNode) {
                            setSelectedNode(prev => prev ? { ...prev, name: e.target.value } : null);
                            setNodes(prev => prev.map(node => 
                              node.id === selectedNode.id ? { ...node, name: e.target.value } : node
                            ));
                          }
                        }} 
                        style={{ 
                          width: '100%', 
                          padding: '12px 16px', 
                          background: '#1a1a1a',
                          border: '1px solid #555', 
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = selectedNode?.color || '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#555'}
                      />
                </div>

                    {/* 输入端口信息 */}
                    {selectedNode?.inputs && selectedNode.inputs.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ 
                          margin: '0 0 12px 0', 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: '#ccc',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                      输入端口 ({selectedNode.inputs.length})
                    </h4>
                    {selectedNode.inputs.map(input => (
                      <div key={input.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#1a1a1a',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        border: '1px solid #333'
                      }}>
                        <div>
                          <div style={{ fontSize: '13px', color: '#fff' }}>
                            {input.name}
                            {input.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                          </div>
                          <div style={{ fontSize: '10px', color: '#888' }}>
                            {input.dataType}
                          </div>
                        </div>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#666'
                        }} />
                      </div>
                    ))}
                  </div>
                )}

                    {/* 输出端口信息 */}
                    {selectedNode?.outputs && selectedNode.outputs.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      color: '#ccc',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      输出端口 ({selectedNode.outputs.length})
                    </h4>
                    {selectedNode.outputs.map(output => (
                      <div key={output.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#1a1a1a',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        border: '1px solid #333'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: selectedNode.color
                        }} />
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', color: '#fff' }}>
                            {output.name}
                          </div>
                          <div style={{ fontSize: '10px', color: '#888' }}>
                            {output.dataType}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                    {/* 参数配置 */}
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        color: '#ccc',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        参数配置 ({Object.keys(selectedNode?.config || {}).length})
                      </h4>
                      
                      {Object.entries(selectedNode?.config || {}).map(([key, value]) => (
                        <div key={key} style={{ marginBottom: '20px' }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontSize: '12px', 
                            fontWeight: '500',
                            color: '#aaa'
                          }}>
                            {key}
                          </label>
                      
                      {typeof value === 'boolean' ? (
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}>
                          <input 
                            type="checkbox" 
                            checked={value} 
                            onChange={(e) => {
                              const newConfig = { ...selectedNode.config, [key]: e.target.checked };
                              setSelectedNode(prev => prev ? { ...prev, config: newConfig } : null);
                              setNodes(prev => prev.map(node => 
                                node.id === selectedNode.id ? { ...node, config: newConfig } : node
                              ));
                            }}
                            style={{
                              width: '16px',
                              height: '16px',
                              accentColor: selectedNode.color
                            }}
                          />
                          <span style={{ fontSize: '13px', color: '#ccc' }}>
                            {value ? '启用' : '禁用'}
                          </span>
                        </label>
                      ) : typeof value === 'number' ? (
                        <input 
                          type="number" 
                          value={value} 
                          onChange={(e) => {
                            const newConfig = { ...selectedNode.config, [key]: parseFloat(e.target.value) || 0 };
                            setSelectedNode(prev => prev ? { ...prev, config: newConfig } : null);
                            setNodes(prev => prev.map(node => 
                              node.id === selectedNode.id ? { ...node, config: newConfig } : node
                            ));
                          }} 
                          style={{ 
                            width: '100%', 
                            padding: '10px 12px', 
                            background: '#1a1a1a',
                            border: '1px solid #555', 
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '13px'
                          }} 
                        />
                      ) : typeof value === 'object' ? (
                        <textarea 
                          value={JSON.stringify(value, null, 2)} 
                          onChange={(e) => {
                            try {
                              const newConfig = { ...selectedNode.config, [key]: JSON.parse(e.target.value) };
                              setSelectedNode(prev => prev ? { ...prev, config: newConfig } : null);
                              setNodes(prev => prev.map(node => 
                                node.id === selectedNode.id ? { ...node, config: newConfig } : node
                              ));
                            } catch (err) {
                              // 忽略JSON解析错误
                            }
                          }} 
                          style={{ 
                            width: '100%', 
                            padding: '10px 12px', 
                            background: '#1a1a1a',
                            border: '1px solid #555', 
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            minHeight: '80px',
                            resize: 'vertical'
                          }} 
                        />
                      ) : (
                        <textarea 
                          value={String(value)} 
                          onChange={(e) => {
                            const newConfig = { ...selectedNode.config, [key]: e.target.value };
                            setSelectedNode(prev => prev ? { ...prev, config: newConfig } : null);
                            setNodes(prev => prev.map(node => 
                              node.id === selectedNode.id ? { ...node, config: newConfig } : node
                            ));
                          }} 
                          style={{ 
                            width: '100%', 
                            padding: '10px 12px', 
                            background: '#1a1a1a',
                            border: '1px solid #555', 
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '13px',
                            minHeight: '60px',
                            resize: 'vertical'
                          }} 
                        />
                      )}
                    </div>
                  ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* 连接状态信息 */}
            {connectingPort && (
              <div style={{
                padding: '20px',
                background: '#1a1a1a',
                borderTop: '1px solid #444'
              }}>
                <h4 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '14px', 
                  color: '#3b82f6'
                }}>
                  正在连接...
                </h4>
                <p style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  color: '#aaa'
                }}>
                  点击目标节点的{connectingPort.portType === 'output' ? '输入' : '输出'}端口完成连接
                </p>
                <button
                  onClick={() => setConnectingPort(null)}
                  style={{
                    marginTop: '12px',
                    padding: '6px 12px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  取消连接
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowStudio;
