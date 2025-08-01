/**
 * 基础功能测试
 * 测试项目的基本功能是否正常工作
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Sentra Auto Browser 基础测试', () => {
  
  test('项目编译成功', () => {
    expect(() => {
      execSync('npm run build', { stdio: 'pipe' });
    }).not.toThrow();
    
    // 检查编译输出文件是否存在
    expect(fs.existsSync('dist/cli/index.js')).toBe(true);
    expect(fs.existsSync('dist/index.js')).toBe(true);
  });

  test('CLI命令可以执行', () => {
    const result = execSync('node dist/cli/index.js --help', { encoding: 'utf8' });
    expect(result).toContain('Usage:');
    expect(result).toContain('run');
    expect(result).toContain('config');
    expect(result).toContain('test');
  });

  test('配置命令正常工作', () => {
    const result = execSync('node dist/cli/index.js config', { encoding: 'utf8' });
    expect(result).toContain('配置信息');
  });

  test('环境变量示例文件存在', () => {
    expect(fs.existsSync('.env.example')).toBe(true);
    
    const envContent = fs.readFileSync('.env.example', 'utf8');
    expect(envContent).toContain('OPENAI_API_KEY');
    expect(envContent).toContain('BROWSER_HEADLESS');
    expect(envContent).toContain('AGENT_MAX_STEPS');
  });

  test('必要的文档文件存在', () => {
    expect(fs.existsSync('README.md')).toBe(true);
    expect(fs.existsSync('QUICKSTART.md')).toBe(true);
    expect(fs.existsSync('CONTRIBUTING.md')).toBe(true);
    expect(fs.existsSync('CHANGELOG.md')).toBe(true);
    expect(fs.existsSync('LICENSE')).toBe(true);
  });

  test('package.json 配置正确', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    expect(packageJson.name).toBe('sentra-auto-browser');
    expect(packageJson.repository.url).toBe('https://github.com/JustForSO/Sentra-Auto-Browser.git');
    expect(packageJson.license).toBe('MIT');
    expect(packageJson.bin['sentra-auto']).toBe('dist/cli/index.js');
  });

  test('TypeScript 类型检查通过', () => {
    expect(() => {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
    }).not.toThrow();
  });

});

describe('配置功能测试', () => {
  
  test('配置显示包含所有必要信息', () => {
    const result = execSync('node dist/cli/index.js config --all', { encoding: 'utf8' });
    
    // 检查AI模型配置
    expect(result).toContain('AI模型配置');
    expect(result).toContain('OPENAI_API_KEY');
    
    // 检查浏览器配置
    expect(result).toContain('浏览器配置');
    expect(result).toContain('BROWSER_HEADLESS');
    
    // 检查CDP配置
    expect(result).toContain('CDP连接配置');
    expect(result).toContain('BROWSER_CONNECT_TO_USER_BROWSER');
    
    // 检查代理配置
    expect(result).toContain('代理配置');
    expect(result).toContain('AGENT_MAX_STEPS');
  });

});

describe('文档完整性测试', () => {
  
  test('README 包含所有必要章节', () => {
    const readme = fs.readFileSync('README.md', 'utf8');
    
    expect(readme).toContain('# 🤖 Sentra Auto Browser');
    expect(readme).toContain('## ✨ 项目特色');
    expect(readme).toContain('## 🚀 快速开始');
    expect(readme).toContain('## 🎮 命令行使用');
    expect(readme).toContain('## 💻 编程使用');
    expect(readme).toContain('## 🎯 使用场景和示例');
    expect(readme).toContain('## 🔧 高级配置');
    expect(readme).toContain('## 💡 最佳实践');
    expect(readme).toContain('## 🚨 常见问题和解决方案');
    expect(readme).toContain('## 🤝 贡献指南');
    expect(readme).toContain('## 📄 许可证');
  });

  test('README 包含正确的GitHub链接', () => {
    const readme = fs.readFileSync('README.md', 'utf8');
    
    expect(readme).toContain('https://github.com/JustForSO/Sentra-Auto-Browser');
    expect(readme).not.toContain('your-username');
    expect(readme).not.toContain('sentra-auto-browser.git');
  });

  test('快速入门指南包含正确信息', () => {
    const quickstart = fs.readFileSync('QUICKSTART.md', 'utf8');
    
    expect(quickstart).toContain('git clone https://github.com/JustForSO/Sentra-Auto-Browser.git');
    expect(quickstart).toContain('cd Sentra-Auto-Browser');
    expect(quickstart).toContain('bilibili搜索编程教程');
  });

});
