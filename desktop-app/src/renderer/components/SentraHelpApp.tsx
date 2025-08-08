import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/help-app.css';
import '../styles/github-markdown.css';
 

type DocItem = { name: string; path: string; content: string };
const DOCS_DIR = '../docs';
const FALLBACK_CSS = `
.help-app { height: 100%; display: grid; grid-template-rows: 48px 1fr; background: #f3f2f1; color: #24292f; }
.help-titlebar { display: flex; align-items: center; gap: 8px; padding: 0 12px; border-bottom: 1px solid #e5e5e5; background: #fff; }
.help-titlebar i { color: #0f62fe; }
.help-titlebar span { font-weight: 600; }
.help-titlebar .title-right { margin-left: auto; color: #6a737d; font-size: 12px; font-weight: 400; }
.help-body { display: grid; grid-template-columns: 260px 1fr; height: 100%; }
.help-sidebar { border-right: 1px solid #e5e5e5; background: #fafafa; display: grid; grid-template-rows: auto 1fr auto; }
.search-box { padding: 10px; border-bottom: 1px solid #eee; }
.search-box input { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; background: #fff; outline: none; }
.nav-list { overflow: auto; padding: 8px; }
.nav-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; color: #24292f; }
.nav-item i { color: #57606a; }
.nav-item:hover { background: #eaeef2; }
.nav-item.active { background: #d0e2ff; color: #0f62fe; font-weight: 600; }
.sidebar-footer { border-top: 1px solid #e5e5e5; height: 36px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; font-size: 12px; color: #6a737d; }
.help-content { overflow: auto; background: #fff; }
.gh-md { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; padding: 24px; }
.gh-md h1, .gh-md h2, .gh-md h3 { border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
.gh-md table { border-collapse: collapse; border-spacing: 0; display: block; width: 100%; overflow: auto; }
.gh-md table th, .gh-md table td { border: 1px solid #dfe2e5; padding: 6px 13px; }
.gh-md pre { background: #f6f8fa; padding: 12px; overflow: auto; border-radius: 6px; }
.gh-md code { background: rgba(175,184,193,.2); padding: .2em .4em; border-radius: 6px; }
.loading, .error, .empty { padding: 24px; color: #6a737d; }
.error { color: #d73a49; }
`;

const SentraHelpApp: React.FC = () => {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 加载 docs 目录下的所有 .md 文件
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError('');
      try {
        const dir = await window.electronAPI.readDirectory(DOCS_DIR);
        if (!dir.success) throw new Error(dir.error || '读取目录失败');
        const mdFiles = dir.files
          .filter((f: any) => f.type === 'file' && f.name.toLowerCase().endsWith('.md'))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        const items: DocItem[] = [];
        for (const f of mdFiles) {
          const res = await window.electronAPI.readFile(`${DOCS_DIR}/${f.name}`);
          if (res.success) {
            const title = /^#\s+(.+)$/m.exec(res.content)?.[1] || f.name.replace(/\.md$/i, '');
            items.push({ name: title, path: `${DOCS_DIR}/${f.name}`, content: res.content });
          }
        }
        setDocs(items);
      } catch (e: any) {
        setError(e.message || '文档加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const filtered = useMemo(
    () => docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase())),
    [docs, search]
  );

  // 自定义图片渲染：支持 docs 内本地图片
  const Img: React.FC<{ src?: string; alt?: string } & any> = (props) => {
    const [src, setSrc] = useState(props.src);
    useEffect(() => {
      const run = async () => {
        const s = props.src || '';
        if (!s || /^https?:/i.test(s) || /^data:/i.test(s)) { setSrc(s); return; }
        const docDir = docs[active]?.path.replace(/\\/g, '/').replace(/\/[^/]*$/, '') || DOCS_DIR;
        const rel = s.startsWith('./') || s.startsWith('../') ? s : `./${s}`;
        const norm = `${docDir}/${rel}`.replace(/\/\.\//g, '/').replace(/\/+/g, '/');
        const res = await window.electronAPI.readFileBase64(norm);
        if (res.success) setSrc(`data:image/*;base64,${res.base64}`);
      };
      run();
    }, [props.src, active, docs]);
    return <img {...props} src={src} alt={props.alt} />;
  };

  // 仅保留复制按钮（不做语法高亮）
  useEffect(() => {
    document.querySelectorAll('pre code').forEach((el) => {
      const pre = el.parentElement as HTMLElement;
      if (!pre) return;
      if (!pre.classList.contains('codeblock')) pre.classList.add('codeblock');
      if (pre.querySelector('.code-copy-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.textContent = '复制';
      btn.onclick = () => {
        try {
          const text = (el as HTMLElement).innerText || '';
          navigator.clipboard.writeText(text);
          btn.textContent = '已复制';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 1200);
        } catch {}
      };
      pre.appendChild(btn);
    });
  }, [docs, active]);

  // 注意：不在 rehype 阶段添加 hljs class，避免 highlight.js 跳过处理

  return (
    <div className="help-app">
      {/* Fallback 样式注入，避免外部 CSS 未加载导致无样式 */}
      <style>{FALLBACK_CSS}</style>
      <div className="help-titlebar">
        <i className="fas fa-book" />
        <span>Sentra 帮助文档</span>
        <span className="title-right">GitHub 风格 · Markdown</span>
      </div>
      <div className="help-body">
        <aside className="help-sidebar">
          <div className="search-box">
            <input
              placeholder="搜索文档..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="nav-list">
            {filtered.map((d, i) => (
              <div
                key={d.path}
                className={`nav-item ${docs[active]?.path === d.path ? 'active' : ''}`}
                onClick={() => setActive(docs.findIndex(x => x.path === d.path))}
              >
                <i className="fas fa-file-alt" />
                <span>{d.name}</span>
        </div>
              ))}
            </div>
          <div className="sidebar-footer">
            <span>共 {docs.length} 篇</span>
            <span>Docs · MD</span>
          </div>
        </aside>
        <main className="help-content">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : docs[active] ? (
            <div className="markdown-body gh-md">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                
                components={{
                  code({children, className, ...props}) {
                    const isBlock = (props as any).node?.tagName === 'code' && /language-/.test(className || '');
                    // 渲染时附带 language-* 到 <code>，便于 hljs 识别
                    return <code className={className} {...props}>{children}</code>;
                  },
                  img: Img,
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  )
                }}
              >
                {docs[active].content}
              </ReactMarkdown>
        </div>
          ) : (
            <div className="empty">未发现文档</div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SentraHelpApp;


