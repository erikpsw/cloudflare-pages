import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Dashboard from './components/Dashboard'
import IPInfo from './components/IPInfo'
import CameraView from './components/CameraView'
import ChatBot from './components/ChatBot'
import './App.css'

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<CameraView />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ip-info" element={<IPInfo />} />
        </Routes>
      </main>
      
      <footer>
        <p>Made by Erik Pan</p>
      </footer>
    </div>
  )
}

export default App
