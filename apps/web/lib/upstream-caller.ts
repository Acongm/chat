export function applyUpstreamCallerHeaders(
  headers: Headers,
  defaultCallSource: string,
): string {
  if (!headers.get('x-call-source')?.trim()) {
    headers.set('x-call-source', defaultCallSource);
  }
  const existing = headers.get('x-request-id')?.trim();
  const requestId = existing || crypto.randomUUID();
  if (!existing) {
    headers.set('x-request-id', requestId);
  }
  return requestId;
}

export function echoRequestId(headers: Headers, requestId: string): void {
  headers.set('x-request-id', requestId);
}
