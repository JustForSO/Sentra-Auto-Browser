// 雪花飘落特效插件执行脚本

// 获取参数，设置默认值
const intensity = parameters.intensity || 50;
const speed = parameters.speed || 1;
const size = parameters.size || 1;
const color = parameters.color || '#ffffff';
const opacity = parameters.opacity || 0.8;
const wind = parameters.wind || 0;
const duration = parameters.duration || 0;

console.log(`开始执行雪花特效，参数: 密度=${intensity}, 速度=${speed}, 大小=${size}, 颜色=${color}`);

// 读取样式文件
const cssContent = readFile('style.css');

// 生成动态CSS
const dynamicCSS = `
  ${cssContent}
  
  .sentra-snowflake {
    color: ${color} !important;
    opacity: ${opacity} !important;
    font-size: ${size}em !important;
    animation-duration: ${3 / speed}s !important;
  }
  
  @keyframes snowfall {
    0% {
      transform: translateY(-100vh) translateX(0px) rotate(0deg);
    }
    100% {
      transform: translateY(100vh) translateX(${wind * 50}px) rotate(360deg);
    }
  }
`;

// 注入样式
await injectCSS(dynamicCSS);

// 生成雪花脚本
const snowScript = `
(function() {
  // 防止重复执行
  if (window.sentraSnowfall) {
    window.sentraSnowfall.stop();
  }

  // 雪花管理器
  window.sentraSnowfall = {
    snowflakes: [],
    isRunning: false,
    intervalId: null,
    
    // 启动雪花效果
    start: function() {
      if (this.isRunning) return;
      
      this.isRunning = true;
      console.log('雪花特效启动');
      
      // 创建雪花容器
      if (!document.getElementById('sentra-snow-container')) {
        const container = document.createElement('div');
        container.id = 'sentra-snow-container';
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
      
      // 定期创建雪花
      this.intervalId = setInterval(() => {
        if (this.isRunning) {
          this.createSnowflake();
        }
      }, ${Math.max(50, 1000 / intensity)});
    },
    
    // 停止雪花效果
    stop: function() {
      if (!this.isRunning) return;
      
      this.isRunning = false;
      console.log('雪花特效停止');
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      // 清理现有雪花
      this.snowflakes.forEach(flake => {
        if (flake.element && flake.element.parentNode) {
          flake.element.parentNode.removeChild(flake.element);
        }
      });
      this.snowflakes = [];
      
      // 移除容器
      const container = document.getElementById('sentra-snow-container');
      if (container) {
        container.remove();
      }
    },
    
    // 创建单个雪花
    createSnowflake: function() {
      const container = document.getElementById('sentra-snow-container');
      if (!container) return;
      
      const snowflake = document.createElement('div');
      snowflake.className = 'sentra-snowflake';
      snowflake.innerHTML = this.getRandomSnowflakeChar();
      
      // 随机位置和属性
      const startX = Math.random() * window.innerWidth;
      const animationDuration = (3 + Math.random() * 3) / ${speed};
      const windOffset = ${wind} * 50;
      
      snowflake.style.cssText = \`
        position: absolute;
        left: \${startX}px;
        top: -50px;
        color: ${color};
        opacity: ${opacity};
        font-size: \${${size} * (0.8 + Math.random() * 0.4)}em;
        animation: snowfall \${animationDuration}s linear forwards;
        pointer-events: none;
        user-select: none;
        z-index: 999999;
      \`;
      
      container.appendChild(snowflake);
      
      // 记录雪花信息
      const flakeData = {
        element: snowflake,
        startTime: Date.now()
      };
      this.snowflakes.push(flakeData);
      
      // 动画结束后移除雪花
      setTimeout(() => {
        if (snowflake.parentNode) {
          snowflake.parentNode.removeChild(snowflake);
        }
        const index = this.snowflakes.indexOf(flakeData);
        if (index > -1) {
          this.snowflakes.splice(index, 1);
        }
      }, animationDuration * 1000);
    },
    
    // 获取随机雪花字符
    getRandomSnowflakeChar: function() {
      const chars = ['❄', '❅', '❆', '✻', '✼', '❋', '✿', '❀', '⁂', '✱'];
      return chars[Math.floor(Math.random() * chars.length)];
    }
  };
  
  // 启动雪花效果
  window.sentraSnowfall.start();
  
  // 如果设置了持续时间，自动停止
  ${duration > 0 ? `
  setTimeout(() => {
    window.sentraSnowfall.stop();
  }, ${duration * 1000});
  ` : ''}
})();
`;

// 注入脚本
await injectJS(snowScript);

console.log('雪花特效已成功启动');

// 返回执行结果
return {
  success: true,
  message: `雪花特效已启动 - 密度: ${intensity}, 速度: ${speed}, 持续时间: ${duration > 0 ? duration + '秒' : '永久'}`,
  data: {
    intensity,
    speed,
    size,
    color,
    opacity,
    wind,
    duration
  }
};
