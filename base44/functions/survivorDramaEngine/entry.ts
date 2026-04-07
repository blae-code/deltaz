import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * survivorDramaEngine — checks colony morale and generates randomized
 * survivor drama scenarios when conditions warrant.
 * Called on schedule or manually by GMs.
 */

const DRAMA_TEMPLATES = {
  desperate: [
    {
      drama_type: 'desertion',
      severity: 'critical',
      title_tpl: '{name} is planning to flee the colony',
      desc_tpl: '{name} has been spotted packing supplies in secret. Morale is at rock bottom and they see no reason to stay. If not stopped, others may follow.',
      options: [
        { id: 'talk_down', label: 'Talk Them Down', description: 'Send a trusted survivor to convince them to stay', morale_effect: 3, risk: 'low' },
        { id: 'let_go', label: 'Let Them Leave', description: 'Allow departure — one less mouth to feed but colony loses a hand', morale_effect: -2, risk: 'none' },
        { id: 'confine', label: 'Confine Them', description: 'Lock them up to prevent desertion — authoritarian but effective', morale_effect: -5, risk: 'high' },
      ],
    },
    {
      drama_type: 'mutiny',
      severity: 'critical',
      title_tpl: 'Mutiny brewing — {name} rallies dissidents',
      desc_tpl: '{name} is openly questioning leadership and gathering supporters. Colony morale is desperate and tensions are at breaking point.',
      options: [
        { id: 'address', label: 'Public Address', description: 'Call a colony meeting to hear grievances', morale_effect: 5, risk: 'medium' },
        { id: 'exile', label: 'Exile the Ringleader', description: 'Cast out {name} as an example', morale_effect: -3, risk: 'medium' },
        { id: 'concessions', label: 'Make Concessions', description: 'Give extra rations and lighter duties', morale_effect: 8, risk: 'low' },
      ],
    },
  ],
  anxious: [
    {
      drama_type: 'fight',
      severity: 'moderate',
      title_tpl: 'Brawl erupts between {name} and {name2}',
      desc_tpl: 'Tensions boiled over during meal rations. {name} accused {name2} of hoarding supplies. Fists flew before anyone could intervene.',
      options: [
        { id: 'mediate', label: 'Mediate', description: 'Sit both parties down and find common ground', morale_effect: 2, risk: 'low' },
        { id: 'punish_both', label: 'Punish Both', description: 'Extra duty shifts for both fighters', morale_effect: -1, risk: 'low' },
        { id: 'fight_ring', label: 'Sanctioned Fight', description: 'Let them settle it properly — boosts some morale but risky', morale_effect: 3, risk: 'high' },
      ],
    },
    {
      drama_type: 'theft',
      severity: 'moderate',
      title_tpl: '{name} caught stealing medical supplies',
      desc_tpl: '{name} was found hiding medical kits under their bunk. They claim they were stockpiling for an emergency, but others feel betrayed.',
      options: [
        { id: 'forgive', label: 'Forgive Publicly', description: 'Explain the situation and move on', morale_effect: 1, risk: 'low' },
        { id: 'rations_cut', label: 'Cut Rations', description: 'Reduce their rations as punishment', morale_effect: -2, risk: 'medium' },
        { id: 'investigate', label: 'Investigate Further', description: 'Maybe they know something — dig deeper', morale_effect: 0, risk: 'medium' },
      ],
    },
    {
      drama_type: 'breakdown',
      severity: 'serious',
      title_tpl: '{name} suffers emotional breakdown',
      desc_tpl: '{name} has locked themselves in quarters and refuses to come out. The weight of survival has become too much. Others are shaken.',
      options: [
        { id: 'comfort', label: 'Send Comfort', description: 'Assign someone to provide emotional support', morale_effect: 3, risk: 'low' },
        { id: 'tough_love', label: 'Tough Love', description: 'Order them back to work — colony needs every hand', morale_effect: -4, risk: 'high' },
        { id: 'rest_day', label: 'Colony Rest Day', description: 'Declare a rest day for everyone\'s mental health', morale_effect: 6, risk: 'low' },
      ],
    },
  ],
  neutral: [
    {
      drama_type: 'rivalry',
      severity: 'minor',
      title_tpl: '{name} and {name2} compete for patrol lead',
      desc_tpl: 'A friendly rivalry has formed between {name} and {name2} over who should lead the next patrol. It\'s boosting some energy but could turn sour.',
      options: [
        { id: 'competition', label: 'Structured Competition', description: 'Set up a fair test to decide — good for morale', morale_effect: 3, risk: 'low' },
        { id: 'co_lead', label: 'Co-Leadership', description: 'Assign them as co-leads — compromise', morale_effect: 1, risk: 'low' },
        { id: 'ignore', label: 'Let It Play Out', description: 'Don\'t intervene unless it escalates', morale_effect: 0, risk: 'medium' },
      ],
    },
    {
      drama_type: 'romance',
      severity: 'minor',
      title_tpl: '{name} and {name2} getting close',
      desc_tpl: 'Survivors have noticed {name} and {name2} spending a lot of time together. Some find it heartwarming, others worry about favoritism.',
      options: [
        { id: 'bless', label: 'Encourage It', description: 'Love in the apocalypse is rare — boost morale', morale_effect: 4, risk: 'low' },
        { id: 'separate', label: 'Reassign Duties', description: 'Keep them on different shifts to avoid distraction', morale_effect: -2, risk: 'low' },
        { id: 'ignore', label: 'Don\'t Interfere', description: 'It\'s their business', morale_effect: 1, risk: 'low' },
      ],
    },
  ],
  content: [
    {
      drama_type: 'sabotage',
      severity: 'moderate',
      title_tpl: 'Equipment sabotage — {name} suspected',
      desc_tpl: 'Water filtration system was deliberately damaged. Evidence points to {name} who has been acting strangely. Colony is shaken despite high morale.',
      options: [
        { id: 'confront', label: 'Confront Directly', description: 'Question {name} with evidence', morale_effect: -1, risk: 'medium' },
        { id: 'surveillance', label: 'Set Up Watch', description: 'Monitor them secretly for more evidence', morale_effect: 0, risk: 'low' },
        { id: 'community_trial', label: 'Community Trial', description: 'Let the colony decide their fate', morale_effect: 2, risk: 'high' },
      ],
    },
  ],
};

