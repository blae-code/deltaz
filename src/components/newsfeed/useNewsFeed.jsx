import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

const MAX_ITEMS = 200;

export default function useNewsFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const factionsRef = useRef([]);
  const territoriesRef = useRef([]);

  const addItem = useCallback((item) => {
    const entry = { id: crypto.randomUUID(), timestamp: Date.now(), ...item };
    setItems(prev => [entry, ...prev].slice(0, MAX_ITEMS));
  }, []);

  // Seed initial events
  useEffect(() => {
    (async () => {
      const [events, factions, territories] = await Promise.all([
        base44.entities.Event.list("-created_date", 50),
        base44.entities.Faction.list("-created_date", 50),
        base44.entities.Territory.list("-created_date", 100),
      ]);
      factionsRef.current = factions;
      territoriesRef.current = territories;

      // Map existing events as seed
      const catMap = {
        world_event: "world_event",
        faction_conflict: "combat",
        anomaly: "world_event",
        broadcast: "broadcast",
        system_alert: "system",
      };
      const seeded = events.map(e => ({
        id: e.id,
        category: catMap[e.type] || "broadcast",
        title: e.title,
        content: e.content,
        severity: e.severity || "info",
        faction_id: e.faction_id,
        territory_id: e.territory_id,
        territory_name: e.territory_id ? territories.find(t => t.id === e.territory_id)?.name : null,
        timestamp: new Date(e.created_date).getTime(),
      }));
      setItems(seeded);
      setLoading(false);
    })();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    const unsubs = [];
    const getFaction = (id) => factionsRef.current.find(f => f.id === id);
    const getTerritory = (id) => territoriesRef.current.find(t => t.id === id);

    // Events
    unsubs.push(base44.entities.Event.subscribe((ev) => {
      if (ev.type === "create") {
        const d = ev.data;
        const catMap = { world_event: "world_event", faction_conflict: "combat", anomaly: "world_event", broadcast: "broadcast", system_alert: "system" };
        addItem({
          category: catMap[d.type] || "broadcast",
          title: d.title,
          content: d.content,
          severity: d.severity || "info",
          faction_id: d.faction_id,
          territory_id: d.territory_id,
          territory_name: d.territory_id ? getTerritory(d.territory_id)?.name : null,
        });
      }
    }));

    // Jobs (missions)
    unsubs.push(base44.entities.Job.subscribe((ev) => {
      const d = ev.data;
      if (ev.type === "create") {
        addItem({ category: "mission", title: `New ${d.difficulty || ""} ${d.type} mission: ${d.title}`, severity: d.difficulty === "suicide" ? "critical" : "info", faction_id: d.faction_id, territory_id: d.territory_id, territory_name: d.territory_id ? getTerritory(d.territory_id)?.name : null });
      } else if (ev.type === "update") {
        if (d.status === "completed") addItem({ category: "mission", title: `Mission Complete: ${d.title}`, content: d.completion_notes, severity: "info", faction_id: d.faction_id });
        else if (d.status === "failed") addItem({ category: "combat", title: `Mission Failed: ${d.title}`, content: d.completion_notes, severity: "warning", faction_id: d.faction_id });
        else if (d.status === "in_progress") addItem({ category: "mission", title: `Operative dispatched: ${d.title}`, severity: "info", faction_id: d.faction_id });
      }
    }));

    // Territories
    unsubs.push(base44.entities.Territory.subscribe((ev) => {
      if (ev.type === "update") {
        const d = ev.data;
        const f = d.controlling_faction_id ? getFaction(d.controlling_faction_id) : null;
        addItem({ category: "territory", title: `${d.name} (${d.sector}) status changed to ${d.status}`, content: d.threat_level ? `Threat level: ${d.threat_level}` : null, severity: d.threat_level === "critical" ? "critical" : d.threat_level === "high" ? "warning" : "info", faction_id: d.controlling_faction_id, territory_name: d.name });
      }
    }));

    // Factions
    unsubs.push(base44.entities.Faction.subscribe((ev) => {
      const d = ev.data;
      if (ev.type === "create") addItem({ category: "faction", title: `New faction emerged: ${d.name} [${d.tag}]`, severity: "info", faction_id: d.id });
      else if (ev.type === "update") addItem({ category: "faction", title: `${d.name} intel update`, content: d.status === "hostile" ? "Faction declared hostile" : undefined, severity: d.status === "hostile" ? "warning" : "info", faction_id: d.id });
    }));

    // Diplomacy
    unsubs.push(base44.entities.Diplomacy.subscribe((ev) => {
      if (ev.type === "create" || ev.type === "update") {
        const d = ev.data;
        const fA = getFaction(d.faction_a_id);
        const fB = getFaction(d.faction_b_id);
        const label = d.status === "war" ? "WAR DECLARED" : d.status === "hostile" ? "Relations turned hostile" : d.status === "allied" ? "Alliance formed" : `Status: ${d.status?.replace("_", " ")}`;
        addItem({ category: "diplomacy", title: `${fA?.name || "?"} ↔ ${fB?.name || "?"}: ${label}`, severity: d.status === "war" ? "critical" : d.status === "hostile" ? "warning" : "info", faction_id: d.faction_a_id });
      }
    }));

    // Treaties
    unsubs.push(base44.entities.Treaty.subscribe((ev) => {
      if (ev.type === "create") {
        const d = ev.data;
        addItem({ category: "diplomacy", title: `New ${d.treaty_type?.replace("_", " ")} proposed`, severity: "info", faction_id: d.proposer_faction_id });
      } else if (ev.type === "update") {
        const d = ev.data;
        if (d.status === "accepted") addItem({ category: "diplomacy", title: `Treaty signed: ${d.treaty_type?.replace("_", " ")}`, severity: "info", faction_id: d.proposer_faction_id });
        else if (d.status === "revoked") addItem({ category: "diplomacy", title: `Treaty revoked: ${d.treaty_type?.replace("_", " ")}`, severity: "warning", faction_id: d.proposer_faction_id });
      }
    }));

    // Reputation changes
    unsubs.push(base44.entities.ReputationLog.subscribe((ev) => {
      if (ev.type === "create") {
        const d = ev.data;
        const sign = d.delta > 0 ? "+" : "";
        addItem({ category: "faction", title: `${d.reason} (${sign}${d.delta} rep)`, severity: d.delta < 0 ? "warning" : "info", faction_id: d.faction_id });
      }
    }));

    // Aid requests
    unsubs.push(base44.entities.AidRequest.subscribe((ev) => {
      if (ev.type === "create") {
        const d = ev.data;
        addItem({ category: "aid", title: `Aid request: ${d.aid_type} support needed`, severity: d.urgency === "critical" ? "critical" : d.urgency === "high" ? "warning" : "info", faction_id: d.requester_faction_id });
      } else if (ev.type === "update") {
        const d = ev.data;
        if (d.status === "approved") addItem({ category: "aid", title: `Aid approved: ${d.aid_type} support`, severity: "info", faction_id: d.target_faction_id });
        else if (d.status === "denied") addItem({ category: "aid", title: `Aid denied: ${d.aid_type} request`, severity: "warning", faction_id: d.requester_faction_id });
      }
    }));

    // Trade routes
    unsubs.push(base44.entities.TradeRoute.subscribe((ev) => {
      if (ev.type === "create") {
        const d = ev.data;
        const from = getFaction(d.from_faction_id);
        const to = getFaction(d.to_faction_id);
        addItem({ category: "economy", title: `Trade route opened: ${from?.name || "?"} → ${to?.name || "?"}`, content: `${d.amount} ${d.resource_type} per cycle`, severity: "info", faction_id: d.from_faction_id });
      }
    }));

    // Colony status
    unsubs.push(base44.entities.ColonyStatus.subscribe((ev) => {
      if (ev.type === "update") {
        const d = ev.data;
        if (d.threat_level === "critical" || d.threat_level === "high") {
          addItem({ category: "combat", title: `Colony threat level: ${d.threat_level}`, content: d.last_incident, severity: d.threat_level === "critical" ? "critical" : "warning" });
        }
      }
    }));

    return () => unsubs.forEach(fn => fn());
  }, [addItem]);

  return { items, loading };
}