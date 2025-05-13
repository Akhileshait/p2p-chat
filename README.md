# Random Video Chat Application

A web application similar to Omegle that allows users to have random video chats with strangers. Built with the MERN stack (MongoDB, Express, React, Node.js) and WebRTC.

## Features

- Real-time video chat with random users
- Text messaging alongside video chat
- Responsive design for desktop and mobile
- User interface controls for:
  - Muting/unmuting audio
  - Enabling/disabling video
  - Skipping to the next chat partner
  - Ending the chat session
- Typing indicators
- Chat message timestamps and delivery confirmations
- Avatar placeholder when video is disabled

## Technologies Used

- **Frontend**:
  - React
  - TypeScript
  - Vite
  - Socket.IO Client
  - Simple-Peer (WebRTC)
  - CSS for styling
  - Font Awesome for icons

- **Backend**:
  - Node.js
  - Express
  - Socket.IO
  - TypeScript

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Server Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

The server will run on port 5000 by default.

### Client Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The client will run on port 5173 by default.

## How It Works

1. **Connection**: When a user connects to the application, they are assigned a unique Socket.IO ID.

2. **Finding Partners**: Users can click "Start Chatting" to be matched with another random user who is also looking for a chat.

3. **WebRTC Connection**: Once matched, a peer-to-peer WebRTC connection is established for video and audio streaming.

4. **Text Chat**: Users can send text messages to their current partner via Socket.IO.

5. **Ending Chat**: Users can end the current chat or skip to a new partner at any time.

## Project Structure

- `/client`: React frontend application
  - `/src`: Source code
    - `/components`: React components (VideoChat, ChatBox, etc.)
    - `/assets`: Static assets
  - `vite.config.ts`: Vite configuration

- `/server`: Node.js backend
  - `/src`: Source code
    - `server.ts`: Express server and Socket.IO implementation

## Future Improvements

- User authentication and profiles
- Filter options for matching (interests, location, etc.)
- File sharing capabilities
- Screen sharing
- Group chat options
- Translation features for cross-language communication
- Recording options (with consent)

## License

This project is licensed under the MIT License. 