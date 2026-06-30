import { useState, useEffect } from "react";
import { useActivityWS } from "../../hooks/useActivityWS";
import { api } from "../../api";
import Room3D from "./Room3D";
import "./VirtualRoom.css";

const WALL_COLORS = [
  { id: "midnight", color: "#0d1117", name: "Midnight" },
  { id: "deep", color: "#131922", name: "Deep Space" },
  { id: "plum", color: "#1a0f1e", name: "Plum" },
  { id: "navy", color: "#0f1729", name: "Navy" },
  { id: "forest", color: "#0d1a14", name: "Forest" },
  { id: "wine", color: "#1a0d0d", name: "Wine" },
  { id: "slate", color: "#1a1d23", name: "Slate" },
  { id: "warm", color: "#1a1610", name: "Warm" },
];

const FLOOR_COLORS = [
  { id: "dark-wood", color: "#1a1520", name: "Dark Wood" },
  { id: "light-wood", color: "#2a2018", name: "Light Wood" },
  { id: "marble", color: "#1a1a1f", name: "Marble" },
  { id: "carpet", color: "#181420", name: "Carpet" },
  { id: "stone", color: "#1a1a18", name: "Stone" },
];

const DECORATIONS = [
  { id: "photo", icon: "🖼️", name: "Photo", category: "memories", size: 40 },
  { id: "painting", icon: "🎨", name: "Painting", category: "memories", size: 50 },
  { id: "clock", icon: "🕰️", name: "Clock", category: "decor", size: 36 },
  { id: "lamp", icon: "💡", name: "Lamp", category: "decor", size: 32 },
  { id: "plant", icon: "🌿", name: "Plant", category: "decor", size: 38 },
  { id: "flower", icon: "🌸", name: "Flower", category: "decor", size: 30 },
  { id: "candle", icon: "🕯️", name: "Candle", category: "decor", size: 28 },
  { id: "star", icon: "⭐", name: "Star", category: "decor", size: 26 },
  { id: "heart", icon: "❤️", name: "Heart", category: "memories", size: 28 },
  { id: "music", icon: "🎵", name: "Music", category: "memories", size: 28 },
  { id: "book", icon: "📖", name: "Book", category: "memories", size: 30 },
  { id: "gift", icon: "🎁", name: "Gift", category: "gifts", size: 34 },
  { id: "teddy", icon: "🧸", name: "Teddy", category: "gifts", size: 36 },
  { id: "diamond", icon: "💎", name: "Gem", category: "gifts", size: 26 },
  { id: "cake", icon: "🎂", name: "Cake", category: "memories", size: 34 },
  { id: "souvenir", icon: "🧭", name: "Souvenir", category: "memories", size: 30 },
  { id: "note", icon: "📝", name: "Note", category: "notes", size: 26 },
  { id: "rug", icon: "🟫", name: "Rug", category: "floor", size: 60 },
  { id: "table", icon: "🪑", name: "Table", category: "floor", size: 50 },
  { id: "shelf", icon: "📚", name: "Shelf", category: "wall", size: 56 },
];

const CATEGORIES = ["all", "memories", "gifts", "decor", "notes", "floor", "wall"];

