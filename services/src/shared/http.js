// A tiny HTTP helper shared by the services.
//
// No framework. These services are small enough that a router is not the hard
// part, and a prototype whose security-relevant code sits behind a dependency
// tree is harder to review, not easier.

import http from 'node:http';

export function json(res, code, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Obhoy-MSP',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(payload);
}

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    throw new Error(`malformed request body: ${err.message}`);
  }
}

/**
 * Build a server from a route table keyed by "METHOD /path".
 * A handler returns [statusCode, body]; a thrown error becomes a 422 with its
 * message, because in this system a refusal is a normal outcome rather than a
 * fault.
 */
export function serve({ name, port, routes, banner = [] }) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return json(res, 204, null);
    const url = new URL(req.url, `http://localhost:${port}`);
    const key = `${req.method} ${url.pathname}`;
    const handler = routes[key];
    if (!handler) {
      return json(res, 404, { ok: false, error: `no route ${key} on ${name}` });
    }
    try {
      const body = req.method === 'POST' ? await readBody(req) : {};
      const [code, payload] = await handler({ body, query: url.searchParams, req });
      return json(res, code, payload);
    } catch (err) {
      return json(res, 422, { ok: false, service: name, error: err.message });
    }
  });

  server.listen(port, () => {
    console.log(`  ${name.padEnd(20)} http://localhost:${port}`);
    for (const line of banner) console.log(`  ${''.padEnd(20)} ${line}`);
  });
  return server;
}

export function required(body, ...fields) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      throw new Error(`${f} is required`);
    }
  }
}
