import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * resolveSurvivorDrama — GM picks a resolution option for a drama,
 * applies morale effects, and generates a narrative outcome.
 * Payload: { drama_id, resolution_id }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { drama_id, resolution_id } = await req.json();
    if (!drama_id || !resolution_id) {
      return Response.json({ error: 'drama_id and resolution_id required' }, { status: 400 });
    }

    const dramas = await base44.asServiceRole.entities.SurvivorDrama.filter({ id: drama_id });
    const drama = dramas[0];
    if (!drama) {
      return Response.json({ error: 'Drama not found' }, { status: 404 });
    }
    if (drama.status !== 'active') {
      return Response.json({ error: 'Drama already resolved' }, { status: 400 });
    }

    const options = drama.resolution_options || [];
    const chosen = options.find(o => o.id === resolution_id);
    if (!chosen) {
      return Response.json({ error: 'Invalid resolution option' }, { status: 400 });
    }

    // Apply morale effect
    const colonies = await base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1);
    const colony = colonies[0];
    const consequences = [];

    if (colony && chosen.morale_effect) {
      const currentMorale = colony.morale ?? 50;
      const newMorale = Math.max(0, Math.min(100, currentMorale + chosen.morale_effect));
      await base44.asServiceRole.entities.ColonyStatus.update(colony.id, { morale: newMorale });
      consequences.push(`morale_${chosen.morale_effect > 0 ? '+' : ''}${chosen.morale_effect}`);
    }

    // Risk-based random consequence for high-risk choices
    if (chosen.risk === 'high' && Math.random() < 0.4) {
      // Something goes wrong
      const involvedIds = drama.involved_survivor_ids || [];
      if (involvedIds.length > 0) {
        const targetId = involvedIds[0];
        // Injure or cause departure based on drama type
        if (drama.drama_type === 'desertion' || drama.drama_type === 'mutiny') {
          await base44.asServiceRole.entities.Survivor.update(targetId, { status: 'departed', current_task: 'idle' });
          consequences.push('survivor_departed');
        } else {
          await base44.asServiceRole.entities.Survivor.update(targetId, { health: 'injured', current_task: 'idle' });
          consequences.push('survivor_injured');
        }
      }
    }

    // Generate outcome narrative
    const names = (drama.involved_survivor_names || []).join(' and ');
    const outcomePrompt = `Drama: "${drama.title}". Resolution: "${chosen.label}" — ${chosen.description}. Involved: ${names}. Consequences: ${consequences.join(', ') || 'none'}. Write a 2-sentence outcome narrative in post-apocalyptic style.`;

    let outcome;
    try {
      outcome = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: outcomePrompt,
        model: 'automatic',
      });
    } catch {
      outcome = `The GM chose to ${chosen.label.toLowerCase()}. ${consequences.length > 0 ? `Consequence: ${consequences.join(', ')}.` : 'The situation was handled without further incident.'}`;
    }

    // Update drama record
    await base44.asServiceRole.entities.SurvivorDrama.update(drama.id, {
      status: 'resolved',
      chosen_resolution: resolution_id,
      resolution_outcome: typeof outcome === 'string' ? outcome : JSON.stringify(outcome),
      resolved_by: user.email,
      resolved_at: new Date().toISOString(),
      consequences,
    });

    return Response.json({
      status: 'ok',
      outcome: typeof outcome === 'string' ? outcome : JSON.stringify(outcome),
      consequences,
    });
  } catch (error) {
    console.error('resolveSurvivorDrama error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});