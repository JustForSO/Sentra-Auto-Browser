// 页面美化器插件执行脚本

// 获取参数
const borderRadius = parameters.borderRadius || 8;
const shadowIntensity = parameters.shadowIntensity || 30;
const gradientBackground = parameters.gradientBackground !== false;
const animationEnabled = parameters.animationEnabled !== false;
const colorScheme = parameters.colorScheme || 'blue';

console.log(`开始页面美化，圆角=${borderRadius}px, 阴影强度=${shadowIntensity}%, 渐变背景=${gradientBackground}, 动画=${animationEnabled}, 配色=${colorScheme}`);

// 配色方案定义
const colorSchemes = {
  blue: {
    primary: '#4A9EFF',
    secondary: '#74B9FF',
    accent: '#0984E3',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  purple: {
    primary: '#A29BFE',
    secondary: '#6C5CE7',
    accent: '#5F3DC4',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  green: {
    primary: '#00B894',
    secondary: '#55EFC4',
    accent: '#00A085',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
  },
  orange: {
    primary: '#FDCB6E',
    secondary: '#E17055',
    accent: '#E84393',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  pink: {
    primary: '#FD79A8',
    secondary: '#E84393',
    accent: '#E91E63',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  rainbow: {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#45B7D1',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
  }
};

const colors = colorSchemes[colorScheme] || colorSchemes.blue;

// 生成美化CSS
const beautifyCSS = `
/* Sentra 页面美化器样式 */
.sentra-beautified {
  transition: all 0.3s ease !important;
}

/* 基础美化样式 */
.sentra-beautify-container {
  border-radius: ${borderRadius}px !important;
  box-shadow: 0 ${Math.round(shadowIntensity/10)}px ${Math.round(shadowIntensity/5)}px rgba(0,0,0,${shadowIntensity/100}) !important;
  ${animationEnabled ? 'transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;' : ''}
}

.sentra-beautify-container:hover {
  ${animationEnabled ? `transform: translateY(-2px) !important;
  box-shadow: 0 ${Math.round(shadowIntensity/8)}px ${Math.round(shadowIntensity/4)}px rgba(0,0,0,${shadowIntensity/80}) !important;` : ''}
}

/* 按钮美化 */
button, .btn, [role="button"], input[type="submit"], input[type="button"] {
  border-radius: ${Math.round(borderRadius/2)}px !important;
  background: ${colors.primary} !important;
  color: white !important;
  border: none !important;
  padding: 8px 16px !important;
  ${animationEnabled ? 'transition: all 0.2s ease !important;' : ''}
  box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
}

button:hover, .btn:hover, [role="button"]:hover {
  ${animationEnabled ? `transform: translateY(-1px) !important;
  background: ${colors.secondary} !important;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;` : ''}
}

/* 输入框美化 */
input, textarea, select {
  border-radius: ${Math.round(borderRadius/2)}px !important;
  border: 2px solid ${colors.primary}40 !important;
  padding: 8px 12px !important;
  ${animationEnabled ? 'transition: all 0.2s ease !important;' : ''}
}

input:focus, textarea:focus, select:focus {
  border-color: ${colors.primary} !important;
  box-shadow: 0 0 0 3px ${colors.primary}20 !important;
  outline: none !important;
}

/* 卡片美化 */
.card, .panel, .box, .container, .content, article, section {
  border-radius: ${borderRadius}px !important;
  ${animationEnabled ? 'transition: all 0.3s ease !important;' : ''}
  box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
}

/* 链接美化 */
a {
  color: ${colors.accent} !important;
  text-decoration: none !important;
  ${animationEnabled ? 'transition: all 0.2s ease !important;' : ''}
}

a:hover {
  color: ${colors.primary} !important;
  ${animationEnabled ? 'transform: translateY(-1px) !important;' : ''}
}

/* 渐变背景 */
${gradientBackground ? `
body {
  background: ${colors.gradient} !important;
  background-attachment: fixed !important;
}

/* 为主要内容区域添加半透明背景 */
main, .main, .content, .container, #content, #main {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: ${borderRadius}px !important;
  margin: 20px !important;
  padding: 20px !important;
}
` : ''}

/* 动画效果 */
${animationEnabled ? `
@keyframes sentra-fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes sentra-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.sentra-animate-in {
  animation: sentra-fade-in 0.6s ease-out !important;
}

.sentra-pulse {
  animation: sentra-pulse 2s infinite !important;
}
` : ''}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.1) !important;
  border-radius: 4px !important;
}

::-webkit-scrollbar-thumb {
  background: ${colors.primary} !important;
  border-radius: 4px !important;
}

::-webkit-scrollbar-thumb:hover {
  background: ${colors.secondary} !important;
}

/* 特殊效果 */
.sentra-glow {
  box-shadow: 0 0 20px ${colors.primary}40 !important;
}

.sentra-gradient-text {
  background: ${colors.gradient} !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}
`;

// 注入CSS
await injectCSS(beautifyCSS);

// 页面美化脚本
const beautifyScript = `
(function() {
  // 防止重复执行
  if (window.sentraPageBeautifier) {
    window.sentraPageBeautifier.cleanup();
  }

  window.sentraPageBeautifier = {
    animationEnabled: ${animationEnabled},
    
    // 应用美化效果
    apply: function() {
      console.log('开始应用页面美化效果...');
      
      // 为主要容器添加美化类
      const containers = document.querySelectorAll('div, section, article, main, .container, .content');
      containers.forEach((el, index) => {
        if (el.offsetWidth > 200 && el.offsetHeight > 100) {
          el.classList.add('sentra-beautify-container');
          
          if (this.animationEnabled) {
            // 添加延迟动画
            setTimeout(() => {
              el.classList.add('sentra-animate-in');
            }, index * 50);
          }
        }
      });
      
      // 为重要元素添加特殊效果
      const importantElements = document.querySelectorAll('h1, h2, .title, .header, .logo');
      importantElements.forEach(el => {
        el.classList.add('sentra-gradient-text');
      });
      
      // 为按钮添加脉冲效果
      if (this.animationEnabled) {
        const buttons = document.querySelectorAll('button[type="submit"], .primary-btn, .cta-button');
        buttons.forEach(btn => {
          btn.classList.add('sentra-pulse');
        });
      }
      
      console.log('页面美化效果已应用');
    },
    
    // 监听动态内容
    observe: function() {
      const observer = new MutationObserver((mutations) => {
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
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      this.observer = observer;
    },
    
    // 处理新元素
    processNewElement: function(element) {
      if (element.offsetWidth > 200 && element.offsetHeight > 100) {
        element.classList.add('sentra-beautify-container');
        if (this.animationEnabled) {
          element.classList.add('sentra-animate-in');
        }
      }
    },
    
    // 清理
    cleanup: function() {
      const elements = document.querySelectorAll('.sentra-beautify-container, .sentra-animate-in, .sentra-pulse, .sentra-gradient-text');
      elements.forEach(el => {
        el.classList.remove('sentra-beautify-container', 'sentra-animate-in', 'sentra-pulse', 'sentra-gradient-text');
      });
      
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  };
  
  // 应用美化效果
  window.sentraPageBeautifier.apply();
  window.sentraPageBeautifier.observe();
  
  console.log('页面美化器已激活');
})();
`;

// 注入脚本
await injectJS(beautifyScript);

console.log('页面美化器已成功应用');

// 返回执行结果
return {
  success: true,
  message: `页面美化器已应用 - 配色: ${colorScheme}, 圆角: ${borderRadius}px, 阴影: ${shadowIntensity}%`,
  data: {
    borderRadius,
    shadowIntensity,
    gradientBackground,
    animationEnabled,
    colorScheme,
    appliedEffects: ['圆角', '阴影', gradientBackground ? '渐变背景' : null, animationEnabled ? '动画' : null].filter(Boolean)
  }
};
