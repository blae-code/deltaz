import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { faction_id } = body;

  // Fetch all data
  const [factions, territories, jobs, reputations, economies, diplomacies, events] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.Job.filter({}, '-created_date', 100),
    base44.asServiceRole.entities.Reputation.filter({}),
    base44.asServiceRole.entities.FactionEconomy.filter({}),
    base44.asServiceRole.entities.Diplomacy.filter({}),
    base44.asServiceRole.entities.Event.filter({}, '-created_date', 20),
  ]);

  const faction = factions.find(f => f.id === faction_id);
  if (!faction) return Response.json({ error: 'Faction not found' }, { status: 404 });

  // Filter relevant data
  const factionTerritories = territories.filter(t => t.controlling_faction_id === faction_id);
  const factionEcon = economies.find(e => e.faction_id === faction_id);
  const factionReps = reputations.filter(r => r.faction_id === faction_id);
  const factionDiplomacy = diplomacies.filter(d => d.faction_a_id === faction_id || d.faction_b_id === faction_id);

  // Recent missions (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
  const factionJobs = jobs.filter(j => j.faction_id === faction_id);
  const recentJobs = factionJobs.filter(j => j.created_date >= weekAgo);
  const completedJobs = recentJobs.filter(j => j.status === 'completed');
  const failedJobs = recentJobs.filter(j => j.status === 'failed');
  const activeJobs = factionJobs.filter(j => j.status === 'available' || j.status === 'in_progress');

  // Recent events
  const recentEvents = events.filter(e => e.faction_id === faction_id || !e.faction_id).slice(0, 10);

  // Build PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const addLine = (text, size = 10, style = 'normal', color = [180, 190, 200]) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    doc.text(text, 14, y);
    y += size * 0.5 + 2;
  };

  const addSection = (title) => {
    y += 4;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setDrawColor(40, 180, 160);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageWidth - 14, y);
    y += 6;
    addLine(title, 13, 'bold', [40, 180, 160]);
    y += 2;
  };

  // Background
  doc.setFillColor(15, 17, 23);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

  // Header
  addLine('DEAD SIGNAL — WEEKLY DOSSIER', 18, 'bold', [40, 180, 160]);
  addLine(`CLASSIFIED — ${faction.name?.toUpperCase()} [${faction.tag || '???'}]`, 11, 'normal', [200, 160, 60]);
  const now = new Date();
  addLine(`Generated: ${now.toISOString().split('T')[0]} | Period: Last 7 Days`, 9, 'normal', [120, 130, 140]);
  addLine(`Prepared for: ${user.callsign || user.full_name || user.email}`, 9, 'normal', [120, 130, 140]);
  y += 4;

  // === FACTION OVERVIEW ===
  addSection('FACTION OVERVIEW');
  addLine(`Name: ${faction.name}`, 10, 'normal', [200, 210, 220]);
  addLine(`Tag: [${faction.tag || 'N/A'}]   |   Status: ${(faction.status || 'active').toUpperCase()}`, 10);
  addLine(`Members: ${faction.member_count || 0}   |   Territories Held: ${factionTerritories.length}`, 10);
  if (factionEcon) {
    addLine(`Wealth: ${factionEcon.wealth?.toLocaleString() || 0} credits   |   Tax Rate: ${((factionEcon.tax_rate || 0) * 100).toFixed(0)}%`, 10);
    addLine(`Last Cycle Income: ${factionEcon.last_cycle_income?.toLocaleString() || 0}c   |   Embargo: ${factionEcon.trade_embargo ? 'YES' : 'NO'}`, 10);
    const prod = factionEcon.resource_production || {};
    addLine(`Production — Fuel: ${prod.fuel || 0}  Metals: ${prod.metals || 0}  Tech: ${prod.tech || 0}  Food: ${prod.food || 0}  Munitions: ${prod.munitions || 0}`, 9, 'normal', [150, 160, 170]);
  }

  // === TERRITORY CONTROL ===
  addSection('TERRITORY CONTROL');
  if (factionTerritories.length === 0) {
    addLine('No territories currently held.', 10, 'italic', [120, 130, 140]);
  } else {
    for (const t of factionTerritories) {
      const threatColor = t.threat_level === 'critical' || t.threat_level === 'high' ? [200, 50, 50] : [180, 190, 200];
      addLine(`• ${t.name} (${t.sector}) — Status: ${(t.status || 'unknown').toUpperCase()} | Threat: ${(t.threat_level || 'unknown').toUpperCase()}`, 9, 'normal', threatColor);
      if (t.resources?.length) {
        addLine(`  Resources: ${t.resources.join(', ')}`, 8, 'normal', [130, 140, 150]);
      }
    }
  }

  // === MISSION PERFORMANCE ===
  addSection('MISSION PERFORMANCE (7-DAY)');
  addLine(`Total Missions Posted: ${recentJobs.length}`, 10, 'normal', [200, 210, 220]);
  addLine(`Completed: ${completedJobs.length}   |   Failed: ${failedJobs.length}   |   Active: ${activeJobs.length}`, 10);
  const successRate = recentJobs.length > 0 ? ((completedJobs.length / recentJobs.length) * 100).toFixed(0) : 'N/A';
  addLine(`Success Rate: ${successRate}%`, 10, 'bold', successRate !== 'N/A' && parseInt(successRate) >= 70 ? [40, 200, 160] : [200, 60, 60]);
  const totalCredits = completedJobs.reduce((s, j) => s + (j.reward_credits || 0), 0);
  addLine(`Total Credits Distributed: ${totalCredits.toLocaleString()}c`, 10);

  if (completedJobs.length > 0) {
    y += 2;
    addLine('Recent Completed:', 9, 'bold', [150, 160, 170]);
    for (const j of completedJobs.slice(0, 5)) {
      addLine(`  ✓ ${j.title} — ${(j.type || '').toUpperCase()} (${j.reward_credits || 0}c)`, 8, 'normal', [40, 180, 160]);
    }
  }
  if (failedJobs.length > 0) {
    y += 2;
    addLine('Failed Missions:', 9, 'bold', [150, 160, 170]);
    for (const j of failedJobs.slice(0, 5)) {
      addLine(`  ✗ ${j.title} — ${(j.type || '').toUpperCase()}`, 8, 'normal', [200, 50, 50]);
    }
  }

  // === REPUTATION STANDINGS ===
  addSection('OPERATIVE REPUTATION');
  if (factionReps.length === 0) {
    addLine('No reputation records found.', 10, 'italic', [120, 130, 140]);
  } else {
    const sorted = [...factionReps].sort((a, b) => (b.score || 0) - (a.score || 0));
    for (const r of sorted.slice(0, 15)) {
      const rankColor = r.rank === 'hostile' || r.rank === 'enemy' ? [200, 50, 50] : [180, 190, 200];
      addLine(`• ${r.player_email} — Score: ${r.score || 0} | Rank: ${(r.rank || 'unknown').toUpperCase()}`, 9, 'normal', rankColor);
    }
  }

  // === DIPLOMACY ===
  addSection('DIPLOMATIC RELATIONS');
  if (factionDiplomacy.length === 0) {
    addLine('No diplomatic relations on record.', 10, 'italic', [120, 130, 140]);
  } else {
    for (const d of factionDiplomacy) {
      const otherFactionId = d.faction_a_id === faction_id ? d.faction_b_id : d.faction_a_id;
      const otherFaction = factions.find(f => f.id === otherFactionId);
      const statusColor = d.status === 'war' || d.status === 'hostile' ? [200, 50, 50] : d.status === 'allied' ? [40, 180, 160] : [180, 190, 200];
      addLine(`• ${otherFaction?.name || 'Unknown'} — ${(d.status || 'neutral').toUpperCase()}${d.terms ? ` (${d.terms.substring(0, 60)})` : ''}`, 9, 'normal', statusColor);
    }
  }

  // === RECENT WORLD EVENTS ===
  addSection('RECENT INTELLIGENCE');
  for (const e of recentEvents.slice(0, 8)) {
    const sevColor = e.severity === 'critical' || e.severity === 'emergency' ? [200, 50, 50] : e.severity === 'warning' ? [200, 160, 60] : [150, 160, 170];
    addLine(`[${(e.severity || 'info').toUpperCase()}] ${e.title}`, 9, 'normal', sevColor);
  }

  // Footer
  y += 8;
  doc.setDrawColor(40, 180, 160);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;
  addLine('END OF DOSSIER — GHOST PROTOCOL INTELLIGENCE DIVISION', 8, 'italic', [80, 90, 100]);
  addLine('This document is classified. Unauthorized distribution will be met with extreme prejudice.', 7, 'italic', [60, 70, 80]);

  const pdfBytes = doc.output('arraybuffer');
  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=dossier-${faction.tag || 'faction'}-${now.toISOString().split('T')[0]}.pdf`
    }
  });
});