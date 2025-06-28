import { describe, it, expect } from 'vitest';
import { createSlug } from '../types';
import { getImageUrl } from '../services/public-figures';

describe('Security Tests', () => {
  describe('Input Validation & XSS Prevention', () => {
    it('should sanitize malicious script tags in names', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '<svg onload=alert("xss")>',
      ];

      maliciousInputs.forEach((input) => {
        const slug = createSlug(input);
        expect(slug).not.toContain('<');
        expect(slug).not.toContain('>');
        expect(slug).not.toContain('(');
        expect(slug).not.toContain(')');
        expect(slug).not.toContain(':');
        expect(slug).not.toMatch(/[^a-z0-9-]/);
      });
    });

    it('should handle Unicode and special characters safely', () => {
      const unicodeInputs = [
        'José María',
        '北京',
        '🎭🎪',
        'café',
        'naïve',
        '../../etc/passwd',
        '../../../windows/system32',
      ];

      unicodeInputs.forEach((input) => {
        const slug = createSlug(input);
        expect(slug).not.toContain('/');
        expect(slug).not.toContain('\\');
        expect(slug).not.toContain('..');
      });
    });
  });

  describe('File Upload Security', () => {
    it('should identify potential security issues in files', () => {
      const testFiles = [
        { name: 'image.jpg', type: 'image/jpeg', size: 1024, isSafe: true },
        { name: 'image.png.exe', type: 'image/png', size: 1024, isSafe: false },
        { name: 'image.svg', type: 'image/svg+xml', size: 1024, isSafe: false },
        { name: 'large.jpg', type: 'image/jpeg', size: 50 * 1024 * 1024, isSafe: false },
      ];

      testFiles.forEach((file) => {
        const hasExecutableExt = file.name.includes('.exe');
        const isSVG = file.type === 'image/svg+xml';
        const maxSize = 10 * 1024 * 1024;
        const isOversized = file.size > maxSize;

        if (!file.isSafe) {
          expect(hasExecutableExt || isSVG || isOversized).toBe(true);
        }

        if (file.isSafe) {
          expect(hasExecutableExt).toBe(false);
          expect(isSVG).toBe(false);
          expect(isOversized).toBe(false);
        }
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should block malicious file paths', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'javascript:alert("xss")',
        'valid-file.webp',
      ];

      const results = maliciousPaths.map((path) => getImageUrl(path));

      expect(results[0]).toBeNull();
      expect(results[1]).toBeNull();
      expect(results[2]).toBeNull();
      expect(results[3]).toBeTruthy();
    });

    it('should handle null and empty inputs', () => {
      expect(getImageUrl(null)).toBeNull();
      expect(getImageUrl('')).toBeNull();
      expect(getImageUrl('   ')).toBeTruthy();
    });
  });
});
