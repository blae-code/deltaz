import moment from "moment";
import LogEntry from "./LogEntry";

export default function LogDateGroup({ date, logs }) {
  const isToday = moment(date).isSame(moment(), "day");
  const label = isToday ? "TODAY" : moment(date).format("YYYY-MM-DD · dddd").toUpperCase();

  return (
    <div>
      <div className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-sm border-b border-border px-4 py-1.5">
        <span className="text-[9px] font-mono font-semibold text-muted-foreground tracking-widest">
          {label}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground/60 ml-2">
          ({logs.length} entries)
        </span>
      </div>
      {logs.map((log) => (
        <LogEntry key={log.id} log={log} />
      ))}
    </div>
  );
}