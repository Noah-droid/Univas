import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./components/Landing";
import Auth from "./components/Auth";
import Universe from "./components/Universe";
import ActivityView from "./components/activities/ActivityView";
import { api } from "./api";

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [universes, setUniverses] = useState([]);
  const [activeUniverse, setActiveUniverse] = useState(null);
  const [view, setView] = useState("landing");
  const [showActivity, setShowActivity] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(null);

  useEffect(() => {
    const path = window.location.pathname;
    const joinMatch = path.match(/^\/join\/(.+)$/);
    if (joinMatch) {
      const code = joinMatch[1];
      if (code && code !== "undefined") {
        setPendingJoin(code);
        if (!user) {
          setView("auth-join");
        }
      } else {
        window.history.replaceState({}, "", "/");
      }
    }
  }, []);

  useEffect(() => {
    if (user && pendingJoin) {
      handleJoinByCode(pendingJoin);
    } else if (user && view === "landing") {
      setView("picker");
    }
  }, [user, pendingJoin]);

  const handleJoinByCode = async (code) => {
    try {
      const universe = await api.joinByCode(code);
      setUniverses((prev) => {
        if (prev.find((u) => u.id === universe.id)) return prev;
        return [...prev, universe];
      });
      setActiveUniverse(universe);
      setView("universe");
      setPendingJoin(null);
      window.history.replaceState({}, "", "/");
    } catch (err) {
      console.error("Join failed:", err);
      setPendingJoin(null);
      window.history.replaceState({}, "", "/");
      setView("picker");
    }
  };

  if (loading) return null;

  if (view === "landing" && !user) {
    return <Landing onGetStarted={() => setView("auth")} />;
  }

  if (view === "auth" || view === "auth-join" || !user) {
    return (
      <Auth
        initialMode={view === "auth-join" ? "register" : "login"}
        onDone={() => {
          if (pendingJoin) {
            handleJoinByCode(pendingJoin);
          } else {
            setView("picker");
          }
        }}
      />
    );
  }

  if (view === "picker" || !activeUniverse) {
    return (
      <UniversePicker
        universes={universes}
        onSelect={(u) => {
          setActiveUniverse(u);
          setView("universe");
        }}
        onCreate={async (name) => {
          const u = await api.createUniverse(name);
          setUniverses((prev) => [...prev, u]);
          setActiveUniverse(u);
          setView("universe");
        }}
        onLogout={() => {
          logout();
          setActiveUniverse(null);
          setUniverses([]);
          setView("landing");
        }}
      />
    );
  }

  if (showActivity) {
    return (
      <ActivityView
        universeId={activeUniverse.id}
        onComplete={() => setShowActivity(false)}
        onExit={() => setShowActivity(false)}
      />
    );
  }

  return (
    <Universe
      universeId={activeUniverse.id}
      universeName={activeUniverse.name}
      onOpenActivity={() => setShowActivity(true)}
      onLeave={() => {
        setActiveUniverse(null);
        setView("picker");
      }}
    />
  );
}

function UniversePicker({ universes, onSelect, onCreate, onLogout }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [joinInput, setJoinInput] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate(name.trim());
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinInput.trim()) return;
    try {
      const universe = await api.joinByCode(joinInput.trim());
      onSelect(universe);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-bg">
        <div className="auth-nebula" />
      </div>
      <div className="auth-container" style={{ gap: 24 }}>
        <div className="auth-brand">
          <div className="auth-brand-icon">✦</div>
          <h1>Univas</h1>
          <p>choose your universe</p>
        </div>

        <div className="auth-card">
          {universes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {universes.map((u) => (
                <button
                  key={u.id}
                  className="auth-submit"
                  style={{ marginBottom: 8, background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                  onClick={() => onSelect(u)}
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}

          {!showCreate && !showInvite && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="auth-submit" onClick={() => setShowCreate(true)}>
                + Create New Universe
              </button>
              <button
                className="auth-submit"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
                onClick={() => setShowInvite(true)}
              >
                Join with Invite Code
              </button>
            </div>
          )}

          {showCreate && (
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="input-group">
                <label>Universe Name</label>
                <input
                  placeholder="our universe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="auth-submit" disabled={!name.trim()}>
                Create
              </button>
              <button
                type="button"
                className="auth-submit"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 13 }}
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </form>
          )}

          {showInvite && (
            <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="input-group">
                <label>Invite Code</label>
                <input
                  placeholder="e.g. a1b2c3d4"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="auth-submit" disabled={!joinInput.trim()}>
                Join Universe
              </button>
              <button
                type="button"
                className="auth-submit"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 13 }}
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        <button
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.25)",
            fontSize: 12,
            cursor: "pointer",
          }}
          onClick={onLogout}
        >
          sign out
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
