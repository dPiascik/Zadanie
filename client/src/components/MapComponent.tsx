import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { GeoJSON } from 'ol/format';
import jsonFilePath from '../assets/raceTrack.json';
import { GeoJSONFeature } from 'ol/format/GeoJSON';
import { Point, MultiPolygon } from 'ol/geom';
import { iconStyle, polygonStyle } from '../style/MapStyle';
import { MapControls } from './MapControls';
import { NewPositionData, PositionData, SendDataToServer } from '../Models';
import { IconPickerPopout } from './IconPickerPopout';

const MapComponent = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [popupContent, setPopupContent] = useState<string>('');
  const [isGeoJSONLoaded, setIsGeoJSONLoaded] = useState<boolean>(false);
  const isAnimating = useRef<boolean>(false);
  const timerId = useRef<ReturnType<typeof setInterval>>();
  const currentIndex = useRef<number>(0);
  const [geojson, setGeoJSON] = useState<GeoJSONFeature | null>(null);
  const [delay, setDelay] = useState<number>(50);
  const isIntervalRunning = useRef<boolean>(false);
  const outsideInfoRef = useRef<HTMLDivElement>(null);
  const vectorSourceRef = useRef<VectorSource>(new VectorSource());
  const bufferRef = useRef<NewPositionData[]>([]);
  const [loadedFileName, setLoadedFileName] = useState<string>('');
  const [dbPoints, setDbPoints] = useState<PositionData[]>([]);
  const lastOutsideStatusRef = useRef<boolean | null>(null);
  const trackGeom = useRef<MultiPolygon | null>(null);
  const [filterInside, setFilterInside] = useState<boolean | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('/fastRaceCar.svg');
  const [sortField, setSortField] = useState<'id' | 'latitude' | 'longitude' | 'isInsidePolygon' | 'exitTime'>('id');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc); // zmiana kierunku sortowania 
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };
  const polygonSource = new VectorSource({
    features: new GeoJSON().readFeatures(jsonFilePath, {
      featureProjection: 'EPSG:3857',
    }),
  });

  const polygonLayer = new VectorLayer({
    source: polygonSource,
    style: polygonStyle,
  });

  const resetMapState = () => {
    isAnimating.current = false;
    vectorSourceRef.current.clear();
    clearInterval(timerId.current);
    currentIndex.current = 0;
  };
  const loadDbData = async () => {
    const data = await fetch('https://localhost:7152/api/positiondata')
      .then(res => res.json());
    setDbPoints(data);
  };
  useEffect(() => {
    // tor
    const features = polygonLayer.getSource()?.getFeatures() || [];
    const geometries = features
      .map(f => f.getGeometry())
      .filter(g => !!g) as any[];

    if (geometries.length === 0) {
      trackGeom.current = null;
      return;
    }
    const coords = geometries.map(g => (g as any).getCoordinates());
    try {
      trackGeom.current = new MultiPolygon(coords as any);
    } catch (err) {
      console.warn('Nie udało się zbudować MultiPolygon:', err);
      trackGeom.current = null;
    }
  }, []);
  useEffect(() => {
    resetMapState();
    loadDbData();
    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      zIndex: 10,
    });

    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(jsonFilePath, {
        featureProjection: 'EPSG:3857',
      }),
    });

    map.current = new Map({
      target: mapRef.current as HTMLElement,
      layers: [new TileLayer({ source: new OSM() }), polygonLayer, vectorLayer],
      view: new View({ center: [0, 0], zoom: 1.5 }),
    });

    map.current.getView().fit(vectorSource.getExtent(), map.current.getSize() as any);
    // Drag drop
    const handleDragOver = (e: DragEvent) => e.preventDefault();

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      setLoadedFileName(file.name);
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string);

          if (!isValidGeoJSON(json)) {
            alert('Błędny plik GeoJSON! Upewnij się, że zawiera poprawne punkty.');
            return;
          }

          setGeoJSON(json);
          setIsGeoJSONLoaded(true);
        } catch (err) {
          console.error('Error parsing GeoJSON:', err);
          alert('Nieprawidłowy plik JSON!');
        }
      };

      reader.readAsText(file);
    };
    const mapDiv = mapRef.current;
    mapDiv?.addEventListener('dragover', handleDragOver);
    mapDiv?.addEventListener('drop', handleDrop);

    return () => {
      mapDiv?.removeEventListener('dragover', handleDragOver);
      mapDiv?.removeEventListener('drop', handleDrop);
      map.current?.setTarget(undefined);
      clearInterval(timerId.current);
    };
  }, []);
  useEffect(() => {
    const flushTimer = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const copy = [...bufferRef.current];
        bufferRef.current = [];

        setTimeout(() => SendBulk(copy), 0);
      }
    }, 1000);

    return () => clearInterval(flushTimer);
  }, []);
  useEffect(() => {
    if (isIntervalRunning.current) {
      startInterval();
    }
  }, [delay]);

  const startInterval = () => {
    if (!isGeoJSONLoaded) return;

    clearInterval(timerId.current);

    timerId.current = setInterval(updateFeature, delay);
    isAnimating.current = true;
    isIntervalRunning.current = true;
  };

  const pauseInterval = () => {
    if (isAnimating.current) {
      clearInterval(timerId.current);
      isAnimating.current = false;
      isIntervalRunning.current = false;
      loadDbData();
    }
  };

  const restartAnimation = () => {
    resetMapState();
  };
  const isValidGeoJSON = (json: any): boolean => {
    return (
      json.type === 'FeatureCollection' &&
      Array.isArray(json.features) &&
      !json.features.some(
        (f: any) =>
          !f.geometry ||
          f.geometry.type !== 'Point' ||
          !Array.isArray(f.geometry.coordinates) ||
          f.geometry.coordinates.length !== 2 ||
          typeof f.geometry.coordinates[0] !== 'number' ||
          typeof f.geometry.coordinates[1] !== 'number'
      )
    );
  };
  const handleLoadGeoJSON = (file: File) => {
    resetMapState();
    setDbPoints([]);
    if (outsideInfoRef.current) outsideInfoRef.current.innerHTML = '';

    setLoadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);

        if (!isValidGeoJSON(json)) {
          alert('Błędny plik GeoJSON! Upewnij się, że zawiera poprawne punkty.');
          return;
        }

        setGeoJSON(json);
        setIsGeoJSONLoaded(true);
        loadDbData();
      } catch (err) {
        console.error('Error parsing GeoJSON:', err);
        alert('Nieprawidłowy plik JSON!');
      }
    };

    reader.readAsText(file);
  };

  const calculateAzimuth = (currentCoords: [number, number], nextCoords: [number, number]) => {
    const toDegrees = (radian: number) => radian * (180 / Math.PI);
    const dx = nextCoords[0] - currentCoords[0];
    const dy = nextCoords[1] - currentCoords[1];
    let azimuth = toDegrees(Math.atan2(dy, dx));
    if (azimuth < 0) azimuth += 360;
    return azimuth;
  };

  const updateFeature = () => {
    if (geojson && geojson.features && currentIndex.current < geojson.features.length - 1) {
      vectorSourceRef.current.clear();

      const currentFeature = new GeoJSON().readFeature(
        geojson.features[currentIndex.current],
        { featureProjection: 'EPSG:3857' }
      );
      const nextFeature = new GeoJSON().readFeature(
        geojson.features[currentIndex.current + 1],
        { featureProjection: 'EPSG:3857' }
      );

      const currentCoords = (currentFeature.getGeometry() as Point).getCoordinates() as [number, number];
      const nextCoords = (nextFeature.getGeometry() as Point).getCoordinates() as [number, number];

      const azimuth = calculateAzimuth(currentCoords, nextCoords);

      // inside/outside
      const isOutside = trackGeom.current
        ? !trackGeom.current.intersectsCoordinate(currentCoords) : true;

      // dane do bazy
      const dataToSave: NewPositionData = {
        latitude: currentCoords[1],
        longitude: currentCoords[0],
        isInsidePolygon: !isOutside,
        exitTime: new Date().toISOString(),
      };

      bufferRef.current.push(dataToSave);

      // update informacji o outside tylko jeśli się zmienił
      if (lastOutsideStatusRef.current !== isOutside) {
        lastOutsideStatusRef.current = isOutside;

        if (outsideInfoRef.current) {
          if (isOutside) {
            outsideInfoRef.current.classList.remove('inside');
            outsideInfoRef.current.classList.add('outside');
            outsideInfoRef.current.innerHTML = `Punkt jest poza torem na współrzędnych ${currentCoords}`;
          } else {
            outsideInfoRef.current.classList.remove('outside');
            outsideInfoRef.current.classList.add('inside');
            outsideInfoRef.current.innerHTML = 'Punkt znajduje się na torze';
          }
        }
      }

      vectorSourceRef.current.addFeature(currentFeature);
      currentFeature.setStyle(iconStyle(azimuth, selectedIcon));

      if (map.current) {
        map.current.getView().setCenter(currentCoords);
      }

      currentIndex.current++;
      if (currentIndex.current === geojson.features.length - 1) {
        clearInterval(timerId.current);
        isAnimating.current = false;
        currentIndex.current = 0;

        fetch('https://localhost:7152/api/positiondata')
          .then(res => res.json())
          .then((data: PositionData[]) => setDbPoints(data))
          .catch(err => console.error('Błąd pobierania danych do tabeli:', err));
      }
    } else {
      console.error('GeoJSON or features are undefined or currentIndex is out of bounds.');
    }
  };
  const SendBulk = async (arr: NewPositionData[]) => {
    try {
      if (!arr || arr.length === 0) return;

      // debugging
      console.log(`SendBulk: sending ${arr.length} items, sample:`, arr[0]);

      const res = await fetch("https://localhost:7152/api/positiondata/bulk", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arr)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '<no body>');
        console.error(`Bulk POST failed: ${res.status} ${res.statusText}`, text);
      } else {
        const json = await res.json().catch(() => null);
        console.log('Bulk POST OK, response:', json);
      }
    } catch (e) {
      console.error('SendBulk failed (fetch error):', e);
    }
  };

  return (
    <div>
      <div className="map" ref={mapRef}></div>
      {popupContent && (
        <div className="popup">
          <div className="popup-content">{popupContent}</div>
          <button onClick={() => setPopupContent('')} className="popup-close-button">Close</button>
        </div>
      )}
      <div className="control-panel">

        <div className="outside-info" ref={outsideInfoRef}></div>
        <div className="row">
          <MapControls
            onLoadGeoJSON={handleLoadGeoJSON}
            delay={delay}
            setDelay={setDelay}
            vectorSource={vectorSourceRef.current}
            startInterval={startInterval}
            pauseInterval={pauseInterval}
          />
          {loadedFileName && (
            <div className="loaded-file-box">
              Wczytano plik: {loadedFileName}
            </div>
          )}
        </div>

        <div className="buttons-row">
          <button className="btn-orange" onClick={startInterval}>Start</button>
          <button className="btn-orange" onClick={pauseInterval}>Stop</button>
          <button className="btn-orange" onClick={restartAnimation}>Restart</button>
        </div>
        <br></br>
        <div style={{ marginBottom: '10px' }}>
          <IconPickerPopout selectedIcon={selectedIcon} setSelectedIcon={setSelectedIcon} />
        </div>
        <br></br>
        <div className='filter-panel'>
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="filter-select" style={{ marginRight: '8px' }}>Pokaż punkty:</label>
            <select
              id="filter-select"
              value={filterInside === null ? 'all' : filterInside ? 'true' : 'false'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') setFilterInside(null);
                else setFilterInside(val === 'true');
              }}
            >
              <option value="all">Wszystkie</option>
              <option value="true">W torze</option>
              <option value="false">Poza torem</option>
            </select>
          </div>
          <div className='table-scroll'>
            <table className="db-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>ID {sortField === 'id' ? (sortAsc ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort('latitude')} style={{ cursor: 'pointer' }}>Latitude {sortField === 'latitude' ? (sortAsc ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort('longitude')} style={{ cursor: 'pointer' }}>Longitude {sortField === 'longitude' ? (sortAsc ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort('isInsidePolygon')} style={{ cursor: 'pointer' }}>Tor {sortField === 'isInsidePolygon' ? (sortAsc ? '↑' : '↓') : ''}</th>
                  <th onClick={() => handleSort('exitTime')} style={{ cursor: 'pointer' }}>Exit Time {sortField === 'exitTime' ? (sortAsc ? '↑' : '↓') : ''}</th>
                </tr>
              </thead>
              <tbody>
                {dbPoints
                  .filter(p => filterInside === null || p.isInsidePolygon === filterInside)
                  .sort((a, b) => {
                    let aVal: number | string;
                    let bVal: number | string;

                    switch (sortField) {
                      case 'exitTime':
                        aVal = new Date(a.exitTime).getTime();
                        bVal = new Date(b.exitTime).getTime();
                        break;
                      case 'isInsidePolygon':
                        aVal = a.isInsidePolygon ? 1 : 0;
                        bVal = b.isInsidePolygon ? 1 : 0;
                        break;
                      case 'id':
                        aVal = a.id;
                        bVal = b.id;
                        break;
                      case 'latitude':
                        aVal = a.latitude;
                        bVal = b.latitude;
                        break;
                      case 'longitude':
                        aVal = a.longitude;
                        bVal = b.longitude;
                        break;
                      default:
                        aVal = 0;
                        bVal = 0;
                    }

                    if (aVal < bVal) return sortAsc ? -1 : 1;
                    if (aVal > bVal) return sortAsc ? 1 : -1;
                    return 0;
                  })
                  .map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.latitude}</td>
                      <td>{p.longitude}</td>
                      <td>{p.isInsidePolygon ? 'Tak' : 'Nie'}</td>
                      <td>{new Date(p.exitTime).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
