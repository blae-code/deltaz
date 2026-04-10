import { useEffect, useState } from "react";
import { getSteamLinkStatus, getSteamLoginUrl, unlinkSteamAccount, verifySteamLink } from "@/api/serverApi";
import DataCard from "../terminal/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Link2, Unlink, Loader2, CheckCircle, ExternalLink } from "lucide-react";

export default function SteamLinker() {
  const [steamStatus, setSteamStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const { toast } = useToast();

  const loadStatus = async () => {
    const nextStatus = await getSteamLinkStatus();
    setSteamStatus(nextStatus);
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();

    // Listen for Steam callback via URL params
    const params = new URLSearchParams(window.location.search);
    const openidMode = params.get("openid.mode");
    if (openidMode === "id_res") {
      // We got a Steam callback — extract all openid params and verify
      const openidParams = {};
      for (const [key, value] of params.entries()) {
        if (key.startsWith("openid.")) {
          openidParams[key] = value;
        }
      }
      verifySteamCallback(openidParams);
    }
  }, []);

  const verifySteamCallback = async (openidParams) => {
    setLinking(true);
    try {
      const res = await verifySteamLink(openidParams);
      const wlMsg = res.whitelisted ? 'You have been whitelisted on the game server.' : 'Steam linked. Whitelist will sync when server is online.';
      toast({ title: "Steam Linked!", description: `${res.steam_id} — ${wlMsg}` });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      loadStatus();
    } catch (err) {
      toast({
        title: "Steam Link Failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setLinking(false);
    }
  };

  const startSteamLink = async () => {
    setLinking(true);
    try {
      // Return URL is current profile page
      const returnUrl = window.location.origin + window.location.pathname;
      const url = await getSteamLoginUrl(returnUrl);
      // Redirect to Steam login
      window.location.href = url;
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setLinking(false);
    }
  };

  const unlinkSteam = async () => {
    setUnlinking(true);
    try {
      const res = await unlinkSteamAccount();
      toast({
        title: "Steam Unlinked",
        description: res.removed_from_whitelist
          ? "Your Steam account has been disconnected and removed from the whitelist."
          : "Your Steam account has been disconnected.",
      });
      loadStatus();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUnlinking(false);
    }
  };

  if (loading) {
    return (
      <DataCard title="Steam Account">
        <div className="text-[10px] text-muted-foreground animate-pulse">Checking Steam link...</div>
      </DataCard>
    );
  }

  const isLinked = steamStatus?.linked;

  return (
    <DataCard title="Steam Account">
      {isLinked ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-sm bg-[#1b2838] border border-[#66c0f4]/40 flex items-center justify-center">
              <svg viewBox="0 0 256 259" className="h-5 w-5" fill="#66c0f4">
                <path d="M128 0c-67.6 0-123.1 52.8-127.6 119.4l68.5 28.3c5.8-4 12.8-6.3 20.3-6.3.7 0 1.3 0 2 .1l30.4-44c0-.3 0-.6 0-.9 0-26.8 21.8-48.6 48.6-48.6s48.6 21.8 48.6 48.6-21.8 48.6-48.6 48.6h-1.1l-43.3 30.9c0 .5.1 1.1.1 1.6 0 20.1-16.3 36.5-36.5 36.5-17.7 0-32.5-12.7-35.8-29.5L4.4 159.8C24.6 214.6 72.5 258.3 128 258.3c70.7 0 128-57.3 128-128S198.7 0 128 0z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-status-ok" />
                <span className="text-xs font-semibold text-status-ok">VERIFIED & LINKED</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-foreground">{steamStatus.steam_id}</span>
                <a
                  href={`https://steamcommunity.com/profiles/${steamStatus.steam_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
                >
                  View Profile <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              {steamStatus.linked_at && (
                <span className="text-[9px] text-muted-foreground">
                  Linked {new Date(steamStatus.linked_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] uppercase tracking-wider h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={unlinkSteam}
            disabled={unlinking}
          >
            {unlinking ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Unlink className="h-3 w-3 mr-1" />}
            UNLINK STEAM
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground">
            Link your Steam account to verify your identity and enable features like automatic mission verification,
            player tracking, and game-server cross-referencing.
          </p>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
            <Badge variant="outline" className="text-[8px]">SECURE</Badge>
            <span>Uses Steam OpenID — we never see your password</span>
          </div>
          <Button
            size="sm"
            className="text-[10px] uppercase tracking-wider h-8 bg-[#1b2838] hover:bg-[#2a475e] text-[#66c0f4] border border-[#66c0f4]/30"
            onClick={startSteamLink}
            disabled={linking}
          >
            {linking ? (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            ) : (
              <Link2 className="h-3 w-3 mr-1.5" />
            )}
            LINK STEAM ACCOUNT
          </Button>
        </div>
      )}
    </DataCard>
  );
}
