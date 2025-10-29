'use client';

import { useState } from 'react';

export interface DebugInfo {
  timestamp: string;
  type: 'api' | 'ai' | 'cache' | 'dedup';
  action: string;
  data: any;
  duration?: number;
}

interface DebugPanelProps {
  debugInfo: DebugInfo[];
  enabled?: boolean;
}

export function DebugPanel({ debugInfo, enabled = false }: DebugPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  if (!enabled || typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const filteredInfo = filter === 'all' 
    ? debugInfo 
    : debugInfo.filter(info => info.type === filter);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-2xl">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-mono text-sm">🐛 DEBUG</span>
            <span className="text-gray-400 text-xs">
              {debugInfo.length} events
            </span>
          </div>
          <button className="text-gray-400 hover:text-white">
            {expanded ? '▼' : '▲'}
          </button>
        </div>

        {/* Content */}
        {expanded && (
          <div className="border-t border-gray-700">
            {/* Filter Tabs */}
            <div className="flex gap-1 p-2 bg-gray-800 text-xs">
              {['all', 'api', 'ai', 'cache', 'dedup'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded ${
                    filter === f 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {f.toUpperCase()}
                  {f !== 'all' && ` (${debugInfo.filter(i => i.type === f).length})`}
                </button>
              ))}
            </div>

            {/* Debug Log */}
            <div className="max-h-96 overflow-y-auto p-3 space-y-2 font-mono text-xs">
              {filteredInfo.length === 0 ? (
                <div className="text-gray-500 italic">No debug info yet...</div>
              ) : (
                filteredInfo.map((info, idx) => (
                  <DebugEntry key={idx} info={info} />
                ))
              )}
            </div>

            {/* Clear Button */}
            <div className="border-t border-gray-700 p-2 text-right">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
              >
                Clear & Reload
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DebugEntry({ info }: { info: DebugInfo }) {
  const [showDetails, setShowDetails] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'api': return 'text-blue-400';
      case 'ai': return 'text-purple-400';
      case 'cache': return 'text-green-400';
      case 'dedup': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api': return '🌐';
      case 'ai': return '🤖';
      case 'cache': return '💾';
      case 'dedup': return '🔄';
      default: return '📝';
    }
  };

  return (
    <div className="bg-gray-800 rounded p-2 border border-gray-700">
      <div 
        className="flex items-start justify-between cursor-pointer hover:bg-gray-750"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span>{getTypeIcon(info.type)}</span>
            <span className={`font-semibold ${getTypeColor(info.type)}`}>
              {info.type.toUpperCase()}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-300">{info.action}</span>
          </div>
          <div className="text-gray-500 text-xs mt-1">
            {new Date(info.timestamp).toLocaleTimeString()}
            {info.duration && ` • ${info.duration}ms`}
          </div>
        </div>
        <button className="text-gray-500 hover:text-white text-xs">
          {showDetails ? '▼' : '▶'}
        </button>
      </div>

      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(info.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
