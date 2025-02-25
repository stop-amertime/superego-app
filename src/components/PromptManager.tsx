import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './PromptManager.css';
import { Prompt } from '../types/Prompt';

interface PromptManagerProps {
  onSelectPrompt: (promptId: string) => void;
  selectedPromptId: string;
}

function PromptManager({ onSelectPrompt, selectedPromptId }: PromptManagerProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Load prompts from prompts.json and localStorage on component mount
  useEffect(() => {
    const loadPrompts = async () => {
      // Load built-in prompts from prompts.json
      const builtInPrompts: Prompt[] = [];
      
      try {
        const response = await fetch('/prompts.json');
        if (response.ok) {
          const data = await response.json();
          // Convert the prompts from the JSON file to Prompt objects
          data.prompts.forEach((p: any) => {
            builtInPrompts.push({
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
      
      // Load custom prompts from localStorage
      let customPrompts: Prompt[] = [];
      const savedPrompts = localStorage.getItem('superego-prompts');
      
      if (savedPrompts) {
        try {
          customPrompts = JSON.parse(savedPrompts);
        } catch (error) {
          console.error('Error parsing saved prompts:', error);
        }
      }
      
      // Combine built-in prompts with custom prompts
      setPrompts([...builtInPrompts, ...customPrompts]);
    };
    
    loadPrompts();
  }, []);

  // Save custom prompts to localStorage when they change
  useEffect(() => {
    const customPrompts = prompts.filter(p => !p.isBuiltIn);
    if (customPrompts.length > 0) {
      localStorage.setItem('superego-prompts', JSON.stringify(customPrompts));
    }
  }, [prompts]);

  // Handle prompt selection
  const handleSelectPrompt = (promptId: string) => {
    onSelectPrompt(promptId);
  };

  // Start editing a prompt
  const handleEditPrompt = (prompt: Prompt) => {
    if (prompt.isBuiltIn) {
      // Create a copy of the built-in prompt
      const newPrompt: Prompt = {
        ...prompt,
        id: `custom-${Date.now()}`,
        name: `${prompt.name} (Custom)`,
        isBuiltIn: false,
        lastUpdated: new Date().toISOString()
      };
      
      setEditingPrompt(newPrompt);
      setNewPromptName(newPrompt.name);
      setNewPromptContent(newPrompt.content);
    } else {
      setEditingPrompt(prompt);
      setNewPromptName(prompt.name);
      setNewPromptContent(prompt.content);
    }
  };

  // Save edited prompt
  const handleSavePrompt = () => {
    if (!editingPrompt) return;
    
    const updatedPrompt: Prompt = {
      ...editingPrompt,
      name: newPromptName.trim() || editingPrompt.name,
      content: newPromptContent.trim() || editingPrompt.content,
      lastUpdated: new Date().toISOString()
    };
    
    // Check if this is a new prompt or an update to an existing one
    const promptExists = prompts.some(p => p.id === updatedPrompt.id);
    
    if (promptExists) {
      setPrompts(prev => prev.map(p => p.id === updatedPrompt.id ? updatedPrompt : p));
    } else {
      setPrompts(prev => [...prev, updatedPrompt]);
    }
    
    // Select the updated prompt
    onSelectPrompt(updatedPrompt.id);
    
    // Reset editing state
    setEditingPrompt(null);
    setNewPromptName('');
    setNewPromptContent('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setNewPromptName('');
    setNewPromptContent('');
    setIsCreatingNew(false);
  };

  // Delete a prompt
  const handleDeletePrompt = (promptId: string) => {
    // Cannot delete built-in prompts
    const promptToDelete = prompts.find(p => p.id === promptId);
    if (!promptToDelete || promptToDelete.isBuiltIn) return;
    
    if (window.confirm(`Are you sure you want to delete the prompt "${promptToDelete.name}"?`)) {
      setPrompts(prev => prev.filter(p => p.id !== promptId));
      
      // If the deleted prompt was selected, select the default prompt
      if (selectedPromptId === promptId) {
        onSelectPrompt('default');
      }
    }
  };

  // Start creating a new prompt
  const handleCreateNewPrompt = () => {
    const newPrompt: Prompt = {
      id: `custom-${Date.now()}`,
      name: 'New Prompt',
      content: '',
      isBuiltIn: false,
      lastUpdated: new Date().toISOString()
    };
    
    setEditingPrompt(newPrompt);
    setNewPromptName(newPrompt.name);
    setNewPromptContent(newPrompt.content);
    setIsCreatingNew(true);
  };

  return (
    <div className="prompt-manager-page">
      <h2>Prompt Manager</h2>
      
      <div className="prompt-manager">
        {!editingPrompt ? (
          <>
            <div className="prompt-list-header">
              <h3>Superego Prompts</h3>
              <button 
                className="button primary"
                onClick={handleCreateNewPrompt}
              >
                Create New
              </button>
            </div>
            
            <div className="prompt-list">
              <h4>Built-in Prompts</h4>
              {prompts.filter(p => p.isBuiltIn).map(prompt => (
                <div 
                  key={prompt.id}
                  className={`prompt-item ${selectedPromptId === prompt.id ? 'active' : ''}`}
                >
                  <div 
                    className="prompt-item-content"
                    onClick={() => handleSelectPrompt(prompt.id)}
                  >
                    <div className="prompt-name">{prompt.name}</div>
                    <div className="prompt-preview">
                      {prompt.content.substring(0, 60)}...
                    </div>
                  </div>
                  <div className="prompt-actions">
                    <button 
                      className="edit-button"
                      onClick={() => handleEditPrompt(prompt)}
                      title="Create a custom copy of this prompt"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
              
              {prompts.filter(p => !p.isBuiltIn).length > 0 && (
                <>
                  <h4>Custom Prompts</h4>
                  {prompts.filter(p => !p.isBuiltIn).map(prompt => (
                    <div 
                      key={prompt.id}
                      className={`prompt-item ${selectedPromptId === prompt.id ? 'active' : ''}`}
                    >
                      <div 
                        className="prompt-item-content"
                        onClick={() => handleSelectPrompt(prompt.id)}
                      >
                        <div className="prompt-name">{prompt.name}</div>
                        <div className="prompt-preview">
                          {prompt.content.substring(0, 60)}...
                        </div>
                      </div>
                      <div className="prompt-actions">
                        <button 
                          className="edit-button"
                          onClick={() => handleEditPrompt(prompt)}
                          title="Edit this prompt"
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          title="Delete this prompt"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="prompt-editor">
            <h3>{isCreatingNew ? 'Create New Prompt' : 'Edit Prompt'}</h3>
            
            <div className="form-group">
              <label htmlFor="promptName">Prompt Name:</label>
              <input 
                type="text"
                id="promptName"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                placeholder="Enter a name for this prompt"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="promptContent">Prompt Content:</label>
              <textarea 
                id="promptContent"
                value={newPromptContent}
                onChange={(e) => setNewPromptContent(e.target.value)}
                placeholder="Enter the prompt content"
                rows={15}
              />
            </div>
            
            <div className="editor-actions">
              <button 
                className="button primary"
                onClick={handleSavePrompt}
                disabled={!newPromptName.trim() || !newPromptContent.trim()}
              >
                Save
              </button>
              <button 
                className="button secondary"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="action-buttons">
        <Link to="/config" className="button secondary">
          Back to Settings
        </Link>
        <Link to="/chat" className="button primary">
          Go to Chat
        </Link>
      </div>
    </div>
  );
}

export default PromptManager;
