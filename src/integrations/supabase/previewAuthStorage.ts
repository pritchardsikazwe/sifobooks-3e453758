// Returns the browser's localStorage for auth session storage.
// (Previously brokered sessions to the Lovable editor via postMessage;
//  now uses standard browser storage for an independent deployment.)
export function brokeredPreviewStorage() {
  if (typeof window === 'undefined') return undefined;
  return localStorage;
}
