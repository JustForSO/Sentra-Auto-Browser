// 鼠标轨迹特效插件执行脚本

// 获取参数
const trailType = parameters.trailType || 'particles';
const particleCount = parameters.particleCount || 20;
const trailLength = parameters.trailLength || 1000;
const colorScheme = parameters.colorScheme || 'rainbow';

console.log(`开始鼠标轨迹特效，类型=${trailType}, 粒子数=${particleCount}, 轨迹长度=${trailLength}ms, 配色=${colorScheme}`);

// 配色方案定义
const colorSchemes = {
  rainbow: ['#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff', '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080'],
  blue: ['#0066cc', '#0080ff', '#3399ff', '#66b3ff', '#99ccff'],
  red: ['#cc0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc'],
  green: ['#00cc00', '#33ff33', '#66ff66', '#99ff99', '#ccffcc'],
  purple: ['#6600cc', '#8033ff', '#9966ff', '#b399ff', '#ccccff'],
  gold: ['#ffcc00', '#ffdd33', '#ffee66', '#ffff99', '#ffffcc']
};

const colors = colorSchemes[colorScheme] || colorSchemes.rainbow;

// 鼠标轨迹特效CSS
const mouseTrailCSS = `
/* Sentra 鼠标轨迹特效样式 */
.sentra-mouse-trail-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 999999;
  overflow: hidden;
}

.sentra-trail-particle {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  animation: sentra-trail-fade-out linear forwards;
}

.sentra-trail-star {
  position: absolute;
  pointer-events: none;
  width: 0;
  height: 0;
  animation: sentra-trail-star-fade linear forwards;
}

.sentra-trail-bubble {
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  border: 2px solid;
  animation: sentra-trail-bubble-float linear forwards;
}

@keyframes sentra-trail-fade-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.2);
  }
}

@keyframes sentra-trail-star-fade {
  0% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: scale(0.3) rotate(180deg);
  }
}

@keyframes sentra-trail-bubble-float {
  0% {
    opacity: 1;
    transform: scale(0.5) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(1.5) translateY(-50px);
  }
}

/* 彩虹轨迹特殊样式 */
.sentra-rainbow-trail {
  background: linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080);
  background-size: 400% 400%;
  animation: sentra-rainbow-move 2s ease infinite, sentra-trail-fade-out linear forwards;
}

@keyframes sentra-rainbow-move {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 火焰轨迹样式 */
.sentra-fire-trail {
  background: radial-gradient(circle, #ff4500, #ff6500, #ff8500, transparent);
  animation: sentra-fire-flicker 0.1s ease infinite, sentra-trail-fade-out linear forwards;
}

@keyframes sentra-fire-flicker {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(1deg); }
  50% { transform: scale(0.9) rotate(-1deg); }
  75% { transform: scale(1.05) rotate(0.5deg); }
}
`;

// 注入CSS
await injectCSS(mouseTrailCSS);

