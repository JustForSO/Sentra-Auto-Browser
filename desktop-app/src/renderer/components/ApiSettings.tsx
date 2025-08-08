import React, { useEffect, useRef, useState } from 'react';

interface ApiSettingsProps {
  visible?: boolean;
}

const ApiSettings: React.FC<ApiSettingsProps> = ({ visible = true }) => {
  const [customUrl, setCustomUrl] = useState('https://yuanplus.cloud');
  const [currentUrl, setCurrentUrl] = useState('https://yuanplus.cloud');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [viewCreated, setViewCreated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const creatingRef = useRef(false);

  // 初始化时加载保存的URL
  useEffect(() => {
    const loadSavedUrl = async () => {
      try {
        const savedUrl = await window.electronAPI.getSetting('api-url');
        if (savedUrl) {
          setCustomUrl(savedUrl);
          setCurrentUrl(savedUrl);
        }
      } catch (err) {
        console.error('加载保存的URL失败:', err);
      }
    };
    loadSavedUrl();
  }, []);

  // 创建BrowserView
  useEffect(() => {
    const createView = async () => {
      if (!containerRef.current || viewCreated || !visible || creatingRef.current) return;
      creatingRef.current = true;

      // 在创建新的BrowserView之前先清理旧的
      try {
        if (window.electronAPI && window.electronAPI.destroyApiView) {
          await window.electronAPI.destroyApiView();
        }
      } catch (err) {
        console.warn('清理旧BrowserView失败:', err);
      }

      let rect = containerRef.current.getBoundingClientRect();
      // 尺寸可能未就绪，尝试重试几次
      let attempts = 0;
      while ((rect.width < 50 || rect.height < 50) && attempts < 10) {
        await new Promise(r => setTimeout(r, 100));
        rect = containerRef.current.getBoundingClientRect();
        attempts += 1;
      }
      const windowElement = containerRef.current.closest('.window-content');
      const windowRect = windowElement ? windowElement.getBoundingClientRect() : rect;

      const bounds = {
        x: Math.round(windowRect.left),
        y: Math.round(windowRect.top + 120),
        width: Math.round(rect.width),
        height: Math.round(rect.height - 120)
      };

      try {
        if (window.electronAPI && window.electronAPI.createApiView) {
          const result = await window.electronAPI.createApiView(currentUrl, bounds);
          if (result.success) {
            setViewCreated(true);
            setError('');
          } else {
            setError(result.error || '创建视图失败');
          }
        } else {
          setError('BrowserView API 不可用');
        }
      } catch (err) {
        console.error('创建API视图失败:', err);
        setError('创建视图失败，请重试');
      } finally {
        creatingRef.current = false;
      }
    };

    const timer = setTimeout(createView, 100);
    return () => clearTimeout(timer);
  }, [currentUrl, viewCreated, visible]);

  // 监听BrowserView事件（每次可见时重新订阅）
  useEffect(() => {
    if (!visible) return;

    const handleLoaded = () => {
      setIsLoading(false);
      setError('');
      setViewCreated(true);
    };

    const handleError = (payload: { errorCode: number; errorDescription: string }) => {
      setIsLoading(false);
      setError(`加载失败: ${payload.errorDescription} (${payload.errorCode})`);
    };

    if (window.electronAPI && window.electronAPI.onApiViewLoaded) {
      window.electronAPI.onApiViewLoaded(handleLoaded);
      window.electronAPI.onApiViewError(handleError);
    }

    return () => {
      if (window.electronAPI && window.electronAPI.removeApiViewListeners) {
        window.electronAPI.removeApiViewListeners();
      }
    };
  }, [visible]);

  // 使用ResizeObserver监听容器大小变化
  useEffect(() => {
    if (!containerRef.current || !viewCreated) return;
    if (!visible) return;

    const updateBounds = async () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowElement = containerRef.current.closest('.window-content');
      const windowRect = windowElement ? windowElement.getBoundingClientRect() : rect;

      const bounds = {
        x: Math.round(windowRect.left),
        y: Math.round(windowRect.top + 120),
        width: Math.round(rect.width),
        height: Math.round(rect.height - 120)
      };

      try {
        if (window.electronAPI && window.electronAPI.setApiViewBounds) {
          await window.electronAPI.setApiViewBounds(bounds);
        }
      } catch (err) {
        console.error('更新视图边界失败:', err);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateBounds();
    });

    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateBounds);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, [viewCreated, visible]);

  // 可见性变化时，隐藏/销毁 BrowserView，避免最小化后仍然显示
  useEffect(() => {
    const hideView = async () => {
      if (viewCreated && !visible && window.electronAPI?.destroyApiView) {
        try {
          await window.electronAPI.destroyApiView();
        } catch (err) {
          // 忽略
        } finally {
          setViewCreated(false);
          setIsLoading(true);
          setError('');
        }
      }
    };
    hideView();
  }, [visible, viewCreated]);

  // 组件卸载时销毁BrowserView
  useEffect(() => {
    return () => {
      if (window.electronAPI && window.electronAPI.destroyApiView) {
        window.electronAPI.destroyApiView().catch((err) => {
          console.warn('BrowserView清理失败:', err);
        });
      }
    };
  }, []);

  // 当 visible 从 false -> true 时，立即创建视图，避免长时间 Loading
  useEffect(() => {
    if (visible && !viewCreated) {
      setIsLoading(true);
      setError('');
      // 触发创建逻辑（依赖于上面 createView 的 effect）
      // 这里只是保证状态刷新
      setCurrentUrl((u) => u);
    }
  }, [visible, viewCreated]);

  // 窗口关闭时清理
  useEffect(() => {
    const handleWindowClose = async () => {
      if (viewCreated && window.electronAPI && window.electronAPI.destroyApiView) {
        try {
          await window.electronAPI.destroyApiView();
          setViewCreated(false);
        } catch (err) {
          console.warn('BrowserView关闭时清理失败:', err);
        }
      }
    };

    window.addEventListener('beforeunload', handleWindowClose);
    return () => window.removeEventListener('beforeunload', handleWindowClose);
  }, [viewCreated]);

  const handleReset = async () => {
    const defaultUrl = 'https://yuanplus.cloud';
    setCustomUrl(defaultUrl);
    setError('');
    setIsLoading(true);

    try {
      if (window.electronAPI && window.electronAPI.setSetting) {
        await window.electronAPI.setSetting('api-url', defaultUrl);
      }
      if (viewCreated && window.electronAPI && window.electronAPI.loadApiViewURL) {
        await window.electronAPI.loadApiViewURL(defaultUrl);
      }
      setCurrentUrl(defaultUrl);
    } catch (err) {
      console.error('重置URL失败:', err);
      setError('重置失败，请重试');
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!customUrl.trim()) {
      setError('请输入有效的URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setIsEditing(false);

    try {
      if (window.electronAPI && window.electronAPI.setSetting) {
        await window.electronAPI.setSetting('api-url', customUrl);
      }
      if (viewCreated && window.electronAPI && window.electronAPI.loadApiViewURL) {
        await window.electronAPI.loadApiViewURL(customUrl);
      }
      setCurrentUrl(customUrl);
    } catch (err) {
      console.error('保存URL失败:', err);
      setError('保存失败，请重试');
      setIsLoading(false);
    }
  };

  const handleReload = async () => {
    if (!viewCreated) return;
    setIsLoading(true);
    setError('');
    try {
      if (window.electronAPI && window.electronAPI.reloadApiView) {
        await window.electronAPI.reloadApiView();
      } else {
        setError('BrowserView API 不可用');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('重新加载失败:', err);
      setError('重新加载失败，请重试');
      setIsLoading(false);
    }
  };

  // 当视图创建后，确保加载一次当前 URL（防止最小化还原后空白）
  useEffect(() => {
    const ensureUrl = async () => {
      if (visible && viewCreated && window.electronAPI?.loadApiViewURL) {
        try {
          await window.electronAPI.loadApiViewURL(currentUrl);
        } catch {}
      }
    };
    ensureUrl();
  }, [visible, viewCreated, currentUrl]);

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f5f5',
        position: 'relative'
      }}
    >
      <div
        style={{
          padding: '16px',
          background: '#ffffff',
          borderBottom: '1px solid #e1dfdd',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'relative',
          zIndex: 1000
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <i className="fas fa-cog" style={{ fontSize: '20px', color: '#00b894' }}></i>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>API管理界面 (BrowserView)</h2>
          {isLoading && (
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #f3f3f3',
                borderTop: '2px solid #00b894',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            ></div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="输入API管理界面URL"
            disabled={!isEditing}
            style={{
              flex: 1,
              minWidth: '300px',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              background: isEditing ? '#ffffff' : '#f8f9fa',
              color: isEditing ? '#333' : '#666'
            }}
          />

          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '8px 16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <i className="fas fa-edit" style={{ marginRight: '6px' }}></i>
                编辑
              </button>
              <button
                onClick={handleReload}
                disabled={isLoading || !viewCreated}
                style={{
                  padding: '8px 16px',
                  background: isLoading || !viewCreated ? '#ccc' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading || !viewCreated ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i>
                刷新
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleApply}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  background: isLoading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                <i className="fas fa-check" style={{ marginRight: '6px' }}></i>
                应用
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setCustomUrl(currentUrl);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <i className="fas fa-times" style={{ marginRight: '6px' }}></i>
                取消
              </button>
            </>
          )}

          <button
            onClick={handleReset}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              background: isLoading ? '#ccc' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            <i className="fas fa-undo" style={{ marginRight: '6px' }}></i>
            重置
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
            {error}
          </div>
        )}
      </div>

      {/* BrowserView容器 */}
      <div style={{ flex: 1, background: '#ffffff', position: 'relative' }}>
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#666'
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #00b894',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px'
              }}
            ></div>
            <p style={{ margin: 0, fontSize: '14px' }}>正在初始化API管理界面...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiSettings;


