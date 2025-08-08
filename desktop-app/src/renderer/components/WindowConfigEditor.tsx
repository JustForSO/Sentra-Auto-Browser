import React, { useState, useEffect } from 'react';
import AppContainer from './AppContainer';

interface ConfigItem {
  key: string;
  value: string;
  description: string;
  category: string;
  required?: boolean;
  sensitive?: boolean;
  type?: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  options?: string[];
  placeholder?: string;
}

const WindowConfigEditor: React.FC = () => {
  const [config, setConfig] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOnlyRequired, setShowOnlyRequired] = useState(false);

  // 简化的配置模板，专为窗口模式设计
  const defaultConfig: ConfigItem[] = [
    // 核心配置
    { key: 'LLM_STRATEGY', value: 'priority', description: '多供应商配置策略', category: 'LLM核心配置', required: true, type: 'select', options: ['priority', 'round_robin', 'load_balance', 'failover'] },
    { key: 'LLM_TEMPERATURE', value: '0', description: '温度值(0-1)', category: 'LLM核心配置', type: 'number' },
    { key: 'LLM_MAX_TOKENS', value: '4000', description: '最大输出token数量', category: 'LLM核心配置', type: 'number' },
    
    // OpenAI
    { key: 'OPENAI_API_KEYS', value: '', description: 'OpenAI API密钥', category: 'OpenAI配置', required: true, sensitive: true, type: 'textarea', placeholder: 'sk-...' },
    { key: 'OPENAI_BASE_URLS', value: 'https://api.openai.com/v1', description: 'API端点', category: 'OpenAI配置' },
    { key: 'OPENAI_MODELS', value: 'gpt-4o,gpt-4-turbo', description: '可用模型', category: 'OpenAI配置' },
    
    // Google
    { key: 'GOOGLE_API_KEYS', value: '', description: 'Google API密钥', category: 'Google配置', sensitive: true, type: 'textarea' },
    { key: 'GOOGLE_MODELS', value: 'gemini-2.5-flash,gemini-2.5-pro', description: '可用模型', category: 'Google配置' },
    
    // Anthropic
    { key: 'ANTHROPIC_API_KEYS', value: '', description: 'Anthropic API密钥', category: 'Anthropic配置', sensitive: true, type: 'textarea' },
    { key: 'ANTHROPIC_MODELS', value: 'claude-3-5-sonnet-20241022', description: '可用模型', category: 'Anthropic配置' },
    
    // 浏览器配置
    { key: 'BROWSER_HEADLESS', value: 'false', description: '无头模式', category: '浏览器配置', type: 'boolean' },
    { key: 'BROWSER_VIEWPORT_WIDTH', value: '1280', description: '视窗宽度', category: '浏览器配置', type: 'number' },
    { key: 'BROWSER_VIEWPORT_HEIGHT', value: '720', description: '视窗高度', category: '浏览器配置', type: 'number' },
    
    // 系统配置
    { key: 'LOG_LEVEL', value: 'info', description: '日志级别', category: '系统配置', type: 'select', options: ['debug', 'info', 'warn', 'error'] },
    { key: 'DEBUG', value: 'false', description: '调试模式', category: '系统配置', type: 'boolean' },
  ];

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.readEnvConfig) {
        const envData = await window.electronAPI.readEnvConfig();
        const envVars: Record<string, string> = {};
        if (envData.env) {
          envData.env.split('\n').forEach((line: string) => {
            const [key, value] = line.split('=');
            if (key && value) {
              envVars[key.trim()] = value.trim();
            }
          });
        }
        
        const configWithDefaults = defaultConfig.map(item => ({
          ...item,
          value: envVars[item.key] || item.value
        }));
        setConfig(configWithDefaults);
      } else {
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      setConfig(defaultConfig);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const envLines: string[] = [];
      config.forEach(item => {
        if (item.value.trim()) {
          envLines.push(`${item.key}=${item.value}`);
        }
      });
      const envContent = envLines.join('\n');

      if (window.electronAPI?.saveEnvConfig) {
        await window.electronAPI.saveEnvConfig(envContent);
        // 显示Windows风格的通知
        showNotification('配置保存成功！', 'success');
      } else {
        console.log('配置预览:', envContent);
        showNotification('浏览器模式：配置已输出到控制台', 'info');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      showNotification('保存配置失败: ' + (error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    // 创建Windows风格的通知
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">
          <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
          ${type === 'success' ? '成功' : type === 'error' ? '错误' : '信息'}
        </div>
        <button class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="notification-content">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // 自动关闭
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
    
    // 点击关闭
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn?.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  };

  const updateConfigValue = (key: string, value: string) => {
    setConfig(prev => prev.map(item => 
      item.key === key ? { ...item, value } : item
    ));
  };

  const resetConfig = () => {
    if (confirm('确定要重置所有配置吗？')) {
      setConfig(defaultConfig);
    }
  };

  const categories = ['all', ...Array.from(new Set(config.map(item => item.category)))];
  
  const filteredConfig = config.filter(item => {
    const matchesSearch = item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesRequired = !showOnlyRequired || item.required;
    return matchesSearch && matchesCategory && matchesRequired;
  });

  const renderConfigInput = (item: ConfigItem) => {
    const commonProps = {
      value: item.value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => 
        updateConfigValue(item.key, e.target.value),
      placeholder: item.placeholder || item.description,
      style: { 
        width: '100%',
        padding: '8px 12px',
        border: '1px solid var(--win-border)',
        borderRadius: 'var(--win-radius-card)',
        backgroundColor: 'var(--win-bg-card)',
        fontSize: 'var(--win-text-sm)'
      }
    };

    switch (item.type) {
      case 'boolean':
        return (
          <select {...commonProps}>
            <option value="">未设置</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        );
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">请选择...</option>
            {item.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'number':
        return <input {...commonProps} type="number" />;
      case 'textarea':
        return (
          <textarea 
            {...commonProps}
            rows={2}
            style={{ ...commonProps.style, resize: 'vertical', minHeight: '60px' }}
          />
        );
      default:
        return (
          <input 
            {...commonProps} 
            type={item.sensitive ? 'password' : 'text'}
          />
        );
    }
  };

  const getConfigStats = () => {
    const total = config.length;
    const configured = config.filter(item => item.value.trim()).length;
    const required = config.filter(item => item.required).length;
    const requiredConfigured = config.filter(item => item.required && item.value.trim()).length;
    
    return { total, configured, required, requiredConfigured };
  };

  const stats = getConfigStats();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: 'var(--win-text-base)',
        color: 'var(--win-text-secondary)'
      }}>
        <i className="fas fa-cogs fa-spin" style={{ marginRight: '12px', fontSize: '24px' }}></i>
        正在加载配置...
      </div>
    );
  }

  return (
    <AppContainer
      appId="config"
      title="环境配置管理"
      icon="fas fa-cogs"
      color="#0078d4"
      theme="light"
    >
      <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
      {/* 头部信息 */}
      <div style={{ 
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: 'var(--win-bg-card)',
        borderRadius: 'var(--win-radius-lg)',
        border: '1px solid var(--win-border)'
      }}>
        <h2 style={{ 
          margin: '0 0 8px 0',
          fontSize: 'var(--win-text-xl)',
          color: 'var(--win-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-cogs" style={{ color: 'var(--win-blue)' }}></i>
          环境配置管理
        </h2>
        <p style={{ 
          margin: '0 0 16px 0',
          fontSize: 'var(--win-text-sm)',
          color: 'var(--win-text-secondary)',
          lineHeight: '1.5'
        }}>
          已配置 <strong style={{ color: 'var(--win-blue)' }}>{stats.configured}/{stats.total}</strong> 项，
          必需项 <strong style={{ color: stats.requiredConfigured === stats.required ? 'var(--win-success)' : 'var(--win-warning)' }}>
            {stats.requiredConfigured}/{stats.required}
          </strong> 项
        </p>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={resetConfig}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--win-error)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--win-radius)',
              cursor: 'pointer',
              fontSize: 'var(--win-text-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-undo"></i>
            重置配置
          </button>
          <button 
            onClick={saveConfig}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              backgroundColor: isSaving ? 'var(--win-text-muted)' : 'var(--win-blue)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--win-radius)',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: 'var(--win-text-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                保存中...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                保存配置
              </>
            )}
          </button>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
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
            placeholder="搜索配置项..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid var(--win-border)',
              borderRadius: 'var(--win-radius)',
              backgroundColor: 'var(--win-bg-card)',
              fontSize: 'var(--win-text-sm)'
            }}
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--win-border)',
            borderRadius: 'var(--win-radius)',
            backgroundColor: 'var(--win-bg-card)',
            fontSize: 'var(--win-text-sm)',
            minWidth: '150px'
          }}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? '所有分类' : category}
            </option>
          ))}
        </select>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          fontSize: 'var(--win-text-sm)',
          color: 'var(--win-text-primary)',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={showOnlyRequired}
            onChange={(e) => setShowOnlyRequired(e.target.checked)}
          />
          仅显示必需项
        </label>
      </div>

      {/* 配置项列表 */}
      {filteredConfig.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: 'var(--win-bg-card)',
          borderRadius: 'var(--win-radius-lg)',
          border: '2px dashed var(--win-border)'
        }}>
          <i className="fas fa-search" style={{ fontSize: '48px', color: 'var(--win-text-muted)', marginBottom: '16px' }}></i>
          <h3 style={{ color: 'var(--win-text-secondary)', margin: '0 0 8px 0' }}>未找到配置项</h3>
          <p style={{ color: 'var(--win-text-muted)', margin: '0' }}>请尝试调整搜索条件或选择其他分类</p>
        </div>
      ) : (
        <div>
          {categories.slice(1).map(category => {
            const categoryItems = filteredConfig.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category} style={{ marginBottom: '24px' }}>
                <h3 style={{ 
                  margin: '0 0 16px 0',
                  fontSize: 'var(--win-text-lg)',
                  color: 'var(--win-text-primary)',
                  borderBottom: '2px solid var(--win-blue)',
                  paddingBottom: '8px'
                }}>
                  {category}
                </h3>
                {categoryItems.map(item => (
                  <div key={item.key} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: 'var(--win-bg-card)',
                    border: '1px solid var(--win-border)',
                    borderRadius: 'var(--win-radius-lg)',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <div style={{ 
                        fontWeight: '600',
                        color: 'var(--win-text-primary)',
                        fontSize: 'var(--win-text-sm)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontFamily: 'monospace' }}>{item.key}</span>
                        {item.required && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            backgroundColor: 'var(--win-error)',
                            color: 'white',
                            borderRadius: '10px',
                            fontWeight: '500'
                          }}>
                            必需
                          </span>
                        )}
                        {item.sensitive && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            backgroundColor: 'var(--win-warning)',
                            color: 'white',
                            borderRadius: '10px',
                            fontWeight: '500'
                          }}>
                            敏感
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: 'var(--win-text-xs)',
                        color: 'var(--win-text-muted)',
                        lineHeight: '1.4'
                      }}>
                        {item.description}
                      </div>
                    </div>
                    <div>
                      {renderConfigInput(item)}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      {item.value ? (
                        <span style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          backgroundColor: 'var(--win-success)',
                          color: 'white',
                          borderRadius: '10px',
                          fontWeight: '500'
                        }}>
                          已配置
                        </span>
                      ) : item.required ? (
                        <span style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          backgroundColor: 'var(--win-error)',
                          color: 'white',
                          borderRadius: '10px',
                          fontWeight: '500'
                        }}>
                          未配置
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          backgroundColor: 'var(--win-text-muted)',
                          color: 'white',
                          borderRadius: '10px',
                          fontWeight: '500'
                        }}>
                          可选
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </AppContainer>
  );
};

export default WindowConfigEditor;