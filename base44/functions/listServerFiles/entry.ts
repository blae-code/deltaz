import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const directory = body.directory || '/';

    const url = (Deno.env.get('PTERODACTYL_URL') || '').replace(/\/+$/, '');
    const apiKey = Deno.env.get('PTERODACTYL_API_KEY') || '';
    const serverId = Deno.env.get('PTERODACTYL_SERVER_ID') || '';

    const res = await fetch(
      `${url}/api/client/servers/${serverId}/files/list?directory=${encodeURIComponent(directory)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'Application/vnd.pterodactyl.v1+json',
        },
      }
    );
    
    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    const files = data.data.map(f => ({
      name: f.attributes.name,
      is_file: f.attributes.is_file,
      size: f.attributes.size,
    }));

    return Response.json({ files, directory });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});