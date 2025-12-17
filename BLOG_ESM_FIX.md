# Blog Page ESM/CommonJS Compatibility Fix

## Problem Description

The blog pages (`/blog` and `/blog/[slug]`) were not accessible in the Vercel serverless environment, resulting in the following error:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module /var/task/node_modules/parse5/dist/index.js from /var/task/node_modules/jsdom/lib/jsdom/browser/parser/html.js not supported.
Instead change the require of index.js in /var/task/node_modules/jsdom/lib/jsdom/browser/parser/html.js to a dynamic import() which is available in all CommonJS modules.
```

## Root Cause

The issue was caused by a dependency chain incompatibility in serverless environments:

1. **`isomorphic-dompurify@2.17+`** depends on `jsdom@27.x`
2. **`jsdom@27.x`** depends on `parse5@8.x`
3. **`parse5@8.x`** is an ES module-only package (`"type": "module"`)
4. **`jsdom@27.x`** uses CommonJS `require()` to import `parse5`
5. In serverless environments (Vercel/AWS Lambda), this causes a **fatal error**

### Why It Works Locally But Fails in Production

- Local development environments are more forgiving with module resolution
- Serverless environments (Vercel, AWS Lambda) have stricter module loading
- The Lambda runtime cannot resolve ES modules via `require()` statements

## Solution

Pin `isomorphic-dompurify` to version **2.16.0** in `package.json`:

```json
{
  "dependencies": {
    "isomorphic-dompurify": "2.16.0"
  }
}
```

### Why Version 2.16.0?

| Component | Version 2.16.0 | Version 2.17+ |
|-----------|----------------|---------------|
| isomorphic-dompurify | 2.16.0 | 2.17.0+ |
| jsdom | 25.0.1 | 27.3.0 |
| parse5 | 7.3.0 | 8.0.0 |
| Module Format | CommonJS + ESM | ESM only |
| Serverless Compatible | ✅ Yes | ❌ No |

**Key difference**: `parse5@7.x` provides **dual exports**:
- CommonJS: `dist/cjs/index.js` (used by `jsdom` via `require()`)
- ESM: `dist/index.js` (modern JavaScript)

`parse5@8.x` removed CommonJS support, breaking backward compatibility.

## Files Changed

### 1. `package.json`
- Changed from `"isomorphic-dompurify": "^2.16.0"` to `"isomorphic-dompurify": "2.16.0"`
- Removed the caret (`^`) to prevent automatic updates to incompatible versions
- Added a comment field documenting the version constraint

### 2. `app/lib/utils/sanitize.ts`
- Added comprehensive documentation about the version constraint
- Explains why the version is pinned and what issues it prevents

## Verification

### Tests
All sanitization tests pass (24 tests):
```bash
npm test app/lib/__tests__/sanitize.test.ts
```

### Build
The project builds successfully without ESM errors:
```bash
npm run build
```

### Dependency Tree
Verify the correct versions are installed:
```bash
npm list isomorphic-dompurify jsdom parse5
```

Expected output:
```
where2go-clean@0.1.0
├─┬ isomorphic-dompurify@2.16.0
│ └─┬ jsdom@25.0.1
│   └── parse5@7.3.0
└─┬ vitest@3.2.4
  └── jsdom@25.0.1 deduped
```

## Maintenance Guidelines

### ⚠️ Important: DO NOT upgrade isomorphic-dompurify

The version must remain at **2.16.0** until one of the following occurs:

1. **jsdom fixes the ESM issue** by using dynamic imports instead of `require()`
2. **parse5 provides CommonJS exports again** in version 8.x+
3. **isomorphic-dompurify switches to a different parser** (e.g., `linkedom`, `happy-dom`)
4. **Vercel/AWS Lambda adds better ESM support** for mixed module environments

### Monitoring for Updates

Check these repositories periodically for fixes:

- [jsdom/jsdom](https://github.com/jsdom/jsdom) - Watch for CommonJS/ESM fixes
- [inikulin/parse5](https://github.com/inikulin/parse5) - Check if CommonJS returns
- [kkomelin/isomorphic-dompurify](https://github.com/kkomelin/isomorphic-dompurify) - Look for parser alternatives

### Testing After Updates

If you decide to upgrade `isomorphic-dompurify` in the future:

1. Update the version in `package.json`
2. Run `npm install` to get new dependencies
3. Check dependency tree: `npm list isomorphic-dompurify jsdom parse5`
4. Run tests: `npm test`
5. Build the project: `npm run build`
6. **Deploy to preview environment** (Vercel preview deployment)
7. **Test blog pages manually**: `/blog` and `/blog/[slug]`
8. Monitor serverless function logs for ESM errors

## Alternative Solutions Considered

### 1. Use a Different Sanitizer ❌
**Rejected**: Would require significant code changes and testing

### 2. Patch jsdom to Use Dynamic Imports ❌
**Rejected**: Maintenance burden, patch would break on every jsdom update

### 3. Use Client-Side Only Sanitization ❌
**Rejected**: Loses SSR benefits, potential security implications

### 4. Fork isomorphic-dompurify ❌
**Rejected**: Maintenance overhead, would need to keep up with security updates

### 5. Pin to Working Version ✅
**Selected**: Minimal changes, maintains all functionality, easy to upgrade later

## Related Files

- `app/lib/utils/sanitize.ts` - HTML sanitization utility
- `app/lib/__tests__/sanitize.test.ts` - Sanitization tests
- `app/blog/[slug]/BlogArticleClient.tsx` - Uses sanitization for blog content
- `package.json` - Dependency version constraints

## Security Considerations

- **No security impact**: Version 2.16.0 uses the latest DOMPurify (3.1.7)
- **Same sanitization rules** as newer versions
- **Continues to protect against XSS** attacks
- **Regular security updates** still possible via DOMPurify patches

## Support

If you encounter issues with this fix or need to upgrade:

1. Check the GitHub Issues in the repositories linked above
2. Review Vercel/AWS Lambda documentation for ESM support updates
3. Consider using a different HTML parser if jsdom remains incompatible
