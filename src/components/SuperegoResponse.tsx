import React, { useState, useEffect } from 'react';
import './SuperegoResponse.css';
import { Prompt, BUILT_IN_PROMPTS } from '../types/Prompt';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'superego';
  content: string;
  timestamp: string;
  decision?: string;
}

interface SuperegoResponseProps {
  evaluation: Message;
  onSend: () => void;
  onRetry: () => void;
  onChangePrompt?: (promptId: string) => Promise<void>;
  currentPromptId?: string;
}

function SuperegoResponse({ 
  evaluation, 
  onSend, 
  onRetry, 
  onChangePrompt,
  currentPromptId = 'default'
}: SuperegoResponseProps) {
  const [isPromptSelectorOpen, setIsPromptSelectorOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isChangingPrompt, setIsChangingPrompt] = useState(false);
  
  // Load prompts from localStorage on component mount
  useEffect(() => {
    const savedPrompts = localStorage.getItem('superego-prompts');
    let customPrompts: Prompt[] = [];
    
    if (savedPrompts) {
      try {
        customPrompts = JSON.parse(savedPrompts);
      } catch (error) {
        console.error('Error parsing saved prompts:', error);
      }
    }
    
    // Combine built-in prompts with custom prompts
    setPrompts([...BUILT_IN_PROMPTS, ...customPrompts]);
  }, []);
  
  // Handle prompt change
  const handlePromptChange = async (promptId: string) => {
    if (onChangePrompt) {
      setIsChangingPrompt(true);
      try {
        await onChangePrompt(promptId);
      } finally {
        setIsChangingPrompt(false);
        setIsPromptSelectorOpen(false);
      }
    }
  };
  
  // Get the current prompt name
  const getCurrentPromptName = () => {
    const prompt = prompts.find(p => p.id === currentPromptId);
    return prompt ? prompt.name : 'Default';
  };

  return (
    <div className="superego-response">
      <div className="superego-content">
        <div className="superego-header">
          <h3>Superego Evaluation</h3>
          {onChangePrompt && (
            <div className="current-prompt">
              Using prompt: <span onClick={() => setIsPromptSelectorOpen(prev => !prev)}>{getCurrentPromptName()} ▾</span>
              
              {isPromptSelectorOpen && (
                <div className="prompt-selector">
                  <div className="prompt-selector-header">
                    <h4>Select a different prompt</h4>
                    <button 
                      className="close-button"
                      onClick={() => setIsPromptSelectorOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="prompt-list">
                    {/* Built-in prompts */}
                    <div className="prompt-category">
                      <h5>Built-in Prompts</h5>
                      {prompts.filter(p => p.isBuiltIn).map(prompt => (
                        <div 
                          key={prompt.id}
                          className={`prompt-item ${currentPromptId === prompt.id ? 'active' : ''}`}
                          onClick={() => handlePromptChange(prompt.id)}
                        >
                          {prompt.name}
                        </div>
                      ))}
                    </div>
                    
                    {/* Custom prompts */}
                    {prompts.filter(p => !p.isBuiltIn).length > 0 && (
                      <div className="prompt-category">
                        <h5>Custom Prompts</h5>
                        {prompts.filter(p => !p.isBuiltIn).map(prompt => (
                          <div 
                            key={prompt.id}
                            className={`prompt-item ${currentPromptId === prompt.id ? 'active' : ''}`}
                            onClick={() => handlePromptChange(prompt.id)}
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
        <div className="superego-message">
          {evaluation.content.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < evaluation.content.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="superego-actions">
        <p>What would you like to do?</p>
        <div className="action-buttons">
          <button 
            onClick={onSend} 
            className="button primary"
            disabled={isChangingPrompt}
          >
            Continue and send to the main model
          </button>
          <button 
            onClick={onRetry} 
            className="button secondary"
            disabled={isChangingPrompt}
          >
            Retry with a different input
          </button>
          {onChangePrompt && (
            <button 
              onClick={() => setIsPromptSelectorOpen(prev => !prev)} 
              className="button secondary"
              disabled={isChangingPrompt}
            >
              {isPromptSelectorOpen ? 'Close prompt selector' : 'Try a different prompt'}
            </button>
          )}
        </div>
        {isChangingPrompt && (
          <div className="changing-prompt-indicator">
            <div className="loading-spinner"></div>
            <p>Evaluating with new prompt...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperegoResponse;
