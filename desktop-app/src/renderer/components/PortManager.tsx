import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/port-manager.css';

type PortEntry = {
  protocol: string;
  localAddress: string;
  localPort: string;
  foreignAddress: string;
  foreignPort: string;
  state: string;
  pid: string;
  processName?: string;
};

const isWindows = true; // 本应用主要面向 Windows 桌面

function parseNetstat(output: string): PortEntry[] {
  const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const entries: PortEntry[] = [];
  for (const line of lines) {
    // 过滤表头
    if (/^Proto/i.test(line) || /^活动连接/i.test(line)) continue;
    const parts = line.replace(/\s+/g, ' ').split(' ');
    if (parts.length < 4) continue;

    const protocol = parts[0].toUpperCase();

    // netstat 在 Windows 下：TCP: Proto LocalAddress ForeignAddress State PID
    //                          UDP: Proto LocalAddress ForeignAddress PID (无 State)
    if (protocol === 'TCP' && parts.length >= 5) {
      const [ , local, foreign, state, pid] = parts.slice(0, 5);
      const [localAddress, localPort] = splitHostPort(local);
      const [foreignAddress, foreignPort] = splitHostPort(foreign);
      entries.push({ protocol, localAddress, localPort, foreignAddress, foreignPort, state, pid });
    } else if (protocol === 'UDP') {
      // UDP 行通常没有 State
      const [ , local, foreign, maybePid] = parts.slice(0, 4);
      const pid = parts[parts.length - 1];
      const [localAddress, localPort] = splitHostPort(local);
      const [foreignAddress, foreignPort] = splitHostPort(foreign || '*:*');
      entries.push({ protocol, localAddress, localPort, foreignAddress, foreignPort, state: '', pid: maybePid || pid });
    }
  }
  return entries;
}

function splitHostPort(addr: string): [string, string] {
  if (!addr) return ['', ''];
  // IPv6 可能是 [::]:80 或 [fe80::1%3]:443，也可能不带中括号，直接以最后一个冒号为分隔
  const lastColon = addr.lastIndexOf(':');
  if (lastColon === -1) return [addr, ''];
  const host = addr.substring(0, lastColon);
  const port = addr.substring(lastColon + 1);
  return [host, port];
}

const PortManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [filter, setFilter] = useState('');
  const cacheRef = useRef<Record<string, string>>({}); // pid -> name

  const runCommandAndCollect = async (command: string): Promise<{ output: string; errorOutput: string; success: boolean }> => {
    const started = await window.electronAPI.executeCommand(command);
    const targetId = (started as any)?.processId;
    let out = '';
    let err = '';

    return new Promise((resolve) => {
      // 聚合输出
      window.electronAPI.onCommandOutput(({ processId, type, data }) => {
        if (processId !== targetId) return;
        if (type === 'stdout') out += data || '';
        else err += data || '';
      });
      // 完成时返回
      window.electronAPI.onCommandFinished(((data: any) => {
        if (data.processId !== targetId) return;
        const finalOut = out || data.output || '';
        const finalErr = err || data.errorOutput || '';
        resolve({ output: finalOut, errorOutput: finalErr, success: data.success });
      }) as any);
      // 错误时也返回
      window.electronAPI.onCommandError(({ processId, error }) => {
        if (processId !== targetId) return;
        resolve({ output: out, errorOutput: error || err, success: false });
      });
    });
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await runCommandAndCollect(isWindows ? 'netstat -ano' : 'netstat -anp');
      if (!res || res.success === false) throw new Error(res?.errorOutput || '执行 netstat 失败');
      const entries = parseNetstat(res.output || '');
      // 获取进程名（按 PID 去重，逐个查询）
      const uniquePids = Array.from(new Set(entries.map(e => e.pid))).filter(Boolean);
      await Promise.all(uniquePids.map(async (pid) => {
        if (!cacheRef.current[pid]) {
          cacheRef.current[pid] = await queryProcessName(pid);
        }
      }));
      const withName = entries.map(e => ({ ...e, processName: cacheRef.current[e.pid] || '' }));
      setPorts(withName);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const queryProcessName = async (pid: string): Promise<string> => {
    try {
      // 使用 CSV 输出便于解析
      const cmd = `tasklist /FI "PID eq ${pid}" /FO CSV /NH`;
      const res = await runCommandAndCollect(cmd);
      if (!res || res.success === false) return '';
      const line = (res.output || '').split(/\r?\n/).map(l => l.trim()).find(Boolean) || '';
      // 形如 "node.exe","12345","Console","1","120,000 K"
      const cols = line.replace(/^"|"$/g, '').split('","');
      return cols[0] || '';
    } catch {
      return '';
    }
  };

  const killPid = async (pid: string) => {
    if (!pid) return;
    const ok = confirm(`确定要结束 PID=${pid} 的进程吗？`);
    if (!ok) return;
    const res = await window.electronAPI.executeCommand(`taskkill /PID ${pid} /F`);
    if (res && res.success !== false) {
      await load();
    } else {
      alert(`结束失败：${res?.errorOutput || '未知错误'}\n可能需要以管理员身份运行。`);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return ports;
    return ports.filter(p =>
      p.localPort.includes(q) ||
      p.pid.includes(q) ||
      (p.processName || '').toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q)
    );
  }, [ports, filter]);

  return (
    <div className="pm-app">
      <div className="pm-titlebar">
        <i className="fas fa-plug" />
        <span>端口管理器</span>
        <div className="pm-actions">
          <input
            className="pm-search"
            placeholder="搜索端口/PID/进程名..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className="pm-btn" onClick={load} disabled={loading}>
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      <div className="pm-body">
        {error ? (
          <div className="pm-error">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="pm-empty">未发现端口占用，点击右上角“刷新”再试</div>
        ) : (
          <table className="pm-table">
            <thead>
              <tr>
                <th>协议</th>
                <th>本地端口</th>
                <th>状态</th>
                <th>PID</th>
                <th>进程</th>
                <th style={{ width: 80 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, idx) => (
                <tr key={`${e.protocol}-${e.localAddress}-${e.localPort}-${e.pid}-${idx}`}>
                  <td>{e.protocol}</td>
                  <td>
                    <span className="pm-port">{e.localPort}</span>
                    <button className="pm-mini" onClick={() => navigator.clipboard.writeText(e.localPort)}>复制</button>
                  </td>
                  <td>
                    {e.protocol === 'TCP' ? (
                      <span className={`pm-state ${e.state.toLowerCase()}`}>{e.state || '-'}</span>
                    ) : (
                      <span className="pm-state">-</span>
                    )}
                  </td>
                  <td>
                    {e.pid}
                    <button className="pm-mini" onClick={() => navigator.clipboard.writeText(e.pid)}>复制</button>
                  </td>
                  <td>{e.processName || ''}</td>
                  <td>
                    <button className="pm-btn danger" onClick={() => killPid(e.pid)}>结束</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pm-statusbar">
        <span>共 {ports.length} 条</span>
        <span>筛选后 {filtered.length} 条</span>
      </div>
    </div>
  );
};

export default PortManager;


