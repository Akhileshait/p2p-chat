import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './ChatBox.css';

interface ChatBoxProps {
  socket: Socket;
  currentUserId: string;
  partnerId: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

const ChatBox: React.FC<ChatBoxProps> = ({ socket, currentUserId, partnerId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle socket events for chat messages
  useEffect(() => {
    // Listen for incoming messages
    socket.on('chat-message', (message: Message) => {
      setMessages(prevMessages => [...prevMessages, message]);
    });

    // Listen for typing indicators
    socket.on('typing-start', ({ from }) => {
      if (from === partnerId) {
        setIsPartnerTyping(true);
      }
    });

    socket.on('typing-stop', ({ from }) => {
      if (from === partnerId) {
        setIsPartnerTyping(false);
      }
    });

    return () => {
      socket.off('chat-message');
      socket.off('typing-start');
      socket.off('typing-stop');
    };
  }, [socket, partnerId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  // Handle typing indicator
  const handleTyping = () => {
    // Send typing-start event to partner
    socket.emit('typing-start', { targetId: partnerId });
    
    // Clear existing timeout if any
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to send typing-stop event
    const timeout = setTimeout(() => {
      socket.emit('typing-stop', { targetId: partnerId });
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  // Send message function
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputMessage.trim() === '') return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      text: inputMessage,
      timestamp: Date.now()
    };
    
    // Add message to local state
    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    // Send message to server
    socket.emit('send-message', {
      targetId: partnerId,
      message: newMessage
    });
    
    // Send typing-stop event
    socket.emit('typing-stop', { targetId: partnerId });
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Clear input field
    setInputMessage('');
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h3><i className="fas fa-comments"></i> Chat</h3>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p><i className="fas fa-comment-dots"></i> No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id}
              className={`message ${message.senderId === currentUserId ? 'sent' : 'received'}`}
            >
              <div className="message-content">
                <p>{message.text}</p>
                <span className="message-time">
                  {message.senderId === currentUserId ? (
                    <i className="fas fa-check"></i>
                  ) : null} {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
        {isPartnerTyping && (
          <div className="typing-indicator">
            <p><i className="fas fa-keyboard"></i> Partner is typing...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleTyping}
        />
        <button type="submit">
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 