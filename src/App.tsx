
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Dashboard from './pages/Dashboard';
import SpeechTherapy from './pages/SpeechTherapy';
import CognitiveTherapy from './pages/CognitiveTherapy';
import MotorTherapy from './pages/MotorTherapy';

function App() {
  return (
    <Router>
      <div className="app-container">
        <NavBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/speech" element={<SpeechTherapy />} />
            <Route path="/cognitive" element={<CognitiveTherapy />} />
            <Route path="/motor" element={<MotorTherapy />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
