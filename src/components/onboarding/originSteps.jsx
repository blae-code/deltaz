// Origin story choice data — each step has narrative text and 3 choices with mechanical effects
// Effects: reputation_bias (faction tag → score delta), skill_affinity, personality_trait, weakness, origin_tag, stat_modifiers

export const ORIGIN_STEPS = [
  {
    id: "signal_day",
    title: "THE DAY THE SIGNAL DIED",
    narrative: "Everyone remembers where they were when the broadcasts stopped. Static swallowed every frequency. The grid collapsed hours later. Panic took the rest.",
    question: "Where were you when the world ended?",
    choices: [
      {
        id: "bunker",
        label: "Underground — Military Bunker",
        description: "You were deep underground when it happened. Government facility. By the time you surfaced, the world above was unrecognizable.",
        effects: {
          origin_tag: "military_survivor",
          skill_affinity: "guard",
          personality_trait: "Disciplined and methodical, but struggles with civilian chaos",
          stat_modifiers: { combat_rating: 3, defense_bonus: 10 },
          reputation_bias: { "SRN": 15, "RCL": -10 },
        },
      },
      {
        id: "hospital",
        label: "City Hospital — Night Shift",
        description: "You were mid-surgery when the lights went out. You kept cutting by flashlight. That was the first of many impossible choices.",
        effects: {
          origin_tag: "medical_survivor",
          skill_affinity: "medic",
          personality_trait: "Calm under pressure, haunted by those they couldn't save",
          stat_modifiers: { combat_rating: 1, healing_bonus: 15 },
          reputation_bias: { "SRN": 5, "HVN": 10 },
        },
      },
      {
        id: "highway",
        label: "Highway — On The Move",
        description: "You were driving when the radio died. Cars stopped. People panicked. You kept moving on foot and never looked back.",
        effects: {
          origin_tag: "drifter",
          skill_affinity: "scavenger",
          personality_trait: "Restless and resourceful, trusts no one fully",
          stat_modifiers: { combat_rating: 2, scavenge_bonus: 15 },
          reputation_bias: {},
        },
      },
    ],
  },
  {
    id: "first_week",
    title: "THE FIRST WEEK",
    narrative: "The first seven days killed more people than the next seven months. Supplies ran dry within 48 hours. Society didn't collapse — it evaporated.",
    question: "How did you survive the first week?",
    choices: [
      {
        id: "group",
        label: "Joined a group of strangers",
        description: "Safety in numbers. You found a crew sheltering in a warehouse. Some of them are still with you. Some aren't.",
        effects: {
          personality_trait: "Natural leader, forms bonds quickly but takes betrayal hard",
          skill_affinity: "trader",
          stat_modifiers: { morale_bonus: 10 },
          reputation_bias: { "HVN": 10 },
        },
      },
      {
        id: "alone",
        label: "Went solo — trust nobody",
        description: "You watched groups fall apart over a can of beans. You decided early: depend on yourself, survive on your terms.",
        effects: {
          personality_trait: "Self-reliant loner, fiercely independent, slow to trust",
          skill_affinity: "scavenger",
          stat_modifiers: { scavenge_bonus: 10, combat_rating: 1 },
          reputation_bias: { "RCL": 10 },
        },
      },
      {
        id: "took_over",
        label: "Took what you needed by force",
        description: "When the rules disappeared, you adapted faster than others. It wasn't personal. It was arithmetic — your survival vs. theirs.",
        effects: {
          personality_trait: "Pragmatic and ruthless, respected but feared",
          skill_affinity: "guard",
          stat_modifiers: { combat_rating: 3 },
          reputation_bias: { "RCL": 15, "HVN": -15, "SRN": -5 },
          weakness: "Haunted by early choices, has enemies from the old days",
        },
      },
    ],
  },
  {
    id: "the_loss",
    title: "WHAT YOU LOST",
    narrative: "Nobody made it through unchanged. The wasteland takes something from everyone — the only question is what.",
    question: "What did the apocalypse take from you?",
    choices: [
      {
        id: "family",
        label: "My family",
        description: "You had people. A home. Names you whispered at night. The silence where their voices used to be is deafening.",
        effects: {
          weakness: "Protective of anyone who reminds them of who they lost",
          personality_trait: "Carries deep grief but channels it into protecting others",
          stat_modifiers: { morale_bonus: -5, defense_bonus: 5 },
        },
      },
      {
        id: "identity",
        label: "My identity",
        description: "You were someone before. Had a career, a reputation, a name that meant something. Now you're just another body with a heartbeat.",
        effects: {
          weakness: "Struggles with purpose, occasionally reckless",
          personality_trait: "Searching for meaning, prone to existential risk-taking",
          stat_modifiers: { scavenge_bonus: 10 },
        },
      },
      {
        id: "humanity",
        label: "My compassion",
        description: "You stopped feeling it somewhere around month three. The switch just... flipped. You're effective now. Efficient. And something vital is missing.",
        effects: {
          weakness: "Emotionally numb, struggles to connect with others",
          personality_trait: "Cold and calculating, incredibly efficient but isolated",
          stat_modifiers: { combat_rating: 2, morale_bonus: -10 },
          reputation_bias: { "RCL": 5 },
        },
      },
    ],
  },
  {
    id: "skill_moment",
    title: "THE MOMENT YOU PROVED YOURSELF",
    narrative: "Everyone in the wasteland has a story — a moment where they discovered what they're actually good at. Yours came sooner than you expected.",
    question: "What's the skill that keeps you alive?",
    choices: [
      {
        id: "fixer",
        label: "I fix things — machines, generators, weapons",
        description: "When the last working generator in camp died, you brought it back. Now everyone comes to you when something breaks. Which is always.",
        effects: {
          skill_affinity: "mechanic",
          personality_trait: "Sees the world as systems and components",
          stat_modifiers: { repair_bonus: 15, crafting_bonus: 10 },
        },
      },
      {
        id: "hunter",
        label: "I track, hunt, and scout",
        description: "You can read footprints in ash, find water in concrete ruins, and smell a hostile camp from a mile away. The wasteland speaks to you.",
        effects: {
          skill_affinity: "scavenger",
          personality_trait: "Patient and perceptive, always watching",
          stat_modifiers: { scavenge_bonus: 15, combat_rating: 1 },
        },
      },
      {
        id: "talker",
        label: "I negotiate — words are weapons too",
        description: "You've talked your way out of more firefights than most people have been in. In a world of bullets, your tongue is the sharpest weapon.",
        effects: {
          skill_affinity: "trader",
          personality_trait: "Silver-tongued and persuasive, reads people like maps",
          stat_modifiers: { trade_bonus: 20, morale_bonus: 5 },
          reputation_bias: { "HVN": 5, "SRN": 5, "RCL": 5 },
        },
      },
    ],
  },
  {
    id: "faction_lean",
    title: "THE FACTIONS",
    narrative: "Three powers have risen from the ashes. Each has a vision for what comes next. None of them agree. And all of them are recruiting.",
    question: "Which ideology resonates with you?",
    choices: [
      {
        id: "order",
        label: "Order through strength",
        description: "Someone has to hold the line. Structure, discipline, chain of command — that's how civilizations survive. The Sovereigns understand this.",
        effects: {
          faction_loyalty: "The Sovereigns — believes survival requires structure and authority",
          reputation_bias: { "SRN": 25, "RCL": -15 },
          personality_trait: "Values order and duty above individual freedom",
        },
      },
      {
        id: "freedom",
        label: "Freedom at any cost",
        description: "The old world's systems failed. Every government, every institution. The Reclaimers know the truth: the only authority worth following is your own.",
        effects: {
          faction_loyalty: "The Reclaimers — believes freedom and self-determination are paramount",
          reputation_bias: { "RCL": 25, "SRN": -15 },
          personality_trait: "Fiercely independent, distrusts authority",
        },
      },
      {
        id: "community",
        label: "Rebuild through community",
        description: "It's not about power or freedom — it's about people. Haven's Rest proves that cooperation works. You want to build something worth living for.",
        effects: {
          faction_loyalty: "Haven's Rest — believes in rebuilding through mutual aid",
          reputation_bias: { "HVN": 25, "RCL": -5, "SRN": -5 },
          personality_trait: "Idealistic but practical, puts the group first",
        },
      },
    ],
  },
  {
    id: "arrival",
    title: "ARRIVAL AT DEAD SIGNAL",
    narrative: "You picked up the signal three days ago. A repeating transmission on a dead frequency. Coordinates. A callsign: DEAD SIGNAL. It could be a trap. It could be salvation. Either way, you're here now.",
    question: "Why did you follow the signal?",
    choices: [
      {
        id: "hope",
        label: "Looking for a place to belong",
        description: "You're tired of wandering. Tired of sleeping with one eye open. If there's even a chance this is real, it's worth the risk.",
        effects: {
          goal: "Find a home and people worth fighting for",
          personality_trait: "Quietly hopeful despite everything",
          stat_modifiers: { morale_bonus: 10 },
        },
      },
      {
        id: "opportunity",
        label: "Where there's signals, there's resources",
        description: "Someone broadcasting means infrastructure. Infrastructure means supplies, tech, leverage. You're not sentimental — you're practical.",
        effects: {
          goal: "Acquire resources and build power",
          personality_trait: "Opportunistic and strategic",
          stat_modifiers: { scavenge_bonus: 10, trade_bonus: 5 },
        },
      },
      {
        id: "answers",
        label: "I need to know what caused the collapse",
        description: "The signal wasn't random. It was coded. Military-grade encryption on a civilian band. Someone knows what happened. And you need to find them.",
        effects: {
          goal: "Uncover the truth behind the signal collapse",
          personality_trait: "Driven by curiosity, borderline obsessive",
          stat_modifiers: { combat_rating: 1 },
          reputation_bias: { "SRN": 5 },
        },
      },
    ],
  },
];

