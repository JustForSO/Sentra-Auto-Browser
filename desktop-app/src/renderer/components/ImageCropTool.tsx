import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropToolProps {
  imageSrc: string;
  onCrop: (croppedImageData: string) => void;
  onCancel: () => void;
}

const ImageCropTool: React.FC<ImageCropToolProps> = ({ imageSrc, onCrop, onCancel }) => {
  const [cropArea, setCropArea] = useState<CropArea>({ x: 10, y: 10, width: 80, height: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 预设比例
  const aspectRatios = [
    { name: '自由', value: null },
    { name: '16:9', value: 16/9 },
    { name: '4:3', value: 4/3 },
    { name: '1:1', value: 1 },
    { name: '3:2', value: 3/2 }
  ];

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = imageSrc;
  }, [imageSrc]);

  const handleMouseDown = useCallback((e: React.MouseEvent, action: 'drag' | 'resize', resizeDirection?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (action === 'drag') {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    } else if (action === 'resize') {
      setIsResizing(resizeDirection || 'se');
      setDragStart({ x, y });
    }
  }, [cropArea]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (isDragging) {
      const newX = Math.max(0, Math.min(100 - cropArea.width, x - dragStart.x));
      const newY = Math.max(0, Math.min(100 - cropArea.height, y - dragStart.y));
      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      let newArea = { ...cropArea };
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;

      switch (isResizing) {
        case 'se':
          newArea.width = Math.max(10, Math.min(100 - newArea.x, cropArea.width + deltaX));
          newArea.height = Math.max(10, Math.min(100 - newArea.y, cropArea.height + deltaY));
          break;
        case 'sw':
          const newWidth = Math.max(10, cropArea.width - deltaX);
          const newX = Math.max(0, cropArea.x + cropArea.width - newWidth);
          newArea.x = newX;
          newArea.width = newWidth;
          newArea.height = Math.max(10, Math.min(100 - newArea.y, cropArea.height + deltaY));
          break;
        case 'ne':
          newArea.width = Math.max(10, Math.min(100 - newArea.x, cropArea.width + deltaX));
          const newHeight = Math.max(10, cropArea.height - deltaY);
          const newY = Math.max(0, cropArea.y + cropArea.height - newHeight);
          newArea.y = newY;
          newArea.height = newHeight;
          break;
        case 'nw':
          const newWidthNW = Math.max(10, cropArea.width - deltaX);
          const newHeightNW = Math.max(10, cropArea.height - deltaY);
          newArea.x = Math.max(0, cropArea.x + cropArea.width - newWidthNW);
          newArea.y = Math.max(0, cropArea.y + cropArea.height - newHeightNW);
          newArea.width = newWidthNW;
          newArea.height = newHeightNW;
          break;
      }

      // 应用宽高比约束
      if (aspectRatio) {
        const currentRatio = newArea.width / newArea.height;
        if (currentRatio !== aspectRatio) {
          if (isResizing.includes('e') || isResizing.includes('w')) {
            newArea.height = newArea.width / aspectRatio;
          } else {
            newArea.width = newArea.height * aspectRatio;
          }
        }
      }

      // 确保不超出边界
      newArea.width = Math.min(newArea.width, 100 - newArea.x);
      newArea.height = Math.min(newArea.height, 100 - newArea.y);

      setCropArea(newArea);
      setDragStart({ x, y });
    }
  }, [isDragging, isResizing, cropArea, dragStart, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const applyCrop = useCallback(() => {
    if (!canvasRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const containerWidth = containerRef.current?.clientWidth || 400;
      const containerHeight = containerRef.current?.clientHeight || 300;
      
      // 计算图片在容器中的实际显示尺寸和位置
      const imgAspectRatio = img.width / img.height;
      const containerAspectRatio = containerWidth / containerHeight;
      
      let displayWidth, displayHeight, offsetX, offsetY;
      
      if (imgAspectRatio > containerAspectRatio) {
        // 图片更宽，以容器宽度为准
        displayWidth = containerWidth;
        displayHeight = containerWidth / imgAspectRatio;
        offsetX = 0;
        offsetY = (containerHeight - displayHeight) / 2;
      } else {
        // 图片更高，以容器高度为准
        displayHeight = containerHeight;
        displayWidth = containerHeight * imgAspectRatio;
        offsetX = (containerWidth - displayWidth) / 2;
        offsetY = 0;
      }

      // 将百分比转换为实际像素
      const cropX = (cropArea.x / 100) * displayWidth;
      const cropY = (cropArea.y / 100) * displayHeight;
      const cropWidth = (cropArea.width / 100) * displayWidth;
      const cropHeight = (cropArea.height / 100) * displayHeight;

      // 计算在原图中的裁剪区域
      const scaleX = img.width / displayWidth;
      const scaleY = img.height / displayHeight;
      
      const sourceCropX = cropX * scaleX;
      const sourceCropY = cropY * scaleY;
      const sourceCropWidth = cropWidth * scaleX;
      const sourceCropHeight = cropHeight * scaleY;

      // 设置canvas尺寸为裁剪区域尺寸
      canvas.width = sourceCropWidth;
      canvas.height = sourceCropHeight;

      // 绘制裁剪后的图片
      ctx.drawImage(
        img,
        sourceCropX, sourceCropY, sourceCropWidth, sourceCropHeight,
        0, 0, sourceCropWidth, sourceCropHeight
      );

      const croppedImageData = canvas.toDataURL('image/png', 0.9);
      onCrop(croppedImageData);
    };
    
    img.src = imageSrc;
  }, [imageSrc, cropArea, imageLoaded, onCrop]);

  const resetCrop = () => {
    setCropArea({ x: 10, y: 10, width: 80, height: 60 });
  };

  return (
    <div style={{ 
      padding: '0', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--win-bg-window)'
    }}>
      {/* 头部控制栏 */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--win-border)',
        background: 'var(--win-bg-card)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--win-text-primary)' }}>
          <i className="fas fa-crop-alt" style={{ marginRight: '8px', color: 'var(--win-blue)' }}></i>
          图片裁剪
        </h3>
        
        {/* 宽高比选择 */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', color: 'var(--win-text-secondary)' }}>宽高比:</span>
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.name}
              onClick={() => setAspectRatio(ratio.value)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                background: aspectRatio === ratio.value ? 'var(--win-blue)' : 'transparent',
                color: aspectRatio === ratio.value ? 'white' : 'var(--win-text-secondary)',
                border: '1px solid var(--win-border)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {ratio.name}
            </button>
          ))}
        </div>

        {/* 裁剪区域信息 */}
        <div style={{ fontSize: '12px', color: 'var(--win-text-muted)' }}>
          裁剪区域: {cropArea.width.toFixed(1)}% × {cropArea.height.toFixed(1)}% 
          (位置: {cropArea.x.toFixed(1)}%, {cropArea.y.toFixed(1)}%)
        </div>
      </div>

      {/* 裁剪区域 */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '600px',
            height: '400px',
            background: `url(${imageSrc}) center/contain no-repeat`,
            border: '2px solid var(--win-border)',
            borderRadius: '8px',
            cursor: 'crosshair',
            overflow: 'hidden'
          }}
        >
          {/* 遮罩层 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)'
          }} />

          {/* 裁剪区域 */}
          <div
            style={{
              position: 'absolute',
              left: `${cropArea.x}%`,
              top: `${cropArea.y}%`,
              width: `${cropArea.width}%`,
              height: `${cropArea.height}%`,
              border: '2px solid var(--win-blue)',
              background: 'transparent',
              cursor: 'move',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
          >
            {/* 裁剪区域控制点 */}
            {['nw', 'ne', 'sw', 'se'].map((direction) => (
              <div
                key={direction}
                style={{
                  position: 'absolute',
                  width: '12px',
                  height: '12px',
                  background: 'var(--win-blue)',
                  border: '2px solid white',
                  borderRadius: '50%',
                  cursor: `${direction}-resize`,
                  ...{
                    nw: { top: '-6px', left: '-6px' },
                    ne: { top: '-6px', right: '-6px' },
                    sw: { bottom: '-6px', left: '-6px' },
                    se: { bottom: '-6px', right: '-6px' }
                  }[direction]
                }}
                onMouseDown={(e) => handleMouseDown(e, 'resize', direction)}
              />
            ))}

            {/* 中心网格线 */}
            <div style={{
              position: 'absolute',
              top: '33.33%',
              left: 0,
              right: 0,
              height: '1px',
              background: 'rgba(255, 255, 255, 0.5)'
            }} />
            <div style={{
              position: 'absolute',
              top: '66.66%',
              left: 0,
              right: 0,
              height: '1px',
              background: 'rgba(255, 255, 255, 0.5)'
            }} />
            <div style={{
              position: 'absolute',
              left: '33.33%',
              top: 0,
              bottom: 0,
              width: '1px',
              background: 'rgba(255, 255, 255, 0.5)'
            }} />
            <div style={{
              position: 'absolute',
              left: '66.66%',
              top: 0,
              bottom: 0,
              width: '1px',
              background: 'rgba(255, 255, 255, 0.5)'
            }} />
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--win-border)',
        background: 'var(--win-bg-card)',
        display: 'flex',
        gap: '12px',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={resetCrop}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: 'var(--win-text-secondary)',
            border: '1px solid var(--win-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <i className="fas fa-undo" style={{ marginRight: '6px' }}></i>
          重置
        </button>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: 'var(--win-text-secondary)',
              border: '1px solid var(--win-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            取消
          </button>
          <button
            onClick={applyCrop}
            style={{
              padding: '8px 16px',
              background: 'var(--win-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <i className="fas fa-check" style={{ marginRight: '6px' }}></i>
            应用裁剪
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ImageCropTool;