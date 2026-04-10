import { base44 } from "@/api/base44Client";
import useEntityQuery from "./useEntityQuery";

export default function useWorldState() {
  return useEntityQuery(
    "world-conditions",
    () => base44.entities.WorldConditions.list("-updated_date", 1).then((rows) => rows[0] || null),
    { subscribeEntities: ["WorldConditions"], syncPolicy: "realtime" },
  );
}
