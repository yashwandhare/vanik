import React from 'react';
import type { ErrorEnvelope } from '../lib/types';

interface ErrorAlertProps {
  error: ErrorEnvelope | string;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
  if (typeof error === 'string') {
    return (
      <div className="bg-[#fee2e2] border-[1.5px] border-[#991b1b] rounded-[16px] p-4 text-[#7f1d1d] text-sm flex items-start justify-between shadow-xs">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider block mb-1">Error</span>
          <span className="font-medium">{error}</span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error notification"
            className="text-[#7f1d1d] hover:text-[#1c1917] font-mono font-bold text-xs px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1b]"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#fee2e2] border-[1.5px] border-[#991b1b] rounded-[16px] p-5 text-[#7f1d1d] shadow-xs">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono font-bold uppercase tracking-wider text-xs block mb-1 bg-[#ffffff] inline-block px-2 py-0.5 rounded border border-[#991b1b] text-[#7f1d1d]">
            {error.code}
          </span>
          <p className="font-bold text-[#1c1917] text-sm mt-1">{error.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error notification"
            className="text-[#7f1d1d] hover:text-[#1c1917] font-mono font-bold text-xs px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1b]"
          >
            ✕
          </button>
        )}
      </div>

      {error.details && error.details.length > 0 && (
        <ul className="mt-3 pl-3 border-l-2 border-[#991b1b] space-y-1 text-xs font-mono">
          {error.details.map((detail, idx) => (
            <li key={idx}>
              {detail.field && (
                <code className="bg-[#ffffff] px-1.5 py-0.5 rounded mr-1.5 font-bold border border-[#d8cbbe]">
                  {detail.field}
                </code>
              )}
              <span className="text-[#7f1d1d] font-medium">{detail.message}</span>
            </li>
          ))}
        </ul>
      )}

      {error.request_id && (
        <div className="mt-3 pt-2 border-t border-[#991b1b]/20 text-[11px] font-mono text-[#7f1d1d]">
          Request ID: {error.request_id}
        </div>
      )}
    </div>
  );
};
