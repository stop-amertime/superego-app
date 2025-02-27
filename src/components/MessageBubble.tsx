import React, { useState, useEffect } from 'react';
import './MessageBubble.css';
import { Prompt } from '../types/Prompt';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'superego';
  content: string;
  timestamp: string;
  decision?: string;
  constitutionId?: string;
  thinking?: string; // The thinking content from Claude's extended thinking feature
  thinkingTime?: string | null; // How long the thinking process took in seconds
}

interface MessageBubbleProps {
  message: Message;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  onChangePrompt?: (messageId: string, promptId: string) => void;
}

function MessageBubble({ message, onEdit, onDelete, onRetry, onChangePrompt }: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [isPromptSelectorOpen, setIsPromptSelectorOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  
  // Load constitutions from constitutions.json and localStorage on component mount
  useEffect(() => {
    if (message.role === 'superego') {
      const loadConstitutions = async () => {
        // Load built-in constitutions from constitutions.json
        const builtInConstitutions: Prompt[] = [];
        
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}constitutions.json`);
          if (response.ok) {
            const data = await response.json();
            // Convert the constitutions from the JSON file to Prompt objects
            data.constitutions.forEach((p: any) => {
              builtInConstitutions.push({
                id: p.id,
                name: p.name,
                content: p.content,
                isBuiltIn: true,
                lastUpdated: new Date().toISOString()
              });
            });
          } else {
            console.error('Failed to load constitutions.json file');
          }
        } catch (error) {
          console.error('Error loading constitutions.json file:', error);
        }
        
        // Load custom constitutions from localStorage
        let customConstitutions: Prompt[] = [];
        const savedConstitutions = localStorage.getItem('superego-constitutions');
        
        if (savedConstitutions) {
          try {
            customConstitutions = JSON.parse(savedConstitutions);
          } catch (error) {
            console.error('Error parsing saved constitutions:', error);
          }
        }
        
        // Combine built-in constitutions with custom constitutions
        setPrompts([...builtInConstitutions, ...customConstitutions]);
      };
      
      loadConstitutions();
    }
  }, [message.role]);
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get constitution name from ID
  const getConstitutionName = (constitutionId: string) => {
    const prompt = prompts.find(p => p.id === constitutionId);
    return prompt ? prompt.name : constitutionId;
  };
  
  // Check if this constitution is the default
  const isDefaultConstitution = () => {
    const savedConfig = localStorage.getItem('superego-config');
    if (savedConfig && message.constitutionId) {
      const config = JSON.parse(savedConfig);
      return config.superEgoConstitutionFile === message.constitutionId;
    }
    return false;
  };

  // Handle changing the constitution
  const handleChangePrompt = (promptId: string) => {
    if (onChangePrompt) {
      onChangePrompt(message.id, promptId);
      setIsPromptSelectorOpen(false);
    }
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
        <div className="message-info">
          <span className="message-sender">
            {message.role === 'user' ? 'You' : 
             message.role === 'assistant' ? 'Assistant' : 'Superego'}
          </span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
        {message.role === 'superego' && message.constitutionId && (
          <div className="message-constitution">
            <span 
              className="constitution-label"
              onClick={() => setIsPromptSelectorOpen(prev => !prev)}
            >
              Constitution: {getConstitutionName(message.constitutionId)} 
              {isDefaultConstitution() && <span className="default-badge" title="Default constitution">Default</span>}
              ▾
            </span>
            
            {isPromptSelectorOpen && (
              <div className="prompt-selector">
                <div className="prompt-selector-header">
                  <h4>Select a different constitution</h4>
                  <button 
                    className="close-button"
                    onClick={() => setIsPromptSelectorOpen(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="prompt-list">
                  {/* Built-in constitutions */}
                  <div className="prompt-category">
                    <h5>Built-in Constitutions</h5>
                    {prompts.filter(p => p.isBuiltIn).map(prompt => (
                      <div 
                        key={prompt.id}
                        className={`prompt-item ${message.constitutionId === prompt.id ? 'active' : ''}`}
                        onClick={() => handleChangePrompt(prompt.id)}
                      >
                        {prompt.name}
                      </div>
                    ))}
                  </div>
                  
                  {/* Custom constitutions */}
                  {prompts.filter(p => !p.isBuiltIn).length > 0 && (
                    <div className="prompt-category">
                      <h5>Custom Constitutions</h5>
                      {prompts.filter(p => !p.isBuiltIn).map(prompt => (
                        <div 
                          key={prompt.id}
                          className={`prompt-item ${message.constitutionId === prompt.id ? 'active' : ''}`}
                          onClick={() => handleChangePrompt(prompt.id)}
                        >
                          {prompt.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Add thinking section above the response for superego messages */}
      {message.role === 'superego' && message.thinking && message.thinking.length > 0 && (
        <div className="superego-thinking-box">
          <div 
            className="thinking-header" 
            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
          >
            <span className="thinking-icon">{isThinkingExpanded ? '▼' : '►'}</span>
            <span className="thinking-label">
              Thinking tokens: {message.thinkingTime || '0'}
            </span>
          </div>
          
          {isThinkingExpanded && (
            <div className="thinking-content">
              {message.thinking?.split('\n').map((line, i, arr) => (
                <React.Fragment key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}
      
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
