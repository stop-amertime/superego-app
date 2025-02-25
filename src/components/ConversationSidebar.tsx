import React, { useState } from 'react';
import './ConversationSidebar.css';
import { Message } from '../api/llmClient';

interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  lastUpdated: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newName: string) => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartRename = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditName(conversation.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      onRenameConversation(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div className="conversation-sidebar">
      <div className="sidebar-header">
        <h3>Conversations</h3>
        <button 
          className="new-conversation-button"
          onClick={onNewConversation}
        >
          New
        </button>
      </div>
      
      <div className="conversations-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">
            No saved conversations
          </div>
        ) : (
          conversations.map(conversation => (
            <div 
              key={conversation.id}
              className={`conversation-item ${currentConversationId === conversation.id ? 'active' : ''}`}
            >
              <div 
                className="conversation-item-content"
                onClick={() => onSelectConversation(conversation.id)}
              >
                {editingId === conversation.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleSaveRename(conversation.id)}
                    onKeyDown={(e) => handleKeyDown(e, conversation.id)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="conversation-name">
                    {conversation.name || `Conversation ${conversation.id.slice(0, 8)}`}
                  </div>
                )}
                <div className="conversation-date">
                  {new Date(conversation.lastUpdated).toLocaleDateString()}
                </div>
              </div>
              
              <div className="conversation-actions">
                <button 
                  className="rename-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(conversation);
                  }}
                  title="Rename"
                >
                  ✏️
                </button>
                <button 
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this conversation?')) {
                      onDeleteConversation(conversation.id);
                    }
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;
