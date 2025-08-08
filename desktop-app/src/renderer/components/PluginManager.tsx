import React, { useEffect, useMemo, useState } from 'react';
import '../styles/plugin-manager.css';

type PluginInfo = {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  tags?: string[];
  enabled?: boolean;
  folderPath: string;
};

// 调用主进程执行 Node 侧脚本：读取 src/plugins/manager.ts 能力
// 通过 CLI 方式：运行 node -e 读取插件目录 (plugins/ 下每个 plugin.json)

const PLUGINS_DIR = 'plugins';

const PluginManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [q, setQ] = useState('');

  const runNodeEval = async (js: string) => {
    // 清理JavaScript代码：移除多余的空白和换行符
    const cleanJs = js.replace(/\s+/g, ' ').trim();
    // 转义引号以避免命令行解析问题
    const escapedJs = cleanJs.replace(/"/g, '\\"');
    const script = `node -e "(async()=>{${escapedJs}})().catch(e=>console.error(e))"`;
    
    const started = await window.electronAPI.executeCommand(script);
    const targetId = (started as any)?.processId;
    let out = '';
    let err = '';
    return new Promise<{ success: boolean; output: string; errorOutput: string }>((resolve) => {
      window.electronAPI.onCommandOutput(({ processId, type, data }) => {
        if (processId !== targetId) return;
        if (type === 'stdout') out += data || '';
        else err += data || '';
      });
      window.electronAPI.onCommandFinished(((data: any) => {
        if (data.processId !== targetId) return;
        resolve({ success: data.success, output: out || data.output || '', errorOutput: err || data.errorOutput || '' });
      }) as any);
      window.electronAPI.onCommandError(((data: any) => {
        if (data.processId !== targetId) return;
        resolve({ success: false, output: out, errorOutput: data.error || err });
      }) as any);
    });
  };

  const loadPlugins = async () => {
    setLoading(true);
    setError('');
    try {
      const js = `const fs=require('fs');const path=require('path');const dir='${PLUGINS_DIR}';const full=path.resolve(process.cwd(),dir);if(!fs.existsSync(full)){console.log('[]');process.exit(0);}const items=fs.readdirSync(full,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);const result=[];for(const name of items){const p=path.join(full,name,'plugin.json');if(fs.existsSync(p)){try{const cfg=JSON.parse(fs.readFileSync(p,'utf-8'));result.push({id:cfg.id,name:cfg.name,version:cfg.version,description:cfg.description,category:cfg.category,tags:cfg.tags,enabled:cfg.enabled,folderPath:path.join(full,name)});}catch(e){}}}process.stdout.write(JSON.stringify(result));`;
      const res = await runNodeEval(js);
      if (!res.success) throw new Error(res.errorOutput || '读取插件失败');
      const list: PluginInfo[] = JSON.parse(res.output || '[]');
      setPlugins(list);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleEnable = async (p: PluginInfo, enabled: boolean) => {
    try {
      // 获取插件文件夹名称（从完整路径中提取）
      const folderName = p.folderPath.split(/[/\\]/).pop() || '';
      
      const js = `const fs=require('fs');const path=require('path');const cfg=path.join(process.cwd(),'${PLUGINS_DIR}','${folderName}','plugin.json');const obj=JSON.parse(fs.readFileSync(cfg,'utf-8'));obj.enabled=${enabled ? 'true' : 'false'};fs.writeFileSync(cfg,JSON.stringify(obj,null,2));console.log('ok');`;
      const res = await runNodeEval(js);
      if (res.output.trim() !== 'ok') throw new Error(res.errorOutput || '写入失败');
      await loadPlugins();
    } catch (e: any) {
      alert(e.message || '更新失败');
    }
  };

  useEffect(() => { loadPlugins(); }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return plugins;
    return plugins.filter(p => p.name.toLowerCase().includes(k) || p.id.toLowerCase().includes(k) || (p.tags||[]).join(',').toLowerCase().includes(k));
  }, [plugins, q]);

  return (
    <div className="plugin-app">
      <div className="plugin-titlebar">
        <i className="fas fa-puzzle-piece" />
        <span>插件管理中心</span>
        <div className="plugin-actions">
          <input className="plugin-search" placeholder="搜索插件名称、类别或标签..." value={q} onChange={(e)=>setQ(e.target.value)} />
          <button className={`plugin-btn ${loading ? '' : 'primary'}`} onClick={loadPlugins} disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{marginRight: 8}}></i>
                刷新中...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt" style={{marginRight: 8}}></i>
                刷新
              </>
            )}
          </button>
        </div>
      </div>

      <div className="plugin-body">
        {loading && plugins.length === 0 ? (
          <div className="plugin-loading">正在加载插件...</div>
        ) : error ? (
          <div className="plugin-error">
            <i className="fas fa-exclamation-triangle" style={{marginRight: 8}}></i>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="plugin-empty">
            <i className="fas fa-puzzle-piece" style={{fontSize: 48, marginBottom: 16, opacity: 0.3}}></i>
            <div style={{fontSize: 16, marginBottom: 8}}>未发现插件</div>
            <div>确保项目根目录下存在 plugins/ 目录且包含有效的 plugin.json 文件</div>
          </div>
        ) : (
          <div className="plugin-grid">
            {filtered.map(p => (
              <div key={p.id} className="plugin-card">
                <div className="plugin-header">
                  <div className="plugin-info">
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                  </div>
                  <div className="plugin-status">
                    <span className={`plugin-state ${p.enabled ? '已启用' : '已禁用'}`}>
                      {p.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
                
                <div className="plugin-meta">
                  <div className="plugin-meta-item">
                    <i className="fas fa-tag"></i>
                    v{p.version}
                  </div>
                  <div className="plugin-meta-item">
                    <i className="fas fa-folder"></i>
                    {p.category}
                  </div>
                  {(p.tags || []).slice(0, 3).map(tag => (
                    <div key={tag} className="plugin-meta-item">
                      <i className="fas fa-hashtag"></i>
                      {tag}
                    </div>
                  ))}
                  {(p.tags || []).length > 3 && (
                    <div className="plugin-meta-item">
                      <i className="fas fa-ellipsis-h"></i>
                      +{(p.tags || []).length - 3}
                    </div>
                  )}
                </div>

                <div className="plugin-actions">
                  <button 
                    className={`plugin-btn plugin-main-action ${p.enabled ? 'danger' : 'primary'}`}
                    onClick={() => toggleEnable(p, !p.enabled)}
                  >
                    <i className={`fas ${p.enabled ? 'fa-stop' : 'fa-play'}`} style={{marginRight: 4}}></i>
                    {p.enabled ? '禁用' : '启用'}
                  </button>
                  <div className="plugin-mini-actions">
                    <button 
                      className="plugin-mini" 
                      onClick={() => {
                        navigator.clipboard.writeText(p.folderPath);
                        // 简单的反馈提示
                        const btn = event?.target as HTMLButtonElement;
                        const originalText = btn.textContent;
                        btn.textContent = '✓';
                        setTimeout(() => {
                          btn.textContent = originalText;
                        }, 1000);
                      }}
                      title="复制插件路径"
                    >
                      <i className="fas fa-copy"></i>
                    </button>
                    <button 
                      className="plugin-mini"
                      onClick={() => {
                        // 使用系统默认方式打开文件夹
                        if (window.electronAPI?.executeCommand) {
                          window.electronAPI.executeCommand(`explorer "${p.folderPath}"`);
                        }
                      }}
                      title="打开插件目录"
                    >
                      <i className="fas fa-folder-open"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="plugin-statusbar">
        <div className="plugin-status-left">
          <span>
            <i className="fas fa-puzzle-piece" style={{marginRight: 6}}></i>
            共 {plugins.length} 个插件
          </span>
          <span>
            <i className="fas fa-filter" style={{marginRight: 6}}></i>
            筛选后 {filtered.length} 个
          </span>
        </div>
        <div className="plugin-status-right">
          <div className="plugin-status-indicator">
            <span>插件系统运行中</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginManager;


