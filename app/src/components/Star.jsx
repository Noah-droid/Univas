import { memo } from "react";
import "./Star.css";

const SIZE_MAP = {
  small: 36,
  medium: 56,
  large: 80,
};

const TYPE_ICONS = {
  puzzle: "🧩",
  drawing: "🎨",
  room: "🏠",
  message: "💌",
  escape: "🔐",
};

function Star({ star, universeSize, onClick }) {
  const px = star.x * universeSize;
  const py = star.y * universeSize;
  const baseSize = SIZE_MAP[star.size] || 44;

  return (
    <div
      className={`star star--${star.size}`}
      style={{
        left: `${px}px`,
        top: `${py}px`,
        width: `${baseSize}px`,
        height: `${baseSize}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(star);
      }}
    >
      <div
        className="star__ring"
        style={{ borderColor: `${star.color}33` }}
      />
      <div
        className="star__glow"
        style={{
          background: `radial-gradient(circle, ${star.color}aa 0%, ${star.color}44 40%, ${star.color}00 70%)`,
        }}
      />
      <div
        className="star__core"
        style={{
          background: `radial-gradient(circle at 35% 35%, #fff, ${star.color})`,
          boxShadow: `
            0 0 ${baseSize * 0.3}px ${star.color},
            0 0 ${baseSize * 0.6}px ${star.color}88,
            0 0 ${baseSize}px ${star.color}44,
            inset 0 0 ${baseSize * 0.2}px rgba(255,255,255,0.3)
          `,
        }}
      >
        <span className="star__icon">{TYPE_ICONS[star.type] || "⭐"}</span>
      </div>
      <div className="star__label">{star.title}</div>
      <div className="star__label-sub">
        {star.completion}% · {star.message}
      </div>
    </div>
  );
}

export default memo(Star);
