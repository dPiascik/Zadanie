import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { GeoJSON } from "ol/format";
import { MultiPolygon } from "ol/geom";
import jsonFilePath from "../assets/raceTrack.json";
import { iconStyle, polygonStyle } from "../style/MapStyle";
import { MapControls } from "./MapControls";
import { PlayerControls } from "./Controls";
import { DbPanel } from "./DbPanel";
import { IconPickerPopout } from "./IconPickerPopout";
import { NewPositionData, PositionData } from "../Models";
import { useRaceAnimation } from "../hooks/RaceAnimation";

export const MapComponent = () => {
  // refs
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  const polygonLayerRef = useRef<VectorLayer<any> | null>(null);
  const trackGeomRef = useRef<MultiPolygon | null>(null);
  const geojsonRef = useRef<any>(null);

  // state
  const [geojson, setGeoJSON] = useState<any>(null);
  const [delay, setDelay] = useState(50);
  const [selectedIcon, setSelectedIcon] = useState("/fastRaceCar.svg");
  const [dbPoints, setDbPoints] = useState<PositionData[]>([]);
  const [loadedFileName, setLoadedFileName] = useState("");
  const [filterInside, setFilterInside] = useState<boolean | null>(null);
  const [sortField, setSortField] = useState<"id" | "latitude" | "longitude" | "isInsidePolygon" | "exitTime">("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [outsideMessage, setOutsideMessage] = useState<string>("");

  const loadDbData = async () => {
    const params = new URLSearchParams();
    if (filterInside !== null) params.append("inside", filterInside.toString());
    params.append("sort", sortField.toLowerCase());
    params.append("asc", sortAsc.toString());
    const url = `https://localhost:7152/api/positiondata/filtered?${params.toString()}`;
    const data = await fetch(url).then(r => r.json());
    setDbPoints(data);
  };

  const sendBulk = async (arr: NewPositionData[]) => {
    if (!arr.length) return;
    try {
      await fetch("https://localhost:7152/api/positiondata/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arr),
      });
    } catch (e) {
      console.error("SendBulk failed", e);
    }
  };

  // hook
  const { start, pause, restart, setDelay: setAnimDelay } = useRaceAnimation({
    geojsonRef,
    trackGeomRef,
    vectorSourceRef,
    mapRef: map,
    selectedIcon,
    delay,
    sendBulk,
    onOutsideChanged: (msg) => setOutsideMessage(msg),
    iconStyleFn: iconStyle,
  });

  useEffect(() => {
    if (!mapRef.current || map.current) return;

    const polygonSource = new VectorSource({
      features: new GeoJSON().readFeatures(jsonFilePath, {
        featureProjection: "EPSG:3857",
      }),
    });
    const polygonLayer = new VectorLayer({
      source: polygonSource,
      style: polygonStyle,
    });
    polygonLayerRef.current = polygonLayer;

    const geometries = polygonSource.getFeatures().map(f => f.getGeometry()).filter(Boolean) as any[];
    try {
      const coords = geometries.map(g => g.getCoordinates());
      trackGeomRef.current = new MultiPolygon(coords as any);
    } catch {
      trackGeomRef.current = null;
    }

    map.current = new Map({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM() }), polygonLayer, new VectorLayer({ source: vectorSourceRef.current })],
      view: new View({ center: [0, 0], zoom: 1.5 }),
    });

    map.current.getView().fit(polygonSource.getExtent(), { size: map.current.getSize() });
  }, []);

  useEffect(() => {
    loadDbData();
  }, [filterInside, sortField, sortAsc]);

  const handleLoadGeoJSON = (file: File, delayMs: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        restart();
        geojsonRef.current = json;
        setGeoJSON(json);
        setAnimDelay(delayMs);
        start();
        setLoadedFileName(file.name);
      } catch {
        alert("Nieprawidłowy plik JSON!");
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => e.preventDefault();

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      restart();
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string);
          geojsonRef.current = json;
          setGeoJSON(json);
          setLoadedFileName(file.name);
        } catch {
          alert("Nieprawidłowy plik JSON!");
        }
      };
      reader.readAsText(file);
    };

    const mapDiv = mapRef.current;
    if (!mapDiv) return;

    mapDiv.addEventListener("dragover", handleDragOver);
    mapDiv.addEventListener("drop", handleDrop);

    return () => {
      mapDiv.removeEventListener("dragover", handleDragOver);
      mapDiv.removeEventListener("drop", handleDrop);
    };
  }, []);


  return (
    <div className="map-container">
      <div className="map" ref={mapRef}></div>
      <div className="control-panel">
        <div className={`outside-info ${outsideMessage.includes("poza") ? "outside" : "inside"}`}>
          {outsideMessage}
        </div>
        <div className="filereaded">
          {loadedFileName ? `Wczytany plik: ${loadedFileName}` : "Brak wczytanego pliku"}
        </div>
        <br></br>
        <MapControls
          onLoadGeoJSON={handleLoadGeoJSON}
          delay={delay}
          setDelay={setDelay}
          vectorSource={vectorSourceRef.current}
          startInterval={start}
          pauseInterval={pause}
        />

        <PlayerControls
          startInterval={start}
          pauseInterval={pause}
          restartAnimation={restart}
        />
        <br></br>
        <IconPickerPopout
          selectedIcon={selectedIcon}
          setSelectedIcon={setSelectedIcon}
        />

        <DbPanel
          dbPoints={dbPoints}
          filterInside={filterInside}
          setFilterInside={setFilterInside}
          sortField={sortField}
          sortAsc={sortAsc}
          handleSort={(field) => {
            if (sortField === field) setSortAsc(!sortAsc);
            else { setSortField(field); setSortAsc(true); }
          }}
        />
      </div>
    </div>
  );
};
