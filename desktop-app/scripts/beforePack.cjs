// beforePack 钩子：在打包前为 sentra-core 生成“扁平”的 node_modules（使用 npm 安装）
// 目的：避免 pnpm 的 .pnpm 符号链接在 electron-builder 中产生冲突

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execSync } = require('child_process');

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else if (entry.isFile()) {
      await fsp.mkdir(path.dirname(d), { recursive: true });
      await fsp.copyFile(s, d);
    }
  }
}

module.exports = async function beforePack(context) {
  const appDir = context.appDir; // desktop-app 目录
  const projectRoot = path.resolve(appDir, '..');
  const deployDir = path.join(projectRoot, '.sentra-deploy');
  const targetCore = path.join(appDir, 'resources', 'sentra-core');
  const targetNodeModules = path.join(targetCore, 'node_modules');

  // 确保 sentra-core 目录存在（dist 由 extraResources 复制）
  await fsp.mkdir(targetCore, { recursive: true });

  // 将根 package.json 复制到 sentra-core 作为依赖清单
  const rootPkg = path.join(projectRoot, 'package.json');
  const corePkg = path.join(targetCore, 'package.json');
  await fsp.copyFile(rootPkg, corePkg);

  // 使用 npm 在 sentra-core 目录安装生产依赖（得到“扁平”的 node_modules）
  // 这样 electron-builder 打包时不会遇到 .pnpm 符号链接
  console.log('[beforePack] Installing production deps into resources/sentra-core via npm...');
  execSync('npm install --omit=dev --no-audit --no-fund', { stdio: 'inherit', cwd: targetCore });
  console.log('[beforePack] node_modules prepared at resources/sentra-core/node_modules');
};


