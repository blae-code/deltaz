import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ActionRail from "../components/layout/ActionRail";
import { Map, Shield, FileSignature } from "lucide-react";

import WorldMap from "./WorldMap";
import Factions from "./Factions";
import Treaties from "./Treaties";

const TABS = [
  { key: "map", label: "AO Map", icon: Map },
  { key: "clans", label: "Clans", icon: Shield },
  { key: "diplomacy", label: "Diplomacy", icon: FileSignature },
];

export default function Territory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "map";

  const setTab = (t) => setSearchParams({ tab: t }, { replace: true });

  return (
    <div className="space-y-4">
      <ActionRail tabs={TABS} active={tab} onChange={setTab} />
      {tab === "map" && <WorldMap />}
      {tab === "clans" && <Factions />}
      {tab === "diplomacy" && <Treaties />}
    </div>
  );
}