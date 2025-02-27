import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Chat.css';
import MessageBubble from './MessageBubble';
import SuperegoResponse from './SuperegoResponse';
import ConversationSidebar from './ConversationSidebar';
import { 
  streamSuperEgoResponse, 
  streamBaseLLMResponse,
  type Message,
  type Config
} from '../api/llmClient';

// Define the Conversation type
interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  lastUpdated: string;
}

function Chat() {
  // State for user input
  const [input, setInput] = useState('');
  
  // State for messages
  const [messages, setMessages] = useState<Message[]>([]);
  
  // State for loading indicators
  const [isSuperEgoLoading, setSuperEgoLoading] = useState(false);
  const [isAssistantLoading, setAssistantLoading] = useState(false);
  
  // State for current evaluation
  const [currentEvaluation, setCurrentEvaluation] = useState<Message | null>(null);
  
  // State for configuration
  const [config, setConfig] = useState<Config>({
    defaultProvider: 'openrouter',
    openrouterApiKey: '',
    anthropicApiKey: '',
    anthropicSuperEgoModel: 'claude-3-7-sonnet-20250219',
    anthropicBaseModel: 'claude-3-7-sonnet-20250219',
    openrouterSuperEgoModel: 'anthropic/claude-3.7-sonnet',
    openrouterBaseModel: 'anthropic/claude-3.7-sonnet',
    superEgoConstitutionFile: 'default',
    superEgoThinkingBudget: 4000, // Default to 4K tokens
    saveHistory: true
  });
  
  // State for conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  // Ref for message container to auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load config and conversations from localStorage on component mount
  useEffect(() => {
    // Load config
    const savedConfig = localStorage.getItem('superego-config');
    let configData = savedConfig ? JSON.parse(savedConfig) : { ...config };
    
    // Check for environment variables and use them if available
    const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    const openrouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (anthropicApiKey && (!configData.anthropicApiKey || configData.anthropicApiKey === '')) {
      configData.anthropicApiKey = anthropicApiKey as string;
    }
    
    if (openrouterApiKey && (!configData.openrouterApiKey || configData.openrouterApiKey === '')) {
      configData.openrouterApiKey = openrouterApiKey as string;
    }
    
    // Update the config state
    setConfig(configData);
    
    // Save the updated config to localStorage
    localStorage.setItem('superego-config', JSON.stringify(configData));
    
    // Load conversations
    const savedConversations = localStorage.getItem('superego-conversations');
    if (savedConversations) {
      const parsedConversations = JSON.parse(savedConversations) as Conversation[];
      setConversations(parsedConversations);
      
      // Load the last active conversation or create a new one
      const lastActiveId = localStorage.getItem('superego-active-conversation');
      if (lastActiveId && parsedConversations.some(c => c.id === lastActiveId)) {
        setCurrentConversationId(lastActiveId);
        const activeConversation = parsedConversations.find(c => c.id === lastActiveId);
        if (activeConversation) {
          setMessages(activeConversation.messages);
        }
      } else if (parsedConversations.length > 0) {
        // Load the most recent conversation
        const mostRecent = [...parsedConversations].sort(
          (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        )[0];
        setCurrentConversationId(mostRecent.id);
        setMessages(mostRecent.messages);
      } else {
        // Create a new conversation
        createNewConversation();
      }
    } else {
      // No saved conversations, create a new one
      createNewConversation();
    }
  }, []);
  
  // Save conversations to localStorage when they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('superego-conversations', JSON.stringify(conversations));
    }
    
    if (currentConversationId) {
      localStorage.setItem('superego-active-conversation', currentConversationId);
    }
  }, [conversations, currentConversationId]);
  
  // Update the current conversation when messages change
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      updateCurrentConversation(messages);
    }
  }, [messages]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentEvaluation]);
  
  // Create a new conversation
  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
      id: newId,
      name: `New Conversation`,
      messages: [],
      lastUpdated: new Date().toISOString()
    };
    
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationId(newId);
    setMessages([]);
    setCurrentEvaluation(null);
  };
  
  // Update the current conversation with new messages
  const updateCurrentConversation = (updatedMessages: Message[]) => {
    if (!currentConversationId) return;
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === currentConversationId 
          ? { 
              ...conv, 
              messages: updatedMessages,
              lastUpdated: new Date().toISOString()
            } 
          : conv
      )
    );
  };
  
  // Select a conversation
  const handleSelectConversation = (conversationId: string) => {
    const selectedConversation = conversations.find(c => c.id === conversationId);
    if (selectedConversation) {
      setCurrentConversationId(conversationId);
      setMessages(selectedConversation.messages);
      setCurrentEvaluation(null);
    }
  };
  
  // Delete a conversation
  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    
    // If the deleted conversation was the current one, select another one or create a new one
    if (conversationId === currentConversationId) {
      const remainingConversations = conversations.filter(c => c.id !== conversationId);
      if (remainingConversations.length > 0) {
        const nextConversation = remainingConversations[0];
        setCurrentConversationId(nextConversation.id);
        setMessages(nextConversation.messages);
      } else {
        createNewConversation();
      }
    }
  };
  
  // Rename a conversation
  const handleRenameConversation = (conversationId: string, newName: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, name: newName } 
          : conv
      )
    );
  };
  
  // Export the current conversation to JSON
  const handleExportConversation = () => {
    if (!currentConversationId) return;
    
    const currentConversation = conversations.find(c => c.id === currentConversationId);
    if (!currentConversation) return;
    
    const dataStr = JSON.stringify(currentConversation, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportName = `${currentConversation.name || 'conversation'}-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  };
  
  // Import a conversation from JSON
  const handleImportConversation = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedConversation = JSON.parse(content) as Conversation;
        
        // Validate the imported data
        if (!importedConversation.id || !Array.isArray(importedConversation.messages)) {
          throw new Error('Invalid conversation format');
        }
        
        // Generate a new ID to avoid conflicts
        const newId = Date.now().toString();
        const newConversation: Conversation = {
          ...importedConversation,
          id: newId,
          name: `${importedConversation.name || 'Imported'} (Imported)`,
          lastUpdated: new Date().toISOString()
        };
        
        setConversations(prev => [...prev, newConversation]);
        setCurrentConversationId(newId);
        setMessages(newConversation.messages);
        setCurrentEvaluation(null);
        
        alert('Conversation imported successfully!');
      } catch (error) {
        console.error('Error importing conversation:', error);
        alert('Failed to import conversation. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be imported again
    event.target.value = '';
  };
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarVisible(prev => !prev);
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Check if API keys are configured
    const provider = config.defaultProvider;
    const apiKey = provider === 'anthropic' ? config.anthropicApiKey : config.openrouterApiKey;
    
    console.log('Using provider:', provider);
    console.log('API key available:', apiKey ? 'Yes' : 'No');
    console.log('Config:', JSON.stringify({
      ...config,
      anthropicApiKey: config.anthropicApiKey ? '***' : '',
      openrouterApiKey: config.openrouterApiKey ? '***' : ''
    }, null, 2));
    
    if (!apiKey) {
      alert(`No API key found for ${provider}. Please configure it in the settings.`);
      return;
    }
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Call the superego API with the current constitution
    await evaluateWithSuperego(input);
  };
  
  // Evaluate input with superego using specified constitution
  const evaluateWithSuperego = async (inputText: string, constitutionId?: string) => {
    // Use the provided constitutionId or the current config
    const usedConstitutionId = constitutionId || config.superEgoConstitutionFile;
    const evaluationConfig = {
      ...config,
      superEgoConstitutionFile: usedConstitutionId
    };
    
    // Always clear the current evaluation when starting a new evaluation
    setCurrentEvaluation(null);
    
    setSuperEgoLoading(true);
    
    try {
      console.log('Calling superego API with input:', inputText);
      console.log('Using constitution:', evaluationConfig.superEgoConstitutionFile);
      
      // Stream the superego response
      const superEgoResponse = await streamSuperEgoResponse(
        inputText,
        evaluationConfig,
        (content) => {
          console.log('Received content chunk:', content);
          // Update the current evaluation as content streams in
          setCurrentEvaluation(prev => {
            if (!prev) {
              return {
                id: Date.now().toString(),
                role: 'superego',
                content,
                timestamp: new Date().toISOString(),
                decision: 'ANALYZING', // Set to ANALYZING while streaming
                constitutionId: usedConstitutionId,
                thinking: '', // Initialize thinking as empty string
                thinkingTime: '0' // Initialize thinking time as 0
              };
            }
            return {
              ...prev,
              content: prev.content + content
            };
          });
        },
        // Add callback for thinking content
        (thinkingContent) => {
          console.log('Received thinking chunk:', thinkingContent);
          // Update the current evaluation with thinking content as it streams in
          setCurrentEvaluation(prev => {
            if (!prev) return null;
            
            // Calculate approximate token count
            const newThinking = prev.thinking ? prev.thinking + thinkingContent : thinkingContent;
            const thinkingTokenCount = Math.round(newThinking.length / 4);
            
            return {
              ...prev,
              thinking: newThinking,
              thinkingTime: thinkingTokenCount.toString()
            };
          });
        }
      );
      
      console.log('Superego response complete:', superEgoResponse);
      
      // Set the final evaluation with the constitution ID and ANALYZED decision
      // Make sure to preserve thinking and thinkingTime properties
      setCurrentEvaluation({
        ...superEgoResponse,
        constitutionId: usedConstitutionId,
        decision: 'ANALYZED'
      });
      
      console.log('Superego response with thinking:', superEgoResponse);
    } catch (error) {
      console.error('Error evaluating input:', error);
      alert(`An error occurred while evaluating your input: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSuperEgoLoading(false);
    }
  };
  
  // Handle changing the constitution during evaluation
  const handleChangePrompt = async (constitutionId: string) => {
    // Find the last user message
    let lastUserMessage = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i];
        break;
      }
    }
    
    if (!lastUserMessage) {
      console.error('No user message found to re-evaluate');
      return;
    }
    
    // Re-evaluate the last user message with the new constitution
    await evaluateWithSuperego(lastUserMessage.content, constitutionId);
  };
  
  // Handle sending to main model
  const handleSendToModel = async () => {
    if (!currentEvaluation) return;
    
    // Add superego message to history
    setMessages(prev => [...prev, currentEvaluation]);
    
    // Clear current evaluation
    setCurrentEvaluation(null);
    
    // Call the base LLM API
    setAssistantLoading(true);
    
    try {
      // Get conversation context - include all messages and the current evaluation
      const context = [...messages, currentEvaluation];
      
      // Find the last user message
      let lastUserMessage = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessage = messages[i];
          break;
        }
      }
      
      // If no user message was found, show an error
      if (!lastUserMessage) {
        console.error('No user message found in the conversation history');
        alert('Could not find a user message to send to the model. Please try again.');
        setAssistantLoading(false);
        return;
      }
      
      console.log('Sending user message to base LLM:', lastUserMessage.content);
      
      // Stream the assistant response
      let assistantContent = '';
      await streamBaseLLMResponse(
        lastUserMessage.content,
        context,
        config,
        (content) => {
          assistantContent += content;
          // You could update a temporary state here to show streaming in the UI
        }
      );
      
      // Add the assistant message to the history
      const assistantResponse: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantResponse]);
    } catch (error) {
      console.error('Error getting response:', error);
      alert(`An error occurred while getting a response: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAssistantLoading(false);
    }
  };
  
  // Handle retry for superego evaluation
  const handleRetry = () => {
    setCurrentEvaluation(null);
  };
  
  // Handle edit message
  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent, timestamp: new Date().toISOString() } 
          : msg
      )
    );
  }, []);
  
  // Handle delete message
  const handleDeleteMessage = useCallback((messageId: string) => {
    // Find the message to delete
    const messageToDelete = messages.find(msg => msg.id === messageId);
    if (!messageToDelete) return;
    
    // Find all messages after this one that should be removed
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;
    
    // Remove this message and all subsequent messages
    const updatedMessages = messages.slice(0, messageIndex);
    setMessages(updatedMessages);
    
    // Clear current evaluation if any
    setCurrentEvaluation(null);
  }, [messages]);
  
  // Handle retry message (rerun from this point)
  const handleRetryMessage = useCallback((messageId: string) => {
    // Find the message to retry
    const messageToRetry = messages.find(msg => msg.id === messageId);
    if (!messageToRetry || messageToRetry.role !== 'user') return;
    
    // Find all messages after this one that should be removed
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;
    
    // Keep only messages up to and including the retried message
    const updatedMessages = messages.slice(0, messageIndex + 1);
    setMessages(updatedMessages);
    
    // Clear current evaluation if any
    setCurrentEvaluation(null);
    
    // Re-evaluate with superego
    evaluateWithSuperego(messageToRetry.content);
  }, [messages]);
  
  // Handle changing the constitution for a past message
  const handleChangePastMessagePrompt = useCallback((messageId: string, promptId: string) => {
    // Update the constitution ID for the message
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, constitutionId: promptId } 
          : msg
      )
    );
  }, []);
  
  // Handle clear chat
  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      setMessages([]);
      setCurrentEvaluation(null);
      
      // Update the current conversation
      if (currentConversationId) {
        updateCurrentConversation([]);
      }
    }
  };
  
  // Create a file input ref for importing conversations
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className={`chat-container ${sidebarVisible ? 'with-sidebar' : ''}`}>
      {sidebarVisible && (
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={createNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
        />
      )}
      
      <div className="chat">
        <div className="chat-header">
          <div className="header-left">
            <button 
              onClick={toggleSidebar} 
              className="toggle-sidebar-button"
              title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarVisible ? '◀' : '▶'}
            </button>
            <h2>
              {currentConversationId 
                ? conversations.find(c => c.id === currentConversationId)?.name || 'Chat' 
                : 'Chat'
              }
            </h2>
          </div>
          <div className="chat-actions">
            <input
              type="file"
              accept=".json"
              onChange={handleImportConversation}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="button secondary"
              title="Import conversation from JSON file"
            >
              Import
            </button>
            <button 
              onClick={handleExportConversation} 
              className="button secondary"
              disabled={!currentConversationId || messages.length === 0}
              title="Export conversation to JSON file"
            >
              Export
            </button>
            <button 
              onClick={handleClearChat} 
              className="button secondary"
              disabled={messages.length === 0}
            >
              Clear Chat
            </button>
            <Link to="/prompts" className="button secondary">Constitutions</Link>
            <Link to="/config" className="button secondary">Settings</Link>
          </div>
        </div>
        
        <div className="messages-container">
          {messages.map(message => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onRetry={handleRetryMessage}
              onChangePrompt={message.role === 'superego' ? handleChangePastMessagePrompt : undefined}
            />
          ))}
          
          {isSuperEgoLoading && (
            <div className="loading-indicator superego">
              <div className="loading-spinner"></div>
              <p>Superego is evaluating your message...</p>
            </div>
          )}
          
          {currentEvaluation && (
            <SuperegoResponse 
              evaluation={currentEvaluation} 
              onSend={handleSendToModel} 
              onRetry={handleRetry}
              onChangePrompt={handleChangePrompt}
              currentPromptId={config.superEgoConstitutionFile}
            />
          )}
          
          {isAssistantLoading && (
            <div className="loading-indicator assistant">
              <div className="loading-spinner"></div>
              <p>Assistant is thinking...</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="input-form">
          <textarea 
            value={input} 
            onChange={handleInputChange} 
            placeholder="Type your message here..."
            disabled={isSuperEgoLoading || isAssistantLoading || !!currentEvaluation}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isSuperEgoLoading || isAssistantLoading || !!currentEvaluation}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
