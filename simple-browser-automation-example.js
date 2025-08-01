const { chromium } = require('playwright');
const fs = require('fs');
const readline = require('readline');

/**
 * 元素类型定义和标记系统
 */
const ElementTypes = {
    BUTTON: {
        name: 'button',
        priority: 100,
        color: '#ff4444',
        bgColor: 'rgba(255, 68, 68, 0.15)',
        selector: 'button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"], .btn, .button',
        description: '按钮元素',
        interactionType: 'clickable'
    },
    INPUT: {
        name: 'input',
        priority: 95,
        color: '#ff8800',
        bgColor: 'rgba(255, 136, 0, 0.15)',
        selector: 'input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, [contenteditable="true"], [role="textbox"]',
        description: '输入框元素',
        interactionType: 'editable'
    },
    LINK: {
        name: 'link',
        priority: 85,
        color: '#00cc44',
        bgColor: 'rgba(0, 204, 68, 0.15)',
        selector: 'a[href], [role="link"]',
        description: '链接元素',
        interactionType: 'navigable'
    },
    SELECT: {
        name: 'select',
        priority: 90,
        color: '#0088ff',
        bgColor: 'rgba(0, 136, 255, 0.15)',
        selector: 'select, input[type="checkbox"], input[type="radio"], [role="checkbox"], [role="radio"], [role="combobox"]',
        description: '选择控件',
        interactionType: 'selectable'
    },
    INTERACTIVE: {
        name: 'interactive',
        priority: 70,
        color: '#8844ff',
        bgColor: 'rgba(136, 68, 255, 0.15)',
        selector: '[onclick], [onchange], [data-click], .clickable, [tabindex]:not([tabindex="-1"])',
        description: '交互元素',
        interactionType: 'clickable'
    },
    CUSTOM: {
        name: 'custom',
        priority: 60,
        color: '#ffcc00',
        bgColor: 'rgba(255, 204, 0, 0.15)',
        selector: '[role="tab"], [role="menuitem"], [role="treeitem"], [role="gridcell"]',
        description: '自定义交互元素',
        interactionType: 'clickable'
    }
};

class PageStateMonitor {
    constructor(page) {
        this.page = page;
        this.currentState = {
            url: '',
            title: '',
            domHash: '',
            timestamp: 0,
            isLoading: false,
            hasNewContent: false
        };
        this.stateHistory = [];
        this.changeListeners = [];
        this.monitoringActive = false;
        this.lastDOMSnapshot = null;
    }

    /**
     * 启动页面状态监控
     */
    async startMonitoring() {
        if (this.monitoringActive) return;
        
        console.log('🔄 启动页面状态监控器...');
        
        // 监听页面导航事件
        this.page.on('domcontentloaded', () => this.handlePageChange('domcontentloaded'));
        this.page.on('load', () => this.handlePageChange('load'));
        this.page.on('framenavigated', () => this.handlePageChange('framenavigated'));
        
        // 定期检查DOM变化
        this.domCheckInterval = setInterval(() => {
            this.checkDOMChanges().catch(console.error);
        }, 2000);
        
        this.monitoringActive = true;
        
        // 获取初始状态
        await this.updateCurrentState();
        
        console.log('✅ 页面状态监控器已启动');
    }

    /**
     * 处理页面变化事件
     */
    async handlePageChange(eventType) {
        console.log(`🔄 检测到页面事件: ${eventType}`);
        
        // 等待页面稳定
        await this.waitForPageStability();
        
        // 更新状态
        const oldState = { ...this.currentState };
        await this.updateCurrentState();
        
        // 通知监听器
        await this.notifyStateChange(oldState, this.currentState, eventType);
    }

    /**
     * 等待页面稳定
     */
    async waitForPageStability(timeout = 10000) {
        try {
            console.log('⏳ 等待页面稳定...');
            
            // 等待DOM加载完成
            await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
            
            // 等待网络空闲
            await this.page.waitForLoadState('networkidle', { timeout: 5000 });
            
            // 额外等待确保动态内容加载
            await this.sleep(1500);
            
            console.log('✅ 页面已稳定');
        } catch (error) {
            console.warn('⚠️ 等待页面稳定超时:', error.message);
        }
    }

    /**
     * 更新当前页面状态
     */
    async updateCurrentState() {
        try {
            const pageInfo = await this.page.evaluate(() => {
                // 计算DOM结构哈希
                const getDOMHash = () => {
                    const elements = document.querySelectorAll('*');
                    let hash = 0;
                    for (let i = 0; i < Math.min(elements.length, 100); i++) {
                        const el = elements[i];
                        const str = el.tagName + (el.id || '') + (el.className || '');
                        for (let j = 0; j < str.length; j++) {
                            const char = str.charCodeAt(j);
                            hash = ((hash << 5) - hash) + char;
                            hash = hash & hash; // 转换为32位整数
                        }
                    }
                    return hash.toString();
                };

                return {
                    url: window.location.href,
                    title: document.title,
                    domHash: getDOMHash(),
                    timestamp: Date.now(),
                    isLoading: document.readyState !== 'complete',
                    elementCount: document.querySelectorAll('*').length,
                    interactiveElementCount: document.querySelectorAll(
                        'button, input, a, select, textarea, [onclick], [role="button"], [role="link"], [tabindex]'
                    ).length
                };
            });

            // 检测变化
            const hasChanged = this.hasSignificantChange(pageInfo);
            
            if (hasChanged) {
                this.stateHistory.push({ ...this.currentState });
                if (this.stateHistory.length > 10) {
                    this.stateHistory = this.stateHistory.slice(-10);
                }
                
                console.log(`🔄 页面状态更新: ${pageInfo.url}`);
                console.log(`📊 元素数量: ${pageInfo.elementCount} (交互元素: ${pageInfo.interactiveElementCount})`);
            }

            this.currentState = {
                ...pageInfo,
                hasNewContent: hasChanged
            };

            return hasChanged;

        } catch (error) {
            console.error('❌ 更新页面状态失败:', error.message);
            return false;
        }
    }

    /**
     * 检测重大变化
     */
    hasSignificantChange(newState) {
        const current = this.currentState;
        
        // URL变化
        if (current.url !== newState.url) {
            console.log(`🌐 URL变化: ${current.url} → ${newState.url}`);
            return true;
        }
        
        // 标题变化
        if (current.title !== newState.title) {
            console.log(`📄 标题变化: "${current.title}" → "${newState.title}"`);
            return true;
        }
        
        // DOM结构变化
        if (current.domHash !== newState.domHash) {
            console.log(`🔄 DOM结构变化检测`);
            return true;
        }
        
        // 元素数量重大变化
        const elementChange = Math.abs(newState.elementCount - current.elementCount);
        if (elementChange > 50) {
            console.log(`📊 元素数量重大变化: ${current.elementCount} → ${newState.elementCount}`);
            return true;
        }
        
        return false;
    }

    /**
     * 检查DOM内容变化
     */
    async checkDOMChanges() {
        try {
            const snapshot = await this.page.evaluate(() => {
                const getVisibleText = () => {
                    const walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_TEXT,
                        {
                            acceptNode: (node) => {
                                const parent = node.parentElement;
                                if (!parent) return NodeFilter.FILTER_REJECT;
                                
                                const style = window.getComputedStyle(parent);
                                if (style.display === 'none' || style.visibility === 'hidden') {
                                    return NodeFilter.FILTER_REJECT;
                                }
                                
                                return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                            }
                        }
                    );
                    
                    let text = '';
                    let node;
                    while (node = walker.nextNode()) {
                        text += node.textContent.trim() + ' ';
                    }
                    return text.substring(0, 5000); // 限制长度
                };

                return {
                    visibleText: getVisibleText(),
                    interactiveCount: document.querySelectorAll(
                        'button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), [onclick], [role="button"]'
                    ).length,
                    timestamp: Date.now()
                };
            });

            if (this.lastDOMSnapshot) {
                const textDiff = snapshot.visibleText !== this.lastDOMSnapshot.visibleText;
                const countDiff = Math.abs(snapshot.interactiveCount - this.lastDOMSnapshot.interactiveCount) > 2;
                
                if (textDiff || countDiff) {
                    console.log('🔄 检测到DOM内容变化');
                    await this.updateCurrentState();
                }
            }

            this.lastDOMSnapshot = snapshot;

        } catch (error) {
            console.warn('⚠️ DOM变化检查失败:', error.message);
        }
    }

    /**
     * 添加状态变化监听器
     */
    addChangeListener(listener) {
        this.changeListeners.push(listener);
    }

    /**
     * 通知状态变化
     */
    async notifyStateChange(oldState, newState, eventType) {
        for (const listener of this.changeListeners) {
            try {
                await listener(oldState, newState, eventType);
            } catch (error) {
                console.error('❌ 状态变化监听器错误:', error.message);
            }
        }
    }

    /**
     * 获取当前状态
     */
    getCurrentState() {
        return { ...this.currentState };
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.domCheckInterval) {
            clearInterval(this.domCheckInterval);
        }
        this.monitoringActive = false;
        console.log('🛑 页面状态监控器已停止');
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 🗂️ 智能标签页管理器 - 全面重构版
 */
class SmartTabManager {
    constructor(browser, context) {
        this.browser = browser;
        this.context = context;
        this.tabs = new Map();
        this.activeTab = null;
        this.lastUpdateTime = 0;
        this.updateInterval = null;
    }

    /**
     * 启动标签页监控
     */
    async startMonitoring() {
        console.log('🗂️ 启动智能标签页管理器...');
        
        // 监听新页面创建
        this.context.on('page', (page) => {
            console.log('📄 检测到新页面创建');
            this.handleNewPage(page);
        });

        // 定期更新标签页信息
        this.updateInterval = setInterval(() => {
            this.updateAllTabs().catch(console.error);
        }, 3000);

        // 初始扫描
        await this.updateAllTabs();
        
        console.log('✅ 智能标签页管理器已启动');
    }

