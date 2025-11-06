import VectorSource from "ol/source/Vector";
import React, { ChangeEvent, Dispatch } from "react";

interface Props {
  onLoadGeoJSON: (file: File, delay: number) => void
  delay: number
  setDelay: Dispatch<React.SetStateAction<number>>
  vectorSource: VectorSource
  startInterval: () => void
  pauseInterval: () => void
}

export const MapControls = ({ onLoadGeoJSON, delay, vectorSource, setDelay, startInterval, pauseInterval }: Props) => {

  const handleDelayChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newDelay = parseInt(e.currentTarget.value, 10);
    if (!isNaN(newDelay)) {
      pauseInterval();
      setDelay(newDelay);
      startInterval();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      onLoadGeoJSON(file, delay);
    }
  };

  return (
    <div>
      <div className="inputms">
        <input
          type="range"
          min={1}
          max={1000}
          value={delay}
          onChange={handleDelayChange}
        />
        <input
          type="number"
          min={1}
          max={1000}
          value={delay}
          onChange={handleDelayChange}
        />
        <div className="delay-value">
          {delay} ms
        </div>
      </div>
      <div>
        <input type="file" className="fileStyle" accept=".json" onChange={handleFileChange} />
      </div>
    </div>
  );
};