'use client';

import { useEffect, useMemo, useState } from 'react';
import { pulse } from '../cosmos/store';
import { CopyButton } from './copy-button';
import { forgetSecret, markConnected, restoreSecret, setRemember, setSecret, useSetup } from './setup-store';

// Runs in the browser only. The secret is only ever sent to this deployment:
// to its MCP endpoint (Test connection) and to /api/stats (your usage).

type RpcResult = Record<string, unknown>;
type TestState =
  | { state: 'idle' }
  | { state: 'running' }
  | { state: 'ok'; tools: string[] }
  | { state: 'fail'; message: string };

async function rpc(url: string, body: object, protocolVersion?: string): Promise<RpcResult> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(protocolVersion ? { 'mcp-protocol-version': protocolVersion } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 404) {
    throw new Error('This secret does not match MCP_SECRET on this deployment, or the endpoint is off (see “Set MCP_SECRET”).');
  }
  if (!res.ok) throw new Error(`The endpoint answered HTTP ${res.status}.`);
  const text = await res.text();
  const payload = (res.headers.get('content-type') ?? '').includes('text/event-stream')
    ? text.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).at(-1)
    : text;
  const message = JSON.parse(payload ?? '{}');
  if (message.error) throw new Error(message.error.message ?? 'MCP error');
  return message.result ?? {};
}

export function ConnectorPanel() {
  const { secret, remember, connected } = useSetup();
  const [reveal, setReveal] = useState(false);
  const [test, setTest] = useState<TestState>({ state: 'idle' });

  useEffect(restoreSecret, []);

  const url = useMemo(
    () => (secret.trim() && typeof window !== 'undefined' ? `${window.location.origin}/mcp/${encodeURIComponent(secret.trim())}` : ''),
    [secret],
  );
  const masked = url.replace(/\/mcp\/.*/, '/mcp/' + '•'.repeat(12));

  async function runTest() {
    setTest({ state: 'running' });
    try {
      const init = await rpc(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'setup-page', version: '1' } },
      });
      const version = typeof init.protocolVersion === 'string' ? init.protocolVersion : '2025-06-18';
      const list = await rpc(url, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, version);
      const tools = ((list.tools as { name: string }[] | undefined) ?? []).map((t) => t.name);
      setTest({ state: 'ok', tools });
      markConnected();
      pulse();
    } catch (error) {
      setTest({ state: 'fail', message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <div className="connector">
      <div className="field">
        <label htmlFor="mcp-secret">Your MCP_SECRET</label>
        <p className="field-help" id="mcp-secret-help">
          The value you set in Vercel. It only goes to this deployment, to test your link and show your usage.
        </p>
        <input
          id="mcp-secret"
          type="password"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="mcp-secret-help"
          value={secret}
          onChange={(e) => {
            setSecret(e.target.value);
            setTest({ state: 'idle' });
          }}
        />
        <div className="field-row">
          <label className="check-label">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember on this browser
          </label>
          {secret && (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                forgetSecret();
                setTest({ state: 'idle' });
              }}
            >
              Forget it
            </button>
          )}
        </div>
      </div>

      {url ? (
        <div className="url-box">
          <p className="url-label">Connector URL</p>
          <div className="url-row">
            <code className="url-value">{reveal ? url : masked}</code>
            <div className="url-actions">
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setReveal((r) => !r)}>
                {reveal ? 'Hide' : 'Show'}
              </button>
              <CopyButton value={url} />
            </div>
          </div>
          <div className="test-row">
            <button type="button" className="btn btn-primary" disabled={test.state === 'running'} onClick={runTest}>
              {test.state === 'running' ? 'Testing' : 'Test connection'}
            </button>
            <div className="test-result" role="status" aria-live="polite">
              {test.state === 'running' && <span className="skeleton" aria-label="Testing connection" />}
              {test.state === 'idle' && connected && (
                <p className="result-ok">
                  <strong>Working.</strong> This secret opens your connector.
                </p>
              )}
              {test.state === 'ok' && (
                <div className="result-ok">
                  <strong>Connected.</strong> {test.tools.length} tools ready:
                  <ul className="chips">
                    {test.tools.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {test.state === 'fail' && (
                <p className="result-fail">
                  <strong>Not connected.</strong> {test.message}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="empty-hint">Paste your secret above to build the URL you will add to Claude or ChatGPT.</p>
      )}

      <p className="field-help">
        No secret yet, or lost it? Make one in <a href="#secret">Set MCP_SECRET</a>.
      </p>
    </div>
  );
}
