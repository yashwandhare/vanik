import React from 'react';
import type { ErrorEnvelope } from '../lib/types';

interface ErrorAlertProps {
  error: ErrorEnvelope | string;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
  if (typeof error === 'string') {
    return (
      <div className="bg-[#F2B6C4] border-[1.5px] border-[#C8472F] rounded-[16px] p-4 text-[#C8472F] text-sm flex items-start justify-between shadow-xs">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider block mb-1">Error</span>
          <span className="font-medium">{error}</span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error notification"
            className="text-[#C8472F] hover:text-[#1E1A1C] font-mono font-bold text-xs px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8472F]"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#F2B6C4] border-[1.5px] border-[#C8472F] rounded-[16px] p-5 text-[#C8472F] shadow-xs">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono font-bold uppercase tracking-wider text-xs block mb-1 bg-[#FFFAF0] inline-block px-2 py-0.5 rounded border border-[#C8472F] text-[#C8472F]">
            {error.code}
          </span>
          <p className="font-bold text-[#1E1A1C] text-sm mt-1">{error.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error notification"
            className="text-[#C8472F] hover:text-[#1E1A1C] font-mono font-bold text-xs px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8472F]"
          >
            ✕
          </button>
        )}
      </div>

      {error.details && error.details.length > 0 && (
        <ul className="mt-3 pl-3 border-l-2 border-[#C8472F] space-y-1 text-xs font-mono">
          {error.details.map((detail, idx) => (
            <li key={idx}>
              {detail.field && (
                <code className="bg-[#FFFAF0] px-1.5 py-0.5 rounded mr-1.5 font-bold border border-[#CDBB98]">
                  {detail.field}
                </code>
              )}
              <span className="text-[#C8472F] font-medium">{detail.message}</span>
            </li>
          ))}
        </ul>
      )}

      {error.request_id && (
        <div className="mt-3 pt-2 border-t border-[#C8472F]/20 text-[11px] font-mono text-[#C8472F]">
          Request ID: {error.request_id}
        </div>
      )}
    </div>
  );
};
