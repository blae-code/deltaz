import { base44 } from "@/api/base44Client";
import useEntityQuery from "./useEntityQuery";

export default function useGameCatalog(limit = 1000) {
  return useEntityQuery(
    ["gameCatalog", limit],
    () => base44.entities.GameItem.filter({}, "name", limit),
    {
      subscribeEntities: ["GameItem"],
    },
  );
}
