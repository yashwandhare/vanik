import React from 'react';
import type { ErrorEnvelope } from '../lib/types';

interface ErrorAlertProps {
  error: ErrorEnvelope | string;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
  if (typeof error === 'string') {
    return (
      <div className="bg-[#ffc0e6] border-[1.5px] border-[#000000] rounded-[16px] p-4 text-[#3f0929] text-sm flex items-start justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider block mb-1">Error</span>
          <span className="font-medium">{error}</span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[#3f0929] hover:text-[#000000] font-mono font-bold text-xs px-2 py-1"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#ffc0e6] border-[1.5px] border-[#000000] rounded-[16px] p-5 text-[#3f0929]">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono font-bold uppercase tracking-wider text-xs block mb-1 bg-[#ffffff] inline-block px-2 py-0.5 rounded border border-[#000000] text-[#000000]">
            {error.code}
          </span>
          <p className="font-bold text-[#000000] text-sm mt-1">{error.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[#3f0929] hover:text-[#000000] font-mono font-bold text-xs px-2 py-1"
          >
            ✕
          </button>
        )}
      </div>

      {error.details && error.details.length > 0 && (
        <ul className="mt-3 pl-3 border-l-2 border-[#000000] space-y-1 text-xs font-mono">
          {error.details.map((detail, idx) => (
            <li key={idx}>
              {detail.field && <code className="bg-[#ffffff] px-1.5 py-0.5 rounded mr-1.5 font-bold border border-[#000000]">{detail.field}</code>}
              <span className="text-[#3f0929] font-medium">{detail.message}</span>
            </li>
          ))}
        </ul>
      )}

      {error.request_id && (
        <div className="mt-3 pt-2 border-t border-[#3f0929]/20 text-[11px] font-mono text-[#3f0929]">
          Request ID: {error.request_id}
        </div>
      )}
    </div>
  );
};
