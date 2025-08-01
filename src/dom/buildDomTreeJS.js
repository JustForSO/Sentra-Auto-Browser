function buildDomTree(args = {
  doHighlightElements: true,
  focusHighlightIndex: -1,
  viewportExpansion: 0,
  debugMode: false,
}) {
  const { doHighlightElements, focusHighlightIndex, viewportExpansion, debugMode } = args;
  let highlightIndex = 0; // Reset highlight index

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
   */
  const DOM_HASH_MAP = {};

  const ID = { current: 0 };

  const HIGHLIGHT_CONTAINER_ID = "playwright-highlight-container";

  // Add a WeakMap cache for XPath strings
  const xpathCache = new WeakMap();

  // Add element visibility map for viewport observer
  const elementVisibilityMap = new WeakMap();

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
      const rects = element.getClientRects();

      if (!rects || rects.length === 0) return index;

      // Generate a color based on the index
      const colors = [
        "#FF0000", "#00FF00", "#0000FF", "#FFA500", "#800080", "#008080",
        "#FF69B4", "#4B0082", "#FF4500", "#2E8B57", "#DC143C", "#4682B4",
      ];
      const colorIndex = index % colors.length;
      const baseColor = colors[colorIndex];
      const backgroundColor = baseColor + "1A";

      // Get iframe offset if necessary
      let iframeOffset = { x: 0, y: 0 };
      if (parentIframe) {
        const iframeRect = parentIframe.getBoundingClientRect();
        iframeOffset.x = iframeRect.left;
        iframeOffset.y = iframeRect.top;
      }

      // Create fragment to hold overlay elements
      const fragment = document.createDocumentFragment();

      // Create highlight overlays for each client rect
      for (const rect of rects) {
        if (rect.width === 0 || rect.height === 0) continue;

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
        overlays.push({ element: overlay, initialRect: rect });
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

      labelWidth = label.offsetWidth > 0 ? label.offsetWidth : labelWidth;
      labelHeight = label.offsetHeight > 0 ? label.offsetHeight : labelHeight;

      const firstRectTop = firstRect.top + iframeOffset.y;
      const firstRectLeft = firstRect.left + iframeOffset.x;

      let labelTop = firstRectTop + 2;
      let labelLeft = firstRectLeft + firstRect.width - labelWidth - 2;

      // Adjust label position if first rect is too small
      if (firstRect.width < labelWidth + 4 || firstRect.height < labelHeight + 4) {
        labelTop = firstRectTop - labelHeight - 2;
        labelLeft = firstRectLeft + firstRect.width - labelWidth;
        if (labelLeft < iframeOffset.x) labelLeft = firstRectLeft;
      }

      // Ensure label stays within viewport bounds
      labelTop = Math.max(0, Math.min(labelTop, window.innerHeight - labelHeight));
      labelLeft = Math.max(0, Math.min(labelLeft, window.innerWidth - labelWidth));

      label.style.top = `${labelTop}px`;
      label.style.left = `${labelLeft}px`;

      fragment.appendChild(label);

      // Add cleanup function
      cleanupFn = () => {
        overlays.forEach(overlay => overlay.element.remove());
        if (label) label.remove();
      };

      // Add fragment to container in one operation
      container.appendChild(fragment);

      return index + 1;
    } finally {
      popTiming('highlighting');
      // Store cleanup function for later use
      if (cleanupFn) {
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

  /**
   * Checks if an element is visible.
   */
  function isElementVisible(element) {
    const style = getCachedComputedStyle(element);
    return (
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  }

  /**
   * Checks if an element is interactive.
   */
  function isInteractiveElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    // Cache the tagName and style lookups
    const tagName = element.tagName.toLowerCase();
    const style = getCachedComputedStyle(element);

    // Define interactive elements (most reliable check first)
    const interactiveElements = new Set([
      'a', 'button', 'input', 'select', 'textarea', 'details', 'summary',
      'label', 'option', 'optgroup', 'fieldset', 'legend', 'datalist',
      'output', 'progress', 'meter', 'area', 'map', 'object', 'embed',
      'iframe', 'video', 'audio', 'canvas'
    ]);

    // Check for basic interactive elements first
    if (interactiveElements.has(tagName)) {
      // Debug: Log input elements specifically
      if (debugMode && (tagName === 'input' || tagName === 'textarea')) {
        console.log(`Found ${tagName} element:`, {
          id: element.id,
          name: element.name,
          type: element.type,
          placeholder: element.placeholder,
          className: element.className
        });
      }
      return true;
    }

    // Get role and aria-role attributes
    const role = element.getAttribute('role');
    const ariaRole = element.getAttribute('aria-role');

    // Define interactive roles
    const interactiveRoles = new Set([
      'button', 'menuitemradio', 'menuitemcheckbox', 'radio', 'checkbox',
      'tab', 'switch', 'slider', 'spinbutton', 'combobox', 'searchbox',
      'textbox', 'option', 'scrollbar', 'link', 'menuitem'
    ]);

    // Check for interactive roles
    if (interactiveRoles.has(role) || interactiveRoles.has(ariaRole)) {
      return true;
    }

    // Check for contenteditable
    if (element.contentEditable === 'true' || element.hasAttribute('contenteditable')) {
      return true;
    }

    // Check for specific interactive cursors (be more selective)
    const specificInteractiveCursors = new Set(['text', 'grab', 'grabbing']);
    if (style && specificInteractiveCursors.has(style.cursor)) {
      return true;
    }

    // Check for pointer cursor only if element has other interactive indicators
    if (style && style.cursor === 'pointer') {
      // Only consider pointer cursor interactive if element has other signs of interactivity
      const hasClickHandler = element.hasAttribute('onclick') ||
                             element.hasAttribute('onmousedown') ||
                             element.hasAttribute('onmouseup');

      const hasTabIndex = element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';

      const hasAriaPressed = element.hasAttribute('aria-pressed');
      const hasAriaExpanded = element.hasAttribute('aria-expanded');
      const hasAriaSelected = element.hasAttribute('aria-selected');

      if (hasClickHandler || hasTabIndex || hasAriaPressed || hasAriaExpanded || hasAriaSelected) {
        return true;
      }
    }

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
      // Fallback: Check common event attributes if getEventListeners is not available
        const commonMouseAttrs = ['onclick', 'onmousedown', 'onmouseup', 'ondblclick'];
        for (const attr of commonMouseAttrs) {
          if (element.hasAttribute(attr) || typeof element[attr] === 'function') {
            return true;
          }
        }
    } catch (e) {
      // If checking listeners fails, rely on other checks
    }

    return false;
  }

  /**
   * Checks if an element is the topmost element at its position.
   */
  function isTopElement(element) {
    // Special case: when viewportExpansion is -1, consider all elements as "top" elements
    if (viewportExpansion === -1) {
      return true;
    }

    const rects = getCachedClientRects(element);

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
   * Checks if a text node is visible.
   */
  function isTextNodeVisible(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return false;

    const parentElement = textNode.parentElement;
    if (!parentElement) return false;

    return isElementVisible(parentElement);
  }

  /**
   * Gets the effective scroll position for an element.
   */
  function getEffectiveScroll(element) {
    let scrollX = 0;
    let scrollY = 0;
    let current = element;

    while (current && current !== document.documentElement) {
      if (current.scrollLeft !== undefined) scrollX += current.scrollLeft;
      if (current.scrollTop !== undefined) scrollY += current.scrollTop;
      current = current.parentElement;
    }

    // Add window scroll
    scrollX += window.scrollX || window.pageXOffset || 0;
    scrollY += window.scrollY || window.pageYOffset || 0;

    return { x: scrollX, y: scrollY };
  }

  /**
   * Processes iframe elements and their content.
   */
  function processIframe(iframe) {
    try {
      // Check if iframe is accessible (same-origin)
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return null; // Cross-origin iframe, skip

      // Process iframe content recursively
      const iframeBody = iframeDoc.body || iframeDoc.documentElement;
      if (!iframeBody) return null;

      return buildDomTreeRecursive(iframeBody, iframe);
    } catch (e) {
      // Cross-origin or other access error, skip
      return null;
    }
  }

  /**
   * Checks if an element should be processed based on various criteria.
   */
  function shouldProcessElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    const tagName = element.tagName.toLowerCase();

    // Skip script and style elements
    if (tagName === 'script' || tagName === 'style') return false;

    // Skip hidden elements
    if (element.hidden) return false;

    // Skip elements with display: none
    const style = getCachedComputedStyle(element);
    if (style && style.display === 'none') return false;

    return true;
  }

  /**
   * Gets text content from an element, handling special cases.
   */
  function getElementText(element) {
    if (!element) return '';

    const tagName = element.tagName.toLowerCase();

    // For input elements, get the value and type information
    if (tagName === 'input') {
      const type = element.type || 'text';
      const value = element.value || '';
      const placeholder = element.placeholder || '';
      return `[${type}] ${value || placeholder}`.trim();
    }

    // For textarea elements
    if (tagName === 'textarea') {
      const value = element.value || '';
      const placeholder = element.placeholder || '';
      return `[textarea] ${value || placeholder}`.trim();
    }

    // For select elements, get selected option text
    if (tagName === 'select') {
      const selectedOption = element.selectedOptions?.[0];
      return selectedOption ? `[select] ${selectedOption.textContent}` : '[select]';
    }

    // For buttons, get button text
    if (tagName === 'button') {
      const text = element.textContent || element.innerText || '';
      return `[button] ${text.trim()}`.substring(0, 100);
    }

    // For links, get link text and href
    if (tagName === 'a') {
      const text = element.textContent || element.innerText || '';
      const href = element.href || '';
      return `[link] ${text.trim()} (${href})`.substring(0, 150);
    }

    // For other elements, get text content but limit length
    const text = element.textContent || element.innerText || '';
    return text.trim().substring(0, 100); // Limit to 100 characters
  }

  /**
   * Gets important attributes for an element.
   */
  function getElementAttributes(element) {
    const attributes = {};

    // List of important attributes to capture
    const importantAttrs = [
      'id', 'class', 'name', 'type', 'href', 'src', 'alt', 'title',
      'placeholder', 'aria-label', 'aria-role', 'role', 'data-testid',
      'data-test', 'data-cy', 'data-automation-id', 'value', 'checked',
      'selected', 'disabled', 'readonly', 'required', 'tabindex'
    ];

    for (const attr of importantAttrs) {
      const value = element.getAttribute(attr);
      if (value !== null && value !== '') {
        attributes[attr] = value;
      }
    }

    return attributes;
  }

  /**
   * Calculates element metrics for performance tracking.
   */
  function updateElementMetrics(element, isInteractive, isVisible) {
    if (!debugMode || !PERF_METRICS) return;

    PERF_METRICS.nodeMetrics.processedNodes++;

    if (isInteractive) {
      PERF_METRICS.nodeMetrics.interactiveNodes = (PERF_METRICS.nodeMetrics.interactiveNodes || 0) + 1;
    }

    if (isVisible) {
      PERF_METRICS.nodeMetrics.visibleNodes = (PERF_METRICS.nodeMetrics.visibleNodes || 0) + 1;
    }
  }

  /**
   * Checks if an element is within the expanded viewport.
   */
  function isInExpandedViewport(element, viewportExpansion) {
    if (viewportExpansion === -1) {
      return true;
    }

    const rects = element.getClientRects();

    if (!rects || rects.length === 0) {
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
      if (rect.width === 0 || rect.height === 0) continue;

      if (!(
        rect.bottom < -viewportExpansion ||
        rect.top > window.innerHeight + viewportExpansion ||
        rect.right < -viewportExpansion ||
        rect.left > window.innerWidth + viewportExpansion
      )) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns an XPath tree string for an element.
   */
  function getXPathTree(element, stopAtBoundary = true) {
    if (xpathCache.has(element)) return xpathCache.get(element);

    const segments = [];
    let currentElement = element;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      const tagName = currentElement.tagName.toLowerCase();
      let index = 1;
      let sibling = currentElement.previousElementSibling;

      while (sibling) {
        if (sibling.tagName.toLowerCase() === tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }

      const segment = index > 1 ? `${tagName}[${index}]` : tagName;
      segments.unshift(segment);

      currentElement = currentElement.parentElement;
    }

    const xpath = '/' + segments.join('/');
    xpathCache.set(element, xpath);
    return xpath;
  }

  // Main DOM tree building function
  function buildDomTreeRecursive(node, parentIframe = null, isParentHighlighted = false) {
    pushTiming('nodeProcessing');

    try {
      // Handle different node types
      if (node.nodeType === Node.TEXT_NODE) {
        // Process text nodes
        if (isTextNodeVisible(node)) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) {
            const id = `text_${ID.current++}`;
            DOM_HASH_MAP[id] = {
              nodeType: 'text',
              text: text.substring(0, 100),
              isVisible: true,
              children: []
            };
            if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.processedNodes++;
            return id;
          }
        }
        if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }

      if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.totalNodes++;

      // Check if element should be processed
      if (!shouldProcessElement(node)) {
        if (debugMode && PERF_METRICS) PERF_METRICS.nodeMetrics.skippedNodes++;
        return null;
      }

      // Process element node
      const tagName = node.tagName.toLowerCase();
      const nodeData = {
        nodeType: 'element',
        tagName: tagName,
        attributes: getElementAttributes(node),
        xpath: getXPathTree(node, true),
        text: getElementText(node),
        children: [],
      };

      let nodeWasHighlighted = false;

      // Perform visibility, interactivity, and highlighting checks
      nodeData.isVisible = isElementVisible(node);

      if (nodeData.isVisible) {
        nodeData.isInteractive = isInteractiveElement(node);

        if (nodeData.isInteractive) {
          // Check viewport status before assigning index and highlighting
          nodeData.isInViewport = isInExpandedViewport(node, viewportExpansion);
          nodeData.isTopElement = isTopElement(node);

          // Only assign highlight index if element is in viewport and is top element
          if ((nodeData.isInViewport || viewportExpansion === -1) && nodeData.isTopElement) {
            nodeData.highlightIndex = highlightIndex;

            if (doHighlightElements) {
              try {
                node.setAttribute('data-browser-use-index', highlightIndex.toString());

                if (focusHighlightIndex === highlightIndex) {
                  node.style.outline = '3px solid red';
                  node.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                } else {
                  node.style.outline = '2px solid blue';
                  node.style.backgroundColor = 'rgba(0, 0, 255, 0.1)';
                }
                nodeWasHighlighted = true;
              } catch (e) {
                // Ignore highlighting errors
              }
            }

            highlightIndex++;
          }
        }

        // Update performance metrics
        updateElementMetrics(node, nodeData.isInteractive, nodeData.isVisible);
      }

      // Special handling for iframe elements
      if (tagName === 'iframe') {
        const iframeContent = processIframe(node);
        if (iframeContent) {
          nodeData.children.push(iframeContent);
        }
      }

      // Process children
      for (const child of node.childNodes) {
        const domElement = buildDomTreeRecursive(child, parentIframe, nodeWasHighlighted);
        if (domElement) {
          nodeData.children.push(domElement);
        }
      }

      const id = `element_${ID.current++}`;
      DOM_HASH_MAP[id] = nodeData;

      return id;

    } finally {
      popTiming('nodeProcessing');
    }
  }

  // Start processing from document.body or document.documentElement
  let rootElement = document.body || document.documentElement;
  if (!rootElement) {
    // Fallback if no body or documentElement
    rootElement = document.querySelector('html') || document;
  }

  const startTime = performance.now();
  const rootId = buildDomTreeRecursive(rootElement);
  const endTime = performance.now();

  // Calculate final performance metrics
  if (debugMode && PERF_METRICS) {
    PERF_METRICS.buildDomTreeBreakdown.totalTime = endTime - startTime;

    // Calculate cache hit rates
    const totalBoundingRectRequests = PERF_METRICS.cacheMetrics.boundingRectCacheHits + PERF_METRICS.cacheMetrics.boundingRectCacheMisses;
    const totalComputedStyleRequests = PERF_METRICS.cacheMetrics.computedStyleCacheHits + PERF_METRICS.cacheMetrics.computedStyleCacheMisses;
    const totalClientRectsRequests = PERF_METRICS.cacheMetrics.clientRectsCacheHits + PERF_METRICS.cacheMetrics.clientRectsCacheMisses;

    if (totalBoundingRectRequests > 0) {
      PERF_METRICS.cacheMetrics.boundingRectHitRate = PERF_METRICS.cacheMetrics.boundingRectCacheHits / totalBoundingRectRequests;
    }

    if (totalComputedStyleRequests > 0) {
      PERF_METRICS.cacheMetrics.computedStyleHitRate = PERF_METRICS.cacheMetrics.computedStyleCacheHits / totalComputedStyleRequests;
    }

    const totalRequests = totalBoundingRectRequests + totalComputedStyleRequests + totalClientRectsRequests;
    const totalHits = PERF_METRICS.cacheMetrics.boundingRectCacheHits + PERF_METRICS.cacheMetrics.computedStyleCacheHits + PERF_METRICS.cacheMetrics.clientRectsCacheHits;

    if (totalRequests > 0) {
      PERF_METRICS.cacheMetrics.overallHitRate = totalHits / totalRequests;
    }

    // Add summary metrics
    PERF_METRICS.summary = {
      totalElements: Object.keys(DOM_HASH_MAP).length,
      interactiveElements: highlightIndex,
      processingTimeMs: endTime - startTime,
      elementsPerSecond: PERF_METRICS.nodeMetrics.processedNodes / ((endTime - startTime) / 1000)
    };
  }

  // Clear the cache before finishing
  DOM_CACHE.clearCache();

  // Cleanup viewport observer
  if (viewportObserver) {
    viewportObserver.disconnect();
  }

  const result = {
    rootId: rootId || 'root',
    map: DOM_HASH_MAP
  };

  if (debugMode && PERF_METRICS) {
    result.perfMetrics = PERF_METRICS;
  }

  return result;
}

// Export for use in our service
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildDomTree };
}
