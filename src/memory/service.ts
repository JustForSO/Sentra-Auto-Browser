import { AgentStep, DOMState, Action } from '../types';
import { logger } from '../utils/logger';

export interface MemoryEntry {
  id: string;
  timestamp: Date;
  type: 'action' | 'observation' | 'plan' | 'reflection' | 'error';
  content: string;
  metadata: {
    stepNumber?: number;
    url?: string;
    success?: boolean;
    confidence?: number;
    tags?: string[];
  };
  embedding?: number[];
}

export interface MemoryQuery {
  query: string;
  type?: MemoryEntry['type'];
  limit?: number;
  minConfidence?: number;
  tags?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  similarity: number;
  relevance: number;
}

export class MemoryService {
  private memories: MemoryEntry[] = [];
  private maxMemories: number;
  private enableEmbeddings: boolean;

  constructor(maxMemories: number = 1000, enableEmbeddings: boolean = false) {
    this.maxMemories = maxMemories;
    this.enableEmbeddings = enableEmbeddings;
  }

  async addMemory(
    type: MemoryEntry['type'],
    content: string,
    metadata: MemoryEntry['metadata'] = {}
  ): Promise<string> {
    const id = this.generateId();
    const memory: MemoryEntry = {
      id,
      timestamp: new Date(),
      type,
      content,
      metadata,
    };

    if (this.enableEmbeddings) {
      memory.embedding = await this.generateEmbedding(content);
    }

    this.memories.push(memory);

    // Maintain memory limit
    if (this.memories.length > this.maxMemories) {
      this.memories = this.memories.slice(-this.maxMemories);
    }

    logger.debug(`Added memory: ${type} - ${content.substring(0, 50)}...`, 'MemoryService');
    return id;
  }

  async addActionMemory(step: AgentStep): Promise<string> {
    const content = this.formatActionMemory(step);
    return this.addMemory('action', content, {
      stepNumber: step.stepNumber,
      url: step.domState?.url,
      success: step.result.success,
      confidence: 0.8,
      tags: [step.action.type, step.result.success ? 'success' : 'failure'],
    });
  }

  async addObservationMemory(domState: DOMState, stepNumber: number): Promise<string> {
    const content = this.formatObservationMemory(domState);
    return this.addMemory('observation', content, {
      stepNumber,
      url: domState.url,
      confidence: 0.7,
      tags: ['observation', 'dom_state'],
    });
  }

  async addPlanMemory(plan: string, stepNumber: number): Promise<string> {
    return this.addMemory('plan', plan, {
      stepNumber,
      confidence: 0.9,
      tags: ['planning', 'strategy'],
    });
  }

  async addReflectionMemory(reflection: string, stepNumber: number): Promise<string> {
    return this.addMemory('reflection', reflection, {
      stepNumber,
      confidence: 0.8,
      tags: ['reflection', 'analysis'],
    });
  }

  async addErrorMemory(error: string, stepNumber: number, url?: string): Promise<string> {
    return this.addMemory('error', error, {
      stepNumber,
      url,
      success: false,
      confidence: 1.0,
      tags: ['error', 'failure'],
    });
  }

  async searchMemories(query: MemoryQuery): Promise<MemorySearchResult[]> {
    let filteredMemories = this.memories;

    // Filter by type
    if (query.type) {
      filteredMemories = filteredMemories.filter(m => m.type === query.type);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      filteredMemories = filteredMemories.filter(m => 
        m.metadata.tags?.some(tag => query.tags!.includes(tag))
      );
    }

    // Filter by time range
    if (query.timeRange) {
      filteredMemories = filteredMemories.filter(m => 
        m.timestamp >= query.timeRange!.start && m.timestamp <= query.timeRange!.end
      );
    }

    // Calculate similarity scores
    const results: MemorySearchResult[] = filteredMemories.map(memory => {
      const similarity = this.calculateSimilarity(query.query, memory.content);
      const relevance = this.calculateRelevance(memory, query);
      
      return {
        entry: memory,
        similarity,
        relevance: similarity * relevance,
      };
    });

    // Sort by relevance and apply limits
    results.sort((a, b) => b.relevance - a.relevance);

    if (query.minConfidence !== undefined) {
      return results.filter(r => r.relevance >= query.minConfidence!);
    }

    return results.slice(0, query.limit || 10);
  }

