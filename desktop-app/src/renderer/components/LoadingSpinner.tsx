import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'var(--st-accent)', 
  text 
}) => {
  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px'
  };

  return (
    <div className="flex items-center justify-center gap-3" style={{ padding: size === 'sm' ? '8px' : '16px' }}>
      <div style={{
        width: sizeMap[size],
        height: sizeMap[size],
        border: `2px solid var(--st-border)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      {text && (
        <span style={{ 
          color: 'var(--st-text-secondary)', 
          fontSize: size === 'sm' ? '12px' : '14px',
          fontWeight: 500
        }}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;