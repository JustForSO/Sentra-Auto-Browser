import React, { useState, useRef, useCallback } from 'react';
import ImageCropTool from './ImageCropTool';

interface WallpaperManagerProps {
  onWallpaperChange: (wallpaper: string) => void;
  onClose: () => void;
}

const WallpaperManager: React.FC<WallpaperManagerProps> = ({ onWallpaperChange, onClose }) => {
  const [selectedWallpaper, setSelectedWallpaper] = useState('');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preset' | 'upload' | 'solid'>('preset');
  const [solidColor, setSolidColor] = useState('#4a90e2');
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [showCropTool, setShowCropTool] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const presetWallpapers = [
    {
      id: '1',
      name: '经典蓝',
      value: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #6c5ce7 100%)'
    },
    {
      id: '2',
      name: '梦幻紫',
      value: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 50%, #fd79a8 100%)'
    },
    {
      id: '3',
      name: '清新绿',
      value: 'linear-gradient(135deg, #00cec9 0%, #55a3ff 50%, #74b9ff 100%)'
    },
    {
      id: '4',
      name: '温暖橙',
      value: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 50%, #d63031 100%)'
    },
    {
      id: '5',
      name: '深邃夜',
      value: 'linear-gradient(135deg, #2d3436 0%, #636e72 50%, #74b9ff 100%)'
    },
    {
      id: '6',
      name: '樱花粉',
      value: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 50%, #e17055 100%)'
    },
    {
      id: '7',
      name: 'Windows 11',
      value: 'linear-gradient(135deg, #0078d4 0%, #106ebe 50%, #005a9e 100%)'
    },
    {
      id: '8',
      name: '极光色',
      value: 'linear-gradient(135deg, #00b894 0%, #00cec9 50%, #74b9ff 100%)'
    }
  ];

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomImage(result);
        setShowCropTool(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleCrop = useCallback(() => {
    if (!customImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
      
      const croppedImage = canvas.toDataURL();
      setSelectedWallpaper(`url(${croppedImage})`);
      setShowCropTool(false);
    };
    img.src = customImage;
  }, [customImage, cropArea]);

  const handleApply = () => {
    let wallpaperValue = selectedWallpaper;
    
    if (activeTab === 'solid') {
      wallpaperValue = solidColor;
    } else if (activeTab === 'upload' && customImage && !showCropTool) {
      wallpaperValue = `url(${customImage})`;
    }
    
    if (wallpaperValue) {
      onWallpaperChange(wallpaperValue);
      onClose();
    }
  };

  return (
    <div style={{ 
      padding: '0', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--win-bg-window)',
      color: 'var(--win-text-primary)'
    }}>
      {/* 头部 */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--win-border)',
        background: 'var(--win-bg-card)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: 'var(--win-text-primary)' }}>
          <i className="fas fa-palette" style={{ marginRight: '12px', color: 'var(--win-blue)' }}></i>
          个性化设置
        </h2>
        
        {/* 标签页 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'preset', label: '预设壁纸', icon: 'fas fa-images' },
            { id: 'upload', label: '自定义图片', icon: 'fas fa-upload' },
            { id: 'solid', label: '纯色背景', icon: 'fas fa-fill-drip' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab.id ? 'var(--win-blue)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--win-text-secondary)',
                border: '1px solid var(--win-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'var(--win-transition)'
              }}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {activeTab === 'preset' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>选择预设壁纸</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '16px'
            }}>
              {presetWallpapers.map((wallpaper) => (
                <div
                  key={wallpaper.id}
                  onClick={() => setSelectedWallpaper(wallpaper.value)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '120px',
                    background: wallpaper.value,
                    border: selectedWallpaper === wallpaper.value ? '3px solid var(--win-blue)' : '2px solid var(--win-border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'end',
                    justifyContent: 'center',
                    padding: '12px',
                    color: 'white',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'var(--win-transition)',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => {
                    if (selectedWallpaper !== wallpaper.value) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {selectedWallpaper === wallpaper.value && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      background: 'var(--win-blue)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <i className="fas fa-check" style={{ fontSize: '12px' }}></i>
                    </div>
                  )}
                  {wallpaper.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>上传自定义图片</h3>
            
            {!customImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  height: '200px',
                  border: '2px dashed var(--win-border)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'var(--win-bg-hover)',
                  transition: 'var(--win-transition)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--win-blue)';
                  e.currentTarget.style.background = 'rgba(0, 120, 212, 0.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--win-border)';
                  e.currentTarget.style.background = 'var(--win-bg-hover)';
                }}
              >
                <i className="fas fa-cloud-upload-alt" style={{ fontSize: '48px', color: 'var(--win-blue)', marginBottom: '16px' }}></i>
                <p style={{ margin: '0', fontSize: '16px', fontWeight: '500' }}>点击上传图片</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--win-text-muted)' }}>
                  支持 JPG、PNG、WebP 格式
                </p>
              </div>
            ) : showCropTool ? (
              <ImageCropTool
                imageSrc={customImage}
                onCrop={(croppedImage) => {
                  setSelectedWallpaper(`url(${croppedImage})`);
                  setCustomImage(croppedImage);
                  setShowCropTool(false);
                }}
                onCancel={() => setShowCropTool(false)}
              />
            ) : (
              <div>
                <div
                  onClick={() => setSelectedWallpaper(`url(${customImage})`)}
                  style={{
                    width: '100%',
                    height: '200px',
                    background: `url(${customImage}) center/cover no-repeat`,
                    borderRadius: '12px',
                    marginBottom: '16px',
                    border: selectedWallpaper === `url(${customImage})` ? '3px solid var(--win-blue)' : '2px solid var(--win-border)',
                    cursor: 'pointer'
                  }}
                ></div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowCropTool(true)}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: 'var(--win-blue)',
                      border: '1px solid var(--win-blue)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <i className="fas fa-crop-alt" style={{ marginRight: '6px' }}></i>
                    重新裁剪
                  </button>
                  <button
                    onClick={() => {
                      setCustomImage(null);
                      setSelectedWallpaper('');
                    }}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: 'var(--win-text-muted)',
                      border: '1px solid var(--win-border)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <i className="fas fa-trash" style={{ marginRight: '6px' }}></i>
                    删除
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {activeTab === 'solid' && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>选择纯色背景</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  颜色选择
                </label>
                <input
                  type="color"
                  value={solidColor}
                  onChange={(e) => setSolidColor(e.target.value)}
                  style={{
                    width: '60px',
                    height: '40px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div
                style={{
                  width: '100%',
                  height: '150px',
                  background: solidColor,
                  borderRadius: '12px',
                  border: '2px solid var(--win-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                预览效果
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid var(--win-border)',
        background: 'var(--win-bg-card)',
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            color: 'var(--win-text-secondary)',
            border: '1px solid var(--win-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          取消
        </button>
        <button
          onClick={handleApply}
          disabled={!selectedWallpaper && activeTab !== 'solid' && !customImage}
          style={{
            padding: '10px 20px',
            background: 'var(--win-blue)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: (!selectedWallpaper && activeTab !== 'solid' && !customImage) ? 0.5 : 1
          }}
        >
          <i className="fas fa-check" style={{ marginRight: '6px' }}></i>
          应用壁纸
        </button>
      </div>
    </div>
  );
};

export default WallpaperManager;