import { Link, useLocation } from 'react-router-dom';
import '../styles/NavBar.css';

function NavBar({ darkMode, toggleDarkMode }) {
  const location = useLocation();
  
  return (
    <nav className={`navbar ${darkMode ? 'dark' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Erik's Tools
        </Link>
        
        <div className="navbar-menu">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            实时摄像头
          </Link>
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
            MPU6050数据
          </Link>
          <Link to="/ip-info" className={location.pathname === '/ip-info' ? 'active' : ''}>
            IP信息
          </Link>
          <Link to="/chatbot" className={location.pathname === '/chatbot' ? 'active' : ''}>
            AI助手
          </Link>
        </div>
        
        <button 
          className={`theme-toggle ${darkMode ? 'dark' : ''}`} 
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
        >
          {darkMode ? '🌙' : '☀️'}
        </button>
      </div>
    </nav>
  );
}

export default NavBar;