// Merge all chosen effects into a unified character profile
export function compileOriginEffects(choices) {
  const compiled = {
    origin_tags: [],
    skill_affinities: [],
    personality_traits: [],
    weaknesses: [],
    faction_loyalty: "",
    goal: "",
    reputation_biases: {},
    stat_modifiers: {
      combat_rating: 2,
      defense_bonus: 0,
      healing_bonus: 0,
      scavenge_bonus: 0,
      repair_bonus: 0,
      crafting_bonus: 0,
      trade_bonus: 0,
      morale_bonus: 0,
    },
  };

  for (const choice of choices) {
    const fx = choice.effects;
    if (fx.origin_tag) compiled.origin_tags.push(fx.origin_tag);
    if (fx.skill_affinity) compiled.skill_affinities.push(fx.skill_affinity);
    if (fx.personality_trait) compiled.personality_traits.push(fx.personality_trait);
    if (fx.weakness) compiled.weaknesses.push(fx.weakness);
    if (fx.faction_loyalty) compiled.faction_loyalty = fx.faction_loyalty;
    if (fx.goal) compiled.goal = fx.goal;
    if (fx.reputation_bias) {
      for (const [tag, delta] of Object.entries(fx.reputation_bias)) {
        compiled.reputation_biases[tag] = (compiled.reputation_biases[tag] || 0) + delta;
      }
    }
    if (fx.stat_modifiers) {
      for (const [key, val] of Object.entries(fx.stat_modifiers)) {
        compiled.stat_modifiers[key] = (compiled.stat_modifiers[key] || 0) + val;
      }
    }
  }

  // Primary skill = most mentioned affinity
  const skillCounts = {};
  compiled.skill_affinities.forEach((s) => { skillCounts[s] = (skillCounts[s] || 0) + 1; });
  compiled.primary_skill = Object.entries(skillCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "scavenger";

  return compiled;
}