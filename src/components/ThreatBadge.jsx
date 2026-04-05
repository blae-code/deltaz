import { Badge } from "@/components/ui/badge";

const THREAT_STYLES = {
  green: "bg-threat-green/20 text-threat-green border-threat-green/30",
  yellow: "bg-threat-yellow/20 text-threat-yellow border-threat-yellow/30",
  orange: "bg-threat-orange/20 text-threat-orange border-threat-orange/30",
  red: "bg-threat-red/20 text-threat-red border-threat-red/30",
  black: "bg-threat-black text-white border-white/20",
};

export default function ThreatBadge({ level }) {
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase ${THREAT_STYLES[level] || THREAT_STYLES.green}`}>
      {level}
    </Badge>
  );
}