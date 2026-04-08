import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ActionRail from "../components/layout/ActionRail";
import { User, BookOpen, Trophy, FileText } from "lucide-react";

import Profile from "./Profile";
import Journal from "./Journal";
import Records from "./Records";
import WeeklyDossier from "./WeeklyDossier";

const TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "journal", label: "Journal", icon: BookOpen },
  { key: "records", label: "Records", icon: Trophy },
  { key: "report", label: "Weekly Report", icon: FileText },
];

export default function Dossier() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "profile";

  const setTab = (t) => setSearchParams({ tab: t }, { replace: true });

  return (
    <div className="space-y-4">
      <ActionRail tabs={TABS} active={tab} onChange={setTab} />
      {tab === "profile" && <Profile />}
      {tab === "journal" && <Journal />}
      {tab === "records" && <Records />}
      {tab === "report" && <WeeklyDossier />}
    </div>
  );
}