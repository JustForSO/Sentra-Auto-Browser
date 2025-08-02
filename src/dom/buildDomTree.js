(
  args = {
    doHighlightElements: true,
    focusHighlightIndex: -1,
    viewportExpansion: 0,
    debugMode: false,
  }
) => {
  const { doHighlightElements, focusHighlightIndex, viewportExpansion, debugMode } = args;
  let highlightIndex = 0; // Reset highlight index

  // 清理工作：移除之前的标记，避免重复索引
  // 清除旧的元素索引属性
  const elementsWithOldIndex = document.querySelectorAll('[data-browser-use-index]');
  elementsWithOldIndex.forEach(el => {
    el.removeAttribute('data-browser-use-index');
    el.removeAttribute('data-browser-use-id');
    // 清除旧的高亮样式
    if (el.style.outline && el.style.outline.includes('blue')) {
      el.style.outline = '';
    }
    if (el.style.backgroundColor && el.style.backgroundColor.includes('rgba(0, 0, 255')) {
      el.style.backgroundColor = '';
    }
  });

  // 清除旧的高亮容器
  const oldContainer = document.getElementById("playwright-highlight-container");
  if (oldContainer) {
    oldContainer.remove();
  }

  // 清除旧的标记元素
  const oldMarkers = document.querySelectorAll('.browser-use-marker, .playwright-highlight-label');
  oldMarkers.forEach(marker => marker.remove());

  // 清除全局清理函数
  if (window._highlightCleanupFunctions) {
    window._highlightCleanupFunctions.forEach(fn => {
      try { fn(); } catch (e) { /* ignore cleanup errors */ }
    });
    window._highlightCleanupFunctions = [];
  }

  // Add timing stack to handle recursion
  const TIMING_STACK = {
    nodeProcessing: [],
    treeTraversal: [],
    highlighting: [],
    current: null
  };

  function pushTiming(type) {
    TIMING_STACK[type] = TIMING_STACK[type] || [];
    TIMING_STACK[type].push(performance.now());
  }

  function popTiming(type) {
    const start = TIMING_STACK[type].pop();
    const duration = performance.now() - start;
    return duration;
  }

  // Only initialize performance tracking if in debug mode
  const PERF_METRICS = debugMode ? {
    buildDomTreeCalls: 0,
    timings: {
      buildDomTree: 0,
      highlightElement: 0,
      isInteractiveElement: 0,
      isElementVisible: 0,
      isTopElement: 0,
      isInExpandedViewport: 0,
      isTextNodeVisible: 0,
      getEffectiveScroll: 0,
    },
    cacheMetrics: {
      boundingRectCacheHits: 0,
      boundingRectCacheMisses: 0,
      computedStyleCacheHits: 0,
      computedStyleCacheMisses: 0,
      getBoundingClientRectTime: 0,
      getComputedStyleTime: 0,
      boundingRectHitRate: 0,
      computedStyleHitRate: 0,
      overallHitRate: 0,
      clientRectsCacheHits: 0,
      clientRectsCacheMisses: 0,
    },
    nodeMetrics: {
      totalNodes: 0,
      processedNodes: 0,
      skippedNodes: 0,
    },
    buildDomTreeBreakdown: {
      totalTime: 0,
      totalSelfTime: 0,
      buildDomTreeCalls: 0,
      domOperations: {
        getBoundingClientRect: 0,
        getComputedStyle: 0,
      },
      domOperationCounts: {
        getBoundingClientRect: 0,
        getComputedStyle: 0,
      }
    }
  } : null;

  // Simple timing helper that only runs in debug mode
  function measureTime(fn) {
    if (!debugMode) return fn;
    return function (...args) {
      const start = performance.now();
      const result = fn.apply(this, args);
      const duration = performance.now() - start;
      return result;
    };
  }

  // Helper to measure DOM operations
  function measureDomOperation(operation, name) {
    if (!debugMode) return operation();

    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;

    if (PERF_METRICS && name in PERF_METRICS.buildDomTreeBreakdown.domOperations) {
      PERF_METRICS.buildDomTreeBreakdown.domOperations[name] += duration;
      PERF_METRICS.buildDomTreeBreakdown.domOperationCounts[name]++;
    }

    return result;
  }

  // Add caching mechanisms at the top level
  const DOM_CACHE = {
    boundingRects: new WeakMap(),
    clientRects: new WeakMap(),
    computedStyles: new WeakMap(),
    clearCache: () => {
      DOM_CACHE.boundingRects = new WeakMap();
      DOM_CACHE.clientRects = new WeakMap();
      DOM_CACHE.computedStyles = new WeakMap();
    }
  };

  // Cache helper functions
  function getCachedBoundingRect(element) {
    if (!element) return null;

    if (DOM_CACHE.boundingRects.has(element)) {
      if (debugMode && PERF_METRICS) {
        PERF_METRICS.cacheMetrics.boundingRectCacheHits++;
      }
      return DOM_CACHE.boundingRects.get(element);
    }

    if (debugMode && PERF_METRICS) {
      PERF_METRICS.cacheMetrics.boundingRectCacheMisses++;
    }

    let rect;
    if (debugMode) {
      const start = performance.now();
      rect = element.getBoundingClientRect();
      const duration = performance.now() - start;
      if (PERF_METRICS) {
        PERF_METRICS.buildDomTreeBreakdown.domOperations.getBoundingClientRect += duration;
        PERF_METRICS.buildDomTreeBreakdown.domOperationCounts.getBoundingClientRect++;
      }
    } else {
      rect = element.getBoundingClientRect();
    }

    if (rect) {
      DOM_CACHE.boundingRects.set(element, rect);
    }
    return rect;
  }

  function getCachedComputedStyle(element) {
    if (!element) return null;

    if (DOM_CACHE.computedStyles.has(element)) {
      if (debugMode && PERF_METRICS) {
        PERF_METRICS.cacheMetrics.computedStyleCacheHits++;
      }
      return DOM_CACHE.computedStyles.get(element);
    }

    if (debugMode && PERF_METRICS) {
      PERF_METRICS.cacheMetrics.computedStyleCacheMisses++;
    }

    let style;
    if (debugMode) {
      const start = performance.now();
      style = window.getComputedStyle(element);
      const duration = performance.now() - start;
      if (PERF_METRICS) {
        PERF_METRICS.buildDomTreeBreakdown.domOperations.getComputedStyle += duration;
        PERF_METRICS.buildDomTreeBreakdown.domOperationCounts.getComputedStyle++;
      }
    } else {
      style = window.getComputedStyle(element);
    }

    if (style) {
      DOM_CACHE.computedStyles.set(element, style);
    }
    return style;
  }

  // Add a new function to get cached client rects
  function getCachedClientRects(element) {
    if (!element) return null;
    
    if (DOM_CACHE.clientRects.has(element)) {
      if (debugMode && PERF_METRICS) {
        PERF_METRICS.cacheMetrics.clientRectsCacheHits++;
      }
      return DOM_CACHE.clientRects.get(element);
    }
    
    if (debugMode && PERF_METRICS) {
      PERF_METRICS.cacheMetrics.clientRectsCacheMisses++;
    }
    
    const rects = element.getClientRects();
    
    if (rects) {
      DOM_CACHE.clientRects.set(element, rects);
    }
    return rects;
  }

  /**
   * Hash map of DOM nodes indexed by their highlight index.
   *
   * @type {Object<string, any>}
   */
  const DOM_HASH_MAP = {};

  const ID = { current: 0 };

  const HIGHLIGHT_CONTAINER_ID = "playwright-highlight-container";

  // Add a WeakMap cache for XPath strings
  const xpathCache = new WeakMap();

  // Initialize once and reuse
  const viewportObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        elementVisibilityMap.set(entry.target, entry.isIntersecting);
      });
    },
    { rootMargin: `${viewportExpansion}px` }
  );

  /**
   * Highlights an element in the DOM and returns the index of the next element.
   */
  function highlightElement(element, index, parentIframe = null) {
    pushTiming('highlighting');

    if (!element) return index;

    // Add data attributes for element location
    element.setAttribute('data-browser-use-index', index);
    element.setAttribute('data-browser-use-id', `element_${index}`);

    // Store overlays and the single label for updating
    const overlays = [];
    let label = null;
    let labelWidth = 20;
    let labelHeight = 16;
    let cleanupFn = null;

    try {
      // Create or get highlight container
      let container = document.getElementById(HIGHLIGHT_CONTAINER_ID);
      if (!container) {
        container = document.createElement("div");
        container.id = HIGHLIGHT_CONTAINER_ID;
        container.style.position = "fixed";
        container.style.pointerEvents = "none";
        container.style.top = "0";
        container.style.left = "0";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.zIndex = "2147483640";
        container.style.backgroundColor = 'transparent';
        document.body.appendChild(container);
      }

      // Get element client rects
      const rects = element.getClientRects(); // Use getClientRects()

      if (!rects || rects.length === 0) return index; // Exit if no rects

      // Generate a color based on the index
      const colors = [
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFA500",
        "#800080",
        "#008080",
        "#FF69B4",
        "#4B0082",
        "#FF4500",
        "#2E8B57",
        "#DC143C",
        "#4682B4",
      ];
      const colorIndex = index % colors.length;
      const baseColor = colors[colorIndex];
      const backgroundColor = baseColor + "1A"; // 10% opacity version of the color

      // Get iframe offset if necessary
      let iframeOffset = { x: 0, y: 0 };
      if (parentIframe) {
        const iframeRect = parentIframe.getBoundingClientRect(); // Keep getBoundingClientRect for iframe offset
        iframeOffset.x = iframeRect.left;
        iframeOffset.y = iframeRect.top;
      }

      // Create fragment to hold overlay elements
      const fragment = document.createDocumentFragment();

      // Create highlight overlays for each client rect
      for (const rect of rects) {
        if (rect.width === 0 || rect.height === 0) continue; // Skip empty rects

        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.border = `2px solid ${baseColor}`;
        overlay.style.backgroundColor = backgroundColor;
        overlay.style.pointerEvents = "none";
        overlay.style.boxSizing = "border-box";

        const top = rect.top + iframeOffset.y;
        const left = rect.left + iframeOffset.x;

        overlay.style.top = `${top}px`;
        overlay.style.left = `${left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;

        fragment.appendChild(overlay);
        overlays.push({ element: overlay, initialRect: rect }); // Store overlay and its rect
      }

      // Create and position a single label relative to the first rect
      const firstRect = rects[0];
      label = document.createElement("div");
      label.className = "playwright-highlight-label";
      label.style.position = "fixed";
      label.style.background = baseColor;
      label.style.color = "white";
      label.style.padding = "1px 4px";
      label.style.borderRadius = "4px";
      label.style.fontSize = `${Math.min(12, Math.max(8, firstRect.height / 2))}px`;
      label.textContent = index;
      //  确保标签不影响页面布局
      label.style.margin = "0";
      label.style.border = "none";
      label.style.outline = "none";
      label.style.boxSizing = "border-box";
      label.style.transform = "none";
      label.style.transformOrigin = "initial";
      label.style.willChange = "auto";
      label.style.overflow = "hidden";
      label.style.pointerEvents = "none";

      labelWidth = label.offsetWidth > 0 ? label.offsetWidth : labelWidth; // Update actual width if possible
      labelHeight = label.offsetHeight > 0 ? label.offsetHeight : labelHeight; // Update actual height if possible

      const firstRectTop = firstRect.top + iframeOffset.y;
      const firstRectLeft = firstRect.left + iframeOffset.x;

      let labelTop = firstRectTop + 2;
      let labelLeft = firstRectLeft + firstRect.width - labelWidth - 2;

      // Adjust label position if first rect is too small
      if (firstRect.width < labelWidth + 4 || firstRect.height < labelHeight + 4) {
        labelTop = firstRectTop - labelHeight - 2;
        labelLeft = firstRectLeft + firstRect.width - labelWidth; // Align with right edge
        if (labelLeft < iframeOffset.x) labelLeft = firstRectLeft; // Prevent going off-left
      }

      // Ensure label stays within viewport bounds slightly better
      labelTop = Math.max(0, Math.min(labelTop, window.innerHeight - labelHeight));
      labelLeft = Math.max(0, Math.min(labelLeft, window.innerWidth - labelWidth));


      label.style.top = `${labelTop}px`;
      label.style.left = `${labelLeft}px`;

      fragment.appendChild(label);

      // Update positions on scroll/resize
      const updatePositions = () => {
        const newRects = element.getClientRects(); // Get fresh rects
        let newIframeOffset = { x: 0, y: 0 };

        if (parentIframe) {
          const iframeRect = parentIframe.getBoundingClientRect(); // Keep getBoundingClientRect for iframe
          newIframeOffset.x = iframeRect.left;
          newIframeOffset.y = iframeRect.top;
        }

        // Update each overlay
        overlays.forEach((overlayData, i) => {
          if (i < newRects.length) { // Check if rect still exists
            const newRect = newRects[i];
            const newTop = newRect.top + newIframeOffset.y;
            const newLeft = newRect.left + newIframeOffset.x;

            overlayData.element.style.top = `${newTop}px`;
            overlayData.element.style.left = `${newLeft}px`;
            overlayData.element.style.width = `${newRect.width}px`;
            overlayData.element.style.height = `${newRect.height}px`;
            overlayData.element.style.display = (newRect.width === 0 || newRect.height === 0) ? 'none' : 'block';
          } else {
            // If fewer rects now, hide extra overlays
            overlayData.element.style.display = 'none';
          }
        });

        // If there are fewer new rects than overlays, hide the extras
        if (newRects.length < overlays.length) {
          for (let i = newRects.length; i < overlays.length; i++) {
            overlays[i].element.style.display = 'none';
          }
        }

        // Update label position based on the first new rect
        if (label && newRects.length > 0) {
          const firstNewRect = newRects[0];
          const firstNewRectTop = firstNewRect.top + newIframeOffset.y;
          const firstNewRectLeft = firstNewRect.left + newIframeOffset.x;

          let newLabelTop = firstNewRectTop + 2;
          let newLabelLeft = firstNewRectLeft + firstNewRect.width - labelWidth - 2;

          if (firstNewRect.width < labelWidth + 4 || firstNewRect.height < labelHeight + 4) {
            newLabelTop = firstNewRectTop - labelHeight - 2;
            newLabelLeft = firstNewRectLeft + firstNewRect.width - labelWidth;
            if (newLabelLeft < newIframeOffset.x) newLabelLeft = firstNewRectLeft;
          }

          // Ensure label stays within viewport bounds
          newLabelTop = Math.max(0, Math.min(newLabelTop, window.innerHeight - labelHeight));
          newLabelLeft = Math.max(0, Math.min(newLabelLeft, window.innerWidth - labelWidth));

          label.style.top = `${newLabelTop}px`;
          label.style.left = `${newLabelLeft}px`;
          label.style.display = 'block';
        } else if (label) {
          // Hide label if element has no rects anymore
          label.style.display = 'none';
        }
      };

      const throttleFunction = (func, delay) => {
        let lastCall = 0;
        return (...args) => {
          const now = performance.now();
          if (now - lastCall < delay) return;
          lastCall = now;
          return func(...args);
        };
      };

      const throttledUpdatePositions = throttleFunction(updatePositions, 16); // ~60fps
      window.addEventListener('scroll', throttledUpdatePositions, true);
      window.addEventListener('resize', throttledUpdatePositions);
      
      // Add cleanup function
      cleanupFn = () => {
        window.removeEventListener('scroll', throttledUpdatePositions, true);
        window.removeEventListener('resize', throttledUpdatePositions);
        // Remove overlay elements if needed
        overlays.forEach(overlay => overlay.element.remove());
        if (label) label.remove();
      };
      
      // Then add fragment to container in one operation
      container.appendChild(fragment);
      
      return index + 1;
    } finally {
      popTiming('highlighting');
      // Store cleanup function for later use
      if (cleanupFn) {
        // Keep a reference to cleanup functions in a global array
        (window._highlightCleanupFunctions = window._highlightCleanupFunctions || []).push(cleanupFn);
      }
    }
  }

  // Add this function to perform cleanup when needed
  function cleanupHighlights() {
    if (window._highlightCleanupFunctions && window._highlightCleanupFunctions.length) {
      window._highlightCleanupFunctions.forEach(fn => fn());
      window._highlightCleanupFunctions = [];
    }
    
    // Also remove the container
    const container = document.getElementById(HIGHLIGHT_CONTAINER_ID);
    if (container) container.remove();
  }

  function getElementPosition(currentElement) {
    if (!currentElement.parentElement) {
      return 0; // No parent means no siblings
    }
  
    const tagName = currentElement.nodeName.toLowerCase();
  
    const siblings = Array.from(currentElement.parentElement.children)
      .filter((sib) => sib.nodeName.toLowerCase() === tagName);
  
    if (siblings.length === 1) {
      return 0; // Only element of its type
    }
  
    const index = siblings.indexOf(currentElement) + 1; // 1-based index
    return index;
  }

  /**
   * Returns an XPath tree string for an element.
   */
  function getXPathTree(element, stopAtBoundary = true) {
    if (xpathCache.has(element)) return xpathCache.get(element);
    
    const segments = [];
    let currentElement = element;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      // Stop if we hit a shadow root or iframe
      if (
        stopAtBoundary &&
        (currentElement.parentNode instanceof ShadowRoot ||
          currentElement.parentNode instanceof HTMLIFrameElement)
      ) {
        break;
      }

      const position = getElementPosition(currentElement);
      const tagName = currentElement.nodeName.toLowerCase();
      const xpathIndex = position > 0 ? `[${position}]` : "";
      segments.unshift(`${tagName}${xpathIndex}`);

      currentElement = currentElement.parentNode;
    }

    const result = segments.join("/");
    xpathCache.set(element, result);
    return result;
  }

  /**
   * Checks if a text node is visible.
   */
  function isTextNodeVisible(textNode) {
    try {
      // Special case: when viewportExpansion is -1, consider all text nodes as visible
      if (viewportExpansion === -1) {
        // Still check parent visibility for basic filtering
        const parentElement = textNode.parentElement;
        if (!parentElement) return false;

        try {
          return parentElement.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          });
        } catch (e) {
          // Fallback if checkVisibility is not supported
          const style = window.getComputedStyle(parentElement);
          return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
        }
      }
      
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const rects = range.getClientRects(); // Use getClientRects for Range

      if (!rects || rects.length === 0) {
        return false;
      }

      let isAnyRectVisible = false;
      let isAnyRectInViewport = false;

      for (const rect of rects) {
        // Check size
        if (rect.width > 0 && rect.height > 0) {
          isAnyRectVisible = true;

          // Viewport check for this rect
          if (!(
            rect.bottom < -viewportExpansion ||
            rect.top > window.innerHeight + viewportExpansion ||
            rect.right < -viewportExpansion ||
            rect.left > window.innerWidth + viewportExpansion
          )) {
            isAnyRectInViewport = true;
            break; // Found a visible rect in viewport, no need to check others
          }
        }
      }

      if (!isAnyRectVisible || !isAnyRectInViewport) {
        return false;
      }

      // Check parent visibility
      const parentElement = textNode.parentElement;
      if (!parentElement) return false;

      try {
        return parentElement.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      } catch (e) {
        // Fallback if checkVisibility is not supported
        const style = window.getComputedStyle(parentElement);
        return style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';
      }
    } catch (e) {
      console.warn('Error checking text node visibility:', e);
      return false;
    }
  }

  // Helper function to check if element is accepted
  function isElementAccepted(element) {
    if (!element || !element.tagName) return false;

    // Always accept body and common container elements
    const alwaysAccept = new Set([
      "body", "div", "main", "article", "section", "nav", "header", "footer"
    ]);
    const tagName = element.tagName.toLowerCase();

    if (alwaysAccept.has(tagName)) return true;

    const leafElementDenyList = new Set([
      "svg",
      "script",
      "style",
      "link",
      "meta",
      "noscript",
      "template",
    ]);

    return !leafElementDenyList.has(tagName);
  }

  /**
   * Checks if an element is visible.
   */
  function isElementVisible(element) {
    const style = getCachedComputedStyle(element);

    //  Enhanced visibility check for CF and challenge elements
    // CF elements might have special display states
    const isBasicallyVisible = (
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );

    // If basically visible, return true
    if (isBasicallyVisible) {
      return true;
    }

    //  Special case for CF challenge elements that might be hidden but still interactive
    // Use enhanced CF detection
    if (isCloudflareChallengeElement(element)) {
      // For CF elements, be more lenient with visibility
      return style.display !== "none" && style.visibility !== "hidden";
    }

    return isBasicallyVisible;
  }

  /**
   * Checks if an element is interactive.
   * 
   * lots of comments, and uncommented code - to show the logic of what we already tried
   * 
   * One of the things we tried at the beginning was also to use event listeners, and other fancy class, style stuff -> what actually worked best was just combining most things with computed cursor style :)
   */
  function isInteractiveElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    // Cache the tagName and style lookups
    const tagName = element.tagName.toLowerCase();
    const style = getCachedComputedStyle(element);

    // Define interactive cursors
    const interactiveCursors = new Set([
      'pointer',    // Link/clickable elements
      'move',       // Movable elements
      'text',       // Text selection
      'grab',       // Grabbable elements
      'grabbing',   // Currently grabbing
      'cell',       // Table cell selection
      'copy',       // Copy operation
      'alias',      // Alias creation
      'all-scroll', // Scrollable content
      'col-resize', // Column resize
      'context-menu', // Context menu available
      'crosshair',  // Precise selection
      'e-resize',   // East resize
      'ew-resize',  // East-west resize
      'help',       // Help available
      'n-resize',   // North resize
      'ne-resize',  // Northeast resize
      'nesw-resize', // Northeast-southwest resize
      'ns-resize',  // North-south resize
      'nw-resize',  // Northwest resize
      'nwse-resize', // Northwest-southeast resize
      'row-resize', // Row resize
      's-resize',   // South resize
      'se-resize',  // Southeast resize
      'sw-resize',  // Southwest resize
      'vertical-text', // Vertical text selection
      'w-resize',   // West resize
      'zoom-in',    // Zoom in
      'zoom-out'    // Zoom out
    ]);

    // Define non-interactive cursors
    const nonInteractiveCursors = new Set([
      'not-allowed', // Action not allowed
      'no-drop',     // Drop not allowed
      'wait',        // Processing
      'progress',    // In progress
      'initial',     // Initial value
      'inherit'      // Inherited value
      //? Let's just include all potentially clickable elements that are not specifically blocked
      // 'none',        // No cursor
      // 'default',     // Default cursor 
      // 'auto',        // Browser default
    ]);

    function doesElementHaveInteractivePointer(element) {
      if (element.tagName.toLowerCase() === "html") return false;

      if (interactiveCursors.has(style.cursor)) return true;

      return false;
    }

    let isInteractiveCursor = doesElementHaveInteractivePointer(element);

    // Genius fix for almost all interactive elements
    if (isInteractiveCursor) {
      return true;
    }

    const interactiveElements = new Set([
      "a",          // Links
      "button",     // Buttons
      "input",      // All input types (text, checkbox, radio, etc.)
      "select",     // Dropdown menus
      "textarea",   // Text areas
      "details",    // Expandable details
      "summary",    // Summary element (clickable part of details)
      "label",      // Form labels (often clickable)
      "option",     // Select options
      "optgroup",   // Option groups
      "fieldset",   // Form fieldsets (can be interactive with legend)
      "legend",     // Fieldset legends
    ]);

    // Define explicit disable attributes and properties
    const explicitDisableTags = new Set([
      'disabled',           // Standard disabled attribute
      // 'aria-disabled',      // ARIA disabled state
      'readonly',          // Read-only state
      // 'aria-readonly',     // ARIA read-only state
      // 'aria-hidden',       // Hidden from accessibility
      // 'hidden',            // Hidden attribute
      // 'inert',             // Inert attribute
      // 'aria-inert',        // ARIA inert state
      // 'tabindex="-1"',     // Removed from tab order
      // 'aria-hidden="true"' // Hidden from screen readers
    ]);

    // handle inputs, select, checkbox, radio, textarea, button and make sure they are not cursor style disabled/not-allowed
    if (interactiveElements.has(tagName)) {
      // Check for non-interactive cursor
      if (nonInteractiveCursors.has(style.cursor)) {
        return false;
      }

      // Check for explicit disable attributes
      for (const disableTag of explicitDisableTags) {
        if (element.hasAttribute(disableTag) ||
          element.getAttribute(disableTag) === 'true' ||
          element.getAttribute(disableTag) === '') {
          return false;
        }
      }

      // Check for disabled property on form elements
      if (element.disabled) {
        return false;
      }

      // Check for readonly property on form elements
      if (element.readOnly) {
        return false;
      }

      // Check for inert property
      if (element.inert) {
        return false;
      }

      return true;
    }

    const role = element.getAttribute("role");
    const ariaRole = element.getAttribute("aria-role");

    // Check for contenteditable attribute
    if (element.getAttribute("contenteditable") === "true" || element.isContentEditable) {
      return true;
    }
    
    // Added enhancement to capture dropdown interactive elements
    if (element.classList && (
      element.classList.contains("button") ||
      element.classList.contains('dropdown-toggle') ||
      element.getAttribute('data-index') ||
      element.getAttribute('data-toggle') === 'dropdown' ||
      element.getAttribute('aria-haspopup') === 'true'
    )) {
      return true;
    }

    //  Enhanced CF (Cloudflare) challenge detection
    // Check for Cloudflare Turnstile checkbox patterns
    if (element.classList && (
      element.classList.contains('cb-c') ||      // CF checkbox container
      element.classList.contains('cb-lb') ||     // CF checkbox label
      element.classList.contains('cb-i') ||      // CF checkbox icon
      element.classList.contains('cb-lb-t') ||   // CF checkbox label text
      element.classList.contains('cb-container') || // CF container
      element.classList.contains('cf-turnstile') || // CF turnstile widget
      element.classList.contains('challenge-form') || // CF challenge form
      element.classList.contains('challenge-container') // CF challenge container
    )) {
      return true;
    }

    // 检查role="alert"的元素（CF经常使用这个）
    if (element.getAttribute('role') === 'alert') {
      return true;
    }

    // 检查包含CF相关文本的元素
    const text = element.textContent?.trim() || '';
    if (text.includes('确认您是真人') || text.includes('验证您是真人') ||
        text.includes('Verify you are human') || text.includes('确认是真人') ||
        text.includes('CLOUDFLARE') || text.includes('Cloudflare') ||
        text.includes('确认您是真人') || text.includes('验证') ||
        text.includes('人机验证') || text.includes('安全验证')) {
      return true;
    }

    // 检查元素的innerHTML是否包含CF相关内容
    const innerHTML = element.innerHTML || '';
    if (innerHTML.includes('cloudflare') || innerHTML.includes('turnstile') ||
        innerHTML.includes('challenge') || innerHTML.includes('verify')) {
      return true;
    }

    // Check for CF-specific attributes and IDs
    if (element.id && (
      element.id.includes('cf-') ||
      element.id.includes('turnstile') ||
      element.id.includes('challenge') ||
      element.id === 'content' && element.getAttribute('aria-live') === 'polite' // CF main container
    )) {
      return true;
    }

    // Check for CF-specific roles and ARIA attributes
    if (element.getAttribute('role') === 'alert' &&
        element.closest('[id*="cf"], [class*="cf"], [class*="turnstile"], [class*="challenge"]')) {
      return true;
    }

    //  Use enhanced CF detection function
    if (isCloudflareChallengeElement(element)) {
      return true;
    }

    //  Enhanced CF child element detection
    // Check if element is a child of CF challenge container
    const cfParent = element.closest('[class*="cb-"], [class*="cf-"], [id*="cf"], [id*="turnstile"], [id*="challenge"]');
    if (cfParent) {
      // For elements inside CF containers, be more aggressive in detection
      if (
        // Input elements in CF context
        (tagName === 'input' && element.type === 'checkbox') ||
        // Labels in CF context
        (tagName === 'label') ||
        // Spans that might be clickable in CF context
        (tagName === 'span' && (
          element.classList.contains('cb-i') ||
          element.classList.contains('cb-lb-t') ||
          element.textContent?.trim().length > 0
        )) ||
        // Divs with CF-specific classes
        (tagName === 'div' && element.classList && (
          element.classList.contains('cb-c') ||
          element.classList.contains('cb-lb')
        ))
      ) {
        return true;
      }
    }

    //  超强CF文本检测 - 检查任何包含CF相关文本的元素
    const elementText = element.textContent?.trim() || '';
    const elementHTML = element.innerHTML || '';
    if (elementText.includes('确认您是真人') || elementText.includes('CLOUDFLARE') ||
        elementText.includes('Cloudflare') || elementText.includes('验证') ||
        elementText.includes('人机验证') || elementText.includes('安全验证') ||
        elementHTML.includes('cloudflare') || elementHTML.includes('turnstile')) {
      return true;
    }

    //  检查是否在包含CF文本的父元素内
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentText = parent.textContent?.trim() || '';
      const parentHTML = parent.innerHTML || '';
      if (parentText.includes('确认您是真人') || parentText.includes('CLOUDFLARE') ||
          parentText.includes('Cloudflare') || parentText.includes('验证') ||
          parentText.includes('人机验证') || parentHTML.includes('cloudflare') ||
          parentHTML.includes('turnstile')) {
        // 如果父元素包含CF文本，则当前元素也应该被检测
        if (tagName === 'input' || tagName === 'label' || tagName === 'span' ||
            tagName === 'div' || tagName === 'button') {
          return true;
        }
      }
      parent = parent.parentElement;
    }

    const interactiveRoles = new Set([
      'button',           // Directly clickable element
      // 'link',            // Clickable link
      // 'menuitem',        // Clickable menu item
      'menuitemradio',   // Radio-style menu item (selectable)
      'menuitemcheckbox', // Checkbox-style menu item (toggleable)
      'radio',           // Radio button (selectable)
      'checkbox',        // Checkbox (toggleable)
      'tab',             // Tab (clickable to switch content)
      'switch',          // Toggle switch (clickable to change state)
      'slider',          // Slider control (draggable)
      'spinbutton',      // Number input with up/down controls
      'combobox',        // Dropdown with text input
      'searchbox',       // Search input field
      'textbox',         // Text input field
      // 'listbox',         // Selectable list
      'option',          // Selectable option in a list
      'scrollbar'        // Scrollable control
    ]);

    // Basic role/attribute checks
    const hasInteractiveRole =
      interactiveElements.has(tagName) ||
      interactiveRoles.has(role) ||
      interactiveRoles.has(ariaRole);

    if (hasInteractiveRole) return true;

    // check whether element has event listeners by window.getEventListeners
    try {
      if (typeof getEventListeners === 'function') {
        const listeners = getEventListeners(element);
        const mouseEvents = ['click', 'mousedown', 'mouseup', 'dblclick'];
        for (const eventType of mouseEvents) {
          if (listeners[eventType] && listeners[eventType].length > 0) {
            return true; // Found a mouse interaction listener
          }
        }
      }

      const getEventListenersForNode = element?.ownerDocument?.defaultView?.getEventListenersForNode || window.getEventListenersForNode;
      if (typeof getEventListenersForNode === 'function') {
        const listeners = getEventListenersForNode(element);
          const interactionEvents = ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'submit', 'change', 'input', 'focus', 'blur'];
          for (const eventType of interactionEvents) {
            for (const listener of listeners) {
              if (listener.type === eventType) {
                 return true; // Found a common interaction listener
              }
            }
          }
      }
      // Fallback: Check common event attributes if getEventListeners is not available (getEventListeners doesn't work in page.evaluate context)
        const commonMouseAttrs = ['onclick', 'onmousedown', 'onmouseup', 'ondblclick'];
        for (const attr of commonMouseAttrs) {
          if (element.hasAttribute(attr) || typeof element[attr] === 'function') {
            return true;
          }
        }
    } catch (e) {
      // console.warn(`Could not check event listeners for ${element.tagName}:`, e);
      // If checking listeners fails, rely on other checks
    }

    return false
  }


  /**
   * Checks if an element is the topmost element at its position.
   */
  function isTopElement(element) {
    // Special case: when viewportExpansion is -1, consider all elements as "top" elements
    if (viewportExpansion === -1) {
      return true;
    }
    
    const rects = getCachedClientRects(element); // Replace element.getClientRects()

    if (!rects || rects.length === 0) {
      return false; // No geometry, cannot be top
    }

    let isAnyRectInViewport = false;
    for (const rect of rects) {
      // Use the same logic as isInExpandedViewport check
      if (rect.width > 0 && rect.height > 0 && !( // Only check non-empty rects
        rect.bottom < -viewportExpansion ||
        rect.top > window.innerHeight + viewportExpansion ||
        rect.right < -viewportExpansion ||
        rect.left > window.innerWidth + viewportExpansion
      )) {
        isAnyRectInViewport = true;
        break;
      }
    }

    if (!isAnyRectInViewport) {
      return false; // All rects are outside the viewport area
    }


    // Find the correct document context and root element
    let doc = element.ownerDocument;

    // If we're in an iframe, elements are considered top by default
    if (doc !== window.document) {
      return true;
    }

    // For shadow DOM, we need to check within its own root context
    const shadowRoot = element.getRootNode();
    if (shadowRoot instanceof ShadowRoot) {
      const centerX = rects[Math.floor(rects.length / 2)].left + rects[Math.floor(rects.length / 2)].width / 2;
      const centerY = rects[Math.floor(rects.length / 2)].top + rects[Math.floor(rects.length / 2)].height / 2;

      try {
        const topEl = measureDomOperation(
          () => shadowRoot.elementFromPoint(centerX, centerY),
          'elementFromPoint'
        );
        if (!topEl) return false;

        let current = topEl;
        while (current && current !== shadowRoot) {
          if (current === element) return true;
          current = current.parentElement;
        }
        return false;
      } catch (e) {
        return true;
      }
    }

    // For elements in viewport, check if they're topmost
    const centerX = rects[Math.floor(rects.length / 2)].left + rects[Math.floor(rects.length / 2)].width / 2;
    const centerY = rects[Math.floor(rects.length / 2)].top + rects[Math.floor(rects.length / 2)].height / 2;

    try {
      const topEl = document.elementFromPoint(centerX, centerY);
      if (!topEl) return false;

      let current = topEl;
      while (current && current !== document.documentElement) {
        if (current === element) return true;
        current = current.parentElement;
      }
      return false;
    } catch (e) {
      return true;
    }
  }

  /**
   * Checks if an element is within the expanded viewport.
   */
  function isInExpandedViewport(element, viewportExpansion) {
    if (viewportExpansion === -1) {
      return true;
    }

    const rects = element.getClientRects(); // Use getClientRects

    if (!rects || rects.length === 0) {
      // Fallback to getBoundingClientRect if getClientRects is empty,
      // useful for elements like <svg> that might not have client rects but have a bounding box.
      const boundingRect = getCachedBoundingRect(element);
      if (!boundingRect || boundingRect.width === 0 || boundingRect.height === 0) {
        return false;
      }
      return !(
        boundingRect.bottom < -viewportExpansion ||
        boundingRect.top > window.innerHeight + viewportExpansion ||
        boundingRect.right < -viewportExpansion ||
        boundingRect.left > window.innerWidth + viewportExpansion
      );
    }

    // Check if *any* client rect is within the viewport
    for (const rect of rects) {
      if (rect.width === 0 || rect.height === 0) continue; // Skip empty rects

      if (!(
        rect.bottom < -viewportExpansion ||
        rect.top > window.innerHeight + viewportExpansion ||
        rect.right < -viewportExpansion ||
        rect.left > window.innerWidth + viewportExpansion
      )) {
        return true; // Found at least one rect in the viewport
      }
    }

    return false; // No rects were found in the viewport
  }

  // Add this new helper function
  function getEffectiveScroll(element) {
    let currentEl = element;
    let scrollX = 0;
    let scrollY = 0;

    return measureDomOperation(() => {
      while (currentEl && currentEl !== document.documentElement) {
        if (currentEl.scrollLeft || currentEl.scrollTop) {
          scrollX += currentEl.scrollLeft;
          scrollY += currentEl.scrollTop;
        }
        currentEl = currentEl.parentElement;
      }

      scrollX += window.scrollX;
      scrollY += window.scrollY;

      return { scrollX, scrollY };
    }, 'scrollOperations');
  }

  // Add these helper functions at the top level
  function isInteractiveCandidate(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    const tagName = element.tagName.toLowerCase();

    // Fast-path for common interactive elements
    const interactiveElements = new Set([
      "a", "button", "input", "select", "textarea", "details", "summary", "label"
    ]);

    if (interactiveElements.has(tagName)) return true;

    // Quick attribute checks without getting full lists
    const hasQuickInteractiveAttr = element.hasAttribute("onclick") ||
      element.hasAttribute("role") ||
      element.hasAttribute("tabindex") ||
      element.hasAttribute("aria-") ||
      element.hasAttribute("data-action") ||
      element.getAttribute("contenteditable") === "true";

    return hasQuickInteractiveAttr;
  }

  // 增强：检查元素是否可输入文
  function isInputElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    const tagName = element.tagName.toLowerCase();
    const style = window.getComputedStyle(element);

    // 检查非交互式光标样式
    const nonInteractiveCursors = new Set([
      'not-allowed', 'disabled', 'default'
    ]);

    // 文本域
    if (tagName === 'textarea') {
      if (nonInteractiveCursors.has(style.cursor)) return false;
      return !element.readOnly && !element.disabled && !element.inert;
    }

    // 输入框
    if (tagName === 'input') {
      const inputType = (element.type || 'text').toLowerCase();
      const textInputTypes = ['text', 'search', 'email', 'password', 'tel', 'url', 'number'];

      if (!textInputTypes.includes(inputType)) return false;
      if (nonInteractiveCursors.has(style.cursor)) return false;
      return !element.readOnly && !element.disabled && !element.inert;
    }

    // 可编辑内容
    if (element.contentEditable === 'true' || element.isContentEditable) {
      if (nonInteractiveCursors.has(style.cursor)) return false;
      return !element.inert;
    }

    // 检查具有 textbox 或 searchbox 角色的元素
    const role = element.getAttribute('role');
    if (role === 'textbox' || role === 'searchbox') {
      if (nonInteractiveCursors.has(style.cursor)) return false;
      return !element.inert;
    }

    return false;
  }

  // 新增：检查元素是否可点击但不可输入
  function isClickableOnlyElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    const tagName = element.tagName.toLowerCase();

    // 明确的点击元素
    if (tagName === 'button' || tagName === 'a') {
      return true;
    }

    // 特殊输入类型（按钮类）
    if (tagName === 'input') {
      const inputType = (element.type || 'text').toLowerCase();
      const buttonTypes = ['button', 'submit', 'reset', 'checkbox', 'radio', 'file'];
      return buttonTypes.includes(inputType);
    }

    //  Enhanced checkbox detection for CF and other challenges
    // Check if element contains or is related to checkbox functionality
    if (tagName === 'label' && element.querySelector('input[type="checkbox"]')) {
      return true;
    }

    // Check for elements that wrap checkbox inputs (common in CF)
    if (element.querySelector && element.querySelector('input[type="checkbox"]')) {
      return true;
    }

    // 有点击事件的元素
    if (element.onclick || element.hasAttribute('onclick')) {
      return true;
    }

    // 有按钮角色的元素
    const role = element.getAttribute('role');
    if (role === 'button' || role === 'link') {
      return true;
    }

    return false;
  }

  // --- Define constants for distinct interaction check ---
  const DISTINCT_INTERACTIVE_TAGS = new Set([
    'a', 'button', 'input', 'select', 'textarea', 'summary', 'details', 'label', 'option'
  ]);
  const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'menuitem', 'menuitemradio', 'menuitemcheckbox',
    'radio', 'checkbox', 'tab', 'switch', 'slider', 'spinbutton',
    'combobox', 'searchbox', 'textbox', 'listbox', 'option', 'scrollbar'
  ]);

  /**
   * Heuristically determines if an element should be considered as independently interactive,
   * even if it's nested inside another interactive container.
   *
   * This function helps detect deeply nested actionable elements (e.g., menu items within a button)
   * that may not be picked up by strict interactivity checks.
   */
  function isHeuristicallyInteractive(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    // Skip non-visible elements early for performance
    if (!isElementVisible(element)) return false;

    // Check for common attributes that often indicate interactivity
    const hasInteractiveAttributes =
      element.hasAttribute('role') ||
      element.hasAttribute('tabindex') ||
      element.hasAttribute('onclick') ||
      typeof element.onclick === 'function';

    // Check for semantic class names suggesting interactivity
    const hasInteractiveClass = /\b(btn|clickable|menu|item|entry|link)\b/i.test(element.className || '');

    // Determine whether the element is inside a known interactive container
    const isInKnownContainer = Boolean(
      element.closest('button,a,[role="button"],.menu,.dropdown,.list,.toolbar')
    );

    // Ensure the element has at least one visible child (to avoid marking empty wrappers)
    const hasVisibleChildren = [...element.children].some(isElementVisible);

    // Avoid highlighting elements whose parent is <body> (top-level wrappers)
    const isParentBody = element.parentElement && element.parentElement.isSameNode(document.body);

    return (
      (isInteractiveElement(element) || hasInteractiveAttributes || hasInteractiveClass) &&
      hasVisibleChildren &&
      isInKnownContainer &&
      !isParentBody
    );
  }

  /**
   * Checks if an element likely represents a distinct interaction
   * separate from its parent (if the parent is also interactive).
   */
  function isElementDistinctInteraction(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');

    // Check if it's an iframe - always distinct boundary
    if (tagName === 'iframe') {
      return true;
    }

    // Check tag name
    if (DISTINCT_INTERACTIVE_TAGS.has(tagName)) {
      return true;
    }
    // Check interactive roles
    if (role && INTERACTIVE_ROLES.has(role)) {
      return true;
    }
    // Check contenteditable
    if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
      return true;
    }
    // Check for common testing/automation attributes
    if (element.hasAttribute('data-testid') || element.hasAttribute('data-cy') || element.hasAttribute('data-test')) {
      return true;
    }
    // Check for explicit onclick handler (attribute or property)
    if (element.hasAttribute('onclick') || typeof element.onclick === 'function') {
      return true;
    }
    
    // Check for other common interaction event listeners
    try {
      const getEventListenersForNode = element?.ownerDocument?.defaultView?.getEventListenersForNode || window.getEventListenersForNode;
      if (typeof getEventListenersForNode === 'function') {
        const listeners = getEventListenersForNode(element);
        const interactionEvents = ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'submit', 'change', 'input', 'focus', 'blur'];
        for (const eventType of interactionEvents) {
          for (const listener of listeners) {
            if (listener.type === eventType) {
               return true; // Found a common interaction listener
            }
          }
        }
      }
      // Fallback: Check common event attributes if getEventListeners is not available (getEventListenersForNode doesn't work in page.evaluate context)
        const commonEventAttrs = ['onmousedown', 'onmouseup', 'onkeydown', 'onkeyup', 'onsubmit', 'onchange', 'oninput', 'onfocus', 'onblur'];
        if (commonEventAttrs.some(attr => element.hasAttribute(attr))) {
          return true;
        }
    } catch (e) {
      // console.warn(`Could not check event listeners for ${element.tagName}:`, e);
      // If checking listeners fails, rely on other checks
    }

    // if the element is not strictly interactive but appears clickable based on heuristic signals
    if (isHeuristicallyInteractive(element)) {
      return true;
    }

    // Default to false: if it's interactive but doesn't match above,
    // assume it triggers the same action as the parent.
    return false;
  }
  // --- End distinct interaction check ---

  /**
   *  Enhanced Cloudflare challenge detection
   * Detects various CF challenge patterns including Turnstile, checkbox challenges, etc.
   */
  function isCloudflareChallengeElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    // Check element classes
    if (element.classList) {
      const cfClasses = [
        'cf-turnstile', 'challenge-form', 'challenge-container',
        'cb-c', 'cb-lb', 'cb-i', 'cb-lb-t', // CF checkbox classes
        'cf-challenge', 'cf-wrapper', 'cf-content'
      ];

      for (const cfClass of cfClasses) {
        if (element.classList.contains(cfClass)) return true;
      }
    }

    // Check element IDs
    if (element.id) {
      const cfIdPatterns = [
        'cf-', 'turnstile', 'challenge', 'content', 'RInW4', // CF specific IDs
        'verifying', 'success', 'fail', 'expired', 'timeout'
      ];

      for (const pattern of cfIdPatterns) {
        if (element.id.includes(pattern)) return true;
      }
    }

    // Check for CF-specific attributes
    if (element.getAttribute('aria-live') === 'polite' ||
        element.getAttribute('aria-atomic') === 'true' ||
        element.getAttribute('role') === 'alert') {

      // Verify it's in a CF context
      const cfContext = element.closest('[class*="cf"], [class*="turnstile"], [class*="challenge"], [id*="cf"], [id*="turnstile"]');
      if (cfContext) return true;
    }

    // Check for nested checkbox in CF context
    if (element.tagName.toLowerCase() === 'label' || element.tagName.toLowerCase() === 'div') {
      const hasCheckbox = element.querySelector('input[type="checkbox"]');
      if (hasCheckbox) {
        // Check if it's in a CF-like structure
        const cfParent = element.closest('[class*="cb-"], [id*="cf"], [class*="challenge"]');
        if (cfParent) return true;
      }
    }

    //  Enhanced CF child element detection
    // Check if element is inside a CF container
    const cfContainer = element.closest('[class*="cb-"], [class*="cf-"], [id*="cf"], [id*="turnstile"], [id*="challenge"], [role="alert"]');
    if (cfContainer) {
      const tagName = element.tagName.toLowerCase();

      // CF checkbox input - 任何在CF容器内的复选框都应该被检测
      if (tagName === 'input' && element.type === 'checkbox') return true;

      // CF label elements - 任何在CF容器内的标签都应该被检测
      if (tagName === 'label') return true;

      // CF interactive spans - 更宽松的检测条件
      if (tagName === 'span') {
        // 有CF相关类名的span
        if (element.classList && (
          element.classList.contains('cb-i') ||
          element.classList.contains('cb-lb-t')
        )) return true;

        // 包含CF相关文本的span
        const text = element.textContent?.trim() || '';
        if (text.includes('确认') || text.includes('验证') || text.includes('真人') ||
            text.includes('Verify') || text.includes('human') || text.includes('robot')) {
          return true;
        }

        // 任何在CF容器内有文本内容的span
        if (text.length > 0) return true;
      }

      // CF clickable divs - 更宽松的检测条件
      if (tagName === 'div') {
        if (element.classList && (
          element.classList.contains('cb-c') ||
          element.classList.contains('cb-lb') ||
          element.classList.contains('cb-container')
        )) return true;

        // 有role="alert"的div
        if (element.getAttribute('role') === 'alert') return true;
      }
    }

    // Check for CF branding or links
    if (element.querySelector && element.querySelector('a[href*="cloudflare.com"]')) {
      return true;
    }

    return false;
  }

  /**
   * Handles the logic for deciding whether to highlight an element and performing the highlight.
   */
  function handleHighlighting(nodeData, node, parentIframe, isParentHighlighted) {
    if (!nodeData.isInteractive) return false; // Not interactive, definitely don't highlight

    let shouldHighlight = false;
    if (!isParentHighlighted) {
      // Parent wasn't highlighted, this interactive node can be highlighted.
      shouldHighlight = true;
    } else {
      // Parent *was* highlighted. Only highlight this node if it represents a distinct interaction.
      if (isElementDistinctInteraction(node)) {
        shouldHighlight = true;
      } else {
        // console.log(`Skipping highlight for ${nodeData.tagName} (parent highlighted)`);
        shouldHighlight = false;
      }
    }

    if (shouldHighlight) {
      // Check viewport status before assigning index and highlighting
      nodeData.isInViewport = isInExpandedViewport(node, viewportExpansion);
      
      // When viewportExpansion is -1, all interactive elements should get a highlight index
      // regardless of viewport status
      if (nodeData.isInViewport || viewportExpansion === -1) {
        nodeData.highlightIndex = highlightIndex++;

        if (doHighlightElements) {
          if (focusHighlightIndex >= 0) {
            if (focusHighlightIndex === nodeData.highlightIndex) {
              highlightElement(node, nodeData.highlightIndex, parentIframe);
            }
          } else {
            highlightElement(node, nodeData.highlightIndex, parentIframe);
          }
          return true; // Successfully highlighted
        }
      } else {
        // console.log(`Skipping highlight for ${nodeData.tagName} (outside viewport)`);
      }
    }

    return false; // Did not highlight
  }

  /**
   * Creates a node data object for a given node and its descendants.
   */
  function buildDomTree(node, parentIframe = null, isParentHighlighted = false) {
    // Fast rejection checks first
    if (!node || node.id === HIGHLIGHT_CONTAINER_ID || 
        (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE)) {
      if (debugMode) PERF_METRICS.nodeMetrics.skippedNodes++;
      return null;
    }

    if (debugMode) PERF_METRICS.nodeMetrics.totalNodes++;

    if (!node || node.id === HIGHLIGHT_CONTAINER_ID) {
      if (debugMode) PERF_METRICS.nodeMetrics.skippedNodes++;
      return null;
    }

    // Special handling for root node (body)
    if (node === document.body) {
      const nodeData = {
        tagName: 'body',
        attributes: {},
        xpath: '/body',
        children: [],
      };

      // Process children of body
      for (const child of node.childNodes) {
        const domElement = buildDomTree(child, parentIframe, false); // Body's children have no highlighted parent initially
        if (domElement) nodeData.children.push(domElement);
      }

      //  Enhanced iframe detection for CF challenges
      // Check for iframes that might contain CF challenges
      const iframes = node.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          // Try to access iframe content (will fail for cross-origin)
          if (iframe.contentDocument && iframe.contentDocument.body) {
            const iframeElement = buildDomTree(iframe.contentDocument.body, iframe, false);
            if (iframeElement) nodeData.children.push(iframeElement);
          }
        } catch (e) {
          // Cross-origin iframe, check if it's a CF challenge iframe
          const isCFIframe =
            iframe.title?.includes('Cloudflare') ||
            iframe.title?.includes('security challenge') ||
            iframe.title?.includes('Widget containing') ||
            iframe.title?.includes('challenge') ||
            iframe.src?.includes('cloudflare') ||
            iframe.src?.includes('challenges.cloudflare') ||
            iframe.src?.includes('turnstile') ||
            iframe.src?.includes('cf-') ||
            iframe.className?.includes('cf-') ||
            iframe.className?.includes('turnstile') ||
            iframe.id?.includes('cf') ||
            iframe.id?.includes('turnstile') ||
            // 检查iframe的父容器是否有CF相关类名
            iframe.closest('[class*="cf-"], [class*="turnstile"], [id*="cf"], [id*="turnstile"]');

          const iframeData = {
            tagName: 'iframe',
            attributes: {
              src: iframe.src || '',
              id: iframe.id || '',
              title: iframe.title || '',
              class: iframe.className || ''
            },
            xpath: getXPathTree(iframe, true),
            children: [],
            isInteractive: true,
            interactionType: isCFIframe ? 'cf-iframe' : 'iframe',
            text: isCFIframe ? 'Cloudflare Security Challenge' : 'Cross-origin iframe'
          };

          //  For CF iframes, create virtual child elements representing the checkbox
          if (isCFIframe) {
            //  创建更精确的CF虚拟复选框元素
            // 获取iframe的位置信息用于精确定位
            const iframeRect = iframe.getBoundingClientRect();

            // Create virtual CF checkbox element with precise positioning
            const virtualCheckbox = {
              tagName: 'input',
              attributes: {
                type: 'checkbox',
                class: 'cf-turnstile-checkbox virtual-cf-element',
                'data-virtual': 'true',
                'data-cf-iframe-id': iframe.id || 'cf-iframe',
                'data-iframe-src': iframe.src || ''
              },
              xpath: getXPathTree(iframe, true) + '/virtual-checkbox',
              children: [],
              isInteractive: true,
              interactionType: 'cf-checkbox',
              text: '确认您是真人',
              // 添加位置信息，让AI知道这是CF复选框的精确位置
              rect: {
                x: iframeRect.x + 10, // iframe内部偏移
                y: iframeRect.y + 10,
                width: Math.max(20, iframeRect.width - 20),
                height: Math.max(20, iframeRect.height - 20)
              },
              // 标记为高优先级CF元素
              cfPriority: 'high',
              cfType: 'checkbox'
            };
            const checkboxId = `${ID.current++}`;
            DOM_HASH_MAP[checkboxId] = virtualCheckbox;
            iframeData.children.push(checkboxId);

            // Create virtual CF container element (clickable area)
            const virtualContainer = {
              tagName: 'div',
              attributes: {
                class: 'cf-turnstile-container virtual-cf-element',
                'data-virtual': 'true',
                'data-cf-iframe-id': iframe.id || 'cf-iframe',
                role: 'button',
                'aria-label': '确认您是真人'
              },
              xpath: getXPathTree(iframe, true) + '/virtual-container',
              children: [],
              isInteractive: true,
              interactionType: 'cf-container',
              text: 'Cloudflare 安全验证',
              // 使用iframe的完整区域作为点击区域
              rect: {
                x: iframeRect.x,
                y: iframeRect.y,
                width: iframeRect.width,
                height: iframeRect.height
              },
              cfPriority: 'highest',
              cfType: 'container'
            };
            const containerId = `${ID.current++}`;
            DOM_HASH_MAP[containerId] = virtualContainer;
            iframeData.children.push(containerId);
          }

          const id = `${ID.current++}`;
          DOM_HASH_MAP[id] = iframeData;
          nodeData.children.push(id);
        }
      }

      const id = `${ID.current++}`;
      DOM_HASH_MAP[id] = nodeData;
      if (debugMode) PERF_METRICS.nodeMetrics.processedNodes++;
      return id;
    }

    // Early bailout for non-element nodes except text
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
      if (debugMode) PERF_METRICS.nodeMetrics.skippedNodes++;
      return null;
    }

    // Process text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent.trim();
      if (!textContent) {
        if (debugMode) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }

      // Only check visibility for text nodes that might be visible
      const parentElement = node.parentElement;
      if (!parentElement || parentElement.tagName.toLowerCase() === 'script') {
        if (debugMode) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }

      const id = `${ID.current++}`;
      DOM_HASH_MAP[id] = {
        type: "TEXT_NODE",
        text: textContent,
        isVisible: isTextNodeVisible(node),
      };
      if (debugMode) PERF_METRICS.nodeMetrics.processedNodes++;
      return id;
    }

    // Quick checks for element nodes
    if (node.nodeType === Node.ELEMENT_NODE && !isElementAccepted(node)) {
      if (debugMode) PERF_METRICS.nodeMetrics.skippedNodes++;
      return null;
    }

    //  CF元素特殊处理 - 在可见性检查之前检查CF元素
    const isCFElement = (
      (node.id && (node.id.includes('cf-') || node.id.includes('turnstile') || node.id.includes('challenge'))) ||
      (node.classList && (
        node.classList.contains('cf-turnstile') ||
        node.classList.contains('challenge-form') ||
        node.classList.contains('cb-c') ||
        node.classList.contains('cb-lb')
      )) ||
      node.getAttribute('aria-live') === 'polite' ||
      node.getAttribute('role') === 'alert'
    );

    // Early viewport check - only filter out elements clearly outside viewport
    if (viewportExpansion !== -1 && !isCFElement) { //  CF元素跳过可见性检查
      const rect = getCachedBoundingRect(node); // Keep for initial quick check
      const style = getCachedComputedStyle(node);

      // Skip viewport check for fixed/sticky elements as they may appear anywhere
      const isFixedOrSticky = style && (style.position === 'fixed' || style.position === 'sticky');

      // Check if element has actual dimensions using offsetWidth/Height (quick check)
      const hasSize = node.offsetWidth > 0 || node.offsetHeight > 0;

      // Use getBoundingClientRect for the quick OUTSIDE check.
      // isInExpandedViewport will do the more accurate check later if needed.
      if (!rect || (!isFixedOrSticky && !hasSize && (
        rect.bottom < -viewportExpansion ||
        rect.top > window.innerHeight + viewportExpansion ||
        rect.right < -viewportExpansion ||
        rect.left > window.innerWidth + viewportExpansion
      ))) {
        // console.log("Skipping node outside viewport (quick check):", node.tagName, rect);
        if (debugMode) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }
    }

    // Process element node
    const nodeData = {
      tagName: node.tagName.toLowerCase(),
      attributes: {},
      xpath: getXPathTree(node, true),
      children: [],
      // 新增：元素交互类型分类
      interactionType: 'none',
      isInputElement: false,
      isClickableOnly: false,
    };

    // 分类元素交互类型
    if (isInputElement(node)) {
      nodeData.interactionType = 'input';
      nodeData.isInputElement = true;
      // 调试日志：输入元素
      if (node.id === 'kw' || node.name === 'wd') {
        console.log(`✅ [buildDomTree] 检测到输入元素: ${node.tagName} id="${node.id}" name="${node.name}"`);
      }
    } else if (isClickableOnlyElement(node)) {
      nodeData.interactionType = 'click';
      nodeData.isClickableOnly = true;
      // 调试日志：仅可点击元素
      if (node.tagName.toLowerCase() === 'a') {
        console.log(`🔗 [buildDomTree] 检测到链接元素: ${node.tagName} href="${node.href}" text="${node.textContent?.trim()}"`);
      }
    } else if (isInteractiveCandidate(node)) {
      nodeData.interactionType = 'interactive';
      // 调试日志：交互元素
      if (node.id === 'kw' || node.name === 'wd') {
        console.log(`🔄 [buildDomTree] 检测到交互元素: ${node.tagName} id="${node.id}" name="${node.name}"`);
      }
    }

    // Get attributes for interactive elements or potential text containers
    if (isInteractiveCandidate(node) || node.tagName.toLowerCase() === 'iframe' || node.tagName.toLowerCase() === 'body') {
      const attributeNames = node.getAttributeNames?.() || [];
      for (const name of attributeNames) {
        nodeData.attributes[name] = node.getAttribute(name);
      }
    }

    let nodeWasHighlighted = false;
    // Perform visibility, interactivity, and highlighting checks
    if (node.nodeType === Node.ELEMENT_NODE) {
      nodeData.isVisible = isElementVisible(node); // isElementVisible uses offsetWidth/Height, which is fine
      if (nodeData.isVisible) {
        nodeData.isTopElement = isTopElement(node);
        if (nodeData.isTopElement) {
          nodeData.isInteractive = isInteractiveElement(node);
          // Call the dedicated highlighting function
          nodeWasHighlighted = handleHighlighting(nodeData, node, parentIframe, isParentHighlighted);
        }
      }
    }

    // Process children, with special handling for iframes and rich text editors
    if (node.tagName) {
      const tagName = node.tagName.toLowerCase();

      // Handle iframes
      if (tagName === "iframe") {
        try {
          const iframeDoc = node.contentDocument || node.contentWindow?.document;
          if (iframeDoc) {
            for (const child of iframeDoc.childNodes) {
              const domElement = buildDomTree(child, node, false);
              if (domElement) nodeData.children.push(domElement);
            }
          }
        } catch (e) {
          console.warn("Unable to access iframe:", e);
          //  For cross-origin iframes (like CF), still mark as interactive
          nodeData.isInteractive = true;
          nodeData.interactionType = 'iframe';
        }
      }
      //  Enhanced CF challenge container detection
      else if (
        // CF challenge containers
        (node.id && (node.id.includes('cf-') || node.id.includes('turnstile') || node.id.includes('challenge'))) ||
        (node.classList && (
          node.classList.contains('cf-turnstile') ||
          node.classList.contains('challenge-form') ||
          node.classList.contains('cb-c') ||
          node.classList.contains('cb-lb')
        )) ||
        // Elements with CF-specific attributes
        node.getAttribute('aria-live') === 'polite' ||
        node.getAttribute('role') === 'alert'
      ) {
        // Force process CF challenge elements even if they seem non-interactive
        nodeData.isInteractive = true;

        // 为CF容器创建虚拟子元素，确保有可点击的复选框
        if (node.id === 'cf-turnstile' || node.classList?.contains('cf-turnstile')) {
          const containerRect = node.getBoundingClientRect();

          // 创建虚拟CF复选框 - 位于容器中心
          const virtualCFCheckbox = {
            tagName: 'input',
            attributes: {
              type: 'checkbox',
              class: 'cf-virtual-checkbox',
              'data-virtual': 'true',
              'data-cf-container': node.id || 'cf-turnstile'
            },
            xpath: getXPathTree(node, true) + '/virtual-cf-checkbox',
            children: [],
            isInteractive: true,
            interactionType: 'cf-checkbox',
            text: '确认您是真人',
            rect: {
              x: containerRect.x + containerRect.width * 0.1,
              y: containerRect.y + containerRect.height * 0.1,
              width: containerRect.width * 0.8,
              height: containerRect.height * 0.8
            },
            cfPriority: 'highest',
            cfType: 'direct-checkbox'
          };
          const cfCheckboxId = `${ID.current++}`;
          DOM_HASH_MAP[cfCheckboxId] = virtualCFCheckbox;
          nodeData.children.push(cfCheckboxId);
          console.log(`✅ 创建虚拟CF复选框，ID: ${cfCheckboxId}`);

          // 创建虚拟CF标签
          const virtualCFLabel = {
            tagName: 'label',
            attributes: {
              class: 'cf-virtual-label',
              'data-virtual': 'true',
              'data-cf-container': node.id || 'cf-turnstile',
              'for': 'cf-virtual-checkbox'
            },
            xpath: getXPathTree(node, true) + '/virtual-cf-label',
            children: [],
            isInteractive: true,
            interactionType: 'cf-label',
            text: '确认您是真人',
            rect: {
              x: containerRect.x,
              y: containerRect.y,
              width: containerRect.width,
              height: containerRect.height
            },
            cfPriority: 'high',
            cfType: 'direct-label'
          };
          const cfLabelId = `${ID.current++}`;
          DOM_HASH_MAP[cfLabelId] = virtualCFLabel;
          nodeData.children.push(cfLabelId);
          console.log(`✅ 创建虚拟CF标签，ID: ${cfLabelId}`);

          // 标记为CF容器
          nodeData.cfContainer = true;
          nodeData.cfType = 'turnstile-container';
          nodeData.interactionType = 'cf-container';
        }
        nodeData.interactionType = 'cf-challenge';

        //  Process all child nodes and ALLOW them to be highlighted independently
        // This ensures CF checkbox internal elements (input, label, span) get detected
        for (const child of node.childNodes) {
          const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted); // Allow child highlighting
          if (domElement) nodeData.children.push(domElement);
        }
      }
      // Handle rich text editors and contenteditable elements
      else if (
        node.isContentEditable ||
        node.getAttribute("contenteditable") === "true" ||
        node.id === "tinymce" ||
        node.classList.contains("mce-content-body") ||
        (tagName === "body" && node.getAttribute("data-id")?.startsWith("mce_"))
      ) {
        // Process all child nodes to capture formatted text
        for (const child of node.childNodes) {
          const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted);
          if (domElement) nodeData.children.push(domElement);
        }
      }
      else {
        // Handle shadow DOM
        if (node.shadowRoot) {
          nodeData.shadowRoot = true;
          for (const child of node.shadowRoot.childNodes) {
            const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted);
            if (domElement) nodeData.children.push(domElement);
          }
        }
        // Handle regular elements
        for (const child of node.childNodes) {
          // Pass the highlighted status of the *current* node to its children
          const passHighlightStatusToChild = nodeWasHighlighted || isParentHighlighted;
          const domElement = buildDomTree(child, parentIframe, passHighlightStatusToChild);
          if (domElement) nodeData.children.push(domElement);
        }
      }
    }

    // Skip empty anchor tags only if they have no dimensions and no children
    if (nodeData.tagName === 'a' && nodeData.children.length === 0 && !nodeData.attributes.href) {
      // Check if the anchor has actual dimensions
      const rect = getCachedBoundingRect(node);
      const hasSize = (rect && rect.width > 0 && rect.height > 0) || (node.offsetWidth > 0 || node.offsetHeight > 0);
      
      if (!hasSize) {
        if (debugMode) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }
    }

    const id = `${ID.current++}`;
    DOM_HASH_MAP[id] = nodeData;
    if (debugMode) PERF_METRICS.nodeMetrics.processedNodes++;
    return id;
  }

  // After all functions are defined, wrap them with performance measurement
  // Remove buildDomTree from here as we measure it separately
  highlightElement = measureTime(highlightElement);
  isInteractiveElement = measureTime(isInteractiveElement);
  isElementVisible = measureTime(isElementVisible);
  isTopElement = measureTime(isTopElement);
  isInExpandedViewport = measureTime(isInExpandedViewport);
  isTextNodeVisible = measureTime(isTextNodeVisible);
  getEffectiveScroll = measureTime(getEffectiveScroll);

  const rootId = buildDomTree(document.body);

  // Clear the cache before starting
  DOM_CACHE.clearCache();

  // Only process metrics in debug mode
  if (debugMode && PERF_METRICS) {
    // Convert timings to seconds and add useful derived metrics
    Object.keys(PERF_METRICS.timings).forEach(key => {
      PERF_METRICS.timings[key] = PERF_METRICS.timings[key] / 1000;
    });

    Object.keys(PERF_METRICS.buildDomTreeBreakdown).forEach(key => {
      if (typeof PERF_METRICS.buildDomTreeBreakdown[key] === 'number') {
        PERF_METRICS.buildDomTreeBreakdown[key] = PERF_METRICS.buildDomTreeBreakdown[key] / 1000;
      }
    });

    // Add some useful derived metrics
    if (PERF_METRICS.buildDomTreeBreakdown.buildDomTreeCalls > 0) {
      PERF_METRICS.buildDomTreeBreakdown.averageTimePerNode =
        PERF_METRICS.buildDomTreeBreakdown.totalTime / PERF_METRICS.buildDomTreeBreakdown.buildDomTreeCalls;
    }

    PERF_METRICS.buildDomTreeBreakdown.timeInChildCalls =
      PERF_METRICS.buildDomTreeBreakdown.totalTime - PERF_METRICS.buildDomTreeBreakdown.totalSelfTime;

    // Add average time per operation to the metrics
    Object.keys(PERF_METRICS.buildDomTreeBreakdown.domOperations).forEach(op => {
      const time = PERF_METRICS.buildDomTreeBreakdown.domOperations[op];
      const count = PERF_METRICS.buildDomTreeBreakdown.domOperationCounts[op];
      if (count > 0) {
        PERF_METRICS.buildDomTreeBreakdown.domOperations[`${op}Average`] = time / count;
      }
    });

    // Calculate cache hit rates
    const boundingRectTotal = PERF_METRICS.cacheMetrics.boundingRectCacheHits + PERF_METRICS.cacheMetrics.boundingRectCacheMisses;
    const computedStyleTotal = PERF_METRICS.cacheMetrics.computedStyleCacheHits + PERF_METRICS.cacheMetrics.computedStyleCacheMisses;

    if (boundingRectTotal > 0) {
      PERF_METRICS.cacheMetrics.boundingRectHitRate = PERF_METRICS.cacheMetrics.boundingRectCacheHits / boundingRectTotal;
    }

    if (computedStyleTotal > 0) {
      PERF_METRICS.cacheMetrics.computedStyleHitRate = PERF_METRICS.cacheMetrics.computedStyleCacheHits / computedStyleTotal;
    }

    if ((boundingRectTotal + computedStyleTotal) > 0) {
      PERF_METRICS.cacheMetrics.overallHitRate =
        (PERF_METRICS.cacheMetrics.boundingRectCacheHits + PERF_METRICS.cacheMetrics.computedStyleCacheHits) /
        (boundingRectTotal + computedStyleTotal);
    }
  }

  return debugMode ?
    { rootId, map: DOM_HASH_MAP, perfMetrics: PERF_METRICS } :
    { rootId, map: DOM_HASH_MAP };
}
