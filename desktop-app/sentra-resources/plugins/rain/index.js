// 雨滴特效插件执行脚本

// 获取参数，设置默认值
const intensity = parameters.intensity || 30;
const speed = parameters.speed || 1;
const color = parameters.color || '#4A90E2';
const opacity = parameters.opacity || 0.6;
const angle = parameters.angle || 0;
const duration = parameters.duration || 0;

console.log(`开始执行雨滴特效，参数: 密度=${intensity}, 速度=${speed}, 角度=${angle}`);

// 读取样式文件
const cssContent = readFile('style.css');

// 生成动态CSS
const dynamicCSS = `
  ${cssContent}
  
  .sentra-raindrop {
    background: linear-gradient(to bottom, transparent, ${color}) !important;
    opacity: ${opacity} !important;
    animation-duration: ${2 / speed}s !important;
    transform: rotate(${angle}deg) !important;
  }
`;

// 注入样式
await injectCSS(dynamicCSS);

// 生成雨滴脚本
const rainScript = `
(function() {
  // 防止重复执行
  if (window.sentraRain) {
    window.sentraRain.stop();
  }

  // 雨滴管理器
  window.sentraRain = {
    raindrops: [],
    isRunning: false,
    intervalId: null,
    
    // 启动雨滴效果
    start: function() {
      if (this.isRunning) return;
      
      this.isRunning = true;
      console.log('雨滴特效启动');
      
      // 创建雨滴容器
      if (!document.getElementById('sentra-rain-container')) {
        const container = document.createElement('div');
        container.id = 'sentra-rain-container';
        container.style.cssText = \`
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 999999;
          overflow: hidden;
        \`;
        document.body.appendChild(container);
      }
      
      // 定期创建雨滴
      this.intervalId = setInterval(() => {
        if (this.isRunning) {
          this.createRaindrop();
        }
      }, ${Math.max(50, 1000 / intensity)});
    },
    
    // 停止雨滴效果
    stop: function() {
      if (!this.isRunning) return;
      
      this.isRunning = false;
      console.log('雨滴特效停止');
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      // 清理现有雨滴
      this.raindrops.forEach(drop => {
        if (drop.element && drop.element.parentNode) {
          drop.element.parentNode.removeChild(drop.element);
        }
      });
      this.raindrops = [];
      
      // 移除容器
      const container = document.getElementById('sentra-rain-container');
      if (container) {
        container.remove();
      }
    },
    
    // 创建单个雨滴
    createRaindrop: function() {
      const container = document.getElementById('sentra-rain-container');
      if (!container) return;
      
      const raindrop = document.createElement('div');
      raindrop.className = 'sentra-raindrop';
      
      // 随机位置和属性
      const startX = Math.random() * window.innerWidth;
      const animationDuration = (2 + Math.random()) / ${speed};
      const length = 10 + Math.random() * 20;
      
      raindrop.style.cssText = \`
        position: absolute;
        left: \${startX}px;
        top: -50px;
        width: 2px;
        height: \${length}px;
        background: linear-gradient(to bottom, transparent, ${color});
        opacity: ${opacity};
        animation: rainfall \${animationDuration}s linear forwards;
        transform: rotate(${angle}deg);
        pointer-events: none;
        z-index: 999999;
      \`;
      
      container.appendChild(raindrop);
      
      // 记录雨滴信息
      const dropData = {
        element: raindrop,
        startTime: Date.now()
      };
      this.raindrops.push(dropData);
      
      // 动画结束后移除雨滴
      setTimeout(() => {
        if (raindrop.parentNode) {
          raindrop.parentNode.removeChild(raindrop);
        }
        const index = this.raindrops.indexOf(dropData);
        if (index > -1) {
          this.raindrops.splice(index, 1);
        }
      }, animationDuration * 1000);
    }
  };
  
  // 启动雨滴效果
  window.sentraRain.start();
  
  // 如果设置了持续时间，自动停止
  ${duration > 0 ? `
  setTimeout(() => {
    window.sentraRain.stop();
  }, ${duration * 1000});
  ` : ''}
})();
`;

// 注入脚本
await injectJS(rainScript);

console.log('雨滴特效已成功启动');

// 返回执行结果
return {
  success: true,
  message: `雨滴特效已启动 - 密度: ${intensity}, 速度: ${speed}, 角度: ${angle}度`,
  data: {
    intensity,
    speed,
    color,
    opacity,
    angle,
    duration
  }
};