export default function VirtualRoom({ universeId, onComplete, onBack }) {
  const [placed, setPlaced] = useState([]);
  const [selectedObj, setSelectedObj] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [filter, setFilter] = useState("all");
  const [wallColor, setWallColor] = useState(WALL_COLORS[0].color);
  const [floorColor, setFloorColor] = useState(FLOOR_COLORS[0].color);
  const [noteInput, setNoteInput] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingNotePos, setPendingNotePos] = useState(null);
  const [activeTab, setActiveTab] = useState("objects");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { send } = useActivityWS(universeId, (msg) => {
    if (msg.type === "ROOM_PLACE") {
      setPlaced((prev) => {
        if (prev.find((p) => p.uid === msg.item.uid)) return prev;
        return [...prev, msg.item];
      });
    } else if (msg.type === "ROOM_MOVE") {
      const update = { x: msg.x, y: msg.y };
      if (msg.z !== undefined) update.z = msg.z;
      setPlaced((prev) =>
        prev.map((p) => (p.uid === msg.uid ? { ...p, ...update } : p))
      );
    } else if (msg.type === "ROOM_REMOVE") {
      setPlaced((prev) => prev.filter((p) => p.uid !== msg.uid));
    } else if (msg.type === "ROOM_WALL") {
      setWallColor(msg.color);
    } else if (msg.type === "ROOM_FLOOR") {
      setFloorColor(msg.color);
    } else if (msg.type === "ROOM_SYNC") {
      setWallColor(msg.room.wallColor);
      setFloorColor(msg.room.floorColor);
      setPlaced(msg.room.objects);
    }
  });

  useEffect(() => {
    if (!universeId) return;
    api.getRoom(universeId).then((room) => {
      setWallColor(room.wall_color);
      setFloorColor(room.floor_color);
      setPlaced(room.objects);
    }).catch(console.error);
  }, [universeId]);

  const filteredDecos = filter === "all"
    ? DECORATIONS
    : DECORATIONS.filter((d) => d.category === filter);

  const handleObjectClick = (obj) => {
    setSelectedObj(obj);
    setActiveTab("objects");
  };

  const confirmNote = () => {
    if (!pendingNotePos) return;
    const item = {
      ...selectedObj,
      uid: Date.now(),
      x: pendingNotePos.x,
      y: pendingNotePos.y,
      text: noteInput,
    };
    setPlaced((prev) => [...prev, item]);
    send({ type: "ROOM_PLACE", item });
    setNoteInput("");
    setShowNoteInput(false);
    setPendingNotePos(null);
  };

  const changeWallColor = (color) => {
    setWallColor(color);
    send({ type: "ROOM_WALL", color });
    api.saveRoom(universeId, { wallColor: color, floorColor, objects: placed }).catch(console.error);
  };

  const changeFloorColor = (color) => {
    setFloorColor(color);
    send({ type: "ROOM_FLOOR", color });
    api.saveRoom(universeId, { wallColor, floorColor: color, objects: placed }).catch(console.error);
  };

  const saveRoom = async () => {
    if (placed.length === 0) return;
    try {
      await api.saveRoom(universeId, { wallColor, floorColor, objects: placed });
    } catch (e) {}
    const difficulty = Math.min(5, Math.max(1, Math.ceil(placed.length / 3)));
    onComplete({
      type: "room",
      title: "Our Room",
      completion: 100,
      difficulty,
      timeSpent: 0,
      size: placed.length >= 8 ? "large" : placed.length >= 4 ? "medium" : "small",
      message: `${placed.length} memories in our space`,
      assets: [],
    });
  };

  const handleBottomTab = (tab) => {
    if (activeTab === tab && sheetOpen) {
      setSheetOpen(false);
    } else {
      setActiveTab(tab);
      setSheetOpen(true);
    }
  };

  return (
    <div className="activity-screen virtual-room-screen">
      <div className="room-toolbar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="room-title">🏠 Our Room</div>
        <div className="room-count">{placed.length} items</div>
        <button className="save-room-btn" onClick={saveRoom} disabled={placed.length === 0}>
          Save Room ✨
        </button>
      </div>

      <div className="room-body">
        <div className="room-sidebar">
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === "objects" ? "active" : ""}`}
              onClick={() => setActiveTab("objects")}
            >
              Objects
            </button>
            <button
              className={`sidebar-tab ${activeTab === "walls" ? "active" : ""}`}
              onClick={() => setActiveTab("walls")}
            >
              Walls
            </button>
            <button
              className={`sidebar-tab ${activeTab === "floor" ? "active" : ""}`}
              onClick={() => setActiveTab("floor")}
            >
              Floor
            </button>
          </div>

          {activeTab === "objects" && (
            <>
              <div className="palette-filters">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={`filter-btn ${filter === c ? "active" : ""}`}
                    onClick={() => setFilter(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="palette-grid">
                {filteredDecos.map((obj) => (
                  <button
                    key={obj.id}
                    className={`palette-item ${selectedObj?.id === obj.id ? "selected" : ""}`}
                    onClick={() => handleObjectClick(obj)}
                  >
                    <span className="palette-icon">{obj.icon}</span>
                    <span className="palette-name">{obj.name}</span>
                  </button>
                ))}
              </div>
              <p className="palette-hint">
                {selectedObj
                  ? `Tap room to place ${selectedObj.name}`
                  : "Pick an object"}
              </p>
            </>
          )}

          {activeTab === "walls" && (
            <div className="color-picker-grid">
              {WALL_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`color-option ${wallColor === c.color ? "active" : ""}`}
                  style={{ background: c.color }}
                  onClick={() => changeWallColor(c.color)}
                >
                  <span className="color-name">{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "floor" && (
            <div className="color-picker-grid">
              {FLOOR_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`color-option ${floorColor === c.color ? "active" : ""}`}
                  style={{ background: c.color }}
                  onClick={() => changeFloorColor(c.color)}
                >
                  <span className="color-name">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Room3D
          wallColor={wallColor}
          floorColor={floorColor}
          placed={placed}
          selectedObj={selectedObj}
          onPlace={(item) => {
            if (item.id === "note") {
              setPendingNotePos({ x: item.x, y: item.y });
              setShowNoteInput(true);
              return;
            }
            setPlaced((prev) => [...prev, item]);
            send({ type: "ROOM_PLACE", item });
          }}
          onRemove={(uid) => {
            setPlaced((prev) => prev.filter((p) => p.uid !== uid));
            send({ type: "ROOM_REMOVE", uid });
          }}
          onMove={(uid, x, y, z) => {
            setPlaced((prev) =>
              prev.map((p) => (p.uid === uid ? { ...p, x, y, ...(z !== undefined ? { z } : {}) } : p))
            );
            send({ type: "ROOM_MOVE", uid, x, y, ...(z !== undefined ? { z } : {}) });
          }}
          dragging={dragging}
          onDragStart={(uid) => setDragging(uid)}
          onDragEnd={() => setDragging(null)}
        />
      </div>

      {/* Mobile bottom tabs */}
      <div className="room-bottom-tabs">
        <button
          className={`room-bottom-tab ${activeTab === "objects" && sheetOpen ? "active" : ""}`}
          onClick={() => handleBottomTab("objects")}
        >
          <span className="room-bottom-tab-icon">📦</span>
          Objects
        </button>
        <button
          className={`room-bottom-tab ${activeTab === "walls" && sheetOpen ? "active" : ""}`}
          onClick={() => handleBottomTab("walls")}
        >
          <span className="room-bottom-tab-icon">🧱</span>
          Walls
        </button>
        <button
          className={`room-bottom-tab ${activeTab === "floor" && sheetOpen ? "active" : ""}`}
          onClick={() => handleBottomTab("floor")}
        >
          <span className="room-bottom-tab-icon">⬛</span>
          Floor
        </button>
      </div>

      {/* Mobile bottom sheet overlay */}
      <div
        className={`room-sheet-overlay ${sheetOpen ? "visible" : ""}`}
        onClick={() => setSheetOpen(false)}
      />

      {/* Mobile bottom sheet */}
      <div className={`room-sheet ${sheetOpen ? "open" : ""}`}>
        <div className="room-sheet-handle" />
        <div className="room-sheet-header">
          <span className="room-sheet-title">
            {activeTab === "objects" ? "Objects" : activeTab === "walls" ? "Wall Colors" : "Floor Colors"}
          </span>
          <button className="room-sheet-close" onClick={() => setSheetOpen(false)}>×</button>
        </div>
        <div className="room-sheet-body">
          {activeTab === "objects" && (
            <>
              <div className="sheet-filters">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={`sheet-filter-chip ${filter === c ? "active" : ""}`}
                    onClick={() => setFilter(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="sheet-grid">
                {filteredDecos.map((obj) => (
                  <button
                    key={obj.id}
                    className={`sheet-grid-item ${selectedObj?.id === obj.id ? "selected" : ""}`}
                    onClick={() => {
                      handleObjectClick(obj);
                      setSheetOpen(false);
                    }}
                  >
                    <span className="sheet-grid-icon">{obj.icon}</span>
                    <span className="sheet-grid-name">{obj.name}</span>
                  </button>
                ))}
              </div>
              <div className="sheet-hint">
                {selectedObj
                  ? <>Selected: <strong>{selectedObj.name}</strong> — tap room to place</>
                  : "Pick an object, then tap the room"}
              </div>
            </>
          )}

          {activeTab === "walls" && (
            <div className="sheet-color-grid">
              {WALL_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`sheet-color-item ${wallColor === c.color ? "active" : ""}`}
                  style={{ background: c.color }}
                  onClick={() => changeWallColor(c.color)}
                />
              ))}
            </div>
          )}

          {activeTab === "floor" && (
            <div className="sheet-color-grid">
              {FLOOR_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`sheet-color-item ${floorColor === c.color ? "active" : ""}`}
                  style={{ background: c.color }}
                  onClick={() => changeFloorColor(c.color)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showNoteInput && (
        <div className="note-modal" onClick={() => setShowNoteInput(false)}>
          <div className="note-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>📝 Leave a note</h3>
            <textarea
              className="note-textarea"
              placeholder="Write something..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              autoFocus
              rows={3}
            />
            <div className="note-actions">
              <button className="back-btn" onClick={() => setShowNoteInput(false)}>
                Cancel
              </button>
              <button className="save-room-btn" onClick={confirmNote}>
                Place Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
