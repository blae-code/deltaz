import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowRight } from "lucide-react";

export default function JournalWidget() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      base44.entities.JournalEntry.filter({ player_email: user.email, status: "pending" }, "-created_date", 3)
        .then(setPending)
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading) {
    return <div className="text-[10px] text-muted-foreground animate-pulse py-2">Loading journal...</div>;
  }

  return (
    <div className="space-y-2">
      {pending.length === 0 ? (
        <div className="text-center py-4">
          <BookOpen className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">No pending events. Visit the Journal to seek new encounters.</p>
        </div>
      ) : (
        pending.map(entry => (
          <div key={entry.id} className="border border-border bg-secondary/20 rounded-sm p-2.5">
            <div className="flex items-center gap-2 justify-between">
              <span className="text-[10px] font-semibold font-mono text-foreground truncate">{entry.title}</span>
              <Badge variant="outline" className="text-[8px] uppercase shrink-0">{entry.category}</Badge>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{entry.narrative}</p>
            <div className="text-[8px] text-accent mt-1">{entry.choices?.length || 0} choices awaiting</div>
          </div>
        ))
      )}

      <Link
        to="/journal"
        className="flex items-center justify-center gap-1 text-[9px] text-primary font-mono tracking-wider hover:underline"
      >
        OPEN JOURNAL <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}