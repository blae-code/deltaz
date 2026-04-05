import { BookOpen, Sparkles, Bot, Radio } from "lucide-react";

export default function RoleplayNotice() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-accent" />
        <div>
          <h2 className="text-sm font-semibold font-display tracking-wider text-foreground uppercase">
            Character Roleplay
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Optional — create a fictional persona for immersive gameplay
          </p>
        </div>
      </div>

      <div className="border border-accent/20 bg-accent/5 rounded-sm p-4 space-y-3">
        <p className="text-xs text-foreground leading-relaxed">
          Dead Signal supports <span className="text-accent font-semibold">character roleplay</span>. You
          can create a fictional backstory, personality, skills, and goals for your operative. This is
          completely optional.
        </p>

        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground">
              <span className="text-foreground font-medium">AI-Integrated:</span> Our AI systems (ARTEMIS tactical advisor, GHOST PROTOCOL narrator, Mission Forge) will read your character data and weave it into briefings, narration, and mission flavor text.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Bot className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground">
              <span className="text-foreground font-medium">Personalized Experience:</span> ARTEMIS will reference your backstory and personality when giving tactical advice. Missions may feel tailored to your character's strengths and weaknesses.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Radio className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground">
              <span className="text-foreground font-medium">Skip It:</span> Don't want to roleplay? No problem. Leave it blank and the AI will treat you like a standard operative. You can always fill it in later from your Dossier page.
            </p>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground text-center tracking-wider">
        YOU CAN SET UP YOUR CHARACTER PROFILE ANYTIME FROM THE DOSSIER PAGE
      </p>
    </div>
  );
}