import { Socket } from 'socket.io-client';
import React from 'react';

export interface VideoChatProps {
  socket: Socket;
  currentUserId: string;
  partnerId: string;
  onCallStart: () => void;
  onCallEnd: () => void;
  onSkipPartner: () => void;
}

declare const VideoChat: React.FC<VideoChatProps>;

export default VideoChat; 