import React, { useState, useEffect } from 'react';
import './SuperegoResponse.css';
import { Prompt } from '../types/Prompt';

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
  
  // Load constitutions from prompts.json and localStorage on component mount
  useEffect(() => {
    const loadConstitutions = async () => {
      // Load built-in constitutions from prompts.json
      const builtInConstitutions: Prompt[] = [];
      
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}prompts.json`);
        if (response.ok) {
          const data = await response.json();
          // Convert the constitutions from the JSON file to Prompt objects
          data.prompts.forEach((p: any) => {
            builtInConstitutions.push({
              id: p.id,
              name: p.name,
              content: p.content,
              isBuiltIn: true,
              lastUpdated: new Date().toISOString()
            });
          });
        } else {
          console.error('Failed to load prompts.json file');
        }
      } catch (error) {
        console.error('Error loading prompts.json file:', error);
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
            Using constitution: <span onClick={() => setIsPromptSelectorOpen(prev => !prev)}>{getCurrentPromptName()} ▾</span>
            
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
                          className={`prompt-item ${currentPromptId === prompt.id ? 'active' : ''}`}
                          onClick={() => handlePromptChange(prompt.id)}
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
              {isPromptSelectorOpen ? 'Close constitution selector' : 'Try a different constitution'}
            </button>
          )}
        </div>
        {isChangingPrompt && (
          <div className="changing-prompt-indicator">
            <div className="loading-spinner"></div>
            <p>Evaluating with new constitution...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperegoResponse;
