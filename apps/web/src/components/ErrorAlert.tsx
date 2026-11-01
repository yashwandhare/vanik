import React from 'react';
import type { ErrorEnvelope } from '../lib/types';

interface ErrorAlertProps {
  error: ErrorEnvelope | string;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
  if (typeof error === 'string') {
    return (
      <div className="bg-[#F8CBD6] border-[1.5px] border-[#D9381E] rounded-[16px] p-4 text-[#D9381E] text-sm flex items-start justify-between shadow-xs">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider block mb-1">Error</span>
          <span className="font-medium text-[#1C181A]">{error}</span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error notification"
            className="text-[#D9381E] hover:text-[#1C181A] font-mono font-bold text-xs px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#F8CBD6] border-[1.5px] border-[#D9381E] rounded-[16px] p-5 text-[#D9381E] shadow-xs">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono font-bold uppercase tracking-wider text-xs block mb-1 bg-[#FFFDF9] inline-block px-2 py-0.5 rounded border border-[#D9381E] text-[#D9381E]">
            {error.code}
          </span>
          <p className="font-bold text-[#1C181A] text-sm mt-1">{error.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error notification"
            className="text-[#D9381E] hover:text-[#1C181A] font-mono font-bold text-xs px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9381E]"
          >
            ✕
          </button>
        )}
      </div>

      {error.details && error.details.length > 0 && (
        <ul className="mt-3 pl-3 border-l-2 border-[#D9381E] space-y-1 text-xs font-mono">
          {error.details.map((detail, idx) => (
            <li key={idx}>
              {detail.field && (
                <code className="bg-[#FFFDF9] px-1.5 py-0.5 rounded mr-1.5 font-bold border border-[#DDD0B8] text-[#1C181A]">
                  {detail.field}
                </code>
              )}
              <span className="text-[#D9381E] font-medium">{detail.message}</span>
            </li>
          ))}
        </ul>
      )}

      {error.request_id && (
        <div className="mt-3 pt-2 border-t border-[#D9381E]/20 text-[11px] font-mono text-[#D9381E]">
          Request ID: {error.request_id}
        </div>
      )}
    </div>
  );
};
