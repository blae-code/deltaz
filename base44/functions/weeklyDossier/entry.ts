import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const factionId = typeof body.faction_id === 'string' ? body.faction_id : '';
    if (!factionId) {
      return Response.json({ error: 'faction_id required' }, { status: 400 });
    }

    const [factions, territories, jobs, reputations, economies, diplomacies, events] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Job.filter({}, '-created_date', 100),
      base44.asServiceRole.entities.Reputation.filter({}),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Event.filter({}, '-created_date', 20),
    ]);

    const faction = factions.find((entry) => entry.id === factionId);
    if (!faction) {
      return Response.json({ error: 'Faction not found' }, { status: 404 });
    }

    const factionTerritories = territories.filter((territory) => territory.controlling_faction_id === factionId);
    const factionEconomy = economies.find((economy) => economy.faction_id === factionId);
    const factionReputations = reputations.filter((reputation) => reputation.faction_id === factionId);
    const factionDiplomacy = diplomacies.filter((relationship) => relationship.faction_a_id === factionId || relationship.faction_b_id === factionId);

    const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const factionJobs = jobs.filter((job) => job.faction_id === factionId);
    const recentJobs = factionJobs.filter((job) => job.created_date >= weekAgo);
    const completedJobs = recentJobs.filter((job) => job.status === 'completed');
    const failedJobs = recentJobs.filter((job) => job.status === 'failed');
    const activeJobs = factionJobs.filter((job) => job.status === 'available' || job.status === 'in_progress');
    const recentEvents = events.filter((event) => event.faction_id === factionId || !event.faction_id).slice(0, 10);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const addLine = (text, size = 10, style = 'normal', color = [180, 190, 200]) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      doc.text(String(text), 14, y);
      y += (size * 0.5) + 2;
    };

    const addSection = (title) => {
      y += 4;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setDrawColor(40, 180, 160);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageWidth - 14, y);
      y += 6;
      addLine(title, 13, 'bold', [40, 180, 160]);
      y += 2;
    };

    doc.setFillColor(15, 17, 23);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

    addLine('DEAD SIGNAL — WEEKLY DOSSIER', 18, 'bold', [40, 180, 160]);
    addLine(`CLASSIFIED — ${String(faction.name || '').toUpperCase()} [${faction.tag || '???'}]`, 11, 'normal', [200, 160, 60]);
    const now = new Date();
    addLine(`Generated: ${now.toISOString().split('T')[0]} | Period: Last 7 Days`, 9, 'normal', [120, 130, 140]);
    addLine(`Prepared for: ${user.callsign || user.full_name || user.email}`, 9, 'normal', [120, 130, 140]);
    y += 4;

    addSection('FACTION OVERVIEW');
    addLine(`Name: ${faction.name}`, 10, 'normal', [200, 210, 220]);
    addLine(`Tag: [${faction.tag || 'N/A'}]   |   Status: ${(faction.status || 'active').toUpperCase()}`, 10);
    addLine(`Members: ${faction.member_count || 0}   |   Territories Held: ${factionTerritories.length}`, 10);
    if (factionEconomy) {
      addLine(`Wealth: ${Number(factionEconomy.wealth || 0).toLocaleString()} credits   |   Tax Rate: ${((factionEconomy.tax_rate || 0) * 100).toFixed(0)}%`, 10);
      addLine(`Last Cycle Income: ${Number(factionEconomy.last_cycle_income || 0).toLocaleString()}c   |   Embargo: ${factionEconomy.trade_embargo ? 'YES' : 'NO'}`, 10);
      const production = factionEconomy.resource_production || {};
      addLine(`Production — Fuel: ${production.fuel || 0}  Metals: ${production.metals || 0}  Tech: ${production.tech || 0}  Food: ${production.food || 0}  Munitions: ${production.munitions || 0}`, 9, 'normal', [150, 160, 170]);
    }

    addSection('TERRITORY CONTROL');
    if (factionTerritories.length === 0) {
      addLine('No territories currently held.', 10, 'italic', [120, 130, 140]);
    } else {
      for (const territory of factionTerritories) {
        const threatColor = territory.threat_level === 'critical' || territory.threat_level === 'high' ? [200, 50, 50] : [180, 190, 200];
        addLine(`• ${territory.name} (${territory.sector}) — Status: ${(territory.status || 'unknown').toUpperCase()} | Threat: ${(territory.threat_level || 'unknown').toUpperCase()}`, 9, 'normal', threatColor);
        if (territory.resources?.length) {
          addLine(`  Resources: ${territory.resources.join(', ')}`, 8, 'normal', [130, 140, 150]);
        }
      }
    }

    addSection('MISSION PERFORMANCE (7-DAY)');
    addLine(`Total Missions Posted: ${recentJobs.length}`, 10, 'normal', [200, 210, 220]);
    addLine(`Completed: ${completedJobs.length}   |   Failed: ${failedJobs.length}   |   Active: ${activeJobs.length}`, 10);
    const successRate = recentJobs.length > 0 ? ((completedJobs.length / recentJobs.length) * 100).toFixed(0) : 'N/A';
    addLine(`Success Rate: ${successRate}%`, 10, 'bold', successRate !== 'N/A' && Number(successRate) >= 70 ? [40, 200, 160] : [200, 60, 60]);
    const totalCredits = completedJobs.reduce((sum, job) => sum + (Number(job.reward_credits) || 0), 0);
    addLine(`Total Listed Credits Distributed: ${totalCredits.toLocaleString()}c`, 10);

    if (completedJobs.length > 0) {
      y += 2;
      addLine('Recent Completed:', 9, 'bold', [150, 160, 170]);
      for (const job of completedJobs.slice(0, 5)) {
        addLine(`  COMPLETE ${job.title} — ${(job.type || '').toUpperCase()} (${job.reward_credits || 0}c)`, 8, 'normal', [40, 180, 160]);
      }
    }
    if (failedJobs.length > 0) {
      y += 2;
      addLine('Failed Missions:', 9, 'bold', [150, 160, 170]);
      for (const job of failedJobs.slice(0, 5)) {
        addLine(`  FAILED ${job.title} — ${(job.type || '').toUpperCase()}`, 8, 'normal', [200, 50, 50]);
      }
    }

    addSection('OPERATIVE REPUTATION');
    if (factionReputations.length === 0) {
      addLine('No reputation records found.', 10, 'italic', [120, 130, 140]);
    } else {
      const sortedReputation = [...factionReputations].sort((a, b) => (b.score || 0) - (a.score || 0));
      for (const reputation of sortedReputation.slice(0, 15)) {
        const rankColor = reputation.rank === 'hostile' || reputation.rank === 'enemy' ? [200, 50, 50] : [180, 190, 200];
        addLine(`• ${reputation.player_email} — Score: ${reputation.score || 0} | Rank: ${(reputation.rank || 'unknown').toUpperCase()}`, 9, 'normal', rankColor);
      }
    }

    addSection('DIPLOMATIC RELATIONS');
    if (factionDiplomacy.length === 0) {
      addLine('No diplomatic relations on record.', 10, 'italic', [120, 130, 140]);
    } else {
      for (const relationship of factionDiplomacy) {
        const otherFactionId = relationship.faction_a_id === factionId ? relationship.faction_b_id : relationship.faction_a_id;
        const otherFaction = factions.find((entry) => entry.id === otherFactionId);
        const statusColor = relationship.status === 'war' || relationship.status === 'hostile'
          ? [200, 50, 50]
          : relationship.status === 'allied'
            ? [40, 180, 160]
            : [180, 190, 200];
        addLine(`• ${otherFaction?.name || 'Unknown'} — ${(relationship.status || 'neutral').toUpperCase()}${relationship.terms ? ` (${String(relationship.terms).substring(0, 60)})` : ''}`, 9, 'normal', statusColor);
      }
    }

    addSection('RECENT INTELLIGENCE');
    for (const event of recentEvents.slice(0, 8)) {
      const severityColor = event.severity === 'critical' || event.severity === 'emergency'
        ? [200, 50, 50]
        : event.severity === 'warning'
          ? [200, 160, 60]
          : [150, 160, 170];
      addLine(`[${(event.severity || 'info').toUpperCase()}] ${event.title}`, 9, 'normal', severityColor);
    }

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
        'Content-Disposition': `attachment; filename=dossier-${faction.tag || 'faction'}-${now.toISOString().split('T')[0]}.pdf`,
      },
    });
  } catch (error) {
    console.error('weeklyDossier error:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});
