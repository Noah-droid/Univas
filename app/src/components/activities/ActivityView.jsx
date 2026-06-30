import { useState, useCallback } from "react";
import { api } from "../../api";
import ActivityHub from "./ActivityHub";
import JigsawPuzzle from "./JigsawPuzzle";
import Drawing from "./Drawing";
import VirtualRoom from "./VirtualRoom";

export default function ActivityView({ universeId, onComplete, onExit }) {
  const [activity, setActivity] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleComplete = useCallback(
    async (starData) => {
      setCreating(true);
      try {
        await api.createStar(universeId, starData);
        onComplete();
      } catch (err) {
        console.error("Failed to create star:", err);
        setCreating(false);
      }
    },
    [universeId, onComplete]
  );

  const handleBack = useCallback(() => {
    setActivity(null);
    setCreating(false);
  }, []);

  if (creating) {
    return (
      <div className="activity-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>Creating your star...</div>
      </div>
    );
  }

  switch (activity) {
    case "puzzle":
      return <JigsawPuzzle universeId={universeId} onComplete={handleComplete} onBack={handleBack} />;
    case "drawing":
      return <Drawing universeId={universeId} onComplete={handleComplete} onBack={handleBack} />;
    case "room":
      return <VirtualRoom universeId={universeId} onComplete={handleComplete} onBack={handleBack} />;
    default:
      return <ActivityHub onSelect={setActivity} onExit={onExit} />;
  }
}
