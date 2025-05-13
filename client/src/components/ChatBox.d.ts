import { Socket } from 'socket.io-client';
import React from 'react';

export interface ChatBoxProps {
  socket: Socket;
  currentUserId: string;
  partnerId: string;
}

declare const ChatBox: React.FC<ChatBoxProps>;

export default ChatBox; 