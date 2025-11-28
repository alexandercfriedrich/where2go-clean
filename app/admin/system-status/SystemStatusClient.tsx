'use client';

import { useState } from 'react';

type EnvVarInfoWithHint = {
  isSet: boolean;
  length: number;
  first4?: string;
  last4?: string;
};

type EnvInfo = {
  adminWarmupSecret: EnvVarInfoWithHint;
  adminUser: {
    isSet: boolean;
    length: number;
  };
  adminPass: {
    isSet: boolean;
    length: number;
  };
};

type TestResult = {
  status: 'idle' | 'testing' | 'success' | 'error';
  httpStatus?: number;
  message: string;
  details?: Record<string, unknown>;
};

export function SystemStatusClient({ envInfo }: { envInfo: EnvInfo }) {
  const [token, setToken] = useState('');
  const [testResult, setTestResult] = useState<TestResult>({
    status: 'idle',
    message: 'Enter your ADMIN_WARMUP_SECRET and click "Test Bearer Auth"',
  });

  const handleTestBearerAuth = async () => {
    if (!token.trim()) {
      setTestResult({
        status: 'error',
        message: 'Please enter a token first',
      });
      return;
    }

    setTestResult({
      status: 'testing',
      message: 'Testing Bearer authentication...',
    });

    try {
      const response = await fetch('/api/debug/test-events-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await response.json();

      if (data.success && data.authenticated) {
        setTestResult({
          status: 'success',
          httpStatus: data.httpStatus,
          message: `✅ Authentication successful! HTTP ${data.httpStatus} ${data.httpStatusText}`,
          details: data,
        });
      } else if (data.httpStatus === 401) {
        setTestResult({
          status: 'error',
          httpStatus: 401,
          message: `❌ Authentication failed! HTTP 401 - Token is invalid or does not match ADMIN_WARMUP_SECRET`,
          details: data,
        });
      } else {
        setTestResult({
          status: 'error',
          httpStatus: data.httpStatus,
          message: `⚠️ Unexpected response: HTTP ${data.httpStatus} ${data.httpStatusText}`,
          details: data,
        });
      }
    } catch (error) {
      setTestResult({
        status: 'error',
        message: `❌ Failed to test: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const getResultColor = () => {
    switch (testResult.status) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'error':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'testing':
        return 'bg-blue-100 border-blue-500 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 System Status Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and test where2go.at admin authentication
          </p>
        </div>

        {/* Environment Variables Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📋 Environment Variables
          </h2>
          <div className="space-y-4">
            {/* ADMIN_WARMUP_SECRET */}
            <div className={`p-4 rounded-lg border-l-4 ${envInfo.adminWarmupSecret.isSet ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">ADMIN_WARMUP_SECRET</h3>
                  <p className="text-sm text-gray-600">
                    Bearer token for /api/admin/events/process
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${envInfo.adminWarmupSecret.isSet ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {envInfo.adminWarmupSecret.isSet ? 'SET' : 'NOT SET'}
                </span>
              </div>
              {envInfo.adminWarmupSecret.isSet && (
                <div className="mt-2 text-sm font-mono bg-white p-2 rounded border">
                  Length: {envInfo.adminWarmupSecret.length} | 
                  First 4: <span className="font-bold">{envInfo.adminWarmupSecret.first4}</span> | 
                  Last 4: <span className="font-bold">{envInfo.adminWarmupSecret.last4}</span>
                </div>
              )}
            </div>

            {/* ADMIN_USER */}
            <div className={`p-4 rounded-lg border-l-4 ${envInfo.adminUser.isSet ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">ADMIN_USER</h3>
                  <p className="text-sm text-gray-600">
                    Username for Basic Auth (admin pages)
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${envInfo.adminUser.isSet ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {envInfo.adminUser.isSet ? 'SET' : 'NOT SET'}
                </span>
              </div>
              {envInfo.adminUser.isSet && (
                <div className="mt-2 text-sm font-mono bg-white p-2 rounded border">
                  Length: {envInfo.adminUser.length} characters
                </div>
              )}
            </div>

            {/* ADMIN_PASS */}
            <div className={`p-4 rounded-lg border-l-4 ${envInfo.adminPass.isSet ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">ADMIN_PASS</h3>
                  <p className="text-sm text-gray-600">
                    Password for Basic Auth (admin pages)
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${envInfo.adminPass.isSet ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {envInfo.adminPass.isSet ? 'SET' : 'NOT SET'}
                </span>
              </div>
              {envInfo.adminPass.isSet && (
                <div className="mt-2 text-sm font-mono bg-white p-2 rounded border">
                  {envInfo.adminPass.length} characters
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bearer Auth Test Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🔐 Test Bearer Authentication
          </h2>
          <p className="text-gray-600 mb-4">
            Enter your ADMIN_WARMUP_SECRET token to test authentication against 
            <code className="mx-1 px-2 py-1 bg-gray-100 rounded text-sm">/api/admin/events/process</code>
          </p>

          <div className="space-y-4">
            {/* Token Input */}
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                ADMIN_WARMUP_SECRET Token
              </label>
              <input
                type="password"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your secret token..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Test Button */}
            <button
              onClick={handleTestBearerAuth}
              disabled={testResult.status === 'testing'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {testResult.status === 'testing' ? '🔄 Testing...' : '🚀 Test Bearer Auth'}
            </button>

            {/* Test Result */}
            <div className={`p-4 rounded-lg border-l-4 ${getResultColor()}`}>
              <p className="font-medium">{testResult.message}</p>
              
              {testResult.details && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    Show Details
                  </summary>
                  <pre className="bg-white bg-opacity-50 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-bold text-blue-900 mb-3">📝 How Authentication Works</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li>• <strong>/admin/*</strong> and <strong>/api/admin/*</strong> routes use Basic Auth (ADMIN_USER/ADMIN_PASS)</li>
            <li>• <strong>/api/admin/events/process</strong> is excluded from Basic Auth and uses Bearer token (ADMIN_WARMUP_SECRET)</li>
            <li>• <strong>/api/debug/*</strong> routes are excluded from Basic Auth for testing purposes</li>
            <li>• Green = Token valid and endpoint working ✅</li>
            <li>• Red = Authentication failed ❌</li>
          </ul>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-100 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-3">🔗 Quick Links</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/admin" className="text-blue-600 hover:underline">← Back to Admin</a>
            <a href="/api/debug/env" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Raw Env Data ↗</a>
            <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Vercel Dashboard ↗</a>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Dashboard ↗</a>
          </div>
        </div>
      </div>
    </div>
  );
}
