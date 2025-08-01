import { Validator, ValidationError } from '../../src/utils/validation';

describe('Validator', () => {
  describe('validateAction', () => {
    it('should validate click action', () => {
      const action = { type: 'click', index: 0 };
      expect(() => Validator.validateAction(action)).not.toThrow();
    });

    it('should validate type action', () => {
      const action = { type: 'type', index: 0, text: 'hello' };
      expect(() => Validator.validateAction(action)).not.toThrow();
    });

    it('should validate navigate action', () => {
      const action = { type: 'navigate', url: 'https://example.com' };
      expect(() => Validator.validateAction(action)).not.toThrow();
    });

    it('should validate scroll action', () => {
      const action = { type: 'scroll', direction: 'down' };
      expect(() => Validator.validateAction(action)).not.toThrow();
    });

    it('should validate wait action', () => {
      const action = { type: 'wait', seconds: 5 };
      expect(() => Validator.validateAction(action)).not.toThrow();
    });

    it('should validate done action', () => {
      const action = { type: 'done', message: 'Task completed', success: true };
      expect(() => Validator.validateAction(action)).not.toThrow();
    });

    it('should throw for invalid action type', () => {
      const action = { type: 'invalid' };
      expect(() => Validator.validateAction(action)).toThrow(ValidationError);
    });

    it('should throw for missing action type', () => {
      const action = { index: 0 };
      expect(() => Validator.validateAction(action)).toThrow(ValidationError);
    });

    it('should throw for invalid click action', () => {
      const action = { type: 'click', index: -1 };
      expect(() => Validator.validateAction(action)).toThrow(ValidationError);
    });

    it('should throw for invalid type action', () => {
      const action = { type: 'type', index: 0 };
      expect(() => Validator.validateAction(action)).toThrow(ValidationError);
    });

    it('should throw for invalid navigate action', () => {
      const action = { type: 'navigate', url: 'invalid-url' };
      expect(() => Validator.validateAction(action)).toThrow(ValidationError);
    });

    it('should throw for invalid scroll action', () => {
      const action = { type: 'scroll', direction: 'invalid' };
      expect(() => Validator.validateAction(action)).toThrow(ValidationError);
    });

    it('should throw for invalid wait action', () => {
      const action = { type: 'wait', seconds: -1 };
      expect(() => Validator.validateAction(action)).toThrow(ValidationError);
    });

    it('should throw for invalid done action', () => {
      const action = { type: 'done', message: 'test' };
      expect(() => Validator.validateAction(action)).toThrow(ValidationError);
    });
  });

  describe('validateLLMConfig', () => {
    it('should validate valid OpenAI config', () => {
      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o',
        apiKey: 'test-key',
        temperature: 0.5,
      };
      expect(() => Validator.validateLLMConfig(config)).not.toThrow();
    });

    it('should validate valid Anthropic config', () => {
      const config = {
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
      };
      expect(() => Validator.validateLLMConfig(config)).not.toThrow();
    });

    it('should throw for invalid provider', () => {
      const config = {
        provider: 'invalid' as any,
        model: 'test-model',
        apiKey: 'test-key',
      };
      expect(() => Validator.validateLLMConfig(config)).toThrow(ValidationError);
    });

    it('should throw for missing API key', () => {
      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o',
        apiKey: '',
      };
      expect(() => Validator.validateLLMConfig(config)).toThrow(ValidationError);
    });

    it('should throw for invalid temperature', () => {
      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o',
        apiKey: 'test-key',
        temperature: 3,
      };
      expect(() => Validator.validateLLMConfig(config)).toThrow(ValidationError);
    });
  });

  describe('validateBrowserProfile', () => {
    it('should validate valid browser profile', () => {
      const profile = {
        headless: true,
        viewport: { width: 1280, height: 720 },
        timeout: 30000,
      };
      expect(() => Validator.validateBrowserProfile(profile)).not.toThrow();
    });

    it('should throw for invalid viewport', () => {
      const profile = {
        viewport: { width: -1, height: 720 },
      };
      expect(() => Validator.validateBrowserProfile(profile)).toThrow(ValidationError);
    });

    it('should throw for invalid timeout', () => {
      const profile = {
        timeout: -1,
      };
      expect(() => Validator.validateBrowserProfile(profile)).toThrow(ValidationError);
    });
  });

  describe('validateAgentSettings', () => {
    it('should validate valid agent settings', () => {
      const settings = {
        maxSteps: 50,
        maxActionsPerStep: 3,
        useVision: true,
        temperature: 0.5,
      };
      expect(() => Validator.validateAgentSettings(settings)).not.toThrow();
    });

    it('should throw for invalid maxSteps', () => {
      const settings = {
        maxSteps: -1,
      };
      expect(() => Validator.validateAgentSettings(settings)).toThrow(ValidationError);
    });

    it('should throw for too high maxSteps', () => {
      const settings = {
        maxSteps: 2000,
      };
      expect(() => Validator.validateAgentSettings(settings)).toThrow(ValidationError);
    });
  });

  describe('isValidUrl', () => {
    it('should validate valid URLs', () => {
      expect(Validator.isValidUrl('https://example.com')).toBe(true);
      expect(Validator.isValidUrl('http://localhost:3000')).toBe(true);
      expect(Validator.isValidUrl('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(Validator.isValidUrl('invalid-url')).toBe(false);
      expect(Validator.isValidUrl('not a url')).toBe(false);
      expect(Validator.isValidUrl('')).toBe(false);
    });
  });
});
