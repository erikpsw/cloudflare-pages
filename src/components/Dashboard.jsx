import { useState, useEffect, useRef } from 'react'
import ReactApexChart from 'react-apexcharts'
import '../styles/Dashboard.css'

function Dashboard() {
  // Data states
  const [accelerometerData, setAccelerometerData] = useState({
    x: Array(30).fill(0),
    y: Array(30).fill(0),
    z: Array(30).fill(0)
  });
  
  const [gyroscopeData, setGyroscopeData] = useState({
    x: Array(30).fill(0),
    y: Array(30).fill(0),
    z: Array(30).fill(0)
  });
  
  const [temperature, setTemperature] = useState(Array(30).fill(0));
  const [currentValues, setCurrentValues] = useState({
    accel: { x: 0, y: 0, z: 0 },
    gyro: { x: 0, y: 0, z: 0 },
    temp: 0
  });
  
  // WebSocket connection states
  const [connected, setConnected] = useState(false);
  const [ipAddress, setIpAddress] = useState('192.168.31.227');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const webSocket = useRef(null);
  
  // Connect to ESP8266 WebSocket
  const connectToSensor = () => {
    if (!ipAddress) {
      setConnectionError('请输入IP地址');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError('');
    
    try {
      // Connect directly to port 81 as used in the ESP8266 code
      const wsUrl = `ws://${ipAddress}:81`;
      console.log(`Attempting to connect to ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setConnected(true);
        setIsConnecting(false);
        console.log(`WebSocket connected to ${wsUrl}`);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          updateSensorData(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionError('连接失败，请检查IP地址是否正确或ESP8266是否已启动');
        setIsConnecting(false);
        setConnected(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      };
      
      webSocket.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionError('连接失败: ' + error.message);
      setIsConnecting(false);
    }
  };
  
  // Disconnect WebSocket
  const disconnectFromSensor = () => {
    if (webSocket.current) {
      webSocket.current.close();
      webSocket.current = null;
      setConnected(false);
    }
  };
  
  // Clean up WebSocket on component unmount
  useEffect(() => {
    return () => {
      if (webSocket.current) {
        webSocket.current.close();
      }
    };
  }, []);
  
  // Update data with real sensor readings
  const updateSensorData = (data) => {
    // Update accelerometer data
    setAccelerometerData(prev => ({
      x: [...prev.x.slice(1), data.accel.x],
      y: [...prev.y.slice(1), data.accel.y],
      z: [...prev.z.slice(1), data.accel.z]
    }));
    
    // Update gyroscope data
    setGyroscopeData(prev => ({
      x: [...prev.x.slice(1), data.gyro.x],
      y: [...prev.y.slice(1), data.gyro.y],
      z: [...prev.z.slice(1), data.gyro.z]
    }));
    
    // Update temperature data
    setTemperature(prev => [...prev.slice(1), data.temp]);
    
    // Update current values
    setCurrentValues({
      accel: {
        x: data.accel.x.toFixed(2),
        y: data.accel.y.toFixed(2),
        z: data.accel.z.toFixed(2)
      },
      gyro: {
        x: data.gyro.x.toFixed(2),
        y: data.gyro.y.toFixed(2),
        z: data.gyro.z.toFixed(2)
      },
      temp: data.temp.toFixed(2)
    });
  };
  
  // Use simulated data when not connected to ESP8266
  useEffect(() => {
    let interval;
    
    if (!connected) {
      // Generate simulated data just like before
      interval = setInterval(() => {
        const newAccelX = Math.random() * 4 - 2;
        const newAccelY = Math.random() * 4 - 2;
        const newAccelZ = Math.random() * 4 - 2 + 9.8;
        
        const newGyroX = Math.random() * 500 - 250;
        const newGyroY = Math.random() * 500 - 250; // This line was missing
        const newGyroZ = Math.random() * 500 - 250;
        
        const newTemp = Math.random() * 10 + 20;
        
        setAccelerometerData(prev => ({
          x: [...prev.x.slice(1), newAccelX],
          y: [...prev.y.slice(1), newAccelY],
          z: [...prev.z.slice(1), newAccelZ]
        }));
        
        setGyroscopeData(prev => ({
          x: [...prev.x.slice(1), newGyroX],
          y: [...prev.y.slice(1), newGyroY],
          z: [...prev.z.slice(1), newGyroZ]
        }));
        
        setTemperature(prev => [...prev.slice(1), newTemp]);
        
        setCurrentValues({
          accel: {
            x: newAccelX.toFixed(2),
            y: newAccelY.toFixed(2),
            z: newAccelZ.toFixed(2)
          },
          gyro: {
            x: newGyroX.toFixed(2),
            y: newGyroY.toFixed(2),
            z: newGyroZ.toFixed(2)
          },
          temp: newTemp.toFixed(2)
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [connected]);
  
  // Chart configurations
  const accelerometerChartOptions = {
    chart: {
      id: 'accelerometer-chart',
      type: 'line',
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 2000
        }
      },
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    colors: ['#4a69bd', '#6ab04c', '#eb3b5a'],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    title: {
      text: '加速度计数据 (m/s²)',
      align: 'left'
    },
    markers: {
      size: 0
    },
    xaxis: {
      categories: [...Array(30).keys()],
      labels: {
        show: false
      }
    },
    yaxis: {
      min: -15,
      max: 15,
      labels: {
        formatter: function(val) {
          return val.toFixed(1); // 加速度值保留1位小数
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right'
    }
  };
  
  // 陀螺仪图表配置
  const gyroscopeChartOptions = {
    chart: {
      id: 'gyroscope-chart',
      type: 'line',
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 2000
        }
      },
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    colors: ['#f9ca24', '#22a6b3', '#be2edd'],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    title: {
      text: '陀螺仪数据 (°/s)',
      align: 'left'
    },
    markers: {
      size: 0
    },
    xaxis: {
      categories: [...Array(30).keys()],
      labels: {
        show: false
      }
    },
    yaxis: {
      min: -300,
      max: 300,
      labels: {
        formatter: function(val) {
          return val.toFixed(0); // 陀螺仪值显示为整数，不保留小数
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right'
    }
  };
  
  // 温度图表配置
  const temperatureChartOptions = {
    chart: {
      id: 'temperature-chart',
      type: 'line',
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 2000
        }
      },
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    colors: ['#ff6b6b'],
    stroke: {
      curve: 'smooth',
      width: 4
    },
    title: {
      text: '温度 (°C)',
      align: 'left'
    },
    markers: {
      size: 0
    },
    xaxis: {
      categories: [...Array(30).keys()],
      labels: {
        show: false
      }
    },
    yaxis: {
      min: 15,
      max: 35,
      labels: {
        formatter: function(val) {
          return val.toFixed(1);
        }
      }
    }
  };
  
  return (
    <div className="dashboard">
      <h2 className="dashboard-title">MPU6050 传感器实时数据</h2>
      
      {/* ESP8266 Connection Controls */}
      <div className="connection-panel">
        <div className="connection-form">
          <input 
            type="text" 
            placeholder="输入ESP8266的IP地址" 
            value={ipAddress} 
            onChange={(e) => setIpAddress(e.target.value)}
            disabled={connected || isConnecting}
          />
          
          {!connected ? (
            <button 
              className={`connect-button ${isConnecting ? 'connecting' : ''}`} 
              onClick={connectToSensor}
              disabled={isConnecting}
            >
              {isConnecting ? '连接中...' : '连接传感器'}
            </button>
          ) : (
            <button className="disconnect-button" onClick={disconnectFromSensor}>
              断开连接
            </button>
          )}
        </div>
        
        {connectionError && <p className="connection-error">{connectionError}</p>}
        
        <div className="connection-status">
          状态: <span className={connected ? 'status-connected' : 'status-disconnected'}>
            {connected ? '已连接到传感器' : '未连接 (使用模拟数据)'}
          </span>
        </div>
      </div>
      
      {/* Sensor cards and charts */}
      <div className="dashboard-cards">
        <div className="sensor-card">
          <h3>当前加速度 (m/s²)</h3>
          <div className="sensor-values">
            <div className="sensor-value">
              <span className="axis x-axis">X:</span> {currentValues.accel.x}
            </div>
            <div className="sensor-value">
              <span className="axis y-axis">Y:</span> {currentValues.accel.y}
            </div>
            <div className="sensor-value">
              <span className="axis z-axis">Z:</span> {currentValues.accel.z}
            </div>
          </div>
        </div>
        
        <div className="sensor-card">
          <h3>当前角速度 (°/s)</h3>
          <div className="sensor-values">
            <div className="sensor-value">
              <span className="axis x-axis">X:</span> {currentValues.gyro.x}
            </div>
            <div className="sensor-value">
              <span className="axis y-axis">Y:</span> {currentValues.gyro.y}
            </div>
            <div className="sensor-value">
              <span className="axis z-axis">Z:</span> {currentValues.gyro.z}
            </div>
          </div>
        </div>
        
        <div className="sensor-card">
          <h3>当前温度 (°C)</h3>
          <div className="sensor-values">
            <div className="sensor-value temp">
              {currentValues.temp}°C
            </div>
          </div>
        </div>
      </div>
      
      <div className="charts-container">
        <div className="chart">
          <ReactApexChart 
            options={accelerometerChartOptions} 
            series={[
              { name: 'X轴', data: accelerometerData.x },
              { name: 'Y轴', data: accelerometerData.y },
              { name: 'Z轴', data: accelerometerData.z }
            ]} 
            type="line" 
            height={300} 
          />
        </div>
        
        <div className="chart">
          <ReactApexChart 
            options={gyroscopeChartOptions} 
            series={[
              { name: 'X轴', data: gyroscopeData.x },
              { name: 'Y轴', data: gyroscopeData.y },
              { name: 'Z轴', data: gyroscopeData.z }
            ]} 
            type="line" 
            height={300} 
          />
        </div>
        
        <div className="chart">
          <ReactApexChart 
            options={temperatureChartOptions} 
            series={[
              { name: '温度', data: temperature }
            ]} 
            type="line" 
            height={200} 
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;