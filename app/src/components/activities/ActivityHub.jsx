import "./ActivityHub.css";

const ACTIVITIES = [
  {
    id: "puzzle",
    icon: "🧩",
    name: "Jigsaw Puzzle",
    desc: "Upload an image, split it up, solve it together",
    color: "#ffd700",
  },
  {
    id: "drawing",
    icon: "🎨",
    name: "Collaborative Drawing",
    desc: "Draw together on a shared canvas",
    color: "#ff6b6b",
  },
  {
    id: "room",
    icon: "🏠",
    name: "Virtual Room",
    desc: "Decorate a shared space with memories",
    color: "#2ecc71",
  },
];

export default function ActivityHub({ onSelect, onExit }) {
  return (
    <div className="activity-hub">
      <div className="activity-hub__nav">
        <button className="back-btn" onClick={onExit}>
          ← Back to Universe
        </button>
      </div>
      <div className="activity-hub__header">
        <h2>What have you been up to?</h2>
        <p>Complete an activity to create a new star</p>
      </div>
      <div className="activity-hub__grid">
        {ACTIVITIES.map((a) => (
          <button
            key={a.id}
            className="activity-card"
            style={{ "--card-color": a.color }}
            onClick={() => onSelect(a.id)}
          >
            <span className="activity-card__icon">{a.icon}</span>
            <span className="activity-card__name">{a.name}</span>
            <span className="activity-card__desc">{a.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
