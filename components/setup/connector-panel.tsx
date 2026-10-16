'use client';

import { useEffect, useMemo, useState } from 'react';
import { pulse } from '../cosmos/store';
import { CopyButton } from './copy-button';
import { PhonePair } from './phone-pair';
import { forgetSecret, markConnected, setRemember, setSecret, useSetup } from './setup-store';

// Runs in the browser only. The secret is only ever sent to this deployment:
// to its MCP endpoint (Test connection) and to /api/stats (your usage). The
// install buttons in chat-guides.tsx hand the link to a chat app when clicked.

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

  const [host, setHost] = useState('');

  useEffect(() => setHost(window.location.host), []);

  const url = useMemo(
    () => (secret.trim() && typeof window !== 'undefined' ? `${window.location.origin}/mcp/${encodeURIComponent(secret.trim())}` : ''),
    [secret],
  );

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
      {/* The field reads as the link itself: this site's /mcp/ address, completed by the secret. */}
      <div className={`link-field${secret ? ' is-filled' : ''}`}>
        <label className="link-prefix" htmlFor="mcp-secret">
          {host}/mcp/
          <span className="sr-only"> followed by your MCP_SECRET</span>
        </label>
        <div className="link-input">
          <input
            id="mcp-secret"
            type={reveal ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            placeholder="paste your MCP_SECRET"
            aria-describedby="mcp-secret-help"
            value={secret}
            onChange={(e) => {
              setSecret(e.target.value);
              setTest({ state: 'idle' });
            }}
          />
          <button type="button" className="link-eye" aria-label={reveal ? 'Hide secret' : 'Show secret'} aria-pressed={reveal} onClick={() => setReveal((r) => !r)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {reveal && <path d="M4 4l16 16" />}
            </svg>
          </button>
        </div>
      </div>

      <div className="link-actions">
        <button type="button" className="btn btn-primary btn-small" disabled={!url || test.state === 'running'} onClick={runTest}>
          {test.state === 'running' ? 'Testing' : 'Test connection'}
        </button>
        {url ? <CopyButton value={url} label="Copy link" /> : <button type="button" className="btn btn-ghost btn-small" disabled>Copy link</button>}
        <label className="check-label">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember
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
            Forget
          </button>
        )}
      </div>

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

      <PhonePair />

      <p className="field-help" id="mcp-secret-help">
        Sent only to this deployment, until you add the link to a chat app. No secret yet, or lost it? <a href="#secret">Make one</a>.
      </p>
    </div>
  );
}