function getMoraleBand(morale) {
  if (morale <= 20) return 'desperate';
  if (morale <= 40) return 'anxious';
  if (morale <= 60) return 'neutral';
  return 'content';
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const forceGenerate = body.force === true;

    // Get colony
    const colonies = await base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1);
    const colony = colonies[0];
    if (!colony) {
      return Response.json({ error: 'No colony found' }, { status: 404 });
    }

    const morale = colony.morale ?? 50;
    const band = getMoraleBand(morale);

    // Check if there are already too many active dramas
    const activeDramas = await base44.asServiceRole.entities.SurvivorDrama.filter({ status: 'active' });
    if (activeDramas.length >= 3 && !forceGenerate) {
      return Response.json({ status: 'skipped', reason: 'Too many active dramas (max 3)', active: activeDramas.length });
    }

    // Probability check based on morale — lower morale = higher chance
    const probability = band === 'desperate' ? 0.9 : band === 'anxious' ? 0.65 : band === 'neutral' ? 0.3 : 0.15;
    if (Math.random() > probability && !forceGenerate) {
      return Response.json({ status: 'skipped', reason: `Random check failed (${Math.round(probability * 100)}% chance)`, morale, band });
    }

    // Get active survivors for names
    const survivors = await base44.asServiceRole.entities.Survivor.filter({ status: 'active' });
    if (survivors.length < 1) {
      return Response.json({ status: 'skipped', reason: 'Not enough survivors' });
    }

    const templates = DRAMA_TEMPLATES[band] || DRAMA_TEMPLATES.neutral;
    const template = pickRandom(templates);

    // Pick involved survivors
    const shuffled = [...survivors].sort(() => Math.random() - 0.5);
    const survivor1 = shuffled[0];
    const survivor2 = shuffled[1] || shuffled[0];

    const name1 = survivor1.nickname || survivor1.name;
    const name2 = survivor2.nickname || survivor2.name;

    const title = template.title_tpl.replace('{name}', name1).replace('{name2}', name2);
    const description = template.desc_tpl.replace(/\{name\}/g, name1).replace(/\{name2\}/g, name2);

    const options = template.options.map(opt => ({
      ...opt,
      description: opt.description.replace(/\{name\}/g, name1).replace(/\{name2\}/g, name2),
    }));

    const drama = await base44.asServiceRole.entities.SurvivorDrama.create({
      title,
      description,
      drama_type: template.drama_type,
      severity: template.severity,
      morale_trigger: morale,
      involved_survivor_ids: [survivor1.id, ...(survivor2.id !== survivor1.id ? [survivor2.id] : [])],
      involved_survivor_names: [name1, ...(name2 !== name1 ? [name2] : [])],
      colony_id: colony.id,
      status: 'active',
      resolution_options: options,
    });

    // Create notification for GMs
    await base44.asServiceRole.entities.Notification.create({
      player_email: 'broadcast',
      title: `Survivor Drama: ${title}`,
      message: `A ${template.severity} ${template.drama_type} scenario requires GM attention. Colony morale: ${morale}%.`,
      type: 'colony_alert',
      priority: template.severity === 'critical' ? 'critical' : 'normal',
    });

    return Response.json({
      status: 'ok',
      drama_id: drama.id,
      drama_type: template.drama_type,
      severity: template.severity,
      morale,
      band,
    });
  } catch (error) {
    console.error('survivorDramaEngine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});