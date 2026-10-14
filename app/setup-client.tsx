'use client';

import { useMemo, useState } from 'react';

// Everything here runs in the browser. The secret is never sent anywhere
// except to this deployment's own MCP endpoint when "Test connection" is used.

type RpcResult = Record<string, unknown>;

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
    throw new Error('404: this secret does not match MCP_SECRET on this deployment, or the endpoint is disabled.');
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

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function ConnectorTools() {
  const [secret, setSecret] = useState('');
  const [reveal, setReveal] = useState(false);
  const [test, setTest] = useState<{ state: 'idle' | 'running' | 'ok' | 'fail'; text?: string }>({ state: 'idle' });
  const [generated, setGenerated] = useState('');

  const url = useMemo(
    () => (secret && typeof window !== 'undefined' ? `${window.location.origin}/mcp/${encodeURIComponent(secret.trim())}` : ''),
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
      const names = ((list.tools as { name: string }[] | undefined) ?? []).map((t) => t.name);
      setTest({ state: 'ok', text: `Connected. ${names.length} tools: ${names.join(', ')}` });
    } catch (error) {
      setTest({ state: 'fail', text: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <>
      <section className="card">
        <h2>Your connector URL</h2>
        <p className="muted">
          Paste your <code>MCP_SECRET</code> to build the URL. It is built in this browser only and is not sent to the server.
        </p>
        <label className="field">
          <span>MCP_SECRET</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={secret}
            onChange={(e) => {
              setSecret(e.target.value);
              setTest({ state: 'idle' });
            }}
            placeholder="Paste the value you set in Vercel"
          />
        </label>
        {url && (
          <>
            <div className="row">
              <input className="mono" readOnly value={reveal ? url : url.replace(/\/mcp\/.*/, '/mcp/••••••••')} />
              <button type="button" onClick={() => setReveal((r) => !r)}>{reveal ? 'Hide' : 'Show'}</button>
              <button type="button" onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
            </div>
            <div className="row">
              <button type="button" className="primary" disabled={test.state === 'running'} onClick={runTest}>
                {test.state === 'running' ? 'Testing…' : 'Test connection'}
              </button>
              {test.text && <span className={test.state === 'ok' ? 'pass' : 'fail'}>{test.text}</span>}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2>Need a secret?</h2>
        <p className="muted">Generates 64 random hex characters in your browser. Save it as <code>MCP_SECRET</code> in Vercel, then redeploy.</p>
        <div className="row">
          <button type="button" onClick={() => setGenerated(randomSecret())}>Generate</button>
          {generated && (
            <>
              <input className="mono" readOnly value={generated} />
              <button type="button" onClick={() => navigator.clipboard.writeText(generated)}>Copy</button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
