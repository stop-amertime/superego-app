import React, { useState } from 'react';
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
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
}

function MessageBubble({ message, onEdit, onDelete, onRetry }: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry(message.id);
    }
  };

  return (
    <div 
      className={`message-bubble ${message.role}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => setShowActions(!showActions)}
    >
      <div className="message-header">
        <span className="message-sender">
          {message.role === 'user' ? 'You' : 
           message.role === 'assistant' ? 'Assistant' : 'Superego'}
        </span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      
      {isEditing ? (
        <div className="message-edit">
          <textarea 
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="edit-textarea"
          />
          <div className="edit-actions">
            <button onClick={handleSaveEdit} className="edit-button save">Save</button>
            <button onClick={handleCancelEdit} className="edit-button cancel">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="message-content">
          {message.content.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < message.content.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      )}
      
      {(showActions || isEditing) && message.role === 'user' && (
        <div className="message-actions">
          {!isEditing && (
            <>
              <button onClick={handleEdit} className="action-button edit" title="Edit message">
                ✏️
              </button>
              <button onClick={handleDelete} className="action-button delete" title="Delete message">
                🗑️
              </button>
              <button onClick={handleRetry} className="action-button retry" title="Retry message">
                🔄
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
