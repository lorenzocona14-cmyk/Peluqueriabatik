import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BatikLanding from './BatikLanding';
import Dashboard from './Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BatikLanding />} />
        <Route path="/admin" element={<Dashboard salonName="Peluquería Atencia" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;