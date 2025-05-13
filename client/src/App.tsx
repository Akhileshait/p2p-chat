import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import VideoChat from './components/VideoChat';
import './App.css';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [inCall, setInCall] = useState<boolean>(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState<boolean>(false);

  useEffect(() => {
    // Connect to server
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Set up event listeners
    newSocket.on('connect', () => {
      setIsConnected(true);
      if (newSocket.id) {
        setCurrentUserId(newSocket.id);
        console.log('Connected to socket server with ID:', newSocket.id);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setCurrentUserId('');
      console.log('Disconnected from socket server');
    });

    newSocket.on('random-user-found', ({ userId }) => {
      console.log('Random user found:', userId);
      setPartnerId(userId);
      setIsSearching(false);
    });

    newSocket.on('no-user-available', () => {
      setIsSearching(false);
      setError('No other users are available right now. Try again later.');
    });

    newSocket.on('partner-left', () => {
      setPartnerId(null);
      setInCall(false);
      setError('Your partner left the chat.');
    });

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const findRandomPartner = () => {
    if (!socket) return;
    
    setError(null);
    setIsSearching(true);
    socket.emit('find-random-user');
  };

  const skipCurrentPartner = () => {
    if (!socket || !partnerId) return;
    
    socket.emit('next-partner', { currentPartnerId: partnerId });
    setPartnerId(null);
    setInCall(false);
    setIsSearching(true);
  };

  const endChat = () => {
    if (!socket || !partnerId) return;
    
    socket.emit('call-ended', { targetId: partnerId });
    setPartnerId(null);
    setInCall(false);
  };

  return (
    <div className="app-container">
      <header>
        <h1><i className="fas fa-video"></i> Random Video Chat</h1>
        <div className="header-right">
          <button 
            className="about-btn"
            onClick={() => setShowAbout(true)}
          >
            <i className="fas fa-info-circle"></i> About
          </button>
          <p className={isConnected ? 'connected' : 'disconnected'}>
            <i className={isConnected ? 'fas fa-wifi' : 'fas fa-wifi-slash'}></i>
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </header>
      
      <main>
        {!partnerId && !isSearching && (
          <div className="welcome-screen">
            <h2>Welcome to Random Video Chat</h2>
            <p>Connect with random people worldwide instantly.</p>
            <button 
              className="start-btn"
              onClick={findRandomPartner}
              disabled={!isConnected}
            >
              <i className="fas fa-video"></i> Start Chatting
            </button>
          </div>
        )}
        
        {isSearching && (
          <div className="searching-screen">
            <h2><i className="fas fa-search"></i> Searching for a partner...</h2>
            <div className="loader"></div>
            <button 
              className="cancel-btn"
              onClick={() => setIsSearching(false)}
            >
              <i className="fas fa-times"></i> Cancel
            </button>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <p><i className="fas fa-exclamation-circle"></i> {error}</p>
            <button 
              onClick={() => setError(null)}
              className="close-btn"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        
        {partnerId && socket && (
          <VideoChat
            socket={socket}
            currentUserId={currentUserId}
            partnerId={partnerId}
            onCallStart={() => setInCall(true)}
            onCallEnd={endChat}
            onSkipPartner={skipCurrentPartner}
          />
        )}

        {showAbout && (
          <div className="modal-overlay" onClick={() => setShowAbout(false)}>
            <div className="about-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><i className="fas fa-info-circle"></i> About Random Video Chat</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowAbout(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-content">
                <h3>Welcome to Random Video Chat!</h3>
                <p>This application allows you to connect with random strangers from around the world through video chat.</p>
                
                <h3>Features:</h3>
                <ul>
                  <li><i className="fas fa-video"></i> Real-time video chat with random users</li>
                  <li><i className="fas fa-comments"></i> Text messaging alongside video chat</li>
                  <li><i className="fas fa-mobile-alt"></i> Responsive design for desktop and mobile</li>
                  <li><i className="fas fa-microphone"></i> Audio controls (mute/unmute)</li>
                  <li><i className="fas fa-video-slash"></i> Video controls (enable/disable)</li>
                  <li><i className="fas fa-forward"></i> Skip to the next partner</li>
                  <li><i className="fas fa-keyboard"></i> Typing indicators</li>
                </ul>
                
                <h3>How It Works:</h3>
                <p>1. Click "Start Chatting" to be matched with a random user</p>
                <p>2. Allow camera and microphone permissions when prompted</p>
                <p>3. Interact with your chat partner via video and text</p>
                <p>4. Use the controls to customize your experience</p>
                <p>5. Click "Skip" to find a new partner or "End" to stop chatting</p>
                
                <h3>Privacy & Safety:</h3>
                <p>Please be respectful of others. Inappropriate behavior may result in being banned from the service.</p>
                <p>No conversations or videos are recorded or stored.</p>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer>
        <div className="footer-content">
          <p>© {new Date().getFullYear()} Random Video Chat. All rights reserved.</p>
          <div className="footer-links">
            <a href="#" onClick={(e) => {e.preventDefault(); setShowAbout(true);}} title="About"><i className="fas fa-info-circle"></i></a>
            <a href="#" title="Terms"><i className="fas fa-file-contract"></i></a>
            <a href="#" title="Privacy"><i className="fas fa-user-shield"></i></a>
            <a href="#" title="Help"><i className="fas fa-question-circle"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
