import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

function getPterodactylConfig() {
  const url = (Deno.env.get('PTERODACTYL_URL') || '').replace(/\/+$/, '');
  const apiKey = Deno.env.get('PTERODACTYL_API_KEY') || '';
  const serverId = Deno.env.get('PTERODACTYL_SERVER_ID') || '';

  if (!url || !apiKey || !serverId) {
    throw new Error('Missing Pterodactyl configuration');
  }

  return {
    url,
    serverId,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
    },
  };
}

function normalizeDirectory(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return '/';
  }

  const sanitized = value.replace(/\\/g, '/').trim();
  return sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const directory = normalizeDirectory(body.directory);
    const ptero = getPterodactylConfig();

    const response = await fetch(
      `${ptero.url}/api/client/servers/${ptero.serverId}/files/list?directory=${encodeURIComponent(directory)}`,
      {
        headers: ptero.headers,
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      return Response.json({ error: text || 'Failed to list files' }, { status: response.status });
    }

    const data = await response.json();
    const files = Array.isArray(data?.data)
      ? data.data.map((entry) => ({
          name: entry?.attributes?.name || '',
          is_file: Boolean(entry?.attributes?.is_file),
          size: Number(entry?.attributes?.size) || 0,
        }))
      : [];

    return Response.json({ files, directory });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});
