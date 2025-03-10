import { useEffect, useRef, useState } from 'react';
import '../styles/CameraView.css';

const CameraView = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [net, setNet] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [effect, setEffect] = useState('none'); // 'none', 'blur', 'replace'
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const animationRef = useRef();
  
  // 添加处理状态标记，避免重复处理
  const isProcessingRef = useRef(false);
  // 添加当前应用的效果状态，用于确保效果转换正确
  const currentEffectRef = useRef('none');
  // 添加节流计时器
  const throttleTimerRef = useRef(null);
  
  // Model parameters
  const modelConfig = {
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2
  };

  // Effect parameters
  const backgroundBlurAmount = 5;
  const edgeBlurAmount = 3;

  // Load BodyPix model on component mount
  useEffect(() => {
    const loadModel = async () => {
      if (!window.bodyPix) {
        setTimeout(loadModel, 200);
        return;
      }
      
      try {
        setLoading(true);
        const loadedNet = await window.bodyPix.load(modelConfig);
        setNet(loadedNet);
        setLoading(false);
        console.log('BodyPix model loaded');
      } catch (err) {
        console.error('Failed to load BodyPix model:', err);
        setLoading(false);
      }
    };

    loadModel();

    // Clean up animation frame on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Initialize camera when component mounts
  useEffect(() => {
    const startCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // Request specific dimensions for more reliability
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 }
            }
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().then(() => {
                setIsOpen(true);
                console.log(`Video dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
                
                // Check if we have valid dimensions and set videoReady to true
                if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                  setVideoReady(true);
                }
              });
            };
          }
        } catch (err) {
          console.error('Error accessing camera:', err);
        }
      } else {
        console.error('getUserMedia not supported in this browser');
      }
    };

    startCamera();

    return () => {
      // Clean up camera stream on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Add more event handlers to detect when video is ready
  useEffect(() => {
    const handleVideoReady = () => {
      if (videoRef.current && 
          videoRef.current.videoWidth > 0 && 
          videoRef.current.videoHeight > 0) {
        
        console.log(`Video ready detected with dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
        
        // Set canvas size explicitly to match video dimensions
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
        
        setVideoReady(true);
      }
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      // Try multiple events to catch when video is ready
      videoElement.addEventListener('loadeddata', handleVideoReady);
      videoElement.addEventListener('loadedmetadata', handleVideoReady);
      videoElement.addEventListener('canplay', handleVideoReady);
      videoElement.addEventListener('playing', handleVideoReady);
      
      // Add a fallback timeout to force videoReady if the events don't fire
      const readyTimeout = setTimeout(() => {
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          console.log('Setting videoReady via timeout fallback');
          setVideoReady(true);
        }
      }, 3000); // 3 seconds fallback
      
      return () => {
        videoElement.removeEventListener('loadeddata', handleVideoReady);
        videoElement.removeEventListener('loadedmetadata', handleVideoReady);
        videoElement.removeEventListener('canplay', handleVideoReady);
        videoElement.removeEventListener('playing', handleVideoReady);
        clearTimeout(readyTimeout);
      };
    }
  }, [isOpen]); // Run this effect when isOpen changes

  // Add video loadeddata event handler
  useEffect(() => {
    const handleVideoLoaded = () => {
      if (videoRef.current && 
          videoRef.current.videoWidth > 0 && 
          videoRef.current.videoHeight > 0) {
        
        console.log(`Video ready with dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
        
        // Set canvas size explicitly to match video dimensions
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
        
        setVideoReady(true);
      }
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('loadeddata', handleVideoLoaded);
    }

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('loadeddata', handleVideoLoaded);
      }
    };
  }, []);

  // 改进效果切换逻辑
  useEffect(() => {
    // 保证完全停止之前的处理
    const cleanupPreviousEffect = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // 重置处理状态
      isProcessingRef.current = false;
      
      // 清除任何可能的节流定时器
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      
      // 清除画布以避免残留效果
      clearCanvas();
    };

    // 清理之前的效果
    cleanupPreviousEffect();
    
    // 只有在视频准备好且模型加载完成后才应用效果
    if (!videoReady || (effect !== 'none' && !net)) {
      return;
    }
    
    // 更新当前效果引用
    currentEffectRef.current = effect;
    
    if (effect === 'none') {
      clearCanvas();
    } else if (effect === 'blur') {
      // 使用setTimeout确保DOM更新和之前的操作完全结束
      setTimeout(() => {
        if (currentEffectRef.current === 'blur') {
          blurBackground();
        }
      }, 50);
    } else if (effect === 'replace') {
      loadBackgroundImage();
    }
    
    return cleanupPreviousEffect;
  }, [effect, net, videoReady]);

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const loadBackgroundImage = () => {
    // 清理之前的处理
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Try a more reliable image source with proper CORS headers
    const img = new Image();
    img.crossOrigin = "anonymous"; // Set this before the src
    
    // Use a more reliable image source - Unsplash source API with specific dimensions
    img.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80';
    
    // Provide more detailed error handling
    img.onload = () => {
      console.log("Background image loaded successfully");
      setBackgroundImage(img);
      // 确认效果没有改变再启动处理
      if (currentEffectRef.current === 'replace') {
        replaceBackground();
      }
    };
    
    img.onerror = () => {
      console.error("Error loading background image, trying fallback...");
      
      // Try a fallback image
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = "anonymous";
      // Picsum Photos is another reliable source for test images with CORS headers
      fallbackImg.src = 'https://picsum.photos/800/600';
      
      fallbackImg.onload = () => {
        console.log("Fallback image loaded successfully");
        setBackgroundImage(fallbackImg);
        // 确认效果没有改变再启动处理
        if (currentEffectRef.current === 'replace') {
          replaceBackground();
        }
      };
      
      fallbackImg.onerror = () => {
        console.error("Fallback image also failed, switching to blur effect");
        setEffect('blur');
      };
    };
  };

  // 改进背景模糊处理函数，添加节流和状态检查
  const blurBackground = async () => {
    // 如果已经在处理或效果已更改，则跳过
    if (isProcessingRef.current || currentEffectRef.current !== 'blur' || 
        !isOpen || !net || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    try {
      // 标记开始处理
      isProcessingRef.current = true;
      
      // Ensure video has dimensions before proceeding
      if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        console.log("Video dimensions not available yet, retrying...");
        isProcessingRef.current = false;
        animationRef.current = requestAnimationFrame(blurBackground);
        return;
      }
      
      // Double check that canvas dimensions match video dimensions
      if (canvasRef.current.width !== videoRef.current.videoWidth ||
          canvasRef.current.height !== videoRef.current.videoHeight) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        console.log(`Adjusted canvas to: ${canvasRef.current.width}x${canvasRef.current.height}`);
      }
      
      // Create a temporary canvas with specific dimensions for processing
      // This helps avoid the cropSize error
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoRef.current.videoWidth;
      tempCanvas.height = videoRef.current.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(videoRef.current, 0, 0);
      
      const segmentation = await net.segmentPerson(tempCanvas);
      
      // 再次检查效果是否仍然是模糊
      if (currentEffectRef.current === 'blur' && canvasRef.current) {
        window.bodyPix.drawBokehEffect(
          canvasRef.current,
          tempCanvas, // Use the temp canvas instead of video directly
          segmentation,
          backgroundBlurAmount,
          edgeBlurAmount,
          false
        );
      }
      
      // 处理完成，重置标志
      isProcessingRef.current = false;
      
      // 使用节流确保不会过于频繁地处理帧
      if (currentEffectRef.current === 'blur') {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          animationRef.current = requestAnimationFrame(blurBackground);
        }, 20); // 60fps ≈ 16.7ms, 加一点余量
      }
    } catch (err) {
      console.error('Error in blur processing:', err);
      // 重置处理状态
      isProcessingRef.current = false;
      
      // Wait a bit longer before retrying on error
      if (currentEffectRef.current === 'blur') {
        setTimeout(() => {
          animationRef.current = requestAnimationFrame(blurBackground);
        }, 500);
      }
    }
  };

  // 改进背景替换处理函数，添加节流和状态检查
  const replaceBackground = async () => {
    // 如果已经在处理或效果已更改，则跳过
    if (isProcessingRef.current || currentEffectRef.current !== 'replace' || 
        !isOpen || !net || !videoRef.current || !canvasRef.current || !backgroundImage) {
      return;
    }
    
    try {
      // 标记开始处理
      isProcessingRef.current = true;
      
      // Ensure video has dimensions before proceeding
      if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        console.log("Video dimensions not available yet, retrying...");
        isProcessingRef.current = false;
        animationRef.current = requestAnimationFrame(replaceBackground);
        return;
      }
      
      // Double check that canvas dimensions match video dimensions
      if (canvasRef.current.width !== videoRef.current.videoWidth ||
          canvasRef.current.height !== videoRef.current.videoHeight) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        console.log(`Adjusted canvas to: ${canvasRef.current.width}x${canvasRef.current.height}`);
      }
      
      // Create a temporary canvas with specific dimensions for processing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoRef.current.videoWidth;
      tempCanvas.height = videoRef.current.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(videoRef.current, 0, 0);
      
      const segmentation = await net.segmentPerson(tempCanvas);
      
      const foregroundColor = { r: 0, g: 0, b: 0, a: 0 }; // Transparent
      const backgroundColor = { r: 0, g: 0, b: 0, a: 255 }; // Black
      
      const backgroundDarkeningMask = window.bodyPix.toMask(
        segmentation,
        foregroundColor,
        backgroundColor
      );
      
      // 再次检查效果是否仍然是替换
      if (currentEffectRef.current === 'replace' && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // 清除之前的内容
        ctx.putImageData(backgroundDarkeningMask, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(backgroundImage, 0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.globalCompositeOperation = 'destination-over';
        ctx.drawImage(tempCanvas, 0, 0); // Use temp canvas instead of video directly
        ctx.globalCompositeOperation = 'source-over'; // Reset
      }
      
      // 处理完成，重置标志
      isProcessingRef.current = false;
      
      // 使用节流确保不会过于频繁地处理帧
      if (currentEffectRef.current === 'replace') {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          animationRef.current = requestAnimationFrame(replaceBackground);
        }, 20); // 60fps ≈ 16.7ms, 加一点余量
      }
    } catch (err) {
      console.error('Error in background replacement:', err);
      // 重置处理状态
      isProcessingRef.current = false;
      
      // Wait a bit longer before retrying on error
      if (currentEffectRef.current === 'replace') {
        setTimeout(() => {
          animationRef.current = requestAnimationFrame(replaceBackground);
        }, 500);
      }
    }
  };

  // 添加防抖效果切换函数
  const handleEffectChange = (newEffect) => {
    // 忽略相同效果的重复切换
    if (newEffect === effect) return;
    
    // 清理之前的处理
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // 重置处理状态
    isProcessingRef.current = false;
    
    // 设置新效果
    setEffect(newEffect);
  };

  return (
    <div className="camera-container">
      <h2>视频背景处理</h2>
      
      {loading ? (
        <div className="loading-container">
          <p>正在加载模型，请稍候...</p>
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          <div className="video-wrapper">
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              width="640"
              height="480"
              style={{ display: effect === 'none' ? 'block' : 'none' }}
              onPlay={() => {
                // Additional check when video starts playing
                if (videoRef.current && 
                    videoRef.current.videoWidth > 0 && 
                    videoRef.current.videoHeight > 0) {
                  setVideoReady(true);
                }
              }}
            />
            <canvas 
              ref={canvasRef}
              width="640"
              height="480"
              style={{ display: effect !== 'none' ? 'block' : 'none' }}
            />
          </div>
          
          <div className="controls">
            <div className="control-group">
              <h3>效果</h3>
              <div className="effect-buttons">
                <button 
                  className={effect === 'none' ? 'active' : ''} 
                  onClick={() => handleEffectChange('none')}
                >
                  原始视频
                </button>
                <button 
                  className={effect === 'blur' ? 'active' : ''} 
                  onClick={() => handleEffectChange('blur')}
                  disabled={!videoReady}
                >
                  背景模糊
                </button>
                <button 
                  className={effect === 'replace' ? 'active' : ''} 
                  onClick={() => handleEffectChange('replace')}
                  disabled={!videoReady}
                >
                  背景替换
                </button>
              </div>
            </div>
          </div>
          
          <div className="info">
            <p>此功能使用 TensorFlow.js 和 BodyPix 模型在浏览器中实时处理视频背景。所有处理都在您的设备上进行，不会上传到服务器。</p>
            {!videoReady && isOpen && (
              <p className="warning">正在初始化摄像头，请稍候...<button onClick={() => setVideoReady(true)}>手动继续</button></p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CameraView;
