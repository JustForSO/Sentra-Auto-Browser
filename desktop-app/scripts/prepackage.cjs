const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const appDir = __dirname.replace(/\\scripts$/, '');
const projectRoot = path.resolve(appDir, '..');
const deployDir = path.join(projectRoot, '.sentra-deploy');

function run(cmd, cwd) {
  console.log('[prepackage]', cmd);
  execSync(cmd, { stdio: 'inherit', cwd: cwd || process.cwd() });
}

try {
  // 1) 安装依赖（含 dev），避免 TS 类型缺失
  run('pnpm --dir .. install --shamefully-hoist', appDir);
  // 2) 构建主项目产物
  run('pnpm --dir .. run build', appDir);
  // 3) 清理上次打包输出
  run('rmdir /s /q release', appDir);
} catch (e) {
  console.error('prepackage failed:', e.message);
  process.exit(1);
}


