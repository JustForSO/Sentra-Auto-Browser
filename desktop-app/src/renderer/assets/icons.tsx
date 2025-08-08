export const BrowserIcon = ({ size = 24, color = '#4CAF50' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="3" width="20" height="18" rx="2" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M2 7h20" stroke={color} strokeWidth="2"/>
    <circle cx="6" cy="5" r="1" fill={color}/>
    <circle cx="9" cy="5" r="1" fill={color}/>
    <circle cx="12" cy="5" r="1" fill={color}/>
  </svg>
);

export const DataIcon = ({ size = 24, color = '#FF9800' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C16.97 2 21 4.69 21 8s-4.03 6-9 6-9-2.69-9-6 4.03-6 9-6z" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M21 12c0 3.31-4.03 6-9 6s-9-2.69-9-6" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M3 8v8c0 3.31 4.03 6 9 6s9-2.69 9-6V8" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const ConditionIcon = ({ size = 24, color = '#9C27B0' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M8 12L12 8L16 12L12 16L8 12Z" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const TransformIcon = ({ size = 24, color = '#2196F3' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M14 2L20 8L14 14L8 8L14 2Z" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M14 10L20 16L14 22L8 16L14 10Z" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M12 8L12 16" stroke={color} strokeWidth="2"/>
  </svg>
);

export const OutputIcon = ({ size = 24, color = '#607D8B' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M14 2V8H20" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M16 13H8" stroke={color} strokeWidth="2"/>
    <path d="M16 17H8" stroke={color} strokeWidth="2"/>
    <path d="M10 9H8" stroke={color} strokeWidth="2"/>
  </svg>
);

export const TriggerIcon = ({ size = 24, color = '#E91E63' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const WebhookIcon = ({ size = 24, color = '#E91E63' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M8 14S9.5 16 12 16S16 14 16 14" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M9 9H9.01" stroke={color} strokeWidth="2"/>
    <path d="M15 9H15.01" stroke={color} strokeWidth="2"/>
  </svg>
);

export const ScrapingIcon = ({ size = 24, color = '#FF9800' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 16V8C20.45 8 20 7.55 20 7S20.45 6 21 6V4C21 2.9 20.1 2 19 2H5C3.9 2 3 2.9 3 4V6C3.55 6 4 6.45 4 7S3.55 8 3 8V16C3.55 16 4 16.45 4 17S3.55 18 3 18V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V18C20.45 18 20 17.55 20 17S20.45 16 21 16Z" stroke={color} strokeWidth="2" fill="none"/>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const PlayIcon = ({ size = 24, color = '#4CAF50' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8 5V19L19 12L8 5Z" stroke={color} strokeWidth="2" fill={color}/>
  </svg>
);

export const PauseIcon = ({ size = 24, color = '#FF9800' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 4H10V20H6V4Z" stroke={color} strokeWidth="2" fill={color}/>
    <path d="M14 4H18V20H14V4Z" stroke={color} strokeWidth="2" fill={color}/>
  </svg>
);

export const StopIcon = ({ size = 24, color = '#F44336' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="6" y="6" width="12" height="12" stroke={color} strokeWidth="2" fill={color}/>
  </svg>
);

export const ConnectionIcon = ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill={color}/>
  </svg>
);

export const AddIcon = ({ size = 24, color = '#4CAF50' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5V19" stroke={color} strokeWidth="2"/>
    <path d="M5 12H19" stroke={color} strokeWidth="2"/>
  </svg>
);

export const DeleteIcon = ({ size = 24, color = '#F44336' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 6H5H21" stroke={color} strokeWidth="2"/>
    <path d="M8 6V4C8 3.45 8.45 3 9 3H15C15.55 3 16 3.45 16 4V6M19 6V20C19 20.55 18.55 21 18 21H6C5.45 21 5 20.55 5 20V6H19Z" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const SettingsIcon = ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M19.4 15C19.2 15.3 19.1 15.6 19 16L20.4 17.1C20.6 17.3 20.7 17.6 20.6 17.9L19.2 20.1C19.1 20.4 18.8 20.5 18.5 20.4L16.8 19.8C16.5 20 16.2 20.2 15.8 20.3L15.5 22.1C15.5 22.4 15.2 22.7 14.9 22.7H12.1C11.8 22.7 11.5 22.4 11.5 22.1L11.2 20.3C10.8 20.2 10.5 20 10.2 19.8L8.5 20.4C8.2 20.5 7.9 20.4 7.8 20.1L6.4 17.9C6.3 17.6 6.4 17.3 6.6 17.1L8 16C7.9 15.6 7.8 15.3 7.8 15S7.9 14.4 8 14L6.6 12.9C6.4 12.7 6.3 12.4 6.4 12.1L7.8 9.9C7.9 9.6 8.2 9.5 8.5 9.6L10.2 10.2C10.5 10 10.8 9.8 11.2 9.7L11.5 7.9C11.5 7.6 11.8 7.3 12.1 7.3H14.9C15.2 7.3 15.5 7.6 15.5 7.9L15.8 9.7C16.2 9.8 16.5 10 16.8 10.2L18.5 9.6C18.8 9.5 19.1 9.6 19.2 9.9L20.6 12.1C20.7 12.4 20.6 12.7 20.4 12.9L19 14C19.1 14.4 19.2 14.7 19.2 15H19.4Z" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const ZoomInIcon = ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M21 21L16.65 16.65" stroke={color} strokeWidth="2"/>
    <path d="M11 8V14" stroke={color} strokeWidth="2"/>
    <path d="M8 11H14" stroke={color} strokeWidth="2"/>
  </svg>
);

export const ZoomOutIcon = ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M21 21L16.65 16.65" stroke={color} strokeWidth="2"/>
    <path d="M8 11H14" stroke={color} strokeWidth="2"/>
  </svg>
);

export const LogIcon = ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M14 2V8H20" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M16 13H8" stroke={color} strokeWidth="2"/>
    <path d="M16 17H8" stroke={color} strokeWidth="2"/>
    <path d="M10 9H9H8" stroke={color} strokeWidth="2"/>
  </svg>
);

export const DesignIcon = ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M2 17L12 22L22 17" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M2 12L12 17L22 12" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
);

export const ExecuteIcon = ({ size = 24, color = '#666' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M10 8L16 12L10 16V8Z" stroke={color} strokeWidth="2" fill={color}/>
  </svg>
);