    /**
     * 处理新页面
     */
    async handleNewPage(page) {
        try {
            // 等待页面基本加载
            await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
            
            const tabInfo = await this.createTabInfo(page);
            this.tabs.set(page, tabInfo);
            
            console.log(`📄 新标签页已注册: ${tabInfo.title}`);
            
            // 智能切换逻辑
            await this.smartSwitchTab();
            
        } catch (error) {
            console.warn('⚠️ 处理新页面失败:', error.message);
        }
    }

    /**
     * 更新所有标签页信息
     */
    async updateAllTabs() {
        try {
            const currentPages = this.context.pages();
            
            // 清理已关闭的页面
            for (const [page] of this.tabs) {
                if (!currentPages.includes(page)) {
                    console.log('🗑️ 清理已关闭的标签页');
                    this.tabs.delete(page);
                }
            }

            // 更新现有页面信息
            for (const page of currentPages) {
                try {
                    const tabInfo = await this.createTabInfo(page);
                    this.tabs.set(page, tabInfo);
                } catch (error) {
                    console.warn('⚠️ 更新标签页信息失败:', error.message);
                }
            }

            // 智能选择活动标签页
            await this.smartSwitchTab();
            
            this.lastUpdateTime = Date.now();

        } catch (error) {
            console.error('❌ 更新标签页失败:', error.message);
        }
    }

    /**
     * 创建标签页信息
     */
    async createTabInfo(page) {
        try {
            const url = await page.url();
            const title = await page.title();
            
            const pageInfo = await page.evaluate(() => {
                return {
                    readyState: document.readyState,
                    elementCount: document.querySelectorAll('*').length,
                    interactiveCount: document.querySelectorAll(
                        'button, input, a, select, textarea, [onclick], [role="button"]'
                    ).length,
                    hasContent: document.body ? document.body.innerText.trim().length > 100 : false,
                    timestamp: Date.now()
                };
            }).catch(() => ({
                readyState: 'loading',
                elementCount: 0,
                interactiveCount: 0,
                hasContent: false,
                timestamp: Date.now()
            }));

            return {
                page: page,
                url: url,
                title: title,
                ...pageInfo,
                lastUpdate: Date.now(),
                score: this.calculateTabScore(url, title, pageInfo)
            };

        } catch (error) {
            console.warn('⚠️ 创建标签页信息失败:', error.message);
            return {
                page: page,
                url: 'unknown',
                title: 'Unknown',
                readyState: 'loading',
                elementCount: 0,
                interactiveCount: 0,
                hasContent: false,
                lastUpdate: Date.now(),
                score: 0
            };
        }
    }

    /**
     * 计算标签页评分
     */
    calculateTabScore(url, title, pageInfo) {
        let score = 0;
        
        // 页面加载状态得分
        if (pageInfo.readyState === 'complete') score += 30;
        else if (pageInfo.readyState === 'interactive') score += 15;
        
        // 内容丰富度得分
        if (pageInfo.hasContent) score += 20;
        score += Math.min(pageInfo.interactiveCount * 2, 30);
        score += Math.min(pageInfo.elementCount / 50, 20);
        
        // URL优先级得分（电商、搜索结果等）
        const priorityDomains = [
            'taobao.com', 'tmall.com', 'jd.com', 'amazon',
            'search', 'results', 'item', 'product', 'detail'
        ];
        
        for (const domain of priorityDomains) {
            if (url.toLowerCase().includes(domain)) {
                score += 25;
                break;
            }
        }

        // 最近更新得分
        const timeSinceUpdate = Date.now() - pageInfo.timestamp;
        score += Math.max(0, 20 - (timeSinceUpdate / 1000));

        return Math.round(score);
    }

    /**
     * 智能切换标签页
     */
    async smartSwitchTab() {
        try {
            if (this.tabs.size === 0) return null;

            let bestTab = null;
            let bestScore = -1;

            for (const tabInfo of this.tabs.values()) {
                if (tabInfo.score > bestScore) {
                    bestScore = tabInfo.score;
                    bestTab = tabInfo;
                }
            }

            if (bestTab && bestTab.page !== this.activeTab) {
                console.log(`🔄 智能切换到最佳标签页: ${bestTab.title} (评分: ${bestScore})`);
                
                this.activeTab = bestTab.page;
                
                // 确保页面可见
                await this.activeTab.bringToFront();
                await this.sleep(500);
                
                return this.activeTab;
            }

            return this.activeTab;

        } catch (error) {
            console.error('❌ 智能切换标签页失败:', error.message);
            return this.activeTab;
        }
    }

    /**
     * 获取活动标签页
     */
    getActiveTab() {
        return this.activeTab;
    }

    /**
     * 获取所有标签页信息
     */
    getAllTabsInfo() {
        return Array.from(this.tabs.values());
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        console.log('🛑 标签页管理器已停止');
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * DOM元素检测器
 */
class AdvancedDOMDetector {
    constructor(page, pageStateMonitor) {
        this.page = page;
        this.pageStateMonitor = pageStateMonitor;
        this.lastDetection = null;
        this.detectionCache = new Map();
        this.markersActive = false;
        this.detectionId = 0;
    }

    /**
     * 智能检测页面元素 - 核心方法
     */
    async detectElements(forceRefresh = false) {
        try {
            const detectionStartTime = Date.now();
            const currentState = this.pageStateMonitor.getCurrentState();
            
            console.log('🔍 启动高级DOM元素检测...');
            
            // 智能缓存检查
            if (!forceRefresh && this.shouldUseCache(currentState)) {
                console.log('📋 使用缓存的检测结果');
                return this.lastDetection;
            }

            console.log('🔄 执行新的元素检测...');
            
            // 等待页面稳定
            await this.waitForStable();
            
            // 清除旧标记
            await this.clearMarkers();
            
            // 执行检测
            const elements = await this.performDetection();
            
            // 创建检测结果
            const detection = {
                id: ++this.detectionId,
                timestamp: Date.now(),
                pageState: { ...currentState },
                elements: elements,
                totalElements: elements.length,
                detectionTime: Date.now() - detectionStartTime,
                hasMarkers: this.markersActive
            };

            // 更新缓存
            this.lastDetection = detection;
            this.updateCache(currentState, detection);
            
            console.log(`✅ DOM检测完成: ${elements.length}个元素 (耗时: ${detection.detectionTime}ms)`);
            
            return detection;

        } catch (error) {
            console.error('❌ DOM元素检测失败:', error.message);
            return {
                id: ++this.detectionId,
                timestamp: Date.now(),
                elements: [],
                totalElements: 0,
                error: error.message,
                hasMarkers: false
            };
        }
    }

    /**
     * 检查是否应该使用缓存
     */
    shouldUseCache(currentState) {
        if (!this.lastDetection) return false;
        
        const timeDiff = Date.now() - this.lastDetection.timestamp;
        if (timeDiff > 10000) return false; // 10秒后强制刷新
        
        const lastState = this.lastDetection.pageState;
        
        // 检查关键状态变化
        return (
            currentState.url === lastState.url &&
            currentState.domHash === lastState.domHash &&
            !currentState.hasNewContent
        );
    }

    /**
     * 等待页面稳定
     */
    async waitForStable() {
        try {
            console.log('⏳ 等待页面稳定用于检测...');
            
            // 等待基本加载
            await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 });
            
            // 检查动态内容稳定性
            let stableCount = 0;
            const maxChecks = 5;
            
            for (let i = 0; i < maxChecks; i++) {
                const elementCount = await this.page.evaluate(() => 
                    document.querySelectorAll('*').length
                );
                
                await this.sleep(500);
                
                const newElementCount = await this.page.evaluate(() => 
                    document.querySelectorAll('*').length
                );
                
                if (Math.abs(newElementCount - elementCount) < 5) {
                    stableCount++;
                    if (stableCount >= 2) {
                        console.log('✅ 页面DOM结构已稳定');
                        break;
                    }
                } else {
                    stableCount = 0;
                }
            }
            
        } catch (error) {
            console.warn('⚠️ 等待页面稳定超时:', error.message);
        }
    }

