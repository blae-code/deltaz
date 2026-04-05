import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const RCON_IP = Deno.env.get('GAME_SERVER_IP');
const RCON_PORT = Number.parseInt(Deno.env.get('RCON_PORT') || '25575', 10);
const RCON_PASS = Deno.env.get('RCON_PASSWORD');
const ALERT_SUPPRESSION_MS = 30 * 60 * 1000;

const THRESHOLDS = {
  food_reserves: { threshold: 20, label: 'Food Reserves', severity: 'critical', emoji: 'FOOD' },
  water_supply: { threshold: 20, label: 'Water Supply', severity: 'critical', emoji: 'WATER' },
  medical_supplies: { threshold: 15, label: 'Medical Supplies', severity: 'emergency', emoji: 'MED' },
  morale: { threshold: 25, label: 'Colony Morale', severity: 'critical', emoji: 'MORALE' },
  defense_integrity: { threshold: 30, label: 'Defense Integrity', severity: 'emergency', emoji: 'DEFENSE' },
  power_level: { threshold: 20, label: 'Power Grid', severity: 'critical', emoji: 'POWER' },
};

function encodePacket(id, type, body) {
  const bodyBuf = new TextEncoder().encode(body);
  const size = 4 + 4 + bodyBuf.length + 2;
  const buf = new Uint8Array(4 + size);
  const view = new DataView(buf.buffer);
  view.setInt32(0, size, true);
  view.setInt32(4, id, true);
  view.setInt32(8, type, true);
  buf.set(bodyBuf, 12);
  buf[12 + bodyBuf.length] = 0;
  buf[13 + bodyBuf.length] = 0;
  return buf;
}

function decodePacket(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return {
    size: view.getInt32(0, true),
    id: view.getInt32(4, true),
    type: view.getInt32(8, true),
    body: new TextDecoder().decode(buf.slice(12, Math.max(12, buf.length - 2))),
  };
}

async function readPacket(conn) {
  const header = new Uint8Array(4);
  const headerBytes = await conn.read(header);
  if (!headerBytes || headerBytes < 4) {
    return null;
  }

  const size = new DataView(header.buffer).getInt32(0, true);
  const payload = new Uint8Array(size);
  let offset = 0;
  while (offset < size) {
    const read = await conn.read(payload.subarray(offset));
    if (!read) break;
    offset += read;
  }

  if (offset !== size) {
    return null;
  }

  const fullPacket = new Uint8Array(4 + size);
  fullPacket.set(header, 0);
  fullPacket.set(payload, 4);
  return decodePacket(fullPacket);
}

async function sendRconCommand(command) {
  if (!RCON_IP || !RCON_PASS || !Number.isFinite(RCON_PORT)) {
    return null;
  }

  let conn;
  try {
    conn = await Deno.connect({ hostname: RCON_IP, port: RCON_PORT });

    await conn.write(encodePacket(1, 3, RCON_PASS));
    const authResponse = await readPacket(conn);
    if (!authResponse || authResponse.id === -1) {
      return 'RCON auth failed';
    }

    await conn.write(encodePacket(2, 2, command));
    const commandResponse = await readPacket(conn);
    return commandResponse?.body || '';
  } catch (error) {
    console.error('RCON error:', error.message);
    return null;
  } finally {
    try {
      conn?.close();
    } catch (_) {}
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {}

    const body = await req.json().catch(() => ({}));
    const colonyData = resolveColonyData(body);

    if (!colonyData) {
      return Response.json({ error: 'No colony data in payload' }, { status: 400 });
    }

    const breached = getBreachedThresholds(colonyData);
    if (breached.length === 0) {
      return Response.json({ status: 'ok', message: 'All metrics within safe limits' });
    }

    const alertKey = `colony-alert:${breached.map((item) => item.metric).sort().join(',')}`;
    const recentAlerts = await base44.asServiceRole.entities.Notification.filter({
      type: 'colony_alert',
      reference_id: alertKey,
    }, '-created_date', 1);

    const latestAlert = recentAlerts[0];
    const latestAlertTime = Date.parse(latestAlert?.created_date || '');
    if (Number.isFinite(latestAlertTime) && (Date.now() - latestAlertTime) < ALERT_SUPPRESSION_MS) {
      return Response.json({
        status: 'suppressed',
        message: 'Duplicate colony alert suppressed',
        breached_count: breached.length,
        alert_key: alertKey,
      });
    }

    const hasEmergency = breached.some((item) => item.severity === 'emergency');
    const overallSeverity = hasEmergency ? 'emergency' : 'critical';
    const alertLines = breached.map((item) => `${item.emoji} ${item.label}: ${item.value}% (threshold: ${item.threshold}%)`);
    const eventTitle = breached.length === 1
      ? `COLONY ALERT: ${breached[0].label} critically low at ${breached[0].value}%`
      : `COLONY CRISIS: ${breached.length} critical systems failing`;
    const eventContent = `${alertLines.join('\n')}\n\nImmediate action required. All operatives report to duty stations.`;

    await base44.asServiceRole.entities.Event.create({
      title: eventTitle,
      content: eventContent,
      type: 'world_event',
      severity: overallSeverity,
      is_active: true,
    });

    const rconMessage = breached.length === 1
      ? `[COLONY ALERT] ${breached[0].label} at ${breached[0].value}%! Survival protocols in effect.`
      : `[COLONY CRISIS] Multiple systems critical: ${breached.map((item) => `${item.label} ${item.value}%`).join(', ')}. All hands report!`;

    const rconResult = await sendRconCommand(`broadcast ${rconMessage}`);

    await base44.asServiceRole.entities.Notification.create({
      player_email: 'broadcast',
      title: eventTitle,
      message: eventContent,
      type: 'colony_alert',
      priority: hasEmergency ? 'critical' : 'high',
      is_read: false,
      reference_id: alertKey,
    });

    return Response.json({
      status: 'alert_triggered',
      breached_count: breached.length,
      breached: breached.map((item) => ({ metric: item.metric, value: item.value, threshold: item.threshold })),
      severity: overallSeverity,
      rcon_sent: rconResult !== null,
      alert_key: alertKey,
    });
  } catch (error) {
    console.error('Colony alert monitor error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function resolveColonyData(body) {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const directMetrics = Object.keys(THRESHOLDS).some((key) => body[key] !== undefined);
  if (directMetrics) {
    return body;
  }

  if (body.data && typeof body.data === 'object') {
    return body.data;
  }

  return null;
}

function getBreachedThresholds(colonyData) {
  const breached = [];

  for (const [metric, config] of Object.entries(THRESHOLDS)) {
    const value = Number(colonyData[metric]);
    if (!Number.isFinite(value)) {
      continue;
    }

    if (value <= config.threshold) {
      breached.push({
        metric,
        value: Math.max(0, Math.min(100, Math.round(value))),
        ...config,
      });
    }
  }

  return breached;
}
