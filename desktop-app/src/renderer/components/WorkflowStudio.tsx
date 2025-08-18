import React, { useState, useCallback, useRef, useEffect } from 'react';

// 简化图标组件，避免导入错误
const PlayIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PauseIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);

const StopIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M6 6h12v12H6z"/>
  </svg>
);

const SettingsIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
  </svg>
);

const DataIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
  </svg>
);

const BrowserIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
  </svg>
);

const RobotIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
  </svg>
);

const TerminalIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M20,19V7H4V19H20M20,3A2,2 0 0,1 22,5V19A2,2 0 0,1 20,21H4A2,2 0 0,1 2,19V5C2,3.89 2.9,3 4,3H20M13,17V15H18V17H13M9.58,13L5.57,9H8.4L11.7,12.3C12.09,12.69 12.09,13.33 11.7,13.72L8.42,17H5.59L9.58,13Z"/>
  </svg>
);

const ExecuteIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M8.5,8.64L13.77,12L8.5,15.36V8.64M6.5,5V19L17.5,12"/>
  </svg>
);

const LogIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
  </svg>
);

const AddIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
  </svg>
);

const DeleteIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
  </svg>
);

const DesignIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,9H14V4H5V21H19V9Z"/>
  </svg>
);

const ZoomInIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M15.5,14L20.5,19L19,20.5L14,15.5V14.71L13.73,14.43C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.43,13.73L14.71,14H15.5M9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14M12,10H10V12H9V10H7V9H9V7H10V9H12V10Z"/>
  </svg>
);

const ZoomOutIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M15.5,14L20.5,19L19,20.5L14,15.5V14.71L13.73,14.43C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.43,13.73L14.71,14H15.5M9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14M7,9H12V10H7V9Z"/>
  </svg>
);

const DatabaseIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12,3C7.58,3 4,4.79 4,7C4,9.21 7.58,11 12,11C16.42,11 20,9.21 20,7C20,4.79 16.42,3 12,3M4,9V12C4,14.21 7.58,16 12,16C16.42,16 20,14.21 20,12V9C20,11.21 16.42,13 12,13C7.58,13 4,11.21 4,9M4,14V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V14C20,16.21 16.42,18 12,18C7.58,18 4,16.21 4,14Z"/>
  </svg>
);

const DownloadIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
  </svg>
);

const EyeIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
  </svg>
);

const EyeOffIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"/>
  </svg>
);

const DebugIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M20,8H17.19C16.74,7.22 16.12,6.55 15.37,6.04L17,4.41L15.59,3L13.42,5.17C12.96,5.06 12.49,5 12,5C11.51,5 11.04,5.06 10.59,5.17L8.41,3L7,4.41L8.62,6.04C7.88,6.55 7.26,7.22 6.81,8H4V10H6.09C6.04,10.33 6,10.66 6,11V12H4V14H6V15C6,15.34 6.04,15.67 6.09,16H4V18H6.81C7.85,19.79 9.78,21 12,21C14.22,21 16.15,19.79 17.19,18H20V16H17.91C17.96,15.67 18,15.34 18,15V14H20V12H18V11C18,10.66 17.96,10.33 17.91,10H20V8M16,15A4,4 0 0,1 12,19A4,4 0 0,1 8,15V11A4,4 0 0,1 12,7A4,4 0 0,1 16,11V15M10,9A1,1 0 0,0 9,10A1,1 0 0,0 10,11A1,1 0 0,0 11,10A1,1 0 0,0 10,9M14,9A1,1 0 0,0 13,10A1,1 0 0,0 14,11A1,1 0 0,0 15,10A1,1 0 0,0 14,9M12,14C12.69,14 13.34,14.16 13.93,14.43L12,16.36L10.07,14.43C10.66,14.16 11.31,14 12,14Z"/>
  </svg>
);

const PluginIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M16.24,3.56L14.83,5L16.41,6.56L17.82,5.15L16.24,3.56M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,4L15.76,7.76L14.34,9.17L12,6.83L9.66,9.17L8.24,7.76L12,4M21,13V11H18V13H21M16.76,18.44L18.17,17L16.41,15.44L15,16.85L16.76,18.44M16.76,18.44L18.17,17L16.41,15.44L15,16.85L16.76,18.44M12,18.17L14.34,15.83L15.76,17.24L12,21L8.24,17.24L9.66,15.83L12,18.17M3,13V11H6V13H3M7.24,18.44L8.66,17L7.24,15.56L5.83,17L7.24,18.44Z"/>
  </svg>
);

const NoPluginIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M22.11 21.46L2.39 1.73L1.11 3L4.27 6.11C4.17 6.26 4.06 6.4 3.96 6.55C3.86 6.71 3.77 6.87 3.69 7.04C3.61 7.2 3.54 7.37 3.48 7.54C3.42 7.71 3.37 7.88 3.33 8.06C3.29 8.24 3.26 8.42 3.24 8.6C3.22 8.78 3.21 8.96 3.21 9.15V14.85C3.21 15.04 3.22 15.22 3.24 15.4C3.26 15.58 3.29 15.76 3.33 15.94C3.37 16.12 3.42 16.29 3.48 16.46C3.54 16.63 3.61 16.8 3.69 16.96C3.77 17.13 3.86 17.29 3.96 17.45C4.06 17.6 4.17 17.74 4.27 17.89L20.84 21.46L22.11 21.46M20.73 17.89C20.83 17.74 20.94 17.6 21.04 17.45C21.14 17.29 21.23 17.13 21.31 16.96C21.39 16.8 21.46 16.63 21.52 16.46C21.58 16.29 21.63 16.12 21.67 15.94C21.71 15.76 21.74 15.58 21.76 15.4C21.78 15.22 21.79 15.04 21.79 14.85V9.15C21.79 8.96 21.78 8.78 21.76 8.6C21.74 8.42 21.71 8.24 21.67 8.06C21.63 7.88 21.58 7.71 21.52 7.54C21.46 7.37 21.39 7.2 21.31 7.04C21.23 6.87 21.14 6.71 21.04 6.55C20.94 6.4 20.83 6.26 20.73 6.11L20.73 17.89Z"/>
  </svg>
);

const OutputIcon = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
  </svg>
);

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

// 基于项目CLI参数的细粒度节点模板 - 完全独立于env文件
const nodeTemplates: Record<string, Omit<WorkflowNode, 'id' | 'position'>[]> = {
  '[CONFIG] 配置': [{
    type: 'openai-config',
    name: 'OpenAI配置',
    description: '配置OpenAI API密钥和模型',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#10b981',
    size: { width: 250, height: 180 },
    inputs: [],
    outputs: [{
      id: 'openai_config_output',
      name: 'OpenAI配置',
      type: 'output',
      dataType: 'object'
    }],
    config: {
      apiKey: '',
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4',
      temperature: 0,
      maxTokens: 4000
    }
  }, {
    type: 'anthropic-config',
    name: 'Anthropic配置',
    description: '配置Anthropic API密钥和模型',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#f97316',
    size: { width: 250, height: 180 },
    inputs: [],
    outputs: [{
      id: 'anthropic_config_output',
      name: 'Anthropic配置',
      type: 'output',
      dataType: 'object'
    }],
    config: {
      apiKey: '',
      baseURL: 'https://api.anthropic.com',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0,
      maxTokens: 4000
    }
  }, {
    type: 'google-config',
    name: 'Google配置',
    description: '配置Google Gemini API密钥和模型',
    icon: <SettingsIcon size={16} color="white" />,
    color: '#3b82f6',
    size: { width: 250, height: 180 },
    inputs: [],
    outputs: [{
      id: 'google_config_output',
      name: 'Google配置',
      type: 'output',
      dataType: 'object'
    }],
    config: {
      apiKey: '',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-pro',
      temperature: 0,
      maxTokens: 4000
    }
  }, {
    type: 'browser-config',
    name: '浏览器配置',
    description: '配置浏览器启动参数',
    icon: <BrowserIcon size={16} color="white" />,
    color: '#8b5cf6',
    size: { width: 250, height: 200 },
    inputs: [],
    outputs: [{
      id: 'browser_config_output',
      name: '浏览器配置',
      type: 'output',
      dataType: 'object'
    }],
    config: {
      headless: false,
      viewportWidth: 1280,
      viewportHeight: 720,
      timeout: 30000,
      userDataDir: './user-data',
      executablePath: '',
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai'
    }
  }, {
    type: 'agent-config',
    name: '代理配置',
    description: '配置AI代理行为参数',
    icon: <RobotIcon size={16} color="white" />,
    color: '#ec4899',
    size: { width: 250, height: 160 },
    inputs: [],
    outputs: [{
      id: 'agent_config_output',
      name: '代理配置',
      type: 'output',
      dataType: 'object'
    }],
    config: {
      maxSteps: 50,
      maxActionsPerStep: 3,
      useVision: true,
      debug: false,
      enablePlugins: true
    }
  }],
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
      task: '访问百度并搜索天气'
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
  
  '[CLI] 命令生成器': [{
    type: 'cli-command-generator',
    name: 'CLI命令生成器',
    description: '根据配置节点动态生成CLI命令和环境变量',
    icon: <TerminalIcon size={16} color="white" />,
    color: '#6366f1',
    size: { width: 300, height: 400 },
    inputs: [{
      id: 'task_input',
      name: 'task',
      type: 'input',
      dataType: 'string'
    }, {
      id: 'openai_config_input',
      name: 'openai-config',
      type: 'input',
      dataType: 'object'
    }, {
      id: 'anthropic_config_input',
      name: 'anthropic-config',
      type: 'input',
      dataType: 'object'
    }, {
      id: 'google_config_input',
      name: 'google-config',
      type: 'input',
      dataType: 'object'
    }, {
      id: 'browser_config_input',
      name: 'browser-config',
      type: 'input',
      dataType: 'object'
    }, {
      id: 'agent_config_input',
      name: 'agent-config',
      type: 'input',
      dataType: 'object'
    }],
    outputs: [],
    config: {}
  }]
};

