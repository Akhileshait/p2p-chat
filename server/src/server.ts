import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store active users
const activeUsers: Record<string, any> = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Add user to active users
  activeUsers[socket.id] = {
    id: socket.id,
    inCall: false,
    peerId: null
  };

  // Notify all users about the update in active users
  io.emit('active-users', Object.values(activeUsers).filter(user => !user.inCall));

  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from active users
    delete activeUsers[socket.id];
    
    // Notify all users about the update in active users
    io.emit('active-users', Object.values(activeUsers).filter(user => !user.inCall));
  });

  // Handle call requests
  socket.on('call-user', ({ targetId, offer }) => {
    if (activeUsers[targetId]) {
      console.log(`Call initiated from ${socket.id} to ${targetId}`);
      
      // Forward the call request to the target user
      io.to(targetId).emit('call-received', {
        from: socket.id,
        offer
      });
      
      // Mark both users as in call
      activeUsers[socket.id].inCall = true;
      activeUsers[targetId].inCall = true;
      
      // Notify all users about the update in active users
      io.emit('active-users', Object.values(activeUsers).filter(user => !user.inCall));
    }
  });

  // Handle call acceptance
  socket.on('call-accepted', ({ targetId, answer }) => {
    if (activeUsers[targetId]) {
      console.log(`Call accepted from ${socket.id} to ${targetId}`);
      
      // Forward the call acceptance to the caller
      io.to(targetId).emit('call-accepted', {
        from: socket.id,
        answer
      });
    }
  });

  // Handle ICE candidates
  socket.on('ice-candidate', ({ targetId, candidate }) => {
    if (activeUsers[targetId]) {
      // Forward the ICE candidate to the target user
      io.to(targetId).emit('ice-candidate', {
        from: socket.id,
        candidate
      });
    }
  });

  // Handle call end
  socket.on('call-ended', ({ targetId }) => {
    if (activeUsers[targetId]) {
      console.log(`Call ended between ${socket.id} and ${targetId}`);
      
      // Notify the target user
      io.to(targetId).emit('call-ended', {
        from: socket.id
      });
      
      // Mark both users as available
      if (activeUsers[socket.id]) activeUsers[socket.id].inCall = false;
      if (activeUsers[targetId]) activeUsers[targetId].inCall = false;
      
      // Notify all users about the update in active users
      io.emit('active-users', Object.values(activeUsers).filter(user => !user.inCall));
    }
  });

  // Handle random chat request
  socket.on('find-random-user', () => {
    // Get all available users (excluding self)
    const availableUsers = Object.values(activeUsers).filter(
      user => !user.inCall && user.id !== socket.id
    );
    
    if (availableUsers.length > 0) {
      // Pick a random user
      const randomIndex = Math.floor(Math.random() * availableUsers.length);
      const targetUser = availableUsers[randomIndex];
      
      // Notify the requester about the found user
      socket.emit('random-user-found', {
        userId: targetUser.id
      });
    } else {
      // Notify the requester that no user is available
      socket.emit('no-user-available');
    }
  });

  // Handle next partner request
  socket.on('next-partner', ({ currentPartnerId }) => {
    if (activeUsers[currentPartnerId]) {
      // Notify current partner that call has ended
      io.to(currentPartnerId).emit('partner-left');
      
      // Mark both users as available
      activeUsers[socket.id].inCall = false;
      activeUsers[currentPartnerId].inCall = false;
      
      // Start finding new partner
      socket.emit('find-random-user');
    }
  });
  
  // Handle chat messages
  socket.on('send-message', ({ targetId, message }) => {
    if (activeUsers[targetId]) {
      console.log(`Message sent from ${socket.id} to ${targetId}`);
      
      // Forward the message to the target user
      io.to(targetId).emit('chat-message', message);
    }
  });
  
  // Handle typing indicators
  socket.on('typing-start', ({ targetId }) => {
    if (activeUsers[targetId]) {
      io.to(targetId).emit('typing-start', {
        from: socket.id
      });
    }
  });
  
  socket.on('typing-stop', ({ targetId }) => {
    if (activeUsers[targetId]) {
      io.to(targetId).emit('typing-stop', {
        from: socket.id
      });
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.send('Random Video Chat Server is running');
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 