import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import ChatBox from './ChatBox';
import './VideoChat.css';

interface VideoChatProps {
  socket: Socket;
  currentUserId: string;
  partnerId: string;
  onCallStart: () => void;
  onCallEnd: () => void;
  onSkipPartner: () => void;
}

const VideoChat: React.FC<VideoChatProps> = ({
  socket,
  currentUserId,
  partnerId,
  onCallStart,
  onCallEnd,
  onSkipPartner
}) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallStarted, setIsCallStarted] = useState<boolean>(false);
  const [isInitiator, setIsInitiator] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  
  // Get local media stream
  useEffect(() => {
    const getMediaStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initiate call if we are the initiator (first to get media)
        if (currentUserId < partnerId) {
          setIsInitiator(true);
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Could not access camera or microphone. Please check permissions.');
      }
    };
    
    getMediaStream();
    
    return () => {
      // Clean up local stream when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentUserId, partnerId]);
  
  // Set up WebRTC connection and socket events
  useEffect(() => {
    if (!socket || !localStream) return;
    
    // Set up socket event listeners for signaling
    socket.on('call-received', async ({ from, offer }) => {
      if (from === partnerId) {
        try {
          console.log('Received call offer from partner', from);
          // Create peer as non-initiator
          const peer = new Peer({ 
            initiator: false, 
            stream: localStream,
            trickle: true // Enable trickle ICE
          });
          
          // Set peer event handlers
          peer.on('signal', (data) => {
            console.log('Generated answer signal', data.type);
            socket.emit('call-accepted', {
              targetId: partnerId,
              answer: data
            });
          });
          
          peer.on('stream', (stream) => {
            console.log('Received remote stream');
            setRemoteStream(stream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
            }
            setIsCallStarted(true);
            onCallStart();
          });
          
          peer.on('error', (err) => {
            console.error('Peer error:', err);
            setError('Connection error. Please try again.');
          });
          
          peer.on('connect', () => {
            console.log('Peer connection established (non-initiator)');
          });
          
          // Accept the offer
          console.log('Signaling with offer data');
          peer.signal(offer);
          peerRef.current = peer;
        } catch (err) {
          console.error('Error creating peer as non-initiator:', err);
          setError('Failed to establish connection. Please try again.');
        }
      }
    });
    
    socket.on('call-accepted', ({ from, answer }) => {
      if (from === partnerId && peerRef.current) {
        console.log('Call accepted, received answer signal', answer.type);
        peerRef.current.signal(answer);
      }
    });
    
    socket.on('ice-candidate', ({ from, candidate }) => {
      if (from === partnerId && peerRef.current) {
        console.log('Received ICE candidate from partner', candidate);
        peerRef.current.signal(candidate);
      }
    });
    
    socket.on('call-ended', ({ from }) => {
      if (from === partnerId) {
        endCall();
      }
    });
    
    // Clean up on unmount
    return () => {
      socket.off('call-received');
      socket.off('call-accepted');
      socket.off('ice-candidate');
      socket.off('call-ended');
      
      // Close peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [socket, localStream, partnerId, onCallStart]);
  
  // Initiate call if we are the initiator
  useEffect(() => {
    if (isInitiator && localStream && socket) {
      try {
        console.log('Creating peer as initiator');
        // Create peer as initiator
        const peer = new Peer({ 
          initiator: true, 
          stream: localStream,
          trickle: true // Enable trickle ICE
        });
        
        // Set peer event handlers
        peer.on('signal', (data) => {
          console.log('Generated signal', data.type || 'ICE candidate');
          
          if (data.type === 'offer') {
            socket.emit('call-user', {
              targetId: partnerId,
              offer: data
            });
          } else if (data.type === 'answer') {
            socket.emit('call-accepted', {
              targetId: partnerId,
              answer: data
            });
          } else if ('candidate' in data) {
            socket.emit('ice-candidate', {
              targetId: partnerId,
              candidate: data
            });
          }
        });
        
        peer.on('stream', (stream) => {
          console.log('Received remote stream');
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          setIsCallStarted(true);
          onCallStart();
        });
        
        peer.on('error', (err) => {
          console.error('Peer error:', err);
          setError('Connection error. Please try again.');
        });
        
        peer.on('connect', () => {
          console.log('Peer connection established (initiator)');
        });
        
        peerRef.current = peer;
      } catch (err) {
        console.error('Error creating peer as initiator:', err);
        setError('Failed to establish connection. Please try again.');
      }
    }
  }, [isInitiator, localStream, socket, partnerId, onCallStart]);
  
  // Reconnection retry logic
  useEffect(() => {
    // If no remote stream after 10 seconds, try to reconnect (up to 3 times)
    if (isInitiator && localStream && !remoteStream && connectionAttempts < 3) {
      const timer = setTimeout(() => {
        console.log(`Connection attempt ${connectionAttempts + 1}: Retrying connection...`);
        
        // Clean up existing peer
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }
        
        // Increment connection attempts
        setConnectionAttempts(prev => prev + 1);
        
        // Create a new peer connection
        const peer = new Peer({
          initiator: true,
          stream: localStream,
          trickle: true
        });
        
        peer.on('signal', (data) => {
          if (data.type === 'offer') {
            socket.emit('call-user', {
              targetId: partnerId,
              offer: data
            });
          } else if ('candidate' in data) {
            socket.emit('ice-candidate', {
              targetId: partnerId,
              candidate: data
            });
          }
        });
        
        peer.on('stream', (stream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          setIsCallStarted(true);
          onCallStart();
        });
        
        peer.on('error', (err) => {
          console.error('Peer error:', err);
        });
        
        peerRef.current = peer;
      }, 10000); // 10 seconds timeout
      
      return () => clearTimeout(timer);
    }
  }, [isInitiator, localStream, remoteStream, connectionAttempts, socket, partnerId, onCallStart]);
  
  const endCall = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up peer connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    setIsCallStarted(false);
    setRemoteStream(null);
    setConnectionAttempts(0);
    onCallEnd();
  };
  
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const isAudioEnabled = audioTracks[0].enabled;
        audioTracks[0].enabled = !isAudioEnabled;
        // Force re-render by updating state
        setLocalStream(localStream);
      }
    }
  };
  
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const isVideoEnabled = videoTracks[0].enabled;
        videoTracks[0].enabled = !isVideoEnabled;
        // Force re-render by updating state
        setLocalStream(localStream);
      }
    }
  };
  
  return (
    <div className="video-chat-container">
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="close-btn"
          >
            ×
          </button>
        </div>
      )}
      
      <div className="video-chat-layout">
        <div className="video-section">
          <div className="video-grid">
            <div className="video-item local-video">
              <div className="video-wrapper">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  muted 
                  playsInline
                />
                {localStream && !localStream.getVideoTracks()[0]?.enabled && (
                  <div className="video-placeholder">
                    <i className="fas fa-user-circle"></i>
                  </div>
                )}
              </div>
              <div className="video-label">You</div>
            </div>
            
            <div className="video-item remote-video">
              {remoteStream ? (
                <div className="video-wrapper">
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline
                  />
                  {remoteStream && remoteStream.getVideoTracks().length > 0 && 
                   !remoteStream.getVideoTracks()[0]?.enabled && (
                    <div className="video-placeholder">
                      <i className="fas fa-user-circle"></i>
                    </div>
                  )}
                </div>
              ) : (
                <div className="connecting-message">
                  {isInitiator ? 'Connecting to partner...' : 'Waiting for partner to connect...'}
                </div>
              )}
              <div className="video-label">Partner</div>
            </div>
          </div>
          
          <div className="controls">
            <button 
              className="control-btn mute-btn"
              onClick={toggleMute}
            >
              <i className={localStream && localStream.getAudioTracks()[0]?.enabled 
                ? 'fas fa-microphone' 
                : 'fas fa-microphone-slash'} />
              {localStream && localStream.getAudioTracks()[0]?.enabled 
                ? 'Mute' 
                : 'Unmute'}
            </button>
            
            <button 
              className="control-btn video-btn"
              onClick={toggleVideo}
            >
              <i className={localStream && localStream.getVideoTracks()[0]?.enabled 
                ? 'fas fa-video' 
                : 'fas fa-video-slash'} />
              {localStream && localStream.getVideoTracks()[0]?.enabled 
                ? 'Hide Video' 
                : 'Show Video'}
            </button>
            
            <button 
              className="control-btn skip-btn"
              onClick={onSkipPartner}
            >
              <i className="fas fa-forward" />
              Skip
            </button>
            
            <button 
              className="control-btn end-btn"
              onClick={endCall}
            >
              <i className="fas fa-phone-slash" />
              End
            </button>
          </div>
        </div>
        
        <div className="chat-section">
          <ChatBox 
            socket={socket}
            currentUserId={currentUserId}
            partnerId={partnerId}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoChat; 