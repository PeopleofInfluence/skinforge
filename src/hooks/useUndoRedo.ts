import { useRef, useState, useCallback } from "react";

const MAX_HISTORY = 50;

export function useUndoRedo(initial: ImageData | null) {
  const [currentData, setCurrentData] = useState<ImageData | null>(initial);
  const history = useRef<ImageData[]>([]);
  const future = useRef<ImageData[]>([]);

  const push = useCallback((data: ImageData) => {
    if (currentData) {
      history.current.push(cloneImageData(currentData));
      if (history.current.length > MAX_HISTORY) {
        history.current.shift();
      }
    }
    future.current = [];
    setCurrentData(cloneImageData(data));
  }, [currentData]);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (prev && currentData) {
      future.current.push(cloneImageData(currentData));
      setCurrentData(cloneImageData(prev));
      return cloneImageData(prev);
    }
    return null;
  }, [currentData]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next && currentData) {
      history.current.push(cloneImageData(currentData));
      setCurrentData(cloneImageData(next));
      return cloneImageData(next);
    }
    return null;
  }, [currentData]);

  const reset = useCallback((data: ImageData) => {
    history.current = [];
    future.current = [];
    setCurrentData(cloneImageData(data));
  }, []);

  return {
    current: currentData,
    push,
    undo,
    redo,
    canUndo: history.current.length > 0,
    canRedo: future.current.length > 0,
    reset,
  };
}

function cloneImageData(data: ImageData): ImageData {
  return new ImageData(
    new Uint8ClampedArray(data.data),
    data.width,
    data.height
  );
}
