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
  const [fetching, setFetching] = useState(false);

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

  useEffect(() => {
    if (user && (view === "picker" || view === "universe") && !activeUniverse) {
      setFetching(true);
      api.getUniverses()
        .then(setUniverses)
        .catch(console.error)
        .finally(() => setFetching(false));
    }
  }, [user, view, activeUniverse]);

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

  if (showActivity) {
    return (
      <ActivityView
        universeId={activeUniverse.id}
        onComplete={() => setShowActivity(false)}
        onExit={() => setShowActivity(false)}
      />
    );
  }

  if (activeUniverse && view === "universe") {
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

  return (
    <UniversePicker
      universes={universes}
      loading={fetching}
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

function UniversePicker({ universes, loading, onSelect, onCreate, onLogout }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name.trim());
    } finally {
      setCreating(false);
    }
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
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="auth-bg-star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              opacity: Math.random() * 0.4 + 0.2,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>
      <div className="picker-container">
        <div className="picker-header">
          <div className="auth-brand-icon">✦</div>
          <h1>Univas</h1>
          <p>choose your universe</p>
        </div>

        {loading ? (
          <div className="picker-loading">Loading your universes...</div>
        ) : (
          <>
            {universes.length > 0 && (
              <div className="picker-section">
                <div className="picker-section-label">Your Universes</div>
                <div className="picker-grid">
                  {universes.map((u) => (
                    <button
                      key={u.id}
                      className="picker-universe-card"
                      onClick={() => onSelect(u)}
                    >
                      <span className="picker-universe-icon">✦</span>
                      <span className="picker-universe-name">{u.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="picker-actions">
              {!showCreate && !showInvite && (
                <>
                  <button className="picker-action-primary" onClick={() => setShowCreate(true)}>
                    <span className="picker-action-icon">+</span>
                    Create New Universe
                  </button>
                  <button className="picker-action-secondary" onClick={() => setShowInvite(true)}>
                    Join with Invite Code
                  </button>
                </>
              )}

              {showCreate && (
                <form onSubmit={handleCreate} className="picker-form">
                  <div className="input-group">
                    <label>Universe Name</label>
                    <input
                      placeholder="our universe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="picker-form-actions">
                    <button type="submit" className="picker-action-primary" disabled={!name.trim() || creating}>
                      {creating ? "Creating..." : "Create"}
                    </button>
                    <button type="button" className="picker-cancel" onClick={() => setShowCreate(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {showInvite && (
                <form onSubmit={handleJoin} className="picker-form">
                  <div className="input-group">
                    <label>Invite Code</label>
                    <input
                      placeholder="e.g. a1b2c3d4"
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="picker-form-actions">
                    <button type="submit" className="picker-action-primary" disabled={!joinInput.trim()}>
                      Join Universe
                    </button>
                    <button type="button" className="picker-cancel" onClick={() => setShowInvite(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}

        <button className="picker-logout" onClick={onLogout}>
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