    /**
     * 执行元素检测 - 核心算法
     */
    async performDetection() {
        console.log('🎯 注入元素检测脚本...');
        
        const elements = await this.page.evaluate((ElementTypes) => {
            // 清除之前的标记
            document.querySelectorAll('.ai-element-marker').forEach(el => el.remove());
            
            const results = [];
            let elementCounter = 0;
            
            // 创建元素检测器
            class ElementDetector {
                constructor() {
                    this.viewport = {
                        width: window.innerWidth,
                        height: window.innerHeight,
                        scrollX: window.scrollX,
                        scrollY: window.scrollY
                    };
                }

                // 检查元素是否可交互
                isInteractive(element) {
                    // 基本交互性检查
                    if (element.disabled || element.hidden) return false;
                    
                    // 样式检查
                    const style = window.getComputedStyle(element);
                    if (style.display === 'none' || style.visibility === 'hidden') return false;
                    if (style.pointerEvents === 'none') return false;
                    if (parseFloat(style.opacity) < 0.1) return false;
                    
                    // 尺寸检查
                    const rect = element.getBoundingClientRect();
                    if (rect.width < 3 || rect.height < 3) return false;
                    
                    return true;
                }

                // 检查元素是否可见
                isVisible(element) {
                    const rect = element.getBoundingClientRect();
                    const viewport = this.viewport;
                    
                    // 扩展视口检查（包含滚动区域）
                    return (
                        rect.top < viewport.height + 1000 &&
                        rect.bottom > -1000 &&
                        rect.left < viewport.width + 500 &&
                        rect.right > -500
                    );
                }

                // 分类元素类型
                classifyElement(element) {
                    for (const [typeName, typeConfig] of Object.entries(ElementTypes)) {
                        if (element.matches(typeConfig.selector)) {
                            return typeConfig;
                        }
                    }
                    return ElementTypes.INTERACTIVE;
                }

                // 获取元素文本内容
                getElementText(element) {
                    const textSources = [
                        () => element.value && element.value.trim(),
                        () => element.textContent && element.textContent.trim(),
                        () => element.innerText && element.innerText.trim(),
                        () => element.alt && element.alt.trim(),
                        () => element.title && element.title.trim(),
                        () => element.placeholder && element.placeholder.trim(),
                        () => element.getAttribute('aria-label') && element.getAttribute('aria-label').trim(),
                        () => element.name && element.name.trim(),
                        () => element.id && element.id.trim()
                    ];
                    
                    for (const getTextFn of textSources) {
                        const text = getTextFn();
                        if (text) {
                            return text.replace(/\s+/g, ' ').substring(0, 200);
                        }
                    }
                    
                    return '';
                }

                // 创建视觉标记
                createMarker(element, number, elementType) {
                    try {
                        const rect = element.getBoundingClientRect();
                        if (rect.width < 3 || rect.height < 3) return null;
                        
                        const marker = document.createElement('div');
                        marker.className = 'ai-element-marker';
                        marker.style.cssText = `
                            position: fixed;
                            top: ${rect.top}px;
                            left: ${rect.left}px;
                            width: ${rect.width}px;
                            height: ${rect.height}px;
                            pointer-events: none;
                            z-index: 999999;
                            border: 3px solid ${elementType.color};
                            border-radius: 4px;
                            background: ${elementType.bgColor};
                            box-shadow: 0 0 10px ${elementType.color}40;
                            transition: all 0.2s ease;
                        `;
                        
                        // 创建数字标签
                        const label = document.createElement('div');
                        label.style.cssText = `
                            position: absolute;
                            top: -18px;
                            left: -3px;
                            background: ${elementType.color};
                            color: white;
                            font-size: 12px;
                            font-weight: bold;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-family: monospace;
                            line-height: 1;
                            min-width: 20px;
                            text-align: center;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                            border: 2px solid white;
                        `;
                        label.textContent = number.toString();
                        
                        marker.appendChild(label);
                        document.body.appendChild(marker);
                        
                        return marker;
                    } catch (error) {
                        console.warn('创建标记失败:', error);
                        return null;
                    }
                }

                // 计算元素置信度
                calculateConfidence(element, isVisible, text, elementType) {
                    let confidence = 50;
                    
                    // 可见性加分
                    if (isVisible) confidence += 25;
                    
                    // 文本内容加分
                    if (text && text.length > 0) confidence += 15;
                    if (text && text.length > 10) confidence += 10;
                    
                    // 元素类型加分
                    confidence += elementType.priority / 10;
                    
                    // 属性完整性加分
                    if (element.id) confidence += 10;
                    if (element.name) confidence += 8;
                    if (element.className) confidence += 5;
                    
                    // 可用性加分
                    if (!element.disabled) confidence += 10;
                    
                    // 交互性加分
                    if (element.onclick || element.addEventListener) confidence += 15;
                    
                    return Math.min(confidence, 100);
                }

                // 检测所有交互元素
                detectAll() {
                    console.log('🔍 开始检测交互元素...');
                    
                    // 获取所有潜在交互元素
                    const allSelectors = Object.values(ElementTypes)
                        .map(type => type.selector)
                        .join(', ');
                    
                    const candidates = document.querySelectorAll(allSelectors);
                    console.log(`📊 找到 ${candidates.length} 个候选元素`);
                    
                    const validElements = [];
                    
                    candidates.forEach(element => {
                        try {
                            // 基本检查
                            if (!this.isInteractive(element)) return;
                            
                            const elementType = this.classifyElement(element);
                            const isVisible = this.isVisible(element);
                            const text = this.getElementText(element);
                            
                            // 只处理可见或接近可见的元素
                            if (!isVisible && !this.isNearVisible(element)) return;
                            
                            const elementNumber = ++elementCounter;
                            const rect = element.getBoundingClientRect();
                            
                            // 创建标记（仅为可见元素）
                            let marker = null;
                            if (isVisible && rect.width > 5 && rect.height > 5) {
                                marker = this.createMarker(element, elementNumber, elementType);
                            }
                            
                            // 为元素添加标识
                            element.setAttribute('data-ai-element-id', elementNumber);
                            element.setAttribute('data-ai-element-type', elementType.name);
                            
                            const confidence = this.calculateConfidence(element, isVisible, text, elementType);
                            
                            const elementInfo = {
                                number: elementNumber,
                                tagName: element.tagName.toLowerCase(),
                                type: element.type || '',
                                text: text,
                                description: this.createDescription(element, elementType, text),
                                elementType: elementType.name,
                                elementTypeConfig: elementType,
                                
                                attributes: {
                                    id: element.id || '',
                                    className: element.className || '',
                                    name: element.name || '',
                                    placeholder: element.placeholder || '',
                                    value: element.value || '',
                                    href: element.href || '',
                                    role: element.getAttribute('role') || '',
                                    'aria-label': element.getAttribute('aria-label') || ''
                                },
                                
                                position: {
                                    x: Math.round(rect.left + this.viewport.scrollX),
                                    y: Math.round(rect.top + this.viewport.scrollY),
                                    width: Math.round(rect.width),
                                    height: Math.round(rect.height),
                                    centerX: Math.round(rect.left + rect.width / 2 + this.viewport.scrollX),
                                    centerY: Math.round(rect.top + rect.height / 2 + this.viewport.scrollY),
                                    viewportX: Math.round(rect.left),
                                    viewportY: Math.round(rect.top)
                                },
                                
                                state: {
                                    isVisible: isVisible,
                                    isClickable: isVisible && !element.disabled,
                                    isEditable: this.isEditable(element),
                                    isEnabled: !element.disabled,
                                    isFocusable: this.isFocusable(element),
                                    hasMarker: marker !== null
                                },
                                
                                confidence: confidence,
                                interactionType: elementType.interactionType,
                                timestamp: Date.now()
                            };
                            
                            validElements.push(elementInfo);
                            
                        } catch (error) {
                            console.warn('元素分析失败:', error);
                        }
                    });
                    
                    // 按优先级和置信度排序
                    validElements.sort((a, b) => {
                        // 首先按元素类型优先级
                        const priorityDiff = b.elementTypeConfig.priority - a.elementTypeConfig.priority;
                        if (priorityDiff !== 0) return priorityDiff;
                        
                        // 然后按置信度
                        const confidenceDiff = b.confidence - a.confidence;
                        if (confidenceDiff !== 0) return confidenceDiff;
                        
                        // 最后按可见性
                        return b.state.isVisible - a.state.isVisible;
                    });
                    
                    console.log(`✅ 检测完成: ${validElements.length} 个有效交互元素`);
                    
                    return validElements;
                }

                // 检查是否接近可见
                isNearVisible(element) {
                    const rect = element.getBoundingClientRect();
                    const viewport = this.viewport;
                    
                    return (
                        rect.top < viewport.height + 500 &&
                        rect.bottom > -500 &&
                        rect.left < viewport.width + 300 &&
                        rect.right > -300
                    );
                }

                // 检查是否可编辑
                isEditable(element) {
                    const tagName = element.tagName.toLowerCase();
                    if (tagName === 'input' && !['button', 'submit', 'reset', 'checkbox', 'radio'].includes(element.type)) {
                        return !element.readOnly && !element.disabled;
                    }
                    if (tagName === 'textarea') {
                        return !element.readOnly && !element.disabled;
                    }
                    return element.contentEditable === 'true';
                }

                // 检查是否可聚焦
                isFocusable(element) {
                    if (element.tabIndex >= 0) return true;
                    const tagName = element.tagName.toLowerCase();
                    return ['input', 'textarea', 'select', 'button', 'a'].includes(tagName);
                }

                // 创建元素描述
                createDescription(element, elementType, text) {
                    let description = elementType.description;
                    
                    if (text) {
                        description += `: ${text}`;
                    } else if (element.placeholder) {
                        description += `: ${element.placeholder}`;
                    } else if (element.id) {
                        description += `: #${element.id}`;
                    } else if (element.className) {
                        const mainClass = element.className.split(' ')[0];
                        description += `: .${mainClass}`;
                    } else {
                        description += `: ${element.tagName.toLowerCase()}`;
                    }
                    
                    return description;
                }
            }
            
            // 执行检测
            const detector = new ElementDetector();
            return detector.detectAll();
            
        }, ElementTypes);

        this.markersActive = elements.length > 0;
        console.log(`🎨 已创建 ${elements.length} 个元素标记`);
        
        return elements;
    }

    /**
     * 清除视觉标记
     */
    async clearMarkers() {
        try {
            await this.page.evaluate(() => {
                document.querySelectorAll('.ai-element-marker').forEach(el => el.remove());
            });
            this.markersActive = false;
            console.log('🧹 已清除所有视觉标记');
        } catch (error) {
            console.warn('⚠️ 清除标记失败:', error.message);
        }
    }

    /**
     * 根据编号获取元素
     */
    getElementById(elementNumber) {
        if (!this.lastDetection) return null;
        return this.lastDetection.elements.find(el => el.number === elementNumber) || null;
    }

    /**
     * 获取元素列表供AI使用
     */
    getElementsForAI(maxElements = 20) {
        if (!this.lastDetection) return [];
        
        return this.lastDetection.elements
            .slice(0, maxElements)
            .map(element => ({
                number: element.number,
                elementType: element.elementType,
                description: element.description,
                text: element.text.substring(0, 100),
                interactionType: element.interactionType,
                confidence: element.confidence,
                position: `(${element.position.centerX}, ${element.position.centerY})`,
                state: element.state.isClickable ? 'clickable' : 
                       element.state.isEditable ? 'editable' : 'visible',
                isVisible: element.state.isVisible,
                isEnabled: element.state.isEnabled,
                hasMarker: element.state.hasMarker
            }));
    }

