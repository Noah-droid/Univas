import { useEffect, useRef, useCallback } from "react";
import { connectWS } from "../api";

export function useActivityWS(universeId, onMessage) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!universeId) return;

    wsRef.current = connectWS(universeId, (msg) => {
      onMessageRef.current(msg);
    });

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [universeId]);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
