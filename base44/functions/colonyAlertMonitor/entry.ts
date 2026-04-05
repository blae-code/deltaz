import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RCON_IP = Deno.env.get("GAME_SERVER_IP");
const RCON_PORT = parseInt(Deno.env.get("RCON_PORT") || "25575");
const RCON_PASS = Deno.env.get("RCON_PASSWORD");

// Threshold config: metric -> { threshold, label, rconMessage, eventSeverity }
const THRESHOLDS = {
  food_reserves: { threshold: 20, label: "Food Reserves", severity: "critical", emoji: "🍖" },
  water_supply: { threshold: 20, label: "Water Supply", severity: "critical", emoji: "💧" },
  medical_supplies: { threshold: 15, label: "Medical Supplies", severity: "emergency", emoji: "🏥" },
  morale: { threshold: 25, label: "Colony Morale", severity: "critical", emoji: "😰" },
  defense_integrity: { threshold: 30, label: "Defense Integrity", severity: "emergency", emoji: "🛡" },
  power_level: { threshold: 20, label: "Power Grid", severity: "critical", emoji: "⚡" },
};

// RCON packet helpers
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
  const view = new DataView(buf.buffer);
  return {
    size: view.getInt32(0, true),
    id: view.getInt32(4, true),
    type: view.getInt32(8, true),
    body: new TextDecoder().decode(buf.slice(12, buf.length - 2)),
  };
}

async function sendRconCommand(command) {
  if (!RCON_IP || !RCON_PASS) return null;
  let conn;
  try {
    conn = await Deno.connect({ hostname: RCON_IP, port: RCON_PORT });
    // Auth
    await conn.write(encodePacket(1, 3, RCON_PASS));
    const authBuf = new Uint8Array(4096);
    await conn.read(authBuf);
    const authResp = decodePacket(authBuf);
    if (authResp.id === -1) return "RCON auth failed";
    // Command
    await conn.write(encodePacket(2, 2, command));
    const cmdBuf = new Uint8Array(4096);
    await conn.read(cmdBuf);
    const cmdResp = decodePacket(cmdBuf);
    return cmdResp.body;
  } catch (err) {
    console.error("RCON error:", err.message);
    return null;
  } finally {
    try { conn?.close(); } catch (_) {}
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const colonyData = body.data;

    if (!colonyData) {
      return Response.json({ error: "No colony data in payload" }, { status: 400 });
    }

    const breached = [];

    // Check each metric against thresholds
    for (const [metric, config] of Object.entries(THRESHOLDS)) {
      const value = colonyData[metric];
      if (value !== undefined && value !== null && value <= config.threshold) {
        breached.push({ metric, value, ...config });
      }
    }

    if (breached.length === 0) {
      return Response.json({ status: "ok", message: "All metrics within safe limits" });
    }

    // Determine worst severity
    const hasEmergency = breached.some(b => b.severity === "emergency");
    const overallSeverity = hasEmergency ? "emergency" : "critical";

    // Build event content
    const alertLines = breached.map(b => `${b.emoji} ${b.label}: ${b.value}% (threshold: ${b.threshold}%)`);
    const eventTitle = breached.length === 1
      ? `COLONY ALERT: ${breached[0].label} critically low at ${breached[0].value}%`
      : `COLONY CRISIS: ${breached.length} critical systems failing`;
    const eventContent = alertLines.join("\n") + "\n\nImmediate action required. All operatives report to duty stations.";

    // Create world event
    await base44.asServiceRole.entities.Event.create({
      title: eventTitle,
      content: eventContent,
      type: "world_event",
      severity: overallSeverity,
      is_active: true,
    });

    // Send RCON broadcast to game server
    const rconMessage = breached.length === 1
      ? `[COLONY ALERT] ${breached[0].label} at ${breached[0].value}%! Survival protocols in effect.`
      : `[COLONY CRISIS] Multiple systems critical: ${breached.map(b => `${b.label} ${b.value}%`).join(", ")}. All hands report!`;

    const rconResult = await sendRconCommand(`broadcast ${rconMessage}`);

    // Also create a broadcast notification
    await base44.asServiceRole.entities.Notification.create({
      player_email: "broadcast",
      title: eventTitle,
      message: eventContent,
      type: "colony_alert",
      priority: hasEmergency ? "critical" : "high",
      is_read: false,
    });

    console.log(`Colony alert triggered: ${breached.length} thresholds breached`);
    console.log(`RCON broadcast result: ${rconResult}`);

    return Response.json({
      status: "alert_triggered",
      breached_count: breached.length,
      breached: breached.map(b => ({ metric: b.metric, value: b.value, threshold: b.threshold })),
      severity: overallSeverity,
      rcon_sent: !!rconResult,
    });
  } catch (error) {
    console.error("Colony alert monitor error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});