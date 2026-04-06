import { base44 } from "@/api/base44Client";

function matchesQuery(text, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (text || "").toLowerCase().includes(q);
}

export async function searchEntities(query, category, filters = {}) {
  const results = [];
  const promises = [];

  const shouldSearch = (cat) => category === "all" || category === cat;

  // Missions
  if (shouldSearch("missions")) {
    const mFilter = {};
    if (filters.mission_type) mFilter.type = filters.mission_type;
    if (filters.mission_status) mFilter.status = filters.mission_status;
    if (filters.mission_difficulty) mFilter.difficulty = filters.mission_difficulty;
    if (filters.mission_faction) mFilter.faction_id = filters.mission_faction;

    promises.push(
      (Object.keys(mFilter).length > 0
        ? base44.entities.Job.filter(mFilter, "-created_date", 50)
        : base44.entities.Job.list("-created_date", 50)
      ).then((jobs) => {
        for (const j of jobs) {
          if (!matchesQuery(`${j.title} ${j.description} ${j.type} ${j.difficulty}`, query)) continue;
          results.push({
            id: j.id,
            type: "missions",
            title: j.title || "Untitled Mission",
            subtitle: `${(j.type || "recon").toUpperCase()} · ${(j.difficulty || "routine").toUpperCase()} · ${j.reward_credits || 0}c`,
            status: j.status,
            meta: j.faction_id ? undefined : undefined,
            link: "/jobs",
          });
        }
      }).catch(() => {})
    );
  }

  // Survivors
  if (shouldSearch("survivors")) {
    const sFilter = {};
    if (filters.survivor_skill) sFilter.skill = filters.survivor_skill;
    if (filters.survivor_status) sFilter.status = filters.survivor_status;
    if (filters.survivor_morale) sFilter.morale = filters.survivor_morale;
    if (filters.survivor_health) sFilter.health = filters.survivor_health;

    promises.push(
      (Object.keys(sFilter).length > 0
        ? base44.entities.Survivor.filter(sFilter, "-created_date", 50)
        : base44.entities.Survivor.list("-created_date", 50)
      ).then((survivors) => {
        for (const s of survivors) {
          if (!matchesQuery(`${s.name} ${s.nickname} ${s.skill} ${s.backstory} ${s.personality}`, query)) continue;
          results.push({
            id: s.id,
            type: "survivors",
            title: s.nickname ? `${s.name} "${s.nickname}"` : s.name,
            subtitle: `${(s.skill || "").toUpperCase()} Lv${s.skill_level || 1} · ${(s.current_task || "idle").toUpperCase()} · Combat: ${s.combat_rating || 1}`,
            status: s.status,
            meta: s.health,
            link: "/colony",
          });
        }
      }).catch(() => {})
    );
  }

  // Territories
  if (shouldSearch("territories")) {
    const tFilter = {};
    if (filters.territory_status) tFilter.status = filters.territory_status;
    if (filters.territory_threat) tFilter.threat_level = filters.territory_threat;

    promises.push(
      (Object.keys(tFilter).length > 0
        ? base44.entities.Territory.filter(tFilter, "-created_date", 100)
        : base44.entities.Territory.list("-created_date", 100)
      ).then((territories) => {
        for (const t of territories) {
          const resText = (t.resources || []).join(" ");
          if (!matchesQuery(`${t.name} ${t.sector} ${resText} ${t.status}`, query)) continue;
          results.push({
            id: t.id,
            type: "territories",
            title: t.name || t.sector,
            subtitle: `Sector ${t.sector || "??"} · ${(t.threat_level || "moderate").toUpperCase()} threat · ${(t.resources || []).join(", ") || "No resources"}`,
            status: t.status,
            meta: t.sector,
            link: "/map",
          });
        }
      }).catch(() => {})
    );
  }

  // Factions
  if (shouldSearch("factions")) {
    const fFilter = {};
    if (filters.faction_status) fFilter.status = filters.faction_status;

    promises.push(
      (Object.keys(fFilter).length > 0
        ? base44.entities.Faction.filter(fFilter, "-created_date", 50)
        : base44.entities.Faction.list("-created_date", 50)
      ).then((factions) => {
        for (const f of factions) {
          if (!matchesQuery(`${f.name} ${f.tag} ${f.description} ${f.status}`, query)) continue;
          results.push({
            id: f.id,
            type: "factions",
            title: `${f.name} [${f.tag || "?"}]`,
            subtitle: `${(f.status || "active").toUpperCase()} · Members: ${f.member_count || "?"} · ${f.ideology || ""}`,
            status: f.status,
            meta: f.tag,
            link: "/factions",
            color: f.color,
          });
        }
      }).catch(() => {})
    );
  }

  await Promise.all(promises);

  // Sort: exact title matches first, then by type grouping
  const q = query.toLowerCase();
  results.sort((a, b) => {
    const aExact = a.title.toLowerCase().startsWith(q) ? 0 : 1;
    const bExact = b.title.toLowerCase().startsWith(q) ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return 0;
  });

  return results.slice(0, 30);
}