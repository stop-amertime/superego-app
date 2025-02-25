import React from 'react';
import './MessageBubble.css';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'superego';
  content: string;
  timestamp: string;
  decision?: string;
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message-bubble ${message.role}`}>
      <div className="message-header">
        <span className="message-sender">
          {message.role === 'user' ? 'You' : 
           message.role === 'assistant' ? 'Assistant' : 'Superego'}
        </span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      <div className="message-content">
        {message.content.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < message.content.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default MessageBubble;