  async getRecentMemories(count: number = 10, type?: MemoryEntry['type']): Promise<MemoryEntry[]> {
    let memories = this.memories;
    
    if (type) {
      memories = memories.filter(m => m.type === type);
    }

    return memories.slice(-count).reverse();
  }

  async getMemoriesByTag(tag: string, limit: number = 10): Promise<MemoryEntry[]> {
    return this.memories
      .filter(m => m.metadata.tags?.includes(tag))
      .slice(-limit)
      .reverse();
  }

  async getSuccessfulActions(limit: number = 5): Promise<MemoryEntry[]> {
    return this.memories
      .filter(m => m.type === 'action' && m.metadata.success === true)
      .slice(-limit)
      .reverse();
  }

  async getFailedActions(limit: number = 5): Promise<MemoryEntry[]> {
    return this.memories
      .filter(m => m.type === 'action' && m.metadata.success === false)
      .slice(-limit)
      .reverse();
  }

  getMemoryStats(): {
    total: number;
    byType: Record<string, number>;
    byTag: Record<string, number>;
    successRate: number;
  } {
    const byType: Record<string, number> = {};
    const byTag: Record<string, number> = {};
    let successCount = 0;
    let actionCount = 0;

    for (const memory of this.memories) {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
      
      if (memory.metadata.tags) {
        for (const tag of memory.metadata.tags) {
          byTag[tag] = (byTag[tag] || 0) + 1;
        }
      }

      if (memory.type === 'action') {
        actionCount++;
        if (memory.metadata.success) {
          successCount++;
        }
      }
    }

    return {
      total: this.memories.length,
      byType,
      byTag,
      successRate: actionCount > 0 ? successCount / actionCount : 0,
    };
  }

  clearMemories(): void {
    this.memories = [];
    logger.info('Memory cleared', 'MemoryService');
  }

  private formatActionMemory(step: AgentStep): string {
    const action = step.action;
    const result = step.result;
    
    let actionDesc = `Action: ${action.type}`;
    
    if ('index' in action) {
      actionDesc += ` on element ${action.index}`;
    }
    if ('text' in action) {
      actionDesc += ` with text "${action.text}"`;
    }
    if ('url' in action) {
      actionDesc += ` to URL "${action.url}"`;
    }

    const resultDesc = result.success ? 'succeeded' : 'failed';
    const message = result.message || result.error || '';

    return `${actionDesc} - ${resultDesc}. ${message}`;
  }

  private formatObservationMemory(domState: DOMState): string {
    const elementCount = domState.elements.length;
    const clickableCount = domState.elements.filter(e => e.isClickable).length;
    
    return `Page: ${domState.title} (${domState.url}) - ${elementCount} elements, ${clickableCount} clickable`;
  }

  private calculateSimilarity(query: string, content: string): number {
    // Simple text similarity - in production, use proper embedding similarity
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const intersection = queryWords.filter(word => contentWords.includes(word));
    const union = [...new Set([...queryWords, ...contentWords])];
    
    return intersection.length / union.length;
  }

  private calculateRelevance(memory: MemoryEntry, query: MemoryQuery): number {
    let relevance = 1.0;
    
    // Boost recent memories
    const ageInHours = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60);
    relevance *= Math.exp(-ageInHours / 24); // Decay over 24 hours
    
    // Boost successful actions
    if (memory.type === 'action' && memory.metadata.success) {
      relevance *= 1.2;
    }
    
    // Boost high confidence memories
    if (memory.metadata.confidence) {
      relevance *= memory.metadata.confidence;
    }
    
    return relevance;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder for embedding generation
    // In production, use OpenAI embeddings or similar
    return new Array(384).fill(0).map(() => Math.random());
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
