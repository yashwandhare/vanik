import React from 'react';
import type { ErrorEnvelope } from '../lib/types';

interface ErrorAlertProps {
  error: ErrorEnvelope | string;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
  if (typeof error === 'string') {
    return (
      <div className="bg-rose-950/40 border border-rose-500/40 rounded-lg p-4 text-rose-200 text-sm flex items-start justify-between">
        <div>
          <span className="font-semibold block">Error</span>
          <span>{error}</span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-200 text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-rose-950/40 border border-rose-500/40 rounded-lg p-4 text-rose-200 text-sm">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-semibold text-rose-300 uppercase tracking-wider text-xs block mb-1">
            {error.code}
          </span>
          <p className="font-medium text-rose-100">{error.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-200 text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        )}
      </div>

      {error.details && error.details.length > 0 && (
        <ul className="mt-3 pl-4 border-l border-rose-800/60 space-y-1 text-xs text-rose-300">
          {error.details.map((detail, idx) => (
            <li key={idx}>
              {detail.field && <code className="bg-rose-900/60 px-1 py-0.5 rounded mr-1 font-mono">{detail.field}</code>}
              <span>{detail.message}</span>
            </li>
          ))}
        </ul>
      )}

      {error.request_id && (
        <div className="mt-3 pt-2 border-t border-rose-900/40 text-[11px] text-rose-400 font-mono">
          Request ID: {error.request_id}
        </div>
      )}
    </div>
  );
};
