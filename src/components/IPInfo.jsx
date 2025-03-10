import { useState, useEffect } from 'react'
import '../styles/IPInfo.css'

function IPInfo() {
  const [ipInfo, setIpInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    <div className="ip-page">
      <h2 className="ip-title">IP地址信息</h2>

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
    </div>
  )
}

export default IPInfo
