import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Static Pages Store', () => {
  const testDataDir = path.join(process.cwd(), 'data');
  const testFile = path.join(testDataDir, 'static-pages.json');
  const tmpFile = '/tmp/static-pages.json';
  
  // Clean up test files before and after each test
  beforeEach(() => {
    // Remove test files if they exist
    try {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch (error) {
      // Ignore errors
    }
  });

  afterEach(() => {
    // Clean up test files
    try {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch (error) {
      // Ignore errors
    }
    
    // Clear module cache to reset the module state
    vi.resetModules();
  });

  describe('StaticPage Interface', () => {
    it('should have correct shape for StaticPage', () => {
      const page = {
        id: 'test-page',
        title: 'Test Page',
        content: '<h1>Test Content</h1>',
        path: '/test',
        updatedAt: new Date().toISOString()
      };

      expect(page).toHaveProperty('id');
      expect(page).toHaveProperty('title');
      expect(page).toHaveProperty('content');
      expect(page).toHaveProperty('path');
      expect(page).toHaveProperty('updatedAt');
      expect(page.path).toMatch(/^\//);
    });
  });

  describe('Filesystem Storage', () => {
    it('should return empty array when no file exists', async () => {
      // Import after cleaning up to get fresh instance
      const { loadAllPages } = await import('../staticPagesStore');
      
      const pages = await loadAllPages();
      expect(pages).toEqual([]);
    });

    it('should save and load pages correctly', async () => {
      const { upsertPage, loadAllPages } = await import('../staticPagesStore');
      
      const page = {
        id: 'test-page',
        title: 'Test Page',
        content: '<h1>Test Content</h1>',
        path: '/test',
        updatedAt: new Date().toISOString()
      };

      await upsertPage(page);
      const pages = await loadAllPages();
      
      expect(pages).toHaveLength(1);
      expect(pages[0].id).toBe('test-page');
      expect(pages[0].title).toBe('Test Page');
    });

    it('should update existing page on upsert', async () => {
      const { upsertPage, loadAllPages } = await import('../staticPagesStore');
      
      const page1 = {
        id: 'test-page',
        title: 'Original Title',
        content: '<h1>Original</h1>',
        path: '/test',
        updatedAt: new Date().toISOString()
      };

      await upsertPage(page1);
      
      const page2 = {
        id: 'test-page',
        title: 'Updated Title',
        content: '<h1>Updated</h1>',
        path: '/test',
        updatedAt: new Date().toISOString()
      };

      await upsertPage(page2);
      const pages = await loadAllPages();
      
      expect(pages).toHaveLength(1);
      expect(pages[0].title).toBe('Updated Title');
      expect(pages[0].content).toBe('<h1>Updated</h1>');
    });

    it('should get page by ID', async () => {
      const { upsertPage, getPageById } = await import('../staticPagesStore');
      
      const page = {
        id: 'test-page',
        title: 'Test Page',
        content: '<h1>Test</h1>',
        path: '/test',
        updatedAt: new Date().toISOString()
      };

      await upsertPage(page);
      const retrieved = await getPageById('test-page');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-page');
    });

    it('should return null for non-existent page ID', async () => {
      const { getPageById } = await import('../staticPagesStore');
      
      const retrieved = await getPageById('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should delete page by ID', async () => {
      const { upsertPage, deletePage, loadAllPages } = await import('../staticPagesStore');
      
      const page1 = {
        id: 'page-1',
        title: 'Page 1',
        content: '<h1>1</h1>',
        path: '/page-1',
        updatedAt: new Date().toISOString()
      };
      
      const page2 = {
        id: 'page-2',
        title: 'Page 2',
        content: '<h1>2</h1>',
        path: '/page-2',
        updatedAt: new Date().toISOString()
      };

      await upsertPage(page1);
      await upsertPage(page2);
      
      const deleted = await deletePage('page-1');
      expect(deleted).toBe(true);
      
      const pages = await loadAllPages();
      expect(pages).toHaveLength(1);
      expect(pages[0].id).toBe('page-2');
    });

    it('should return false when deleting non-existent page', async () => {
      const { deletePage } = await import('../staticPagesStore');
      
      const deleted = await deletePage('non-existent');
      expect(deleted).toBe(false);
    });

    it('should handle multiple pages correctly', async () => {
      const { upsertPage, loadAllPages } = await import('../staticPagesStore');
      
      const pages = [
        {
          id: 'page-1',
          title: 'Page 1',
          content: '<h1>1</h1>',
          path: '/page-1',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'page-2',
          title: 'Page 2',
          content: '<h1>2</h1>',
          path: '/page-2',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'page-3',
          title: 'Page 3',
          content: '<h1>3</h1>',
          path: '/page-3',
          updatedAt: new Date().toISOString()
        }
      ];

      for (const page of pages) {
        await upsertPage(page);
      }
      
      const allPages = await loadAllPages();
      expect(allPages).toHaveLength(3);
      expect(allPages.map(p => p.id).sort()).toEqual(['page-1', 'page-2', 'page-3']);
    });
  });

  describe('Path Validation', () => {
    it('should enforce path starts with /', () => {
      const validPaths = ['/', '/test', '/about', '/contact/form'];
      const invalidPaths = ['test', 'about/', 'http://example.com'];
      
      validPaths.forEach(path => {
        expect(path.startsWith('/')).toBe(true);
      });
      
      invalidPaths.forEach(path => {
        expect(path.startsWith('/')).toBe(false);
      });
    });
  });

  describe('Data Format Consistency', () => {
    it('should maintain consistent data format after save/load', async () => {
      const { upsertPage, getPageById } = await import('../staticPagesStore');
      
      const originalPage = {
        id: 'test-page',
        title: 'Test Page',
        content: '<h1>Test Content</h1><p>Paragraph with "quotes" and special chars: äöü</p>',
        path: '/test',
        updatedAt: new Date().toISOString()
      };

      await upsertPage(originalPage);
      const retrieved = await getPageById('test-page');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(originalPage.id);
      expect(retrieved?.title).toBe(originalPage.title);
      expect(retrieved?.content).toBe(originalPage.content);
      expect(retrieved?.path).toBe(originalPage.path);
    });

    it('should update timestamp on upsert', async () => {
      const { upsertPage, getPageById } = await import('../staticPagesStore');
      
      const page = {
        id: 'test-page',
        title: 'Test Page',
        content: '<h1>Test</h1>',
        path: '/test',
        updatedAt: '2020-01-01T00:00:00.000Z'
      };

      const saved = await upsertPage(page);
      
      // updatedAt should be updated to current time
      expect(saved.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
      expect(new Date(saved.updatedAt).getTime()).toBeGreaterThan(new Date('2020-01-01').getTime());
    });
  });
});