const WorkflowStudio: React.FC = () => {
  // 初始化状态 - 包含细粒度节点示例工作流
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    // OpenAI配置节点
    {
      id: 'openai-config-1',
      type: 'openai-config',
      name: 'OpenAI配置',
      description: '配置OpenAI API密钥和模型',
      icon: <SettingsIcon size={16} color="white" />,
      color: '#10b981',
      position: { x: 50, y: 50 },
      size: { width: 250, height: 180 },
      inputs: [],
      outputs: [{
        id: 'openai_config_output',
        name: 'OpenAI配置',
        type: 'output',
        dataType: 'object'
      }],
      config: {
        apiKey: 'sk-t8zcWN8dFJxaD18REKRrdLzlngOJlmpkzvfomfyLwaYMNcO6',
        baseURL: 'https://yuanplus.cloud/v1',
        model: 'gemini-2.5-pro',
        temperature: 0,
        maxTokens: 4000
      }
    },
    
    // 浏览器配置节点
    {
      id: 'browser-config-1',
      type: 'browser-config',
      name: '浏览器配置',
      description: '配置浏览器启动参数',
      icon: <BrowserIcon size={16} color="white" />,
      color: '#8b5cf6',
      position: { x: 50, y: 280 },
      size: { width: 250, height: 200 },
      inputs: [],
      outputs: [{
        id: 'browser_config_output',
        name: '浏览器配置',
        type: 'output',
        dataType: 'object'
      }],
      config: {
        headless: false,
        viewportWidth: 1280,
        viewportHeight: 720,
        timeout: 30000,
        userDataDir: './user-data',
        executablePath: '',
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai'
      }
    },
    
    // 代理配置节点
    {
      id: 'agent-config-1',
      type: 'agent-config',
      name: '代理配置',
      description: '配置AI代理行为参数',
      icon: <RobotIcon size={16} color="white" />,
      color: '#ec4899',
      position: { x: 50, y: 530 },
      size: { width: 250, height: 160 },
      inputs: [],
      outputs: [{
        id: 'agent_config_output',
        name: '代理配置',
        type: 'output',
        dataType: 'object'
      }],
      config: {
        maxSteps: 50,
        maxActionsPerStep: 3,
        useVision: true,
        debug: false,
        enablePlugins: true
      }
    },
    
    // 任务描述节点
    {
      id: 'example-task-1',
      type: 'task-description',
      name: '任务描述',
      description: '要执行的自然语言任务',
      icon: <DataIcon size={16} color="white" />,
      color: '#ef4444',
      position: { x: 400, y: 50 },
      size: { width: 250, height: 120 },
      inputs: [],
      outputs: [{
        id: 'task_output',
        name: '任务',
        type: 'output',
        dataType: 'string'
      }],
      config: {
        task: '访问百度并搜索天气'
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
      position: { x: 400, y: 200 },
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
      position: { x: 600, y: 200 },
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
      position: { x: 800, y: 200 },
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
      position: { x: 400, y: 320 },
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
      position: { x: 600, y: 320 },
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
      id: 'cli-generator-1',
      type: 'cli-command-generator',
      name: 'CLI命令生成器',
      description: '生成最终的CLI命令并执行',
      icon: <TerminalIcon size={16} color="white" />,
      color: '#6366f1',
      position: { x: 1000, y: 50 },
      size: { width: 300, height: 400 },
      inputs: [{
        id: 'task_input',
        name: 'task',
        type: 'input',
        dataType: 'string',
        required: true
      }, {
        id: 'openai_config_input',
        name: 'openai-config',
        type: 'input',
        dataType: 'object'
      }, {
        id: 'anthropic_config_input',
        name: 'anthropic-config',
        type: 'input',
        dataType: 'object'
      }, {
        id: 'google_config_input',
        name: 'google-config',
        type: 'input',
        dataType: 'object'
      }, {
        id: 'browser_config_input',
        name: 'browser-config',
        type: 'input',
        dataType: 'object'
      }, {
        id: 'agent_config_input',
        name: 'agent-config',
        type: 'input',
        dataType: 'object'
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
    // 连接示例：配置节点 -> CLI生成器
    {
      id: 'connection-1',
      sourceNodeId: 'example-task-1',
      sourcePortId: 'task_output',
      targetNodeId: 'cli-generator-1',
      targetPortId: 'task_input'
    },
    {
      id: 'connection-2',
      sourceNodeId: 'openai-config-1',
      sourcePortId: 'openai_config_output',
      targetNodeId: 'cli-generator-1',
      targetPortId: 'openai_config_input'
    },
    {
      id: 'connection-3',
      sourceNodeId: 'browser-config-1',
      sourcePortId: 'browser_config_output',
      targetNodeId: 'cli-generator-1',
      targetPortId: 'browser_config_input'
    },
    {
      id: 'connection-4',
      sourceNodeId: 'agent-config-1',
      sourcePortId: 'agent_config_output',
      targetNodeId: 'cli-generator-1',
      targetPortId: 'agent_config_input'
    },
    {
      id: 'connection-5',
      sourceNodeId: 'anthropic-config-1',
      sourcePortId: 'anthropic_config_output',
      targetNodeId: 'cli-generator-1',
      targetPortId: 'anthropic_config_input'
    },
    {
      id: 'connection-6',
      sourceNodeId: 'google-config-1',
      sourcePortId: 'google_config_output',
      targetNodeId: 'cli-generator-1',
      targetPortId: 'google_config_input'
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
      targetNodeId: 'cli-generator-1',
      targetPortId: 'model_input'
    },
    // 最大步数 -> CLI命令生成器
    {
      id: 'conn-steps-output',
      sourceNodeId: 'example-steps-1',
      sourcePortId: 'steps_output',
      targetNodeId: 'cli-generator-1',
      targetPortId: 'steps_input'
    },
    // 可视化模式 -> CLI命令生成器
    {
      id: 'conn-visible-output',
      sourceNodeId: 'example-visible-1',
      sourcePortId: 'visible_output',
      targetNodeId: 'cli-generator-1',
      targetPortId: 'visible_input'
    },
    // 调试模式 -> CLI命令生成器
    {
      id: 'conn-debug-output',
      sourceNodeId: 'example-debug-1',
      sourcePortId: 'debug_output',
      targetNodeId: 'cli-generator-1',
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
      name: workflowName,
      nodes: safeNodes,
      connections: safeConnections,
      panOffset,
      zoom,
      version: '1.0',
      createdAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(workflowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${workflowName || 'workflow'}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [workflowName, nodes, connections, panOffset, zoom]);

  const saveWorkflow = useCallback(() => {
    // 保存当前工作流到本地存储
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
      name: workflowName,
      nodes: safeNodes,
      connections: safeConnections,
      panOffset,
      zoom,
      version: '1.0',
      savedAt: new Date().toISOString()
    };
    
    try {
      localStorage.setItem('currentWorkflow', JSON.stringify(workflowData));
      window.alert('工作流已保存！');
    } catch (error) {
      window.alert('保存失败：' + (error instanceof Error ? error.message : String(error)));
    }
  }, [workflowName, nodes, connections, panOffset, zoom]);

  const loadWorkflow = useCallback(() => {
    // 从本地存储加载工作流
    try {
      const savedWorkflow = localStorage.getItem('currentWorkflow');
      if (!savedWorkflow) {
        window.alert('没有找到已保存的工作流！');
        return;
      }
      
      const workflowData = JSON.parse(savedWorkflow);
      
      // 恢复工作流数据
      setWorkflowName(workflowData.name || '');
      setNodes(workflowData.nodes || []);
      setConnections(workflowData.connections || []);
      setPanOffset(workflowData.panOffset || { x: 0, y: 0 });
      setZoom(workflowData.zoom || 1);
      
      window.alert('工作流已加载！');
    } catch (error) {
      window.alert('加载失败：' + (error instanceof Error ? error.message : String(error)));
    }
  }, []);

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

  // 管理事件监听器的生命周期 - 使用ref防止重复注册
  const listenersRegistered = useRef(false);
  
  useEffect(() => {
    console.log('设置事件监听器...');
    
    // 防止重复注册
    if (listenersRegistered.current) {
      console.log('事件监听器已注册，跳过...');
      return;
    }
    
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
    
    // 注册事件监听器 - 只注册一次
    if (window.electronAPI) {
      console.log('注册事件监听器...');
      window.electronAPI.onCommandOutput?.(handleCommandOutput);
      window.electronAPI.onCommandFinished?.(handleCommandFinished);
      window.electronAPI.onCommandError?.(handleCommandError);
      window.electronAPI.onCommandStopped?.(handleCommandStopped);
      window.electronAPI.onCommandStarted?.(handleCommandStarted);
      listenersRegistered.current = true;
    }
    
    // 清理函数
    return () => {
      console.log('清理事件监听器...');
      listenersRegistered.current = false;
    };
  }, []); // 空依赖数组，只在组件挂载时执行一次

  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      window.alert('请先添加节点到工作流中');
      return;
    }

    // 查找 CLI 命令生成器节点
    const outputNode = nodes.find(n => n.type === 'cli-command-generator');
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
                // 配置节点类型
                case 'openai-config':
                case 'anthropic-config':
                case 'google-config':
                case 'browser-config':
                case 'agent-config':
                  value = sourceNode.config;
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
      
      // 构建环境变量对象
      const envVars: Record<string, string> = {};
      
      // 从配置节点收集环境变量
      const openaiConfig = connectedInputs.get('openai-config');
      if (openaiConfig) {
        if (openaiConfig.apiKey) envVars.OPENAI_API_KEY = openaiConfig.apiKey;
        if (openaiConfig.baseURL) envVars.OPENAI_BASE_URL = openaiConfig.baseURL;
        if (openaiConfig.organization) envVars.OPENAI_ORGANIZATION = openaiConfig.organization;
        // 自动设置provider为openai
        envVars.LLM_PROVIDER = 'openai';
        connectedInputs.set('provider', 'openai');
        // 如果没有指定模型，使用默认模型
        if (!connectedInputs.get('model')) {
          envVars.LLM_MODEL = 'gpt-4o-mini';
          connectedInputs.set('model', 'gpt-4o-mini');
        }
      }
      
      const anthropicConfig = connectedInputs.get('anthropic-config');
      if (anthropicConfig) {
        if (anthropicConfig.apiKey) envVars.ANTHROPIC_API_KEY = anthropicConfig.apiKey;
        if (anthropicConfig.baseURL) envVars.ANTHROPIC_BASE_URL = anthropicConfig.baseURL;
        // 自动设置provider为anthropic
        envVars.LLM_PROVIDER = 'anthropic';
        connectedInputs.set('provider', 'anthropic');
        // 如果没有指定模型，使用默认模型
        if (!connectedInputs.get('model')) {
          envVars.LLM_MODEL = 'claude-3-5-sonnet-20241022';
          connectedInputs.set('model', 'claude-3-5-sonnet-20241022');
        }
      }
      
      const googleConfig = connectedInputs.get('google-config');
      if (googleConfig) {
        if (googleConfig.apiKey) envVars.GOOGLE_API_KEY = googleConfig.apiKey;
        if (googleConfig.baseURL) envVars.GOOGLE_BASE_URL = googleConfig.baseURL;
        // 自动设置provider为google
        envVars.LLM_PROVIDER = 'google';
        connectedInputs.set('provider', 'google');
        // 如果没有指定模型，使用默认模型
        if (!connectedInputs.get('model')) {
          envVars.LLM_MODEL = 'gemini-2.0-flash-exp';
          connectedInputs.set('model', 'gemini-2.0-flash-exp');
        }
      }
      
      const browserConfig = connectedInputs.get('browser-config');
      if (browserConfig) {
        if (browserConfig.headless !== undefined) envVars.BROWSER_HEADLESS = String(browserConfig.headless);
        if (browserConfig.viewportWidth) envVars.BROWSER_WIDTH = String(browserConfig.viewportWidth);
        if (browserConfig.viewportHeight) envVars.BROWSER_HEIGHT = String(browserConfig.viewportHeight);
        if (browserConfig.timeout) envVars.BROWSER_TIMEOUT = String(browserConfig.timeout);
        if (browserConfig.userDataDir) envVars.BROWSER_USER_DATA_DIR = browserConfig.userDataDir;
        if (browserConfig.executablePath) envVars.BROWSER_EXECUTABLE_PATH = browserConfig.executablePath;
        if (browserConfig.locale) envVars.BROWSER_LOCALE = browserConfig.locale;
        if (browserConfig.timezone) envVars.BROWSER_TIMEZONE = browserConfig.timezone;
      }
      
      const agentConfig = connectedInputs.get('agent-config');
      if (agentConfig) {
        if (agentConfig.maxSteps) envVars.AGENT_MAX_STEPS = String(agentConfig.maxSteps);
        if (agentConfig.maxActionsPerStep) envVars.AGENT_MAX_ACTIONS_PER_STEP = String(agentConfig.maxActionsPerStep);
        if (agentConfig.useVision !== undefined) envVars.AGENT_USE_VISION = String(agentConfig.useVision);
        if (agentConfig.debug !== undefined) envVars.DEBUG = String(agentConfig.debug);
        if (agentConfig.enablePlugins !== undefined) envVars.ENABLE_PLUGINS = String(agentConfig.enablePlugins);
      }
      
      // 添加系统级环境变量
      if (agentConfig.debug) {
        envVars.LOG_LEVEL = 'debug';
        envVars.LLM_DEBUG_MODE = 'true';
      }
      
      // 添加LLM策略配置
      envVars.LLM_STRATEGY = 'priority'; // 默认使用优先级策略
      envVars.LLM_DISABLE_HEALTH_CHECK = 'true'; // 防止密钥被禁用
      envVars.LLM_ALWAYS_RETRY_ALL = 'false'; // 不总是重试所有端点
      envVars.LLM_ENABLE_FALLBACK_MODE = 'true'; // 启用回退模式
      
      // 验证必要的环境变量和配置
      const validationErrors: string[] = [];
      const configuredProvider = envVars.LLM_PROVIDER || connectedInputs.get('provider');
      
      // 检查LLM提供商配置
      if (!configuredProvider) {
        validationErrors.push('缺少LLM提供商配置，请连接AI提供商节点');
      }
      
      // 检查API密钥
      if (configuredProvider === 'openai' && !envVars.OPENAI_API_KEY) {
        validationErrors.push('使用OpenAI时需要配置OPENAI_API_KEY');
      }
      if (configuredProvider === 'anthropic' && !envVars.ANTHROPIC_API_KEY) {
        validationErrors.push('使用Anthropic时需要配置ANTHROPIC_API_KEY');
      }
      if (configuredProvider === 'google' && !envVars.GOOGLE_API_KEY) {
        validationErrors.push('使用Google时需要配置GOOGLE_API_KEY');
      }
      
      // 检查模型配置
      if (!envVars.LLM_MODEL && !connectedInputs.get('model')) {
        validationErrors.push('缺少LLM模型配置，请连接AI模型节点');
      }
      
      if (validationErrors.length > 0) {
        throw new Error(`配置验证失败:\n${validationErrors.map(err => `• ${err}`).join('\n')}`);
      }
      
      // 构建 CLI 命令
      let command = `npx sentra-auto run "${taskDescription}"`;
      
      // 调试信息：显示所有连接的输入和环境变量
      console.log('连接的输入参数:', Object.fromEntries(connectedInputs));
      console.log('生成的环境变量:', envVars);
      console.log('配置验证通过，使用提供商:', configuredProvider);
      
      // 添加命令行参数
      const provider = connectedInputs.get('provider');
      if (provider) {
        command += ` --provider ${provider}`;
        envVars.LLM_PROVIDER = provider;
      }
      
      const model = connectedInputs.get('model');
      if (model) {
        command += ` --model ${model}`;
        envVars.LLM_MODEL = model;
      }
      
      const maxSteps = connectedInputs.get('max-steps');
      if (maxSteps) {
        command += ` --max-steps ${maxSteps}`;
      }
      
      const temperature = connectedInputs.get('temperature');
      if (temperature !== undefined) {
        command += ` --temperature ${temperature}`;
        envVars.LLM_TEMPERATURE = String(temperature);
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
      
      // 浏览器配置通过环境变量传递，不是命令行参数
      // 已经在上面的browserConfig处理中设置了相关环境变量：
      // - BROWSER_USER_DATA_DIR
      // - BROWSER_EXECUTABLE_PATH  
      // - BROWSER_TIMEOUT
      // - BROWSER_WIDTH, BROWSER_HEIGHT 等

      // 调试信息：显示最终命令
      console.log('最终生成的命令:', command);
      console.log('命令长度:', command.length);
      console.log('CLI命令生成器节点:', outputNode);
      console.log('所有连接:', connections);
      console.log('所有节点:', nodes);

      // 显示将要执行的命令和环境变量
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
        }, {
          id: `log-${Date.now()}-env`,
          message: `🔧 环境变量配置 (${Object.keys(envVars).length}个):`,
          level: 'info',
          timestamp: new Date()
        }, ...Object.entries(envVars).map(([key, value]) => ({
          id: `log-${Date.now()}-env-${key}`,
          message: `  ${key}=${key.includes('KEY') ? '***' : value}`,
          level: 'info',
          timestamp: new Date()
        }))]
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
        // 使用 Electron 的 IPC 来执行完整命令，并传递环境变量
        const result = await window.electronAPI?.executeCommand(command, envVars);
        
        if (result?.success) {
          console.log('命令启动成功:', result);
          console.log('使用的环境变量:', envVars);
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
              onClick={saveWorkflow}
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
                fontSize: '13px'
              }}
            >
              <DataIcon size={14} color="white" />
              保存
            </button>
            <button
              onClick={loadWorkflow}
              style={{
                padding: '8px 12px',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <DataIcon size={14} color="white" />
              加载
            </button>
            <button
              onClick={clearWorkflow}
              disabled={nodes.length === 0}
              style={{
                padding: '8px 12px',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                background: nodes.length === 0 ? '#f3f4f6' : 'white',
                color: nodes.length === 0 ? '#9ca3af' : '#ef4444',
                cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <DeleteIcon size={14} color={nodes.length === 0 ? '#9ca3af' : '#ef4444'} />
              清空
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
                      maxHeight: 'calc(100vh - 300px)',
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
