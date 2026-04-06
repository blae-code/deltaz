import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";

export default function ConsequenceTagCloud({ entries }) {
  // Collect all consequence tags from resolved entries
  const tagCounts = {};
  entries
    .filter(e => e.status === 'resolved' && e.consequence_tags?.length > 0)
    .forEach(e => {
      e.consequence_tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

  const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  if (tags.length === 0) return null;

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <div className="border-b border-border px-3 py-2 bg-secondary/30 flex items-center gap-2">
        <Tag className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-semibold font-display tracking-wider text-primary uppercase">
          Story Threads
        </span>
      </div>
      <div className="p-3 flex flex-wrap gap-1.5">
        {tags.map(([tag, count]) => (
          <Badge
            key={tag}
            variant="outline"
            className="text-[9px] font-mono bg-secondary/30 hover:bg-secondary/60 transition-colors"
          >
            {tag.replace(/_/g, ' ')}
            {count > 1 && <span className="text-primary ml-1">×{count}</span>}
          </Badge>
        ))}
      </div>
    </div>
  );
}