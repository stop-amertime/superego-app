/**
 * LLM Client for interacting with language model APIs
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Define the configuration type
export interface Config {
  defaultProvider: 'anthropic' | 'openrouter';
  openrouterApiKey: string;
  anthropicApiKey: string;
  anthropicSuperEgoModel: string;
  anthropicBaseModel: string;
  openrouterSuperEgoModel: string;
  openrouterBaseModel: string;
  superEgoPromptFile: string;
  saveHistory: boolean;
}

// Define the message type
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'superego';
  content: string;
  timestamp: string;
  decision?: string;
}

// Define the streaming callback type
export type OnContentCallback = (content: string) => void;

/**
 * Get the superego instructions based on the prompt ID
 */
export async function getSuperEgoInstructions(promptId: string): Promise<string> {
  // First check custom prompts in localStorage
  const savedPrompts = localStorage.getItem('superego-prompts');
  if (savedPrompts) {
    try {
      const customPrompts = JSON.parse(savedPrompts);
      const customPrompt = customPrompts.find((p: any) => p.id === promptId);
      if (customPrompt) {
        return customPrompt.content;
      }
    } catch (error) {
      console.error('Error parsing saved prompts:', error);
    }
  }
  
  // Then try to fetch from the prompts.json file
  try {
    const response = await fetch('/prompts.json');
    if (response.ok) {
      const data = await response.json();
      const prompt = data.prompts.find((p: any) => p.id === promptId);
      if (prompt) {
        return prompt.content;
      } else {
        console.error(`Prompt with ID ${promptId} not found in prompts.json`);
      }
    } else {
      console.error('Failed to load prompts.json file');
    }
  } catch (error) {
    console.error('Error loading prompts.json file:', error);
  }
  
  // Fallback to a basic prompt if all else fails
  return `You are a screening agent that evaluates user inputs before they are sent to the main AI assistant.
Your job is to analyze the input and provide your thoughts on it.

For each user input, you should:
1. Analyze the content for any harmful, illegal, or inappropriate requests
2. Provide your analysis of the input
3. Suggest whether the input should be sent to the main AI assistant or not`;
}

/**
 * Initialize API clients
 */
function initClients(config: Config) {
  let anthropicClient = null;
  let openrouterClient = null;
  
  // Initialize Anthropic client if API key is available
  if (config.anthropicApiKey) {
    anthropicClient = new Anthropic({
      apiKey: config.anthropicApiKey,
      dangerouslyAllowBrowser: true, // Required for browser environments
    });
  }
  
  // Initialize OpenRouter client if API key is available
  if (config.openrouterApiKey) {
    openrouterClient = new OpenAI({
      apiKey: config.openrouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      dangerouslyAllowBrowser: true, // Required for browser environments
    });
  }
  
  return { anthropicClient, openrouterClient };
}

/**
 * Stream a response from the superego model
 */
