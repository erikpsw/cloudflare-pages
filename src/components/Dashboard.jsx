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
  const [ipAddress, setIpAddress] = useState('192.168.137.145');
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
      const wsUrl = `ws://${ipAddress}:81`;
      console.log(`正在尝试连接到 ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      // 添加更多连接状态日志
      console.log('WebSocket当前状态:', ws.readyState);
      
      ws.onopen = () => {
        console.log('WebSocket连接已建立, readyState:', ws.readyState);
        setConnected(true);
        setIsConnecting(false);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket错误详情:', {
          readyState: ws.readyState,
          error: error
        });
        setConnectionError('连接失败，请检查:\n1. ESP8266 WebSocket服务器是否在运行\n2. 端口81是否开放\n3. 是否有防火墙阻止');
        setIsConnecting(false);
        setConnected(false);
      };
      
      // 添加连接超时
      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setConnectionError('连接超时，请检查网络设置和ESP8266状态');
          setIsConnecting(false);
        }
      }, 5000);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          updateSensorData(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      };
      
      webSocket.current = ws;
    } catch (error) {
      console.error('创建WebSocket时出错:', error);
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
  
  // Motor control states
  const [motorSpeeds, setMotorSpeeds] = useState({ a: 0, b: 0 });
  const [showDetailedCharts, setShowDetailedCharts] = useState(false);
  const [baseSpeed, setBaseSpeed] = useState(200);

  // Send motor control commands
  const sendMotorCommand = (motorA, motorB) => {
    if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
      const command = {
        motors: {
          a: motorA,
          b: motorB
        }
      };
      webSocket.current.send(JSON.stringify(command));
    }
  };

  // Motor control functions
  const controlMotors = (action) => {
    switch (action) {
      case 'forward':
        setMotorSpeeds({ a: baseSpeed, b: baseSpeed });
        sendMotorCommand(baseSpeed, baseSpeed);
        break;
      case 'backward':
        setMotorSpeeds({ a: -baseSpeed, b: -baseSpeed });
        sendMotorCommand(-baseSpeed, -baseSpeed);
        break;
      case 'left':
        setMotorSpeeds({ a: -baseSpeed, b: baseSpeed });
        sendMotorCommand(-baseSpeed, baseSpeed);
        break;
      case 'right':
        setMotorSpeeds({ a: baseSpeed, b: -baseSpeed });
        sendMotorCommand(baseSpeed, -baseSpeed);
        break;
      case 'stop':
        setMotorSpeeds({ a: 0, b: 0 });
        sendMotorCommand(0, 0);
        break;
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
      
      {/* Chart Toggle Switch */}
      <div className="chart-control center">
        <label>传感器数据图表</label>
        <label className="switch">
          <input
            type="checkbox"
            checked={showDetailedCharts}
            onChange={(e) => setShowDetailedCharts(e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      {/* Motor Control Panel */}
      <div className="motor-control-panel">
        <h3>电机控制</h3>
        <div className="speed-controls">
          <div className="speed-control">
            <label>电机 A 速度</label>
            <input
              type="range"
              min="-255"
              max="255"
              value={motorSpeeds.a}
              onChange={(e) => {
                const newSpeed = parseInt(e.target.value);
                setMotorSpeeds(prev => ({ ...prev, a: newSpeed }));
                sendMotorCommand(newSpeed, motorSpeeds.b);
              }}
              disabled={!connected}
            />
            <div className="speed-value">{motorSpeeds.a}</div>
          </div>
          <div className="speed-control">
            <label>电机 B 速度</label>
            <input
              type="range"
              min="-255"
              max="255"
              value={motorSpeeds.b}
              onChange={(e) => {
                const newSpeed = parseInt(e.target.value);
                setMotorSpeeds(prev => ({ ...prev, b: newSpeed }));
                sendMotorCommand(motorSpeeds.a, newSpeed);
              }}
              disabled={!connected}
            />
            <div className="speed-value">{motorSpeeds.b}</div>
          </div>
        </div>

        <div className="motor-controls">
          <button 
            onClick={() => controlMotors('forward')}
            disabled={!connected}
            className="control-button forward"
          >
            前进
          </button>
          <div className="motor-controls-row">
            <button 
              onClick={() => controlMotors('left')}
              disabled={!connected}
              className="control-button left"
            >
              左转
            </button>
            <button 
              onClick={() => controlMotors('stop')}
              disabled={!connected}
              className="control-button stop"
            >
              停止
            </button>
            <button 
              onClick={() => controlMotors('right')}
              disabled={!connected}
              className="control-button right"
            >
              右转
            </button>
          </div>
          <button 
            onClick={() => controlMotors('backward')}
            disabled={!connected}
            className="control-button backward"
          >
            后退
          </button>
        </div>
        <div className="motor-speeds">
          <div>电机A: {motorSpeeds.a}</div>
          <div>电机B: {motorSpeeds.b}</div>
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
        {/* All charts are controlled by showDetailedCharts */}
        {showDetailedCharts && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;