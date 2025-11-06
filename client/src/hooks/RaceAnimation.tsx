import { useEffect, useRef, useCallback } from "react";
import { GeoJSON } from "ol/format";
import { Point } from "ol/geom";
import { NewPositionData } from "../Models";

type SendBulkFn = (arr: NewPositionData[]) => Promise<void> | void;

export function useRaceAnimation(params: {
  geojsonRef: React.MutableRefObject<any>;
  trackGeomRef: React.MutableRefObject<any>;
  vectorSourceRef: React.MutableRefObject<any>;
  mapRef: React.MutableRefObject<any>;
  selectedIcon: string;
  delay: number;
  sendBulk: SendBulkFn;
  onOutsideChanged?: (msg: string, isOutside: boolean) => void;
  iconStyleFn: (azimuth: number, icon: string) => any;
}) {
  const {
    geojsonRef,
    trackGeomRef,
    vectorSourceRef,
    mapRef,
    selectedIcon,
    delay,
    sendBulk,
    onOutsideChanged,
    iconStyleFn,
  } = params;

  const currentIndexRef = useRef<number>(0);
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnimatingRef = useRef<boolean>(false);
  const lastOutsideStatusRef = useRef<boolean | null>(null);
  const bufferRef = useRef<NewPositionData[]>([]);
  const delayRef = useRef<number>(delay);

  useEffect(() => {
    delayRef.current = delay;
    
    if (isAnimatingRef.current) {
      
      clearInterval(timerIdRef.current as any);
      timerIdRef.current = setInterval(step, delayRef.current);
    }
    
  }, [delay]);

  
  useEffect(() => {
    const flushTimer = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const copy = [...bufferRef.current];
        bufferRef.current = [];
        try {
          const res = sendBulk(copy);
          if (res && typeof (res as Promise<any>).then === "function") {
            (res as Promise<any>).catch((e) => console.error("sendBulk error:", e));
          }
        } catch (e) {
          console.error("sendBulk sync error:", e);
        }
      }
    }, 1000);

    return () => clearInterval(flushTimer);
    
  }, [sendBulk]);

  
  const step = useCallback(() => {
    const gj = geojsonRef.current;
    if (!gj || !gj.features || currentIndexRef.current >= gj.features.length - 1) {
      return;
    }

    try {
      vectorSourceRef.current.clear();

      const curFeat = new GeoJSON().readFeature(gj.features[currentIndexRef.current], {
        featureProjection: "EPSG:3857",
      });
      const nextFeat = new GeoJSON().readFeature(gj.features[currentIndexRef.current + 1], {
        featureProjection: "EPSG:3857",
      });

      const currentCoords = (curFeat.getGeometry() as Point).getCoordinates() as [number, number];
      const nextCoords = (nextFeat.getGeometry() as Point).getCoordinates() as [number, number];
      //azymut
      const dx = nextCoords[0] - currentCoords[0];
      const dy = nextCoords[1] - currentCoords[1];
      let azimuth = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (azimuth < 0) azimuth += 360;

      // inside/outside
      const isOutside = trackGeomRef.current ? !trackGeomRef.current.intersectsCoordinate(currentCoords) : true;

      const dataToSave: NewPositionData = {
        latitude: currentCoords[1],
        longitude: currentCoords[0],
        isInsidePolygon: !isOutside,
        exitTime: new Date().toISOString(),
      };
      bufferRef.current.push(dataToSave);

      if (lastOutsideStatusRef.current !== isOutside) {
        lastOutsideStatusRef.current = isOutside;
        if (onOutsideChanged) {
          const coordsStr = `[${currentCoords[1].toFixed(6)}, ${currentCoords[0].toFixed(6)}]`;
          const msg = isOutside
            ? `Punkt jest poza torem na współrzędnych ${coordsStr}`
            : `Punkt znajduje się na torze`;
          onOutsideChanged(msg, isOutside);
        }
      }

      curFeat.setStyle(iconStyleFn(azimuth, selectedIcon));
      vectorSourceRef.current.addFeature(curFeat);

      mapRef.current?.getView().setCenter(currentCoords);

      currentIndexRef.current++;

      if (currentIndexRef.current >= gj.features.length - 1) {
        clearInterval(timerIdRef.current as any);
        isAnimatingRef.current = false;
        currentIndexRef.current = 0;
      }
    } catch (err) {
      console.error("Animation step error:", err);
    }

  }, [geojsonRef, trackGeomRef, vectorSourceRef, mapRef, selectedIcon, onOutsideChanged, iconStyleFn]);

  const start = useCallback(() => {
    if (!geojsonRef.current) return;
    clearInterval(timerIdRef.current as any);
    timerIdRef.current = setInterval(step, delayRef.current);
    isAnimatingRef.current = true;
  }, [step]);

  const pause = useCallback(() => {
    clearInterval(timerIdRef.current as any);
    isAnimatingRef.current = false;
  }, []);

  const restart = useCallback(() => {
  pause();                       
  vectorSourceRef.current.clear();
  currentIndexRef.current = 0; 
  isAnimatingRef.current = false; 
}, [pause]);

  const setDelay = useCallback((ms: number) => {
    delayRef.current = ms;

    if (isAnimatingRef.current) {
      clearInterval(timerIdRef.current as any);
      timerIdRef.current = setInterval(step, delayRef.current);
    }
  }, [step]);

  useEffect(() => {
    return () => {
      clearInterval(timerIdRef.current as any);
    };
  }, []);

  return {
    start,
    pause,
    restart,
    setDelay,
    isAnimatingRef,
    currentIndexRef,
    bufferRef,
  };
}
