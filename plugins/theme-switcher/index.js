// 智能主题切换器插件执行脚本

// 获取参数
const autoDetect = parameters.autoDetect !== false;
const targetTheme = parameters.targetTheme || 'auto';
const animationDuration = parameters.animationDuration || 300;

console.log(`开始智能主题切换，自动检测=${autoDetect}, 目标主题=${targetTheme}, 动画时长=${animationDuration}ms`);

// 主题检测和切换脚本
const themeSwitcherScript = `
(function() {
  // 防止重复执行
  if (window.sentraThemeSwitcher) {
    window.sentraThemeSwitcher.cleanup();
  }

  // 主题切换器
  window.sentraThemeSwitcher = {
    currentTheme: 'unknown',
    targetTheme: '${targetTheme}',
    animationDuration: ${animationDuration},
    
    // 检测当前主题
    detectCurrentTheme: function() {
      // 检查HTML元素的data属性
      const html = document.documentElement;
      if (html.getAttribute('data-theme') === 'dark' || 
          html.classList.contains('dark') ||
          html.classList.contains('dark-theme')) {
        return 'dark';
      }
      
      // 检查body的类名和样式
      const body = document.body;
      const bodyStyle = window.getComputedStyle(body);
      const bgColor = bodyStyle.backgroundColor;
      
      // 解析背景色
      if (bgColor) {
        const rgb = bgColor.match(/\\d+/g);
        if (rgb && rgb.length >= 3) {
          const r = parseInt(rgb[0]);
          const g = parseInt(rgb[1]);
          const b = parseInt(rgb[2]);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          
          // 如果背景色较暗，认为是暗色主题
          if (brightness < 128) {
            return 'dark';
          }
        }
      }
      
      // 检查CSS变量
      const rootStyle = window.getComputedStyle(html);
      const colorScheme = rootStyle.getPropertyValue('color-scheme');
      if (colorScheme.includes('dark')) {
        return 'dark';
      }
      
      // 检查媒体查询
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // 用户偏好暗色，但页面可能是亮色
        return 'light'; // 假设页面默认是亮色
      }
      
      return 'light';
    },
    
    // 应用主题
    applyTheme: function(theme) {
      const html = document.documentElement;
      const body = document.body;
      
      // 添加过渡动画
      const transition = \`all \${this.animationDuration}ms ease-in-out\`;
      html.style.transition = transition;
      body.style.transition = transition;
      
      // 移除旧的主题类
      html.classList.remove('sentra-light-theme', 'sentra-dark-theme');
      body.classList.remove('sentra-light-theme', 'sentra-dark-theme');
      
      if (theme === 'dark') {
        this.applyDarkTheme();
      } else {
        this.applyLightTheme();
      }
      
      // 移除过渡动画
      setTimeout(() => {
        html.style.transition = '';
        body.style.transition = '';
      }, this.animationDuration);
      
      this.currentTheme = theme;
      console.log(\`主题已切换到: \${theme}\`);
    },
    
    // 应用暗色主题
    applyDarkTheme: function() {
      const html = document.documentElement;
      const body = document.body;
      
      html.classList.add('sentra-dark-theme');
      body.classList.add('sentra-dark-theme');
      
      // 设置CSS变量
      html.style.setProperty('--sentra-bg-color', '#1a1a1a');
      html.style.setProperty('--sentra-text-color', '#e0e0e0');
      html.style.setProperty('--sentra-accent-color', '#4A9EFF');
      
      // 应用全局样式
      html.style.filter = 'invert(0.9) hue-rotate(180deg) brightness(0.8)';
      html.style.backgroundColor = '#1a1a1a';
      
      // 恢复图片和视频
      const mediaElements = document.querySelectorAll('img, video, iframe, svg, canvas');
      mediaElements.forEach(el => {
        el.style.filter = 'invert(0.9) hue-rotate(180deg) brightness(1.25)';
      });
    },
    
    // 应用亮色主题
    applyLightTheme: function() {
      const html = document.documentElement;
      const body = document.body;
      
      html.classList.add('sentra-light-theme');
      body.classList.add('sentra-light-theme');
      
      // 设置CSS变量
      html.style.setProperty('--sentra-bg-color', '#ffffff');
      html.style.setProperty('--sentra-text-color', '#333333');
      html.style.setProperty('--sentra-accent-color', '#007bff');
      
      // 移除暗色主题的样式
      html.style.filter = '';
      html.style.backgroundColor = '';
      
      // 恢复媒体元素
      const mediaElements = document.querySelectorAll('img, video, iframe, svg, canvas');
      mediaElements.forEach(el => {
        el.style.filter = '';
      });
    },
    
    // 切换主题
    toggle: function() {
      const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.applyTheme(newTheme);
      return newTheme;
    },
    
    // 清理
    cleanup: function() {
      const html = document.documentElement;
      const body = document.body;
      
      html.classList.remove('sentra-light-theme', 'sentra-dark-theme');
      body.classList.remove('sentra-light-theme', 'sentra-dark-theme');
      html.style.filter = '';
      html.style.backgroundColor = '';
      
      const mediaElements = document.querySelectorAll('img, video, iframe, svg, canvas');
      mediaElements.forEach(el => {
        el.style.filter = '';
      });
    }
  };
  
  // 执行主题切换逻辑
  const switcher = window.sentraThemeSwitcher;
  
  ${autoDetect ? `
  // 自动检测当前主题
  switcher.currentTheme = switcher.detectCurrentTheme();
  console.log(\`检测到当前主题: \${switcher.currentTheme}\`);
  ` : ''}
  
  // 根据目标主题执行切换
  let finalTheme = switcher.targetTheme;
  if (finalTheme === 'auto') {
    // 自动模式：切换到相反主题
    finalTheme = switcher.currentTheme === 'dark' ? 'light' : 'dark';
  }
  
  switcher.applyTheme(finalTheme);
  
  // 添加快捷键支持 (Ctrl+Shift+T)
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      switcher.toggle();
    }
  });
  
  console.log('智能主题切换器已激活，快捷键: Ctrl+Shift+T');
})();
`;

// 注入脚本
await injectJS(themeSwitcherScript);

console.log('智能主题切换器已成功应用');

// 返回执行结果
return {
  success: true,
  message: `智能主题切换器已应用 - 目标主题: ${targetTheme}, 动画时长: ${animationDuration}ms`,
  data: {
    autoDetect,
    targetTheme,
    animationDuration,
    shortcut: 'Ctrl+Shift+T 切换主题'
  }
};