// 鼠标轨迹特效脚本
const mouseTrailScript = `
(function() {
  // 防止重复执行
  if (window.sentraMouseTrail) {
    window.sentraMouseTrail.cleanup();
  }

  window.sentraMouseTrail = {
    trailType: '${trailType}',
    particleCount: ${particleCount},
    trailLength: ${trailLength},
    colors: ${JSON.stringify(colors)},
    container: null,
    particles: [],
    isActive: false,
    
    // 初始化
    init: function() {
      this.createContainer();
      this.bindEvents();
      this.isActive = true;
      console.log('鼠标轨迹特效已激活');
    },
    
    // 创建容器
    createContainer: function() {
      this.container = document.createElement('div');
      this.container.className = 'sentra-mouse-trail-container';
      this.container.id = 'sentra-mouse-trail-container';
      document.body.appendChild(this.container);
    },
    
    // 绑定事件
    bindEvents: function() {
      this.mouseMoveHandler = this.onMouseMove.bind(this);
      document.addEventListener('mousemove', this.mouseMoveHandler);
    },
    
    // 鼠标移动处理
    onMouseMove: function(e) {
      if (!this.isActive || !this.container) return;
      
      const x = e.clientX;
      const y = e.clientY;
      
      this.createTrailEffect(x, y);
    },
    
    // 创建轨迹效果
    createTrailEffect: function(x, y) {
      const count = Math.min(this.particleCount, 50); // 限制最大数量
      
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          this.createParticle(x, y, i);
        }, i * 20); // 延迟创建，形成轨迹
      }
    },
    
    // 创建粒子
    createParticle: function(x, y, index) {
      if (!this.container) return;
      
      const particle = document.createElement('div');
      const color = this.colors[index % this.colors.length];
      
      // 添加随机偏移
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      
      switch (this.trailType) {
        case 'particles':
          this.createParticleEffect(particle, x + offsetX, y + offsetY, color);
          break;
        case 'rainbow':
          this.createRainbowEffect(particle, x + offsetX, y + offsetY);
          break;
        case 'stars':
          this.createStarEffect(particle, x + offsetX, y + offsetY, color);
          break;
        case 'fire':
          this.createFireEffect(particle, x + offsetX, y + offsetY);
          break;
        case 'bubbles':
          this.createBubbleEffect(particle, x + offsetX, y + offsetY, color);
          break;
      }
      
      this.container.appendChild(particle);
      this.particles.push(particle);
      
      // 自动清理
      setTimeout(() => {
        if (particle && particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
        const particleIndex = this.particles.indexOf(particle);
        if (particleIndex > -1) {
          this.particles.splice(particleIndex, 1);
        }
      }, this.trailLength);
    },
    
    // 粒子效果
    createParticleEffect: function(particle, x, y, color) {
      particle.className = 'sentra-trail-particle';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.width = (Math.random() * 8 + 4) + 'px';
      particle.style.height = particle.style.width;
      particle.style.backgroundColor = color;
      particle.style.animationDuration = this.trailLength + 'ms';
    },
    
    // 彩虹效果
    createRainbowEffect: function(particle, x, y) {
      particle.className = 'sentra-trail-particle sentra-rainbow-trail';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.width = (Math.random() * 12 + 6) + 'px';
      particle.style.height = particle.style.width;
      particle.style.animationDuration = this.trailLength + 'ms';
    },
    
    // 星星效果
    createStarEffect: function(particle, x, y, color) {
      particle.className = 'sentra-trail-star';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      
      // 创建星星形状
      const size = Math.random() * 10 + 5;
      particle.style.borderLeft = size + 'px solid transparent';
      particle.style.borderRight = size + 'px solid transparent';
      particle.style.borderBottom = (size * 0.7) + 'px solid ' + color;
      particle.style.transform = 'rotate(35deg)';
      particle.style.animationDuration = this.trailLength + 'ms';
      
      // 添加第二个三角形形成星星
      const star2 = document.createElement('div');
      star2.style.position = 'absolute';
      star2.style.left = (-size) + 'px';
      star2.style.top = (size * 0.3) + 'px';
      star2.style.width = '0';
      star2.style.height = '0';
      star2.style.borderLeft = size + 'px solid transparent';
      star2.style.borderRight = size + 'px solid transparent';
      star2.style.borderBottom = (size * 0.7) + 'px solid ' + color;
      star2.style.transform = 'rotate(-70deg)';
      particle.appendChild(star2);
    },
    
    // 火焰效果
    createFireEffect: function(particle, x, y) {
      particle.className = 'sentra-trail-particle sentra-fire-trail';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.width = (Math.random() * 15 + 8) + 'px';
      particle.style.height = particle.style.width;
      particle.style.animationDuration = this.trailLength + 'ms';
    },
    
    // 气泡效果
    createBubbleEffect: function(particle, x, y, color) {
      particle.className = 'sentra-trail-bubble';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.width = (Math.random() * 20 + 10) + 'px';
      particle.style.height = particle.style.width;
      particle.style.borderColor = color;
      particle.style.animationDuration = this.trailLength + 'ms';
    },
    
    // 清理
    cleanup: function() {
      this.isActive = false;
      
      if (this.mouseMoveHandler) {
        document.removeEventListener('mousemove', this.mouseMoveHandler);
      }
      
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      
      this.particles = [];
      console.log('鼠标轨迹特效已清理');
    }
  };
  
  // 初始化鼠标轨迹特效
  window.sentraMouseTrail.init();
  
  // 添加快捷键支持 (Ctrl+Shift+M 切换)
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      if (window.sentraMouseTrail.isActive) {
        window.sentraMouseTrail.cleanup();
      } else {
        window.sentraMouseTrail.init();
      }
    }
  });
  
  console.log('鼠标轨迹特效已激活，快捷键: Ctrl+Shift+M 切换');
})();
`;

// 注入脚本
await injectJS(mouseTrailScript);

console.log('鼠标轨迹特效已成功应用');

// 返回执行结果
return {
  success: true,
  message: `鼠标轨迹特效已应用 - 类型: ${trailType}, 粒子数: ${particleCount}, 配色: ${colorScheme}`,
  data: {
    trailType,
    particleCount,
    trailLength,
    colorScheme,
    shortcut: 'Ctrl+Shift+M 切换特效'
  }
};
