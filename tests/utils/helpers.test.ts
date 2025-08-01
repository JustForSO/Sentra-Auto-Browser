import { Helpers } from '../../src/utils/helpers';
import { AgentHistory, AgentStep } from '../../src/types';

describe('Helpers', () => {
  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(Helpers.formatDuration(30)).toBe('30.0s');
      expect(Helpers.formatDuration(45.5)).toBe('45.5s');
    });

    it('should format minutes correctly', () => {
      expect(Helpers.formatDuration(90)).toBe('1m 30.0s');
      expect(Helpers.formatDuration(150)).toBe('2m 30.0s');
    });

    it('should format hours correctly', () => {
      expect(Helpers.formatDuration(3660)).toBe('1h 1m');
      expect(Helpers.formatDuration(7200)).toBe('2h 0m');
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      const text = 'Short text';
      expect(Helpers.truncateText(text, 20)).toBe(text);
    });

    it('should truncate long text', () => {
      const text = 'This is a very long text that should be truncated';
      const result = Helpers.truncateText(text, 20);
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should use default max length', () => {
      const text = 'a'.repeat(150);
      const result = Helpers.truncateText(text);
      expect(result.length).toBe(100);
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from valid URLs', () => {
      expect(Helpers.extractDomain('https://example.com/path')).toBe('example.com');
      expect(Helpers.extractDomain('http://sub.domain.com')).toBe('sub.domain.com');
      expect(Helpers.extractDomain('https://localhost:3000')).toBe('localhost');
    });

    it('should return original string for invalid URLs', () => {
      expect(Helpers.extractDomain('invalid-url')).toBe('invalid-url');
      expect(Helpers.extractDomain('not a url')).toBe('not a url');
    });
  });

  describe('countActionTypes', () => {
    it('should count action types correctly', () => {
      const steps: AgentStep[] = [
        {
          stepNumber: 1,
          action: { type: 'click', index: 0 },
          result: { success: true },
          timestamp: new Date(),
        },
        {
          stepNumber: 2,
          action: { type: 'type', index: 1, text: 'test' },
          result: { success: true },
          timestamp: new Date(),
        },
        {
          stepNumber: 3,
          action: { type: 'click', index: 2 },
          result: { success: false },
          timestamp: new Date(),
        },
      ];

      const counts = Helpers.countActionTypes(steps);
      expect(counts).toEqual({
        click: 2,
        type: 1,
      });
    });

    it('should return empty object for empty steps', () => {
      const counts = Helpers.countActionTypes([]);
      expect(counts).toEqual({});
    });
  });

  describe('getFailedSteps', () => {
    it('should return only failed steps', () => {
      const steps: AgentStep[] = [
        {
          stepNumber: 1,
          action: { type: 'click', index: 0 },
          result: { success: true },
          timestamp: new Date(),
        },
        {
          stepNumber: 2,
          action: { type: 'type', index: 1, text: 'test' },
          result: { success: false, error: 'Failed' },
          timestamp: new Date(),
        },
      ];

      const failedSteps = Helpers.getFailedSteps(steps);
      expect(failedSteps).toHaveLength(1);
      expect(failedSteps[0].stepNumber).toBe(2);
    });
  });

  describe('calculateSuccessRate', () => {
    it('should calculate success rate correctly', () => {
      const steps: AgentStep[] = [
        {
          stepNumber: 1,
          action: { type: 'click', index: 0 },
          result: { success: true },
          timestamp: new Date(),
        },
        {
          stepNumber: 2,
          action: { type: 'type', index: 1, text: 'test' },
          result: { success: false },
          timestamp: new Date(),
        },
        {
          stepNumber: 3,
          action: { type: 'click', index: 2 },
          result: { success: true },
          timestamp: new Date(),
        },
      ];

      const successRate = Helpers.calculateSuccessRate(steps);
      expect(successRate).toBeCloseTo(66.67, 1);
    });

    it('should return 0 for empty steps', () => {
      const successRate = Helpers.calculateSuccessRate([]);
      expect(successRate).toBe(0);
    });
  });

  describe('isValidJSON', () => {
    it('should validate valid JSON', () => {
      expect(Helpers.isValidJSON('{"key": "value"}')).toBe(true);
      expect(Helpers.isValidJSON('[1, 2, 3]')).toBe(true);
      expect(Helpers.isValidJSON('"string"')).toBe(true);
      expect(Helpers.isValidJSON('123')).toBe(true);
    });

    it('should reject invalid JSON', () => {
      expect(Helpers.isValidJSON('invalid json')).toBe(false);
      expect(Helpers.isValidJSON('{key: value}')).toBe(false);
      expect(Helpers.isValidJSON('')).toBe(false);
    });
  });

  describe('extractJSON', () => {
    it('should extract JSON object from text', () => {
      const text = 'Some text before {"key": "value"} and after';
      const result = Helpers.extractJSON(text);
      expect(result).toEqual({ key: 'value' });
    });

    it('should extract JSON array from text', () => {
      const text = 'Some text before [1, 2, 3] and after';
      const result = Helpers.extractJSON(text);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should throw for text without JSON', () => {
      const text = 'No JSON here';
      expect(() => Helpers.extractJSON(text)).toThrow();
    });
  });

  describe('isEmpty', () => {
    it('should detect empty values', () => {
      expect(Helpers.isEmpty(null)).toBe(true);
      expect(Helpers.isEmpty(undefined)).toBe(true);
      expect(Helpers.isEmpty([])).toBe(true);
      expect(Helpers.isEmpty('')).toBe(true);
      expect(Helpers.isEmpty({})).toBe(true);
    });

    it('should detect non-empty values', () => {
      expect(Helpers.isEmpty([1])).toBe(false);
      expect(Helpers.isEmpty('text')).toBe(false);
      expect(Helpers.isEmpty({ key: 'value' })).toBe(false);
      expect(Helpers.isEmpty(0)).toBe(false);
      expect(Helpers.isEmpty(false)).toBe(false);
    });
  });
});
