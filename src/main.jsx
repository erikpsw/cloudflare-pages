import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Load TensorFlow.js and BodyPix scripts
// const loadScripts = async () => {
//   const tfjs = document.createElement('script')
//   tfjs.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.2'
//   document.head.appendChild(tfjs)

//   return new Promise((resolve) => {
//     tfjs.onload = () => {
//       const bodyPix = document.createElement('script')
//       bodyPix.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.0'
//       document.head.appendChild(bodyPix)
      
//       bodyPix.onload = resolve
//     }
//   })
// }

// Load scripts then render the app
// loadScripts().then(() => {
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
// })
