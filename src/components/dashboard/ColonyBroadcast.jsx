import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { sendServerBroadcast } from "@/api/serverApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ColonyBroadcast() {
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("warning");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendBroadcast = async () => {
    if (!message.trim()) return;
    setSending(true);

    // Create an Event broadcast
    await base44.entities.Event.create({
      title: `COLONY ALERT: ${message.substring(0, 50)}`,
      content: message,
      type: "broadcast",
      severity,
      is_active: true,
    });

    // Also try RCON broadcast if server is available
    try {
      await sendServerBroadcast(`[COLONY ${severity.toUpperCase()}] ${message}`);
    } catch (_) {
      // Server might be offline — event broadcast still works
    }

    toast({ title: "Broadcast Sent", description: "Alert dispatched to all survivors" });
    setMessage("");
    setSending(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="h-7 text-[10px] bg-secondary/50 border-border font-mono w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">INFO</SelectItem>
            <SelectItem value="warning">WARNING</SelectItem>
            <SelectItem value="critical">CRITICAL</SelectItem>
            <SelectItem value="emergency">EMERGENCY</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[9px] text-muted-foreground">Broadcast to all survivors</span>
      </div>

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter broadcast message..."
        className="text-xs bg-secondary/50 border-border font-mono min-h-[50px]"
        rows={2}
      />

      <Button
        onClick={sendBroadcast}
        disabled={!message.trim() || sending}
        size="sm"
        className="w-full font-mono text-[10px] uppercase tracking-wider h-7"
      >
        {sending ? (
          <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> TRANSMITTING...</>
        ) : (
          <><Send className="h-3 w-3 mr-1.5" /> BROADCAST ALERT</>
        )}
      </Button>
    </div>
  );
}
