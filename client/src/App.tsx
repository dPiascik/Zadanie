import React from 'react';
import MapComponent from './components/MapComponent';
import './style/App.scss';


const App =() => {
  return (
    <div className="App">
      <h1>Open Layers App</h1>
      <MapComponent />
    </div>
  );
}

export default App;