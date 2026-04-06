import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MissionBriefingModal({
  mission,
  isOpen,
  onClose,
  onAccept,
  onDecline,
}) {
  if (!mission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary text-xl font-display tracking-wide uppercase">
            Mission Briefing: {mission.title}
          </DialogTitle>
          <DialogDescription>
            Review the details of your potential assignment.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 -mx-4 text-sm text-muted-foreground">
          <div className="space-y-4 pr-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Overview:</h3>
              <p>{mission.description}</p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Objectives:</h3>
              <ul className="list-disc list-inside space-y-1">
                {mission.objectives?.map((obj, index) => (
                  <li key={index}>{obj}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Rewards:</h3>
              <ul className="list-disc list-inside space-y-1">
                {mission.rewards?.credits && <li>{mission.rewards.credits} Credits</li>}
                {mission.rewards?.reputation && <li>{mission.rewards.reputation} Reputation</li>}
                {mission.rewards?.items?.length > 0 && (
                  <li>Items: {mission.rewards.items.join(", ")}</li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Threat Level:</h3>
              <p className="uppercase">{mission.threatLevel || "Unknown"}</p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1">Location:</h3>
              <p>{mission.location?.name || "Undisclosed"}</p>
              {mission.location?.sector && <p>Sector: {mission.location.sector}</p>}
            </div>

            {/* Add more mission details as needed */}
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 -mx-4 px-4 border-t border-border">
          <Button variant="secondary" onClick={onDecline} className="w-full sm:w-auto">
            Decline
          </Button>
          <Button onClick={onAccept} className="w-full sm:w-auto">
            Accept Mission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}