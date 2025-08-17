// 暗黑主题切换插件执行脚本

// 获取参数，设置默认值
const intensity = parameters.intensity || 80;
const preserveImages = parameters.preserveImages !== false;
const accentColor = parameters.accentColor || '#4A9EFF';
const backgroundColor = parameters.backgroundColor || '#1a1a1a';
const textColor = parameters.textColor || '#e0e0e0';

console.log(`开始应用暗黑主题，强度=${intensity}%, 保护图片=${preserveImages}`);

// 读取样式文件
const cssContent = readFile('style.css');

// 计算暗化程度
const darknessLevel = intensity / 100;
const invertLevel = Math.min(darknessLevel * 0.9, 0.85);
const brightnessLevel = 1 - (darknessLevel * 0.3);

// 生成动态CSS
const dynamicCSS = `
  ${cssContent}
  
  /* 全局暗黑主题 */
  html {
    filter: invert(${invertLevel}) hue-rotate(180deg) brightness(${brightnessLevel}) !important;
    background: ${backgroundColor} !important;
  }
  
  /* 恢复图片和视频的正常显示 */
  ${preserveImages ? `
  img, video, iframe, svg, canvas, embed, object {
    filter: invert(${invertLevel}) hue-rotate(180deg) brightness(${1/brightnessLevel}) !important;
  }
  ` : ''}
  
  /* 自定义颜色覆盖 */
  .sentra-dark-theme-override {
    background-color: ${backgroundColor} !important;
    color: ${textColor} !important;
  }
  
  /* 链接和按钮强调色 */
  a, button, .btn, [role="button"] {
    color: ${accentColor} !important;
  }
  
  /* 输入框样式 */
  input, textarea, select {
    background-color: #2a2a2a !important;
    color: ${textColor} !important;
    border-color: #444 !important;
  }
  
  /* 滚动条样式 */
  ::-webkit-scrollbar {
    background-color: #2a2a2a !important;
  }
  
  ::-webkit-scrollbar-thumb {
    background-color: #555 !important;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background-color: #666 !important;
  }
`;

// 注入样式
await injectCSS(dynamicCSS);

// 生成主题切换脚本
const themeScript = `
(function() {
  // 防止重复执行
  if (window.sentraDarkTheme) {
    window.sentraDarkTheme.remove();
  }

  // 暗黑主题管理器
  window.sentraDarkTheme = {
    isActive: false,
    originalStyles: new Map(),
    
    // 应用暗黑主题
    apply: function() {
      if (this.isActive) return;
      
      this.isActive = true;
      console.log('暗黑主题已应用');
      
      // 添加主题标识
      document.documentElement.setAttribute('data-sentra-dark-theme', 'true');
      
      // 监听动态内容变化
      this.observeChanges();
      
      // 处理现有元素
      this.processExistingElements();
    },
    
    // 移除暗黑主题
    remove: function() {
      if (!this.isActive) return;
      
      this.isActive = false;
      console.log('暗黑主题已移除');
      
      // 移除主题标识
      document.documentElement.removeAttribute('data-sentra-dark-theme');
      
      // 停止监听
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      
      // 恢复原始样式
      this.restoreOriginalStyles();
    },
    
    // 处理现有元素
    processExistingElements: function() {
      // 处理特殊元素
      const specialElements = document.querySelectorAll('code, pre, .highlight, .code-block');
      specialElements.forEach(el => {
        if (!el.hasAttribute('data-sentra-processed')) {
          el.classList.add('sentra-dark-theme-override');
          el.setAttribute('data-sentra-processed', 'true');
        }
      });
    },
    
    // 监听DOM变化
    observeChanges: function() {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.processNewElement(node);
              }
            });
          }
        });
      });
      
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },
    
    // 处理新添加的元素
    processNewElement: function(element) {
      // 处理代码块等特殊元素
      if (element.matches && element.matches('code, pre, .highlight, .code-block')) {
        element.classList.add('sentra-dark-theme-override');
        element.setAttribute('data-sentra-processed', 'true');
      }
      
      // 处理子元素
      const specialChildren = element.querySelectorAll && element.querySelectorAll('code, pre, .highlight, .code-block');
      if (specialChildren) {
        specialChildren.forEach(el => {
          if (!el.hasAttribute('data-sentra-processed')) {
            el.classList.add('sentra-dark-theme-override');
            el.setAttribute('data-sentra-processed', 'true');
          }
        });
      }
    },
    
    // 恢复原始样式
    restoreOriginalStyles: function() {
      // 移除处理标记
      const processedElements = document.querySelectorAll('[data-sentra-processed]');
      processedElements.forEach(el => {
        el.classList.remove('sentra-dark-theme-override');
        el.removeAttribute('data-sentra-processed');
      });
    },
    
    // 切换主题
    toggle: function() {
      if (this.isActive) {
        this.remove();
      } else {
        this.apply();
      }
    }
  };
  
  // 应用暗黑主题
  window.sentraDarkTheme.apply();
  
  // 添加快捷键切换 (Ctrl+Shift+D)
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      window.sentraDarkTheme.toggle();
    }
  });
})();
`;

// 注入脚本
await injectJS(themeScript);

console.log('暗黑主题已成功应用');

// 返回执行结果
return {
  success: true,
  message: `暗黑主题已应用 - 强度: ${intensity}%, 保护图片: ${preserveImages ? '是' : '否'}`,
  data: {
    intensity,
    preserveImages,
    accentColor,
    backgroundColor,
    textColor,
    shortcut: 'Ctrl+Shift+D 切换主题'
  }
};