    /**
     * 更新缓存
     */
    updateCache(pageState, detection) {
        const cacheKey = `${pageState.url}_${pageState.domHash}`;
        this.detectionCache.set(cacheKey, {
            detection: detection,
            timestamp: Date.now()
        });
        
        // 清理过期缓存
        const expireTime = Date.now() - 30000; // 30秒过期
        for (const [key, value] of this.detectionCache.entries()) {
            if (value.timestamp < expireTime) {
                this.detectionCache.delete(key);
            }
        }
    }

    /**
     * 获取检测信息
     */
    getDetectionInfo() {
        return this.lastDetection ? {
            id: this.lastDetection.id,
            timestamp: this.lastDetection.timestamp,
            totalElements: this.lastDetection.totalElements,
            detectionTime: this.lastDetection.detectionTime,
            hasMarkers: this.lastDetection.hasMarkers
        } : null;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 🧠 增强AI决策引擎 - 基于多模态能力重构
 */
class EnhancedAIDecisionEngine {
    constructor(page, pageStateMonitor) {
        this.page = page;
        this.pageStateMonitor = pageStateMonitor;
        this.apiEndpoint = 'https://yuanplus.cloud/v1/chat/completions';
        this.apiKey = 'sk-t8zcWN8dFJxaD18REKRrdLzlngOJlmpkzvfomfyLwaYMNcO6';
        this.decisionTimeout = 60000;
        this.decisionHistory = [];
        this.maxHistorySize = 10;
    }

    /**
     * 做出智能决策
     */
    async makeDecision(task, elementList, pageState, stepCount, operationHistory = []) {
        const decisionStartTime = Date.now();
        
        try {
            console.log('🧠 启动增强AI决策分析...');
            
            // 捕获页面截图
            const screenshot = await this.captureScreenshot();
            
            // 构建决策上下文
            const messages = this.buildDecisionMessages(
                task, elementList, pageState, stepCount, 
                operationHistory, screenshot
            );
            
            // 调用AI API
            const decision = await this.callAI(messages);
            
            if (decision) {
                const decisionTime = Date.now() - decisionStartTime;
                console.log(`✅ AI决策成功 (耗时: ${decisionTime}ms)`);
                console.log(`🔧 选择工具: ${decision.tool}`);
                console.log(`💭 决策理由: ${decision.reasoning.substring(0, 100)}...`);
                
                // 记录决策历史
                this.recordDecision(decision, decisionTime);
                
                return decision;
            }
            
            console.error('❌ AI决策失败：无有效响应');
            return null;
            
        } catch (error) {
            console.error('❌ AI决策异常:', error.message);
            return null;
        }
    }

    /**
     * 捕获页面截图
     */
    async captureScreenshot() {
        try {
            const screenshot = await this.page.screenshot({
                type: 'jpeg',
                quality: 80,
                fullPage: false,
                animations: 'disabled',
                clip: {
                    x: 0,
                    y: 0,
                    width: Math.min(1920, await this.page.evaluate(() => window.innerWidth)),
                    height: Math.min(1080, await this.page.evaluate(() => window.innerHeight))
                }
            });
            
            return screenshot.toString('base64');
        } catch (error) {
            console.warn('⚠️ 截图失败:', error.message);
            return null;
        }
    }

    /**
     * 构建决策消息
     */
    buildDecisionMessages(task, elementList, pageState, stepCount, operationHistory, screenshot) {
        const messages = [];
        
        // 系统提示
        messages.push({
            role: 'system',
            content: this.buildSystemPrompt()
        });

        // 操作历史上下文
        if (operationHistory.length > 0) {
            messages.push({
                role: 'assistant',
                content: this.buildHistoryContext(operationHistory)
            });
        }

        // 当前任务消息
        const userMessage = {
            role: 'user',
            content: this.buildTaskPrompt(task, elementList, pageState, stepCount)
        };

        // 添加截图
        if (screenshot) {
            userMessage.content = [
                { type: 'text', text: userMessage.content },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${screenshot}`,
                        detail: 'high'
                    }
                }
            ];
        }

        messages.push(userMessage);
        
        return messages;
    }

    /**
     * 构建系统提示
     */
    buildSystemPrompt() {
        return `你是一个专业的网页自动化AI助手，具备以下核心能力：

🎯 核心任务能力：
- 智能分析网页内容和结构
- 准确识别和操作页面元素
- 处理复杂的多步骤任务流程
- 适应不同网站的界面变化

🎨 元素识别系统：
- 🔴 红色标记 = 按钮类元素 (button) - 用于点击操作
- 🟠 橙色标记 = 输入框元素 (input) - 用于文本输入
- 🟢 绿色标记 = 链接元素 (link) - 用于页面跳转
- 🔵 蓝色标记 = 选择控件 (select) - 用于选择操作
- 🟣 紫色标记 = 交互元素 (interactive) - 用于复杂交互
- 🟡 黄色标记 = 自定义元素 (custom) - 用于特殊功能

🧠 智能决策原则：
1. 优先分析页面截图，理解当前状态
2. 根据任务目标选择最合适的操作
3. 考虑操作历史，避免重复无效操作
4. 检测页面跳转，适应新的页面状态
5. 选择置信度高、状态良好的元素
6. 在任务完成时及时停止

🚨 重要操作指导：
- 页面跳转后要重新分析新页面的内容
- 搜索操作成功后通常会跳转到结果页面
- 在结果页面应该浏览商品而不是重复搜索
- 根据页面内容判断任务是否已经完成
- 避免在同一页面重复执行相同操作

请基于页面截图和元素信息，选择最佳的下一步操作。`;
    }

    /**
     * 构建历史上下文
     */
    buildHistoryContext(operationHistory) {
        let context = '📊 最近操作历史：\n\n';
        
        operationHistory.slice(-5).forEach((op, index) => {
            context += `步骤${op.step}: ${op.tool}`;
            if (op.params.element_number) {
                context += ` (元素#${op.params.element_number})`;
            }
            context += ` - ${op.result.success ? '成功' : '失败'}\n`;
            
            if (op.params.text_content) {
                context += `  输入内容: "${op.params.text_content}"\n`;
            }
            if (op.params.element_description) {
                context += `  操作元素: ${op.params.element_description}\n`;
            }
            context += '\n';
        });
        
        return context;
    }

    /**
     * 构建任务提示
     */
    buildTaskPrompt(task, elementList, pageState, stepCount) {
        let prompt = `请为以下任务选择最佳操作：

🎯 用户任务: "${task}"

📊 当前状态：
- 执行步骤: 第${stepCount}步
- 当前页面: ${pageState.title}
- 页面URL: ${pageState.url}
- 页面是否有新内容: ${pageState.hasNewContent ? '是' : '否'}

🎨 当前页面可交互元素：`;

        if (elementList.length === 0) {
            prompt += '\n⚠️ 未检测到可交互元素，可能需要等待页面加载或滚动页面。';
        } else {
            elementList.forEach((element, index) => {
                const colorEmoji = this.getColorEmoji(element.elementType);
                prompt += `\n${colorEmoji} 编号${element.number}: ${element.description}`;
                prompt += `\n   📍 位置: ${element.position}`;
                prompt += `\n   🎯 类型: ${element.interactionType}`;
                prompt += `\n   📝 文本: "${element.text}"`;
                prompt += `\n   🔧 状态: ${element.state}`;
                prompt += `\n   💯 置信度: ${element.confidence}%`;
                prompt += `\n`;
            });
        }

        prompt += `\n📸 页面截图分析要求：
1. 仔细观察页面截图中的彩色标记和数字
2. 分析当前页面是否发生了跳转或内容变化
3. 根据任务进度判断下一步最合适的操作
4. 优先选择置信度高、状态良好的元素
5. 检查任务是否已经完成或接近完成

请选择最合适的下一步操作。`;

        return prompt;
    }

    /**
     * 获取颜色表情符号
     */
    getColorEmoji(elementType) {
        const emojiMap = {
            'button': '🔴',
            'input': '🟠',
            'link': '🟢',
            'select': '🔵',
            'interactive': '🟣',
            'custom': '🟡'
        };
        return emojiMap[elementType] || '⚪';
    }

    /**
     * 调用AI API
     */
    async callAI(messages) {
        try {
            const requestPayload = {
                model: 'gpt-4o-mini',
                messages: messages,
                tools: this.getToolDefinitions(),
                tool_choice: 'required',
                temperature: 0.1,
                max_tokens: 2000,
                timeout: this.decisionTimeout
            };

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseAIResponse(data);

        } catch (error) {
            console.error('❌ AI API调用失败:', error.message);
            return null;
        }
    }

    /**
     * 获取工具定义
     */
    getToolDefinitions() {
        return [
            {
                type: 'function',
                function: {
                    name: 'click_element',
                    description: '点击页面上的指定元素',
                    parameters: {
                        type: 'object',
                        properties: {
                            element_number: {
                                type: 'integer',
                                description: '要点击的元素编号（页面上的彩色数字标记）'
                            },
                            element_type: {
                                type: 'string',
                                description: '元素类型',
                                enum: ['button', 'input', 'link', 'select', 'interactive', 'custom']
                            },
                            element_description: {
                                type: 'string',
                                description: '要点击的元素描述'
                            },
                            reasoning: {
                                type: 'string',
                                description: '选择这个操作的详细原因'
                            }
                        },
                        required: ['element_number', 'element_type', 'element_description', 'reasoning']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'input_text',
                    description: '在指定的输入框中输入文本',
                    parameters: {
                        type: 'object',
                        properties: {
                            element_number: {
                                type: 'integer',
                                description: '输入框元素编号'
                            },
                            element_type: {
                                type: 'string',
                                description: '元素类型，通常是input',
                                enum: ['button', 'input', 'link', 'select', 'interactive', 'custom']
                            },
                            element_description: {
                                type: 'string',
                                description: '输入框元素描述'
                            },
                            text_content: {
                                type: 'string',
                                description: '要输入的文本内容'
                            },
                            reasoning: {
                                type: 'string',
                                description: '选择这个操作的详细原因'
                            },
                            clear_before_input: {
                                type: 'boolean',
                                description: '是否在输入前清空现有内容',
                                default: true
                            }
                        },
                        required: ['element_number', 'element_type', 'element_description', 'text_content', 'reasoning']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'scroll_page',
                    description: '滚动页面查看更多内容',
                    parameters: {
                        type: 'object',
                        properties: {
                            direction: {
                                type: 'string',
                                enum: ['down', 'up', 'to_top', 'to_bottom'],
                                description: '滚动方向'
                            },
                            distance: {
                                type: 'integer',
                                description: '滚动距离（像素）',
                                default: 500
                            },
                            reasoning: {
                                type: 'string',
                                description: '选择滚动的原因'
                            }
                        },
                        required: ['direction', 'reasoning']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'wait_for_page',
                    description: '等待页面加载或内容更新',
                    parameters: {
                        type: 'object',
                        properties: {
                            wait_time: {
                                type: 'integer',
                                description: '等待时间（毫秒）',
                                default: 3000
                            },
                            reasoning: {
                                type: 'string',
                                description: '等待的原因'
                            }
                        },
                        required: ['reasoning']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'navigate_to_url',
                    description: '导航到指定的URL地址',
                    parameters: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                description: '目标URL地址'
                            },
                            reasoning: {
                                type: 'string',
                                description: '导航的原因'
                            }
                        },
                        required: ['url', 'reasoning']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'complete_task',
                    description: '标记任务已完成',
                    parameters: {
                        type: 'object',
                        properties: {
                            completion_reason: {
                                type: 'string',
                                description: '任务完成的详细原因'
                            },
                            final_result: {
                                type: 'string',
                                description: '最终结果描述'
                            }
                        },
                        required: ['completion_reason', 'final_result']
                    }
                }
            }
        ];
    }

    /**
     * 解析AI响应
     */
    parseAIResponse(apiResponse) {
        try {
            if (!apiResponse.choices || apiResponse.choices.length === 0) {
                throw new Error('API响应中没有选择项');
            }

            const choice = apiResponse.choices[0];
            const message = choice.message;

            if (!message.tool_calls || message.tool_calls.length === 0) {
                throw new Error('API响应中没有工具调用');
            }

            const toolCall = message.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            return {
                tool: functionName,
                params: functionArgs,
                reasoning: functionArgs.reasoning || `AI选择使用${functionName}工具`,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('❌ 解析AI响应失败:', error.message);
            return null;
        }
    }

    /**
     * 记录决策历史
     */
    recordDecision(decision, decisionTime) {
        this.decisionHistory.push({
            ...decision,
            decisionTime: decisionTime,
            timestamp: Date.now()
        });

        if (this.decisionHistory.length > this.maxHistorySize) {
            this.decisionHistory = this.decisionHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * 获取决策历史
     */
    getDecisionHistory() {
        return this.decisionHistory.slice();
    }
}

/**
 * 🎛️ 智能操作执行器 - 完全重构版
 */
class SmartOperationExecutor {
    constructor(page, domDetector, pageStateMonitor) {
        this.page = page;
        this.domDetector = domDetector;
        this.pageStateMonitor = pageStateMonitor;
        this.operationHistory = [];
        this.maxHistorySize = 20;
    }

    /**
     * 执行操作
     */
    async executeOperation(decision) {
        const operationStartTime = Date.now();
        
        try {
            console.log(`🔧 执行操作: ${decision.tool}`);
            
            let result = null;
            
            switch (decision.tool) {
                case 'click_element':
                    result = await this.clickElement(decision.params);
                    break;
                case 'input_text':
                    result = await this.inputText(decision.params);
                    break;
                case 'scroll_page':
                    result = await this.scrollPage(decision.params);
                    break;
                case 'wait_for_page':
                    result = await this.waitForPage(decision.params);
                    break;
                case 'navigate_to_url':
                    result = await this.navigateToUrl(decision.params);
                    break;
                case 'complete_task':
                    result = await this.completeTask(decision.params);
                    break;
                default:
                    result = { success: false, error: `未知操作: ${decision.tool}` };
            }

            const operationTime = Date.now() - operationStartTime;
            
            // 记录操作历史
            this.recordOperation({
                tool: decision.tool,
                params: decision.params,
                result: result,
                operationTime: operationTime,
                timestamp: Date.now()
            });

            console.log(`${result.success ? '✅' : '❌'} 操作${result.success ? '成功' : '失败'} (耗时: ${operationTime}ms)`);
            
            return result;

        } catch (error) {
            console.error('❌ 操作执行异常:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 点击元素
     */
    async clickElement(params) {
        try {
            const { element_number, element_type, element_description, reasoning } = params;
            
            console.log(`🎯 点击元素 #${element_number}: ${element_description}`);
            console.log(`💭 操作原因: ${reasoning}`);
            
            // 获取元素信息
            const elementInfo = this.domDetector.getElementById(element_number);
            if (!elementInfo) {
                return { success: false, error: `未找到编号为 ${element_number} 的元素` };
            }

            console.log(`📍 元素位置: (${elementInfo.position.centerX}, ${elementInfo.position.centerY})`);
            console.log(`🔧 元素状态: 可见=${elementInfo.state.isVisible}, 可点击=${elementInfo.state.isClickable}`);

            // 多策略点击
            const strategies = [
                () => this.clickByAttribute(element_number),
                () => this.clickByPosition(elementInfo.position),
                () => this.clickBySelector(elementInfo),
                () => this.clickByText(elementInfo.text)
            ];

            for (let i = 0; i < strategies.length; i++) {
                try {
                    console.log(`🎯 尝试点击策略${i + 1}`);
                    const success = await strategies[i]();
                    
                    if (success) {
                        console.log(`✅ 点击策略${i + 1}成功`);
                        
                        // 等待页面响应
                        await this.sleep(2000);
                        
                        // 检查页面变化
                        await this.pageStateMonitor.updateCurrentState();
                        
                        return { success: true };
                    }
                    
                } catch (strategyError) {
                    console.warn(`❌ 点击策略${i + 1}失败: ${strategyError.message}`);
                    continue;
                }
            }

            return { success: false, error: '所有点击策略都失败了' };

        } catch (error) {
            console.error('❌ 点击元素失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 通过属性点击
     */
    async clickByAttribute(elementNumber) {
        const locator = this.page.locator(`[data-ai-element-id="${elementNumber}"]`);
        const count = await locator.count();
        
        if (count > 0) {
            await locator.first().waitFor({ state: 'visible', timeout: 5000 });
            await locator.first().scrollIntoViewIfNeeded();
            await this.sleep(500);
            await locator.first().click({ timeout: 10000 });
            return true;
        }
        
        return false;
    }

    /**
     * 通过位置点击
     */
    async clickByPosition(position) {
        const { centerX, centerY } = position;
        
        // 滚动到目标位置
        await this.page.evaluate((x, y) => {
            const targetX = Math.max(0, x - window.innerWidth / 2);
            const targetY = Math.max(0, y - window.innerHeight / 2);
            window.scrollTo({ left: targetX, top: targetY, behavior: 'smooth' });
        }, centerX, centerY);
        
        await this.sleep(1000);
        
        // 验证坐标是否在视口内
        const isInViewport = await this.page.evaluate((x, y) => {
            const rect = { left: x - 10, top: y - 10, right: x + 10, bottom: y + 10 };
            return rect.left >= 0 && rect.top >= 0 && 
                   rect.right <= window.innerWidth && rect.bottom <= window.innerHeight;
        }, centerX, centerY);
        
        if (isInViewport) {
            await this.page.mouse.click(centerX, centerY);
            return true;
        }
        
        return false;
    }

    /**
     * 通过选择器点击
     */
    async clickBySelector(elementInfo) {
        const selectors = [];
        
        if (elementInfo.attributes.id) {
            selectors.push(`#${elementInfo.attributes.id}`);
        }
        
        if (elementInfo.attributes.name) {
            selectors.push(`[name="${elementInfo.attributes.name}"]`);
        }
        
        if (elementInfo.attributes.className) {
            const mainClass = elementInfo.attributes.className.split(' ')[0];
            if (mainClass) {
                selectors.push(`.${mainClass}`);
            }
        }
        
        for (const selector of selectors) {
            try {
                const locator = this.page.locator(selector);
                const count = await locator.count();
                
                if (count > 0) {
                    const targetLocator = count > 1 ? locator.first() : locator;
                    await targetLocator.waitFor({ state: 'visible', timeout: 5000 });
                    await targetLocator.scrollIntoViewIfNeeded();
                    await this.sleep(500);
                    await targetLocator.click({ timeout: 10000 });
                    return true;
                }
            } catch (error) {
                continue;
            }
        }
        
        return false;
    }

    /**
     * 通过文本点击
     */
    async clickByText(text) {
        if (!text || text.length < 3) return false;
        
        try {
            const locator = this.page.getByText(text, { exact: true });
            const count = await locator.count();
            
            if (count > 0) {
                await locator.first().waitFor({ state: 'visible', timeout: 5000 });
                await locator.first().scrollIntoViewIfNeeded();
                await this.sleep(500);
                await locator.first().click({ timeout: 10000 });
                return true;
            }
        } catch (error) {
            // 尝试部分匹配
            try {
                const partialText = text.substring(0, Math.min(20, text.length));
                const locator = this.page.getByText(partialText);
                const count = await locator.count();
                
                if (count > 0) {
                    await locator.first().waitFor({ state: 'visible', timeout: 5000 });
                    await locator.first().scrollIntoViewIfNeeded();
                    await this.sleep(500);
                    await locator.first().click({ timeout: 10000 });
                    return true;
                }
            } catch (partialError) {
                return false;
            }
        }
        
        return false;
    }

    /**
     * 输入文本
     */
    async inputText(params) {
        try {
            const { element_number, element_type, element_description, text_content, reasoning, clear_before_input } = params;
            
            console.log(`⌨️ 输入文本 #${element_number}: ${element_description} = "${text_content}"`);
            console.log(`💭 操作原因: ${reasoning}`);
            
            // 获取元素信息
            const elementInfo = this.domDetector.getElementById(element_number);
            if (!elementInfo) {
                return { success: false, error: `未找到编号为 ${element_number} 的元素` };
            }

            // 多策略输入
            const strategies = [
                () => this.inputByAttribute(element_number, text_content, clear_before_input),
                () => this.inputByPosition(elementInfo.position, text_content, clear_before_input),
                () => this.inputBySelector(elementInfo, text_content, clear_before_input)
            ];

            for (let i = 0; i < strategies.length; i++) {
                try {
                    console.log(`⌨️ 尝试输入策略${i + 1}`);
                    const success = await strategies[i]();
                    
                    if (success) {
                        console.log(`✅ 输入策略${i + 1}成功`);
                        await this.sleep(1000);
                        return { success: true };
                    }
                    
                } catch (strategyError) {
                    console.warn(`❌ 输入策略${i + 1}失败: ${strategyError.message}`);
                    continue;
                }
            }

            return { success: false, error: '所有输入策略都失败了' };

        } catch (error) {
            console.error('❌ 输入文本失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 通过属性输入
     */
    async inputByAttribute(elementNumber, text, clearBefore) {
        const locator = this.page.locator(`[data-ai-element-id="${elementNumber}"]`);
        const count = await locator.count();
        
        if (count > 0) {
            const target = locator.first();
            await target.waitFor({ state: 'visible', timeout: 5000 });
            await target.scrollIntoViewIfNeeded();
            await this.sleep(500);
            
            if (clearBefore !== false) {
                await target.selectText().catch(() => {});
                await this.sleep(200);
            }
            
            await target.fill(text);
            return true;
        }
        
        return false;
    }

    /**
     * 通过位置输入
     */
    async inputByPosition(position, text, clearBefore) {
        const { centerX, centerY } = position;
        
        // 滚动并点击输入框
        await this.page.evaluate((x, y) => {
            window.scrollTo({
                left: Math.max(0, x - window.innerWidth / 2),
                top: Math.max(0, y - window.innerHeight / 2),
                behavior: 'smooth'
            });
        }, centerX, centerY);
        
        await this.sleep(1000);
        
        // 点击获得焦点
        await this.page.mouse.click(centerX, centerY);
        await this.sleep(500);
        
        // 清空内容
        if (clearBefore !== false) {
            await this.page.keyboard.selectAll();
            await this.page.keyboard.press('Delete');
            await this.sleep(300);
        }
        
        // 输入文本
        await this.page.keyboard.type(text, { delay: 50 });
        return true;
    }

    /**
     * 通过选择器输入
     */
    async inputBySelector(elementInfo, text, clearBefore) {
        const selectors = [];
        
        if (elementInfo.attributes.id) {
            selectors.push(`#${elementInfo.attributes.id}`);
        }
        
        if (elementInfo.attributes.name) {
            selectors.push(`[name="${elementInfo.attributes.name}"]`);
        }
        
        if (elementInfo.attributes.placeholder) {
            selectors.push(`[placeholder="${elementInfo.attributes.placeholder}"]`);
        }
        
        for (const selector of selectors) {
            try {
                const locator = this.page.locator(selector);
                const count = await locator.count();
                
                if (count > 0) {
                    const target = count > 1 ? locator.first() : locator;
                    await target.waitFor({ state: 'visible', timeout: 5000 });
                    await target.scrollIntoViewIfNeeded();
                    await this.sleep(500);
                    
                    if (clearBefore !== false) {
                        await target.selectText().catch(() => {});
                        await this.sleep(200);
                    }
                    
                    await target.fill(text);
                    return true;
                }
            } catch (error) {
                continue;
            }
        }
        
        return false;
    }

    /**
     * 滚动页面
     */
    async scrollPage(params) {
        try {
            const { direction, distance = 500, reasoning } = params;
            
            console.log(`📜 滚动页面: ${direction} (${distance}px)`);
            console.log(`💭 滚动原因: ${reasoning}`);

            switch (direction) {
                case 'down':
                    await this.page.mouse.wheel(0, distance);
                    break;
                case 'up':
                    await this.page.mouse.wheel(0, -distance);
                    break;
                case 'to_top':
                    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
                    break;
                case 'to_bottom':
                    await this.page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
                    break;
            }

            await this.sleep(2000);
            
            // 强制重新检测元素
            await this.domDetector.detectElements(true);
            
            return { success: true };

        } catch (error) {
            console.error('❌ 滚动页面失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 等待页面
     */
    async waitForPage(params) {
        try {
            const { wait_time = 3000, reasoning } = params;
            
            console.log(`⏳ 等待页面: ${wait_time}ms`);
            console.log(`💭 等待原因: ${reasoning}`);

            await this.sleep(wait_time);
            
            // 等待网络空闲
            await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
            
            // 更新页面状态
            await this.pageStateMonitor.updateCurrentState();
            
            // 重新检测元素
            await this.domDetector.detectElements(true);
            
            return { success: true };

        } catch (error) {
            console.error('❌ 等待页面失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 导航到URL
     */
    async navigateToUrl(params) {
        try {
            const { url, reasoning } = params;
            
            console.log(`🌐 导航到: ${url}`);
            console.log(`💭 导航原因: ${reasoning}`);

            await this.page.goto(url, { 
                waitUntil: 'networkidle', 
                timeout: 30000 
            });

            await this.sleep(3000);
            
            // 更新页面状态
            await this.pageStateMonitor.updateCurrentState();
            
            // 重新检测元素
            await this.domDetector.detectElements(true);
            
            return { success: true };

        } catch (error) {
            console.error('❌ 导航失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 完成任务
     */
    async completeTask(params) {
        try {
            const { completion_reason, final_result } = params;
            
            console.log(`🎉 任务完成`);
            console.log(`💭 完成原因: ${completion_reason}`);
            console.log(`📊 最终结果: ${final_result}`);

            return { 
                success: true, 
                taskCompleted: true,
                completionReason: completion_reason,
                finalResult: final_result
            };

        } catch (error) {
            console.error('❌ 标记任务完成失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 记录操作历史
     */
    recordOperation(operation) {
        this.operationHistory.push(operation);
        
        if (this.operationHistory.length > this.maxHistorySize) {
            this.operationHistory = this.operationHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * 获取操作历史
     */
    getOperationHistory() {
        return this.operationHistory.slice();
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 🎛️ 主控制器 - 完全重构版
 */
class MasterController {
    constructor() {
        // 浏览器实例
        this.browser = null;
        this.context = null;
        this.currentPage = null;
        
        // 核心模块
        this.pageStateMonitor = null;
        this.tabManager = null;
        this.domDetector = null;
        this.aiDecisionEngine = null;
        this.operationExecutor = null;
        
        // 任务状态
        this.currentTask = {
            command: '',
            status: 'idle',
            currentStep: 0,
            maxSteps: 25,
            startTime: 0
        };
        
        // 系统状态
        this.isInitialized = false;
        this.operationStats = {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            pageNavigations: 0
        };
    }

    /**
     * 初始化系统
     */
    async initialize() {
        try {
            console.log('🚀 初始化智能浏览器控制系统 v15.0...');
            
            // 连接浏览器
            if (!await this.connectBrowser()) {
                throw new Error('浏览器连接失败');
            }
            
            // 初始化核心模块
            await this.initializeModules();
            
            // 启动监控
            await this.startMonitoring();
            
            // 执行初始检测
            await this.performInitialDetection();
            
            this.isInitialized = true;
            console.log('✅ 系统初始化完成！');
            
            return true;

        } catch (error) {
            console.error('❌ 系统初始化失败:', error.message);
            return false;
        }
    }

    /**
     * 连接浏览器
     */
    async connectBrowser() {
        try {
            console.log('🔗 连接到Edge调试端口...');
            
            this.browser = await chromium.connectOverCDP('http://localhost:9222');
            const contexts = this.browser.contexts();
            
            if (contexts.length === 0) {
                throw new Error('未找到浏览器上下文');
            }
            
            this.context = contexts[0];
            const pages = this.context.pages();
            
            if (pages.length === 0) {
                throw new Error('未找到打开的页面');
            }
            
            this.currentPage = pages[0];
            await this.currentPage.setViewportSize({ width: 1920, height: 1080 });
            
            console.log('✅ 浏览器连接成功');
            console.log(`📄 当前页面: ${await this.currentPage.url()}`);
            
            return true;

        } catch (error) {
            console.error('❌ 浏览器连接失败:', error.message);
            return false;
        }
    }

    /**
     * 初始化核心模块
     */
    async initializeModules() {
        console.log('🧠 初始化核心模块...');
        
        // 页面状态监控器
        this.pageStateMonitor = new PageStateMonitor(this.currentPage);
        console.log('✅ 页面状态监控器已创建');
        
        // 标签页管理器
        this.tabManager = new SmartTabManager(this.browser, this.context);
        console.log('✅ 智能标签页管理器已创建');
        
        // DOM检测器
        this.domDetector = new AdvancedDOMDetector(this.currentPage, this.pageStateMonitor);
        console.log('✅ 高级DOM检测器已创建');
        
        // AI决策引擎
        this.aiDecisionEngine = new EnhancedAIDecisionEngine(this.currentPage, this.pageStateMonitor);
        console.log('✅ 增强AI决策引擎已创建');
        
        // 操作执行器
        this.operationExecutor = new SmartOperationExecutor(this.currentPage, this.domDetector, this.pageStateMonitor);
        console.log('✅ 智能操作执行器已创建');
        
        // 设置页面状态变化监听器
        this.pageStateMonitor.addChangeListener(this.onPageStateChange.bind(this));
        
        console.log('🎯 所有核心模块已初始化');
    }

    /**
     * 启动监控服务
     */
    async startMonitoring() {
        console.log('🔄 启动监控服务...');
        
        await this.pageStateMonitor.startMonitoring();
        await this.tabManager.startMonitoring();
        
        console.log('✅ 监控服务已启动');
    }

    /**
     * 执行初始检测
     */
    async performInitialDetection() {
        console.log('🔍 执行初始页面检测...');
        
        // 更新当前页面引用
        await this.updateCurrentPage();
        
        // 检测页面元素
        const detection = await this.domDetector.detectElements();
        
        console.log(`📊 初始检测完成: ${detection.totalElements}个元素`);
        console.log(`🎨 页面标记已添加`);
    }

    /**
     * 页面状态变化处理
     */
    async onPageStateChange(oldState, newState, eventType) {
        try {
            console.log(`🔄 处理页面状态变化: ${eventType}`);
            
            // 更新统计
            if (oldState.url !== newState.url) {
                this.operationStats.pageNavigations++;
                console.log(`🌐 页面导航计数: ${this.operationStats.pageNavigations}`);
            }
            
            // 更新当前页面引用
            await this.updateCurrentPage();
            
            // 强制重新检测元素
            if (newState.hasNewContent) {
                console.log('🔄 检测到新内容，重新分析页面元素...');
                await this.domDetector.detectElements(true);
            }
            
        } catch (error) {
            console.error('❌ 处理页面状态变化失败:', error.message);
        }
    }

    /**
     * 更新当前页面引用
     */
    async updateCurrentPage() {
        try {
            const activeTab = this.tabManager.getActiveTab();
            
            if (activeTab && activeTab !== this.currentPage) {
                console.log('🔄 切换到新的活动页面');
                
                this.currentPage = activeTab;
                
                // 更新所有模块的页面引用
                this.pageStateMonitor.page = this.currentPage;
                this.domDetector.page = this.currentPage;
                this.aiDecisionEngine.page = this.currentPage;
                this.operationExecutor.page = this.currentPage;
                
                console.log(`📄 当前页面已更新: ${await this.currentPage.url()}`);
            }
            
        } catch (error) {
            console.error('❌ 更新当前页面失败:', error.message);
        }
    }

    /**
     * 执行任务
     */
    async executeTask(command) {
        try {
            console.log(`\n🎯 开始执行任务: "${command}"`);
            
            // 初始化任务
            this.initializeTask(command);
            
            let taskCompleted = false;
            let consecutiveFailures = 0;
            const maxConsecutiveFailures = 3;
            
            while (this.currentTask.currentStep < this.currentTask.maxSteps && 
                   this.currentTask.status === 'running' && 
                   !taskCompleted) {
                
                this.currentTask.currentStep++;
                console.log(`\n🔄 执行步骤 ${this.currentTask.currentStep}/${this.currentTask.maxSteps}`);
                
                try {
                    // 执行单步操作
                    const stepResult = await this.executeStep(command);
                    
                    if (stepResult.success) {
                        consecutiveFailures = 0;
                        this.operationStats.successfulSteps++;
                        
                        // 检查任务完成
                        if (stepResult.taskCompleted) {
                            console.log('🎉 AI判断任务已完成！');
                            taskCompleted = true;
                            break;
                        }
                        
                    } else {
                        consecutiveFailures++;
                        this.operationStats.failedSteps++;
                        
                        console.warn(`⚠️ 步骤失败 (连续失败: ${consecutiveFailures}/${maxConsecutiveFailures})`);
                        
                        if (consecutiveFailures >= maxConsecutiveFailures) {
                            console.error('❌ 连续失败次数过多，任务终止');
                            this.currentTask.status = 'failed';
                            break;
                        }
                    }
                    
                    // 步骤间等待
                    await this.sleep(1500);
                    
                } catch (stepError) {
                    console.error(`❌ 步骤 ${this.currentTask.currentStep} 异常:`, stepError.message);
                    consecutiveFailures++;
                    this.operationStats.failedSteps++;
                    
                    if (consecutiveFailures >= maxConsecutiveFailures) {
                        this.currentTask.status = 'failed';
                        break;
                    }
                }
            }
            
            // 处理任务结果
            return this.handleTaskCompletion(taskCompleted);
            
        } catch (error) {
            console.error('❌ 任务执行异常:', error.message);
            this.currentTask.status = 'failed';
            return false;
        }
    }

    /**
     * 初始化任务
     */
    initializeTask(command) {
        this.currentTask = {
            command: command,
            status: 'running',
            currentStep: 0,
            maxSteps: 25,
            startTime: Date.now()
        };
        
        this.operationStats = {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            pageNavigations: 0
        };
        
        console.log(`📋 任务已初始化，最大步骤: ${this.currentTask.maxSteps}`);
    }

    /**
     * 执行单个步骤
     */
    async executeStep(command) {
        const stepStartTime = Date.now();
        
        try {
            console.log('🔍 开始步骤分析...');
            
            // 确保使用最新的页面
            await this.updateCurrentPage();
            
            // 获取当前页面状态
            const pageState = this.pageStateMonitor.getCurrentState();
            
            // 检测页面元素
            const detection = await this.domDetector.detectElements();
            const elementList = this.domDetector.getElementsForAI(15);
            
            console.log(`📊 页面分析: ${elementList.length}个可用元素`);
            
            // AI决策
            const operationHistory = this.operationExecutor.getOperationHistory();
            const decision = await this.aiDecisionEngine.makeDecision(
                command, elementList, pageState, this.currentTask.currentStep, operationHistory
            );
            
            if (!decision) {
                return { success: false, error: 'AI决策失败' };
            }
            
            console.log(`🎯 AI决策: ${decision.tool}`);
            if (decision.params.element_number) {
                console.log(`🔍 目标元素: #${decision.params.element_number}`);
            }
            
            // 执行操作
            const operationResult = await this.operationExecutor.executeOperation(decision);
            
            const stepTime = Date.now() - stepStartTime;
            this.operationStats.totalSteps++;
            
            console.log(`⏱️ 步骤耗时: ${stepTime}ms`);
            
            return {
                success: operationResult.success,
                taskCompleted: operationResult.taskCompleted || false,
                error: operationResult.error,
                stepTime: stepTime
            };
            
        } catch (error) {
            console.error('❌ 步骤执行失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 处理任务完成
     */
    handleTaskCompletion(taskCompleted) {
        const duration = ((Date.now() - this.currentTask.startTime) / 1000).toFixed(1);
        
        if (taskCompleted || this.currentTask.status === 'running') {
            this.currentTask.status = 'completed';
            console.log(`\n🎉 任务执行成功！`);
        } else {
            console.log(`\n😔 任务执行失败`);
        }
        
        console.log(`⏱️ 总耗时: ${duration}秒`);
        console.log(`📊 操作统计:`);
        console.log(`  - 总步骤: ${this.operationStats.totalSteps}`);
        console.log(`  - 成功步骤: ${this.operationStats.successfulSteps}`);
        console.log(`  - 失败步骤: ${this.operationStats.failedSteps}`);
        console.log(`  - 页面导航: ${this.operationStats.pageNavigations}`);
        console.log(`  - 成功率: ${Math.round((this.operationStats.successfulSteps / Math.max(1, this.operationStats.totalSteps)) * 100)}%`);
        
        return this.currentTask.status === 'completed';
    }

    /**
     * 获取系统状态
     */
    getSystemStatus() {
        try {
            const pageState = this.pageStateMonitor ? this.pageStateMonitor.getCurrentState() : {};
            const elementList = this.domDetector ? this.domDetector.getElementsForAI(5) : [];
            const detectionInfo = this.domDetector ? this.domDetector.getDetectionInfo() : {};
            const tabsInfo = this.tabManager ? this.tabManager.getAllTabsInfo() : [];
            
            return {
                system: {
                    version: 'v15.0',
                    initialized: this.isInitialized,
                    currentUrl: pageState.url || 'unknown'
                },
                task: {
                    command: this.currentTask.command,
                    status: this.currentTask.status,
                    currentStep: this.currentTask.currentStep,
                    maxSteps: this.currentTask.maxSteps,
                    progress: (this.currentTask.currentStep / this.currentTask.maxSteps) * 100
                },
                page: {
                    title: pageState.title || 'unknown',
                    hasNewContent: pageState.hasNewContent || false,
                    isLoading: pageState.isLoading || false,
                    elementsDetected: detectionInfo.totalElements || 0,
                    elementsVisible: elementList.length
                },
                tabs: {
                    totalTabs: tabsInfo.length,
                    activeTab: this.tabManager ? (this.tabManager.getActiveTab() === this.currentPage) : false
                },
                stats: this.operationStats
            };
            
        } catch (error) {
            console.error('❌ 获取系统状态失败:', error.message);
            return { error: error.message };
        }
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            console.log('🧹 清理系统资源...');
            
            if (this.pageStateMonitor) {
                this.pageStateMonitor.stopMonitoring();
            }
            
            if (this.tabManager) {
                this.tabManager.stopMonitoring();
            }
            
            if (this.domDetector) {
                await this.domDetector.clearMarkers();
            }
            
            console.log('✅ 资源清理完成');
            
        } catch (error) {
            console.error('❌ 资源清理失败:', error.message);
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 📱 终端界面 - 重构版
 */
class TerminalInterface {
    constructor() {
        this.controller = null;
        this.rl = null;
        this.isRunning = false;
        this.sessionStats = {
            startTime: Date.now(),
            commandsExecuted: 0,
            successfulCommands: 0
        };
    }

    /**
     * 启动终端界面
     */
    async start() {
        try {
            console.log('AI增强智能浏览器控制系统');
            console.log('='.repeat(80));
            
            // 初始化控制器
            this.controller = new MasterController();
            const initSuccess = await this.controller.initialize();
            
            if (!initSuccess) {
                console.log('❌ 系统初始化失败');
                console.log('💡 请确保Edge浏览器在调试模式下运行：');
                console.log('   "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222');
                return;
            }
            
            // 创建终端界面
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                prompt: 'v15.0> '
            });
            
            this.isRunning = true;
            
            this.showWelcomeMessage();
            await this.runInteractiveLoop();
            
        } catch (error) {
            console.error('❌ 系统启动失败:', error.message);
            process.exit(1);
        }
    }

    /**
     * 显示欢迎消息
     */
    showWelcomeMessage() {
        console.log('\n🎯 系统初始化完成！');
        console.log('💡 输入任务描述，AI将智能执行');
        console.log('📖 输入 "help" 查看帮助，"exit" 退出程序');
        console.log('\n🎨 增强特性：');
        console.log('   ✅ 智能页面跳转检测   ✅ 实时状态监控');
        console.log('   ✅ 多策略元素定位     ✅ 自动标签页管理');
        console.log('   ✅ AI多模态决策       ✅ 动态缓存优化');
        console.log('='.repeat(80));
    }

    /**
     * 运行交互循环
     */
    async runInteractiveLoop() {
        this.rl.prompt();
        
        this.rl.on('line', async (input) => {
            const command = input.trim();
            
            if (!command) {
                this.rl.prompt();
                return;
            }
            
            this.sessionStats.commandsExecuted++;
            
            if (this.isSystemCommand(command)) {
                await this.handleSystemCommand(command);
            } else {
                await this.executeUserTask(command);
            }
            
            if (this.isRunning) {
                this.rl.prompt();
            }
        });
        
        this.rl.on('close', () => {
            this.handleExit();
        });
    }

    /**
     * 检查系统命令
     */
    isSystemCommand(command) {
        const systemCommands = ['status', 'refresh', 'clear', 'help', 'exit', 'quit'];
        return systemCommands.includes(command.toLowerCase());
    }

    /**
     * 处理系统命令
     */
    async handleSystemCommand(command) {
        try {
            switch (command.toLowerCase()) {
                case 'status':
                    this.showSystemStatus();
                    break;
                case 'refresh':
                    await this.refreshSystem();
                    break;
                case 'clear':
                    await this.clearMarkers();
                    break;
                case 'help':
                    this.showHelp();
                    break;
                case 'exit':
                case 'quit':
                    this.handleExit();
                    break;
                default:
                    console.log('❌ 未知系统命令');
            }
        } catch (error) {
            console.error('❌ 系统命令执行失败:', error.message);
        }
    }

    /**
     * 执行用户任务
     */
    async executeUserTask(command) {
        const taskStartTime = Date.now();
        
        try {
            console.log(`\n🎯 开始执行任务: "${command}"`);
            console.log(`⏱️ 开始时间: ${new Date().toLocaleTimeString()}`);
            
            const success = await this.controller.executeTask(command);
            
            const duration = ((Date.now() - taskStartTime) / 1000).toFixed(1);
            
            if (success) {
                this.sessionStats.successfulCommands++;
                console.log(`\n🎉 任务执行成功！耗时: ${duration}秒`);
            } else {
                console.log(`\n😔 任务执行失败，耗时: ${duration}秒`);
                console.log(`💡 建议: 检查网络连接或尝试重新表述任务`);
            }
            
            const successRate = Math.round((this.sessionStats.successfulCommands / this.sessionStats.commandsExecuted) * 100);
            console.log(`📊 会话成功率: ${successRate}%`);
            
        } catch (error) {
            console.error('❌ 任务执行异常:', error.message);
        }
    }

    /**
     * 显示系统状态
     */
    showSystemStatus() {
        try {
            console.log('\n📊 系统状态报告 v15.0');
            console.log('='.repeat(60));
            
            const status = this.controller.getSystemStatus();
            
            console.log('🔧 系统信息:');
            console.log(`  版本: ${status.system.version}`);
            console.log(`  初始化状态: ${status.system.initialized ? '✅ 已完成' : '❌ 未完成'}`);
            console.log(`  当前页面: ${status.system.currentUrl}`);
            
            console.log('\n🎯 任务状态:');
            console.log(`  当前任务: ${status.task.command || '无'}`);
            console.log(`  任务状态: ${status.task.status}`);
            console.log(`  执行进度: ${status.task.progress.toFixed(1)}%`);
            console.log(`  当前步骤: ${status.task.currentStep}/${status.task.maxSteps}`);
            
            console.log('\n📄 页面信息:');
            console.log(`  页面标题: ${status.page.title}`);
            console.log(`  有新内容: ${status.page.hasNewContent ? '✅ 是' : '❌ 否'}`);
            console.log(`  正在加载: ${status.page.isLoading ? '✅ 是' : '❌ 否'}`);
            console.log(`  检测元素: ${status.page.elementsDetected}个`);
            console.log(`  可见元素: ${status.page.elementsVisible}个`);
            
            console.log('\n🗂️ 标签页信息:');
            console.log(`  总标签页: ${status.tabs.totalTabs}个`);
            console.log(`  活动页面: ${status.tabs.activeTab ? '✅ 正确' : '⚠️ 需切换'}`);
            
            console.log('\n📊 操作统计:');
            console.log(`  总步骤: ${status.stats.totalSteps}`);
            console.log(`  成功步骤: ${status.stats.successfulSteps}`);
            console.log(`  失败步骤: ${status.stats.failedSteps}`);
            console.log(`  页面导航: ${status.stats.pageNavigations}`);
            
            const sessionDuration = ((Date.now() - this.sessionStats.startTime) / 60000).toFixed(1);
            console.log('\n📊 会话统计:');
            console.log(`  会话时长: ${sessionDuration}分钟`);
            console.log(`  执行命令: ${this.sessionStats.commandsExecuted}个`);
            console.log(`  成功命令: ${this.sessionStats.successfulCommands}个`);
            
            console.log('\n='.repeat(60));
            
        } catch (error) {
            console.error('❌ 获取系统状态失败:', error.message);
        }
    }

    /**
     * 刷新系统
     */
    async refreshSystem() {
        try {
            console.log('\n🔄 刷新系统状态...');
            
            await this.controller.updateCurrentPage();
            await this.controller.domDetector.detectElements(true);
            
            console.log('✅ 系统刷新完成');
            
        } catch (error) {
            console.error('❌ 系统刷新失败:', error.message);
        }
    }

    /**
     * 清除标记
     */
    async clearMarkers() {
        try {
            console.log('\n🧹 清除页面标记...');
            
            await this.controller.domDetector.clearMarkers();
            
            console.log('✅ 页面标记已清除');
            
        } catch (error) {
            console.error('❌ 清除标记失败:', error.message);
        }
    }

    /**
     * 显示帮助信息
     */
    showHelp() {
        console.log('智能浏览器控制系统帮助');
        console.log('='.repeat(70));
        
        console.log('\n🚀 v15.0 核心特性:');
        console.log('  ✅ 智能页面跳转检测 - 实时感知页面变化');
        console.log('  ✅ 高级DOM元素检测 - 多策略元素定位');
        console.log('  ✅ AI多模态决策引擎 - 结合视觉和文本分析');
        console.log('  ✅ 智能标签页管理 - 自动切换最佳页面');
        console.log('  ✅ 动态缓存优化 - 提升检测效率');
        console.log('  ✅ 实时状态监控 - 全面系统监控');
        
        console.log('\n🎨 元素标记系统:');
        console.log('  🔴 红色 - 按钮类元素 (button)');
        console.log('  🟠 橙色 - 输入框元素 (input)');
        console.log('  🟢 绿色 - 链接元素 (link)');
        console.log('  🔵 蓝色 - 选择控件 (select)');
        console.log('  🟣 紫色 - 交互元素 (interactive)');
        console.log('  🟡 黄色 - 自定义元素 (custom)');
        
        console.log('\n📋 任务示例:');
        console.log('  • "淘宝搜索买个手机" - 智能搜索和商品浏览');
        console.log('  • "帮我登录账户" - 自动填写登录表单');
        console.log('  • "查看商品详情并加购物车" - 复杂购物流程');
        console.log('  • "搜索新闻关于AI发展" - 信息检索任务');
        
        console.log('\n🔧 系统命令:');
        console.log('  • status  - 显示详细系统状态');
        console.log('  • refresh - 刷新页面状态和元素检测');
        console.log('  • clear   - 清除页面上的可视化标记');
        console.log('  • help    - 显示此帮助信息');
        console.log('  • exit    - 安全退出程序');
        
        console.log('\n💡 使用技巧:');
        console.log('  • 系统会自动检测页面跳转和新内容');
        console.log('  • AI基于截图和元素信息做出智能决策');
        console.log('  • 支持复杂的多步骤任务执行');
        console.log('  • 自动处理页面加载和元素等待');
        
        console.log('\n='.repeat(70));
    }

    /**
     * 退出处理
     */
    handleExit() {
        try {
            console.log('\n👋 正在安全退出系统...');
            
            const sessionDuration = ((Date.now() - this.sessionStats.startTime) / 60000).toFixed(1);
            
            console.log('\n📊 会话总结:');
            console.log(`  会话时长: ${sessionDuration}分钟`);
            console.log(`  执行命令: ${this.sessionStats.commandsExecuted}个`);
            console.log(`  成功命令: ${this.sessionStats.successfulCommands}个`);
            console.log(`  成功率: ${Math.round((this.sessionStats.successfulCommands / Math.max(1, this.sessionStats.commandsExecuted)) * 100)}%`);
            
            // 清理资源
            if (this.controller) {
                this.controller.cleanup();
            }
            
            this.isRunning = false;
            
            if (this.rl) {
                this.rl.close();
            }
            
            process.exit(0);
            
        } catch (error) {
            console.error('❌ 退出过程错误:', error.message);
            process.exit(1);
        }
    }
}


(async function main() {
    console.log('启动AI增强智能浏览器控制系统...');
    
    const terminal = new TerminalInterface();
    await terminal.start();
})().catch(error => {
    console.error('启动失败:', error.message);
    console.error('请确保Edge浏览器在调试模式下运行：');
    console.error('   "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222');
    process.exit(1);
});

// 导出模块
module.exports = {
    MasterController,
    PageStateMonitor,
    SmartTabManager,
    AdvancedDOMDetector,
    EnhancedAIDecisionEngine,
    SmartOperationExecutor,
    TerminalInterface,
    ElementTypes
};