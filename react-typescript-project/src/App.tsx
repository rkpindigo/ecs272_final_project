import React, { useEffect, useState } from 'react';
import './App.css';
import RadarChart from './components/radarChart';
import { load_oscars } from './data/load_oscars';
import { OscarsRow } from './types';
import { Slides } from './components/Slides';

function App() {
  const [data, set_data] = useState<OscarsRow[] | null>(null);
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    // Load data once on mount.
    load_oscars()
      .then((rows) => set_data(rows))
      .catch(() => set_error('Failed to load data'));
  }, []);

  return (
    <div className="App">
      <Slides data={data} error={error} />
      <div className="radar-block">
        <RadarChart />
      </div>
    </div>
  );
}

export default App;
