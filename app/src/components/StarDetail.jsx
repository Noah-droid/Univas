import { useEffect, useRef } from "react";
import "./StarDetail.css";

const TYPE_ICONS = {
  puzzle: "🧩",
  drawing: "🎨",
  escape: "🔐",
  message: "💌",
  room: "🏠",
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function StarDetail({ star, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div className="star-detail-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="star-detail" style={{ "--star-color": star.color }}>
        <button className="star-detail__close" onClick={onClose}>
          ×
        </button>

        <div className="star-detail__header">
          <div className="star-detail__icon">{TYPE_ICONS[star.type] || "⭐"}</div>
          <h2 className="star-detail__title">{star.title}</h2>
        </div>

        <div className="star-detail__meta">
          <div className="meta-item">
            <span className="meta-label">Date</span>
            <span className="meta-value">{star.createdAt}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Completion</span>
            <span className="meta-value">{star.completion}%</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Difficulty</span>
            <span className="meta-value">{"★".repeat(star.difficulty)}{"☆".repeat(5 - star.difficulty)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Time</span>
            <span className="meta-value">{formatTime(star.timeSpent)}</span>
          </div>
        </div>

        <div className="star-detail__message">
          <div className="message-label">Message</div>
          <div className="message-text">"{star.message}"</div>
        </div>

        <div className="star-detail__footer">
          <span className="star-type-badge">{star.type}</span>
          <span className="star-size-badge">{star.size} star</span>
        </div>
      </div>
    </div>
  );
}
