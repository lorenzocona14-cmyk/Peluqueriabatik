import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BatikLanding from './BatikLanding';
import AdminDashboard from './AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BatikLanding />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;