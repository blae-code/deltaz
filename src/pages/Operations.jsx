import { useSearchParams } from "react-router-dom";
import ActionRail from "../components/layout/ActionRail";
import { Radar, Crosshair, Target, ScrollText, Radio, Eye } from "lucide-react";

import WarRoom from "./WarRoom";
import Jobs from "./Jobs";
import MissionPlanner from "./MissionPlanner";
import MissionLog from "./MissionLog";
import Events from "./Events";
import Intel from "./Intel";

const TABS = [
  { key: "warroom", label: "War Room", icon: Radar },
  { key: "missions", label: "Missions", icon: Crosshair },
  { key: "planner", label: "Planner", icon: Target },
  { key: "log", label: "Mission Log", icon: ScrollText },
  { key: "comms", label: "Comms", icon: Radio },
  { key: "intel", label: "Intel", icon: Eye },
];

export default function Operations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "warroom";

  const setTab = (t) => setSearchParams({ tab: t }, { replace: true });

  return (
    <div className="space-y-4">
      <ActionRail tabs={TABS} active={tab} onChange={setTab} />
      {tab === "warroom" && <WarRoom />}
      {tab === "missions" && <Jobs />}
      {tab === "planner" && <MissionPlanner />}
      {tab === "log" && <MissionLog />}
      {tab === "comms" && <Events />}
      {tab === "intel" && <Intel />}
    </div>
  );
}