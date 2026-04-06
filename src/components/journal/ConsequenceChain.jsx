import { Badge } from "@/components/ui/badge";
import { GitBranch, ArrowDown } from "lucide-react";

export default function ConsequenceChain({ entries }) {
  // Build chains from root entries
  const entryMap = {};
  entries.forEach(e => { entryMap[e.id] = e; });

  const roots = entries.filter(e => !e.parent_entry_id);
  const getChildren = (parentId) => entries.filter(e => e.parent_entry_id === parentId);

  const chains = roots
    .map(root => {
      const chain = [root];
      let current = root;
      while (true) {
        const children = getChildren(current.id);
        if (children.length === 0) break;
        chain.push(children[0]);
        current = children[0];
      }
      return chain;
    })
    .filter(chain => chain.length > 1)
    .sort((a, b) => new Date(b[0].created_date) - new Date(a[0].created_date));

  if (chains.length === 0) {
    return (
      <div className="text-center py-8">
        <GitBranch className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-[10px] text-muted-foreground">
          No consequence chains yet. Your choices will start branching as you resolve events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {chains.map((chain, ci) => (
        <div key={chain[0].id} className="border border-border bg-card rounded-sm overflow-hidden">
          <div className="border-b border-border px-3 py-2 bg-secondary/30 flex items-center gap-2">
            <GitBranch className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold font-display tracking-wider text-foreground uppercase">
              {chain[0].title}
            </span>
            <Badge variant="outline" className="text-[8px] ml-auto">{chain.length} events</Badge>
          </div>
          <div className="p-3 space-y-0">
            {chain.map((entry, idx) => (
              <div key={entry.id}>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full border-2 shrink-0 ${
                      entry.status === 'resolved' ? 'border-primary bg-primary/20' : 'border-accent bg-accent/20 animate-pulse'
                    }`} />
                    {idx < chain.length - 1 && (
                      <div className="w-px flex-1 bg-border min-h-[24px]" />
                    )}
                  </div>
                  <div className="pb-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-foreground truncate">{entry.title}</span>
                      <Badge variant="outline" className="text-[7px] uppercase">{entry.category}</Badge>
                    </div>
                    {entry.chosen_label && (
                      <p className="text-[9px] text-primary font-mono mt-0.5">→ {entry.chosen_label}</p>
                    )}
                    {entry.outcome && (
                      <p className="text-[9px] text-muted-foreground italic mt-1 line-clamp-2">{entry.outcome}</p>
                    )}
                    {entry.world_effects?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {entry.world_effects.map((we, wi) => (
                          <Badge key={wi} variant="outline" className="text-[7px] text-accent border-accent/30">
                            {we.type === 'intel_created' ? '📡' : we.type === 'event_created' ? '📢' : '⚡'} {we.description}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {entry.status === 'pending' && (
                      <span className="text-[8px] text-accent font-mono animate-pulse mt-1 inline-block">AWAITING DECISION...</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}