export async function streamSuperEgoResponse(
  userInput: string,
  config: Config,
  onContent: OnContentCallback
): Promise<Message> {
  // Get the provider-specific model name for superego
  const provider = config.defaultProvider;
  const model = provider === 'anthropic' 
    ? config.anthropicSuperEgoModel 
    : config.openrouterSuperEgoModel;
  
  // Initialize clients
  const { anthropicClient, openrouterClient } = initClients(config);
  
  // Get instructions from the configured prompt file
  const systemPrompt = await getSuperEgoInstructions(config.superEgoPromptFile);
  const userMessage = `Evaluate this user input: ${userInput}`;
  
  let fullResponse = '';
  
  try {
    if (provider === 'anthropic' && anthropicClient) {
      console.log('Using Anthropic API with model:', model);
      console.log('System prompt:', systemPrompt);
      console.log('User message:', userMessage);
      
      try {
        console.log('Initializing Anthropic stream...');
        const stream = await anthropicClient.messages.stream({
          model: model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          max_tokens: 1000,
        });
        console.log('Anthropic stream initialized successfully');
        
        for await (const chunk of stream) {
          // Handle different types of chunks from Anthropic API
          if (chunk.type === 'content_block_delta' && chunk.delta) {
            // Check if it's a text delta
            if ('text' in chunk.delta) {
              const content = chunk.delta.text;
              fullResponse += content;
              onContent(content);
            }
          }
        }
      } catch (error: any) {
        console.error('Anthropic API error:', error);
        
        // Create a more detailed error message
        const errorDetail = `Anthropic API Error: ${error.message || error}`;
        return {
          id: Date.now().toString(),
          role: 'superego',
          content: errorDetail,
          timestamp: new Date().toISOString(),
          decision: 'ERROR'
        };
      }
    } else if (provider === 'openrouter' && openrouterClient) {
      console.log('Using OpenRouter API with model:', model);
      console.log('System prompt:', systemPrompt);
      console.log('User message:', userMessage);
      
      try {
        console.log('Initializing OpenRouter stream...');
        const stream = await openrouterClient.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          stream: true,
        });
        console.log('OpenRouter stream initialized successfully');
        
        for await (const chunk of stream) {
          if (chunk.choices && chunk.choices[0].delta.content) {
            const content = chunk.choices[0].delta.content;
            fullResponse += content;
            onContent(content);
          }
        }
      } catch (error: any) {
        console.error('OpenRouter API error:', error);
        
        // Create a more detailed error message
        const errorDetail = `OpenRouter API Error: ${error.message || error}`;
        return {
          id: Date.now().toString(),
          role: 'superego',
          content: errorDetail,
          timestamp: new Date().toISOString(),
          decision: 'ERROR'
        };
      }
    } else {
      throw new Error(`Provider ${provider} not configured or not supported`);
    }
  } catch (error: any) {
    console.error('General error in streamSuperEgoResponse:', error);
    
    // Create a more detailed error message
    const errorDetail = `General Error: ${error.message || error}`;
    return {
      id: Date.now().toString(),
      role: 'superego',
      content: errorDetail,
      timestamp: new Date().toISOString(),
      decision: 'ERROR'
    };
  }
  
  // Check if we got a valid response
  if (!fullResponse) {
    let errorMessage = 'No response received from the API. ';
    
    // Provide helpful troubleshooting information
    if (provider === 'anthropic') {
      errorMessage += `
This could be due to:
1. Invalid API key - Check your Anthropic API key in .env or config
2. Invalid model name - The model may not exist or you may not have access
3. Rate limiting - You may have exceeded your API quota
4. Network issues - Check your internet connection

Try:
- Verifying your API key at https://console.anthropic.com
- Using a different model (e.g., claude-3-haiku-20240307)
- Checking your API usage and limits
- Using the OpenRouter provider instead`;
    } else if (provider === 'openrouter') {
      errorMessage += `
This could be due to:
1. Invalid API key - Check your OpenRouter API key in .env or config
2. Invalid model name - The model may not exist or you may not have access
3. Rate limiting - You may have exceeded your API quota
4. Network issues - Check your internet connection

Try:
- Verifying your API key at https://openrouter.ai/keys
- Using a different model
- Checking your API usage and limits
- Using the Anthropic provider instead`;
    }
    
    console.error(errorMessage);
    
    // Return an error response that will be displayed to the user
    return {
      id: Date.now().toString(),
      role: 'superego',
      content: errorMessage,
      timestamp: new Date().toISOString(),
      decision: 'ERROR'
    };
  }
  
  // Return the full response
  return {
    id: Date.now().toString(),
    role: 'superego',
    content: fullResponse,
    timestamp: new Date().toISOString(),
    decision: 'ANALYZED'
  };
}

/**
 * Stream a response from the base LLM model
 */
export async function streamBaseLLMResponse(
  userInput: string,
  conversationContext: Message[],
  config: Config,
  onContent: OnContentCallback
): Promise<string> {
  // Get the provider-specific model name for base LLM
  const provider = config.defaultProvider;
  const model = provider === 'anthropic' 
    ? config.anthropicBaseModel 
    : config.openrouterBaseModel;
  
  console.log('Using provider for base LLM:', provider);
  console.log('Using model for base LLM:', model);
  console.log('Conversation context length:', conversationContext.length);
  
  // Initialize clients
  const { anthropicClient, openrouterClient } = initClients(config);
  
  // Prepare messages with conversation context
  const messages = conversationContext
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  
  // Add the current user input if it's not already in the context
  // Check if the last message is from the user and has the same content
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== userInput) {
    messages.push({
      role: 'user',
      content: userInput
    });
  }
  
  console.log('Final messages array length:', messages.length);
  
  let fullResponse = '';
  
  try {
    if (provider === 'anthropic' && anthropicClient) {
      console.log('Using Anthropic API for base LLM with model:', model);
      
      try {
        // Convert messages to Anthropic format
        const anthropicMessages: Array<{role: 'user' | 'assistant', content: string}> = [];
        
        // Anthropic requires alternating user/assistant messages starting with a user message
        // If we have an even number of messages, we need to ensure we start with a user message
        if (messages.length > 0) {
          // Ensure the first message is from a user
          if (messages[0].role !== 'user') {
            // If the first message is not from a user, prepend a dummy user message
            anthropicMessages.push({
              role: 'user',
              content: 'Hello'
            });
          }
          
          // Process the messages
          for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            // Skip system messages as Anthropic handles them separately
            if (msg.role === 'user' || msg.role === 'assistant') {
              // If we have two consecutive messages with the same role, we need to combine them
              if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === msg.role) {
                anthropicMessages[anthropicMessages.length - 1].content += '\n\n' + msg.content;
              } else {
                anthropicMessages.push({
                  role: msg.role,
                  content: msg.content
                });
              }
            }
          }
          
          // Ensure we end with an assistant message if the last message is from a user
          if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === 'user') {
            // The next response will be from the assistant, so we don't need to add a dummy message
          }
        } else {
          // If we have no messages, add the user input
          anthropicMessages.push({
            role: 'user',
            content: userInput
          });
        }
        
        console.log('Anthropic messages prepared:', anthropicMessages.length);
        
        // Initialize the stream
        console.log('Initializing Anthropic stream for base LLM...');
        const stream = await anthropicClient.messages.stream({
          model: model,
          messages: anthropicMessages,
          max_tokens: 4000,
        });
        console.log('Anthropic stream initialized successfully for base LLM');
        
        for await (const chunk of stream) {
          // Handle different types of chunks from Anthropic API
          if (chunk.type === 'content_block_delta' && chunk.delta) {
            // Check if it's a text delta
            if ('text' in chunk.delta) {
              const content = chunk.delta.text;
              fullResponse += content;
              onContent(content);
            }
          }
        }
      } catch (error: any) {
        console.error('Anthropic API error in base LLM:', error);
        
        // Create a more detailed error message
        const errorDetail = `Anthropic API Error in base LLM: ${error.message || error}`;
        throw new Error(errorDetail);
      }
    } else if (provider === 'openrouter' && openrouterClient) {
      console.log('Using OpenRouter API for base LLM with model:', model);
      
      try {
        // Convert messages to OpenAI format
        const openaiMessages = messages.map(msg => {
          // Ensure role is one of the valid OpenAI roles
          let role: 'system' | 'user' | 'assistant';
          if (msg.role === 'user') {
            role = 'user';
          } else if (msg.role === 'assistant') {
            role = 'assistant';
          } else {
            // Default to user for any other role
            role = 'user';
          }
          
          return {
            role,
            content: msg.content
          };
        });
        
        console.log('OpenRouter messages prepared:', openaiMessages.length);
        
        // Initialize the stream
        console.log('Initializing OpenRouter stream for base LLM...');
        const stream = await openrouterClient.chat.completions.create({
          model: model,
          messages: openaiMessages,
          stream: true,
        });
        console.log('OpenRouter stream initialized successfully for base LLM');
        
        for await (const chunk of stream) {
          if (chunk.choices && chunk.choices[0].delta.content) {
            const content = chunk.choices[0].delta.content;
            fullResponse += content;
            onContent(content);
          }
        }
      } catch (error: any) {
        console.error('OpenRouter API error in base LLM:', error);
        
        // Create a more detailed error message
        const errorDetail = `OpenRouter API Error in base LLM: ${error.message || error}`;
        throw new Error(errorDetail);
      }
    } else {
      throw new Error(`Provider ${provider} not configured or not supported`);
    }
  } catch (error: any) {
    console.error(`Error in streamBaseLLMResponse: ${error.message || error}`);
    
    // Check if we got a valid response
    if (!fullResponse) {
      let errorMessage = 'No response received from the API for base LLM. ';
      
      // Provide helpful troubleshooting information
      if (provider === 'anthropic') {
        errorMessage += `
This could be due to:
1. Invalid API key - Check your Anthropic API key in .env or config
2. Invalid model name - The model "${config.anthropicBaseModel}" may not exist or you may not have access
3. Rate limiting - You may have exceeded your API quota
4. Network issues - Check your internet connection
5. Message format issues - Anthropic requires alternating user/assistant messages

Try:
- Verifying your API key at https://console.anthropic.com
- Using a different model (e.g., claude-3-haiku-20240307)
- Checking your API usage and limits
- Using the OpenRouter provider instead`;
      } else if (provider === 'openrouter') {
        errorMessage += `
This could be due to:
1. Invalid API key - Check your OpenRouter API key in .env or config
2. Invalid model name - The model "${config.openrouterBaseModel}" may not exist or you may not have access
3. Rate limiting - You may have exceeded your API quota
4. Network issues - Check your internet connection

Try:
- Verifying your API key at https://openrouter.ai/keys
- Using a different model
- Checking your API usage and limits
- Using the Anthropic provider instead`;
      }
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    throw error;
  }
  
  return fullResponse;
}
