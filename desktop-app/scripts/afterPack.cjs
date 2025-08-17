const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async function afterPack(context) {
  try {
    const appOutDir = context.appOutDir; // e.g. release/win-unpacked
    const targetCore = path.join(appOutDir, 'resources', 'sentra-core');
    if (!fs.existsSync(targetCore)) {
      console.warn('[afterPack] target sentra-core not found:', targetCore);
      return;
    }

    // 将根 package.json 复制为依赖清单
    const projectRoot = path.resolve(context.packager.projectDir, '..');
    const rootPkg = path.join(projectRoot, 'package.json');
    const corePkg = path.join(targetCore, 'package.json');
    fs.copyFileSync(rootPkg, corePkg);

    console.log('[afterPack] Installing production deps into', targetCore);
    execSync('npm install --omit=dev --no-audit --no-fund', { cwd: targetCore, stdio: 'inherit' });
    console.log('[afterPack] node_modules ready');
  } catch (e) {
    console.error('[afterPack] failed:', e.message);
    throw e;
  }
};



