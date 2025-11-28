'use client';

import { useState, useEffect } from 'react';

type StatusCheck = {
  name: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
};

export default function SystemStatusPage() {
  const [checks, setChecks] = useState<StatusCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runChecks = async () => {
    setLoading(true);
    const results: StatusCheck[] = [];

    // 1. Check Environment Variables
    try {
      const envRes = await fetch('/api/debug/env');
      const envData = await envRes.json();
      
      results.push({
        name: 'Environment Variables',
        status: envData.hasSecret ? 'success' : 'error',
        message: envData.hasSecret 
          ? `✓ All required variables present (${envData.allAdminVars.length} found)`
          : '✗ ADMIN_WARMUP_SECRET missing',
        details: envData
      });
    } catch (e) {
      results.push({
        name: 'Environment Variables',
        status: 'error',
        message: '✗ Failed to check environment',
        details: String(e)
      });
    }

    // 2. Check Auth with Bearer Token
    try {
      const token = prompt('Enter your ADMIN_WARMUP_SECRET token (or cancel to skip):');
      
      if (token) {
        const authRes = await fetch('/api/debug/auth', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const authData = await authRes.json();
        
        results.push({
          name: 'Bearer Token Authentication',
          status: authData.tokensMatch ? 'success' : 'error',
          message: authData.tokensMatch
            ? '✓ Bearer token valid'
            : authData.lengthMatch
              ? '✗ Token content mismatch'
              : `✗ Token length mismatch (got ${authData.tokenLength}, expected ${authData.secretLength})`,
          details: authData
        });

        // 3. Test Events Process API
        if (authData.tokensMatch) {
          try {
            const eventsRes = await fetch('/api/admin/events/process', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ events: [], options: {} })
            });
            const eventsData = await eventsRes.json();
            
            results.push({
              name: 'Events Process API',
              status: eventsRes.ok ? 'success' : 'error',
              message: eventsRes.ok
                ? '✓ API endpoint working'
                : `✗ API returned ${eventsRes.status}`,
              details: eventsData
            });
          } catch (e) {
            results.push({
              name: 'Events Process API',
              status: 'error',
              message: '✗ Failed to test API',
              details: String(e)
            });
          }
        }
      } else {
        results.push({
          name: 'Bearer Token Authentication',
          status: 'warning',
          message: '⊘ Skipped (no token provided)',
          details: null
        });
        results.push({
          name: 'Events Process API',
          status: 'warning',
          message: '⊘ Skipped (token test required first)',
          details: null
        });
      }
    } catch (e) {
      results.push({
        name: 'Bearer Token Authentication',
        status: 'error',
        message: '✗ Failed to test auth',
        details: String(e)
      });
    }

    // 4. Check Supabase Connection
    results.push({
      name: 'Supabase Database',
      status: 'warning',
      message: '⊘ Manual check required',
      details: 'Visit Supabase dashboard to verify connection'
    });

    // 5. Check Upstash Redis
    results.push({
      name: 'Upstash Redis Cache',
      status: 'warning',
      message: '⊘ Manual check required',
      details: 'Visit Upstash dashboard to verify connection'
    });

    setChecks(results);
    setLastCheck(new Date());
    setLoading(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const getStatusColor = (status: StatusCheck['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 border-green-500 text-green-800';
      case 'error': return 'bg-red-100 border-red-500 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'checking': return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getStatusIcon = (status: StatusCheck['status']) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'checking': return '⏳';
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
            Real-time status checks for where2go.at infrastructure
          </p>
          {lastCheck && (
            <p className="text-sm text-gray-500 mt-2">
              Last check: {lastCheck.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mb-6">
          <button
            onClick={runChecks}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? '🔄 Checking...' : '🔄 Re-run Checks'}
          </button>
        </div>

        {/* Status Checks */}
        <div className="space-y-4">
          {checks.map((check, index) => (
            <div
              key={index}
              className={`border-l-4 rounded-lg shadow-sm p-6 ${getStatusColor(check.status)}`}
            >
              <div className="flex items-start">
                <span className="text-2xl mr-3">
                  {getStatusIcon(check.status)}
                </span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{check.name}</h3>
                  <p className="mb-3">{check.message}</p>
                  
                  {check.details && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium mb-2">
                        Show Details
                      </summary>
                      <pre className="bg-white bg-opacity-50 p-3 rounded text-xs overflow-auto">
                        {JSON.stringify(check.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">📝 How to Use</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li>• Click &quot;Re-run Checks&quot; to test all systems</li>
            <li>• You&apos;ll be prompted for your ADMIN_WARMUP_SECRET token</li>
            <li>• Green = Working ✓</li>
            <li>• Red = Error ✗</li>
            <li>• Yellow = Warning or Skipped ⚠</li>
            <li>• Click &quot;Show Details&quot; to see technical information</li>
          </ul>
        </div>

        {/* Quick Links */}
        <div className="mt-6 bg-gray-100 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-3">🔗 Quick Links</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/admin" className="text-blue-600 hover:underline">← Back to Admin</a>
            <a href="/api/debug/env" target="_blank" className="text-blue-600 hover:underline">View Raw Env Data ↗</a>
            <a href="https://vercel.com/dashboard" target="_blank" className="text-blue-600 hover:underline">Vercel Dashboard ↗</a>
            <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-600 hover:underline">Supabase Dashboard ↗</a>
          </div>
        </div>
      </div>
    </div>
  );
}
