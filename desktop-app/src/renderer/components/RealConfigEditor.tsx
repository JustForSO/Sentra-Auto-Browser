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
  example?: string;
}

const RealConfigEditor: React.FC = () => {
  const [config, setConfig] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOnlyRequired, setShowOnlyRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 从.env.example解析配置项
  const parseEnvExample = (content: string): ConfigItem[] => {
    const lines = content.split('\n');
    const configs: ConfigItem[] = [];
    let currentCategory = '通用配置';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 检测分类注释
      if (line.startsWith('# ') && line.includes('配置')) {
        currentCategory = line.replace('# ', '').trim();
        continue;
      }
      
      // 检测配置项
      if (line.includes('=') && !line.startsWith('#')) {
        const [key, value] = line.split('=', 2);
        const cleanKey = key.trim();
        const cleanValue = value?.trim() || '';
        
        // 查找前面的注释作为描述
        let description = '';
        let j = i - 1;
        while (j >= 0 && lines[j].trim().startsWith('#')) {
          const comment = lines[j].trim().replace(/^#+\s*/, '');
          if (comment && !comment.includes('配置')) {
            description = comment;
            break;
          }
          j--;
        }
        
        // 判断配置类型
        let type: ConfigItem['type'] = 'text';
        let options: string[] | undefined;
        let placeholder = '';
        
        if (cleanKey.includes('_KEY') || cleanKey.includes('PASSWORD')) {
          type = 'textarea';
          placeholder = cleanKey.includes('OPENAI') ? 'sk-...' : 
                      cleanKey.includes('ANTHROPIC') ? 'sk-ant-...' :
                      cleanKey.includes('GOOGLE') ? 'AIza...' : '';
        } else if (cleanKey.includes('HEADLESS') || cleanKey.includes('DEBUG')) {
          type = 'boolean';
        } else if (cleanKey.includes('PORT') || cleanKey.includes('WIDTH') || cleanKey.includes('HEIGHT') || 
                  cleanKey.includes('TIMEOUT') || cleanKey.includes('TEMPERATURE') || cleanKey.includes('TOKENS')) {
          type = 'number';
        } else if (cleanKey.includes('MODEL')) {
          type = 'select';
          if (cleanKey.includes('OPENAI')) {
            options = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
          } else if (cleanKey.includes('GOOGLE')) {
            options = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro'];
          } else if (cleanKey.includes('ANTHROPIC')) {
            options = ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
          }
        } else if (cleanKey.includes('LEVEL')) {
          type = 'select';
          options = ['debug', 'info', 'warn', 'error'];
        } else if (cleanKey.includes('STRATEGY')) {
          type = 'select';
          options = ['priority', 'round_robin', 'load_balance', 'failover'];
        }
        
        configs.push({
          key: cleanKey,
          value: cleanValue,
          description: description || `${cleanKey} 配置项`,
          category: currentCategory,
          required: cleanKey.includes('_KEY') || cleanKey.includes('STRATEGY'),
          sensitive: cleanKey.includes('_KEY') || cleanKey.includes('PASSWORD'),
          type,
          options,
          placeholder,
          example: cleanValue
        });
      }
    }
    
    return configs;
  };

  // 加载配置
  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.readEnvConfig();
      
      // 解析.env.example获取配置模板
      const exampleConfigs = parseEnvExample(result.envExample);
      
      // 解析现有.env文件
      const existingEnv: Record<string, string> = {};
      if (result.env) {
        const lines = result.env.split('\n');
        lines.forEach(line => {
          if (line.includes('=') && !line.startsWith('#')) {
            const [key, value] = line.split('=', 2);
            existingEnv[key.trim()] = value?.trim() || '';
          }
        });
      }
      
      // 合并配置：使用example作为模板，existing作为值
      const mergedConfigs = exampleConfigs.map(item => ({
        ...item,
        value: existingEnv[item.key] || item.value
      }));
      
      setConfig(mergedConfigs);
    } catch (err) {
      console.error('加载配置失败:', err);
      setError('加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // 生成.env文件内容
      let envContent = '';
      let currentCategory = '';
      
      config.forEach(item => {
        if (item.category !== currentCategory) {
          envContent += `\n# ${item.category}\n`;
          currentCategory = item.category;
        }
        
        // 添加描述注释
        envContent += `# ${item.description}\n`;
        
        // 添加配置项
        envContent += `${item.key}=${item.value}\n\n`;
      });
      
      // 保存到文件
      const result = await window.electronAPI.saveEnvConfig(envContent.trim());
      
      if (result.success) {
        setSuccess('配置保存成功！');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('保存配置失败');
      }
    } catch (err) {
      console.error('保存配置失败:', err);
      setError('保存配置失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 更新配置值
  const updateConfigValue = (key: string, value: string) => {
    setConfig(prev => prev.map(item => 
      item.key === key ? { ...item, value } : item
    ));
  };

  // 重置配置
  const resetConfig = () => {
    if (confirm('确定要重置所有配置吗？这将清空所有自定义设置。')) {
      setConfig(prev => prev.map(item => ({ ...item, value: '' })));
    }
  };

  // 导入示例配置
  const importExampleConfig = () => {
    if (confirm('确定要导入示例配置吗？这将覆盖现有设置。')) {
      setConfig(prev => prev.map(item => ({ ...item, value: item.example || '' })));
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // 获取分类列表
  const categories = ['all', ...new Set(config.map(item => item.category))];

  // 过滤配置
  const filteredConfig = config.filter(item => {
    const matchesSearch = item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesRequired = !showOnlyRequired || item.required;
    
    return matchesSearch && matchesCategory && matchesRequired;
  });

  // 渲染配置输入组件
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
        fontSize: 'var(--win-text-sm)',
        fontFamily: item.sensitive ? 'Consolas, Monaco, monospace' : 'inherit'
      }
    };

    switch (item.type) {
      case 'boolean':
        return (
          <select {...commonProps}>
            <option value="">选择...</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            {...commonProps}
          />
        );
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">选择...</option>
            {item.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={3}
            style={{
              ...commonProps.style,
              resize: 'vertical',
              minHeight: '80px'
            }}
          />
        );
      default:
        return (
          <input
            type={item.sensitive ? 'password' : 'text'}
            {...commonProps}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <AppContainer
        appId="config"
        title="环境配置管理"
        icon="fas fa-cogs"
        color="#0078d4"
        theme="light"
      >
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
      </AppContainer>
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
            Sentra Browser 环境配置
          </h2>
          <p style={{ 
            margin: '0 0 16px 0',
            fontSize: 'var(--win-text-sm)',
            color: 'var(--win-text-secondary)',
            lineHeight: '1.5'
          }}>
            管理 Sentra Auto Browser 的环境变量配置。支持多种AI模型提供商和浏览器自动化设置。
          </p>
          
          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={saveConfig}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                backgroundColor: isSaving ? '#95a5a6' : 'var(--win-blue)',
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
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-save"></i>
              )}
              {isSaving ? '保存中...' : '保存配置'}
            </button>
            
            <button
              onClick={loadConfig}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: 'var(--win-text-primary)',
                border: '1px solid var(--win-border)',
                borderRadius: 'var(--win-radius)',
                cursor: 'pointer',
                fontSize: 'var(--win-text-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-sync-alt"></i>
              重新加载
            </button>
            
            <button
              onClick={importExampleConfig}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: 'var(--win-text-primary)',
                border: '1px solid var(--win-border)',
                borderRadius: 'var(--win-radius)',
                cursor: 'pointer',
                fontSize: 'var(--win-text-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-download"></i>
              导入示例
            </button>
            
            <button
              onClick={resetConfig}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#e74c3c',
                border: '1px solid #e74c3c',
                borderRadius: 'var(--win-radius)',
                cursor: 'pointer',
                fontSize: 'var(--win-text-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-trash"></i>
              重置配置
            </button>
          </div>
        </div>

        {/* 通知 */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: 'var(--win-radius)',
            color: '#c33',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#efe',
            border: '1px solid #cfc',
            borderRadius: 'var(--win-radius)',
            color: '#363',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        {/* 过滤和搜索 */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <input
              type="text"
              placeholder="搜索配置项..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--win-border)',
                borderRadius: 'var(--win-radius)',
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
            gap: '8px',
            fontSize: 'var(--win-text-sm)',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={showOnlyRequired}
              onChange={(e) => setShowOnlyRequired(e.target.checked)}
            />
            只显示必需项
          </label>
        </div>

        {/* 配置项列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredConfig.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--win-text-muted)'
            }}>
              <i className="fas fa-search" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
              <p>没有找到匹配的配置项</p>
            </div>
          ) : (
            // 按分类分组显示
            categories.slice(1).map(category => {
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px'
                        }}>
                          <strong style={{ fontSize: 'var(--win-text-base)' }}>
                            {item.key}
                          </strong>
                          {item.required && (
                            <span style={{
                              fontSize: 'var(--win-text-xs)',
                              backgroundColor: '#e74c3c',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '10px'
                            }}>
                              必需
                            </span>
                          )}
                          {item.sensitive && (
                            <span style={{
                              fontSize: 'var(--win-text-xs)',
                              backgroundColor: '#f39c12',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '10px'
                            }}>
                              敏感
                            </span>
                          )}
                        </div>
                        <p style={{
                          margin: '0',
                          fontSize: 'var(--win-text-sm)',
                          color: 'var(--win-text-secondary)',
                          lineHeight: '1.4'
                        }}>
                          {item.description}
                        </p>
                        {item.example && item.example !== item.value && (
                          <p style={{
                            margin: '4px 0 0 0',
                            fontSize: 'var(--win-text-xs)',
                            color: 'var(--win-text-muted)',
                            fontStyle: 'italic'
                          }}>
                            示例: {item.example}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        {renderConfigInput(item)}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {item.value && (
                          <button
                            onClick={() => updateConfigValue(item.key, '')}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              color: '#e74c3c',
                              border: '1px solid #e74c3c',
                              borderRadius: 'var(--win-radius)',
                              cursor: 'pointer',
                              fontSize: 'var(--win-text-xs)'
                            }}
                            title="清空"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                        {item.example && item.example !== item.value && (
                          <button
                            onClick={() => updateConfigValue(item.key, item.example || '')}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              color: 'var(--win-blue)',
                              border: '1px solid var(--win-blue)',
                              borderRadius: 'var(--win-radius)',
                              cursor: 'pointer',
                              fontSize: 'var(--win-text-xs)'
                            }}
                            title="使用示例值"
                          >
                            <i className="fas fa-magic"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppContainer>
  );
};

export default RealConfigEditor;