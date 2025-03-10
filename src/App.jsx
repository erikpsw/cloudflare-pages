import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Dashboard from './components/Dashboard'
import IPInfo from './components/IPInfo'
import CameraView from './components/CameraView'
import './App.css'

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [ipInfo, setIpInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 切换暗黑模式
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // 获取IP信息
  useEffect(() => {
    const fetchIpInfo = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
          throw new Error('无法获取IP信息');
        }
        const data = await response.json();
        setIpInfo(data);
      } catch (err) {
        console.error('获取IP信息出错:', err);
        setError('无法获取IP信息');
      } finally {
        setLoading(false);
      }
    };
    
    fetchIpInfo();
  }, []);

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<CameraView />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ip-info" element={
            <div className="ip-content">
              {loading ? (
                <p className="loading">正在加载IP信息...</p>
              ) : error ? (
                <p className="error">{error}</p>
              ) : ipInfo ? (
                <div className="ip-details">
                  <p><strong>IP地址</strong> {ipInfo.ip}</p>
                  <p><strong>城市</strong> {ipInfo.city || '未知'}</p>
                  <p><strong>地区</strong> {ipInfo.region || '未知'}</p>
                  <p><strong>国家</strong> {ipInfo.country_name || '未知'}</p>
                  <p><strong>网络服务提供商</strong> {ipInfo.org || '未知'}</p>
                  <p><strong>纬度</strong> {ipInfo.latitude || '未知'}</p>
                  <p><strong>经度</strong> {ipInfo.longitude || '未知'}</p>
                </div>
              ) : (
                <p>没有可用的IP信息</p>
              )}
            </div>
          } />
        </Routes>
      </main>
      
      <footer>
        <p>Made by Erik Pan</p>
      </footer>
    </div>
  )
}

export default App
