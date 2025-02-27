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
  superEgoConstitutionFile: string;
  superEgoThinkingBudget: number; // Property for thinking token budget
  contextMessageLimit: number | null; // Property for limiting the number of messages in context (null means unlimited)
  saveHistory: boolean;
}

// Define the message type
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'superego';
  content: string;
  timestamp: string;
  decision?: string;
  constitutionId?: string; // The ID of the constitution used for this message
  thinking?: string; // The thinking content from Claude's extended thinking feature
  thinkingTime?: string | null; // How long the thinking process took in seconds
  withoutSuperego?: string; // The response without superego context (for comparison)
}

// Define the streaming callback type
export type OnContentCallback = (content: string) => void;

/**
 * Get the superego constitution based on the constitution ID
 */
export async function getConstitution(constitutionId: string): Promise<string> {
  // First check custom constitutions in localStorage
  const savedConstitutions = localStorage.getItem('superego-constitutions');
  if (savedConstitutions) {
    try {
      const customConstitutions = JSON.parse(savedConstitutions);
      const customConstitution = customConstitutions.find((p: any) => p.id === constitutionId);
      if (customConstitution) {
        return customConstitution.content;
      }
    } catch (error) {
      console.error('Error parsing saved constitutions:', error);
    }
  }
  
  // Then try to fetch from the constitutions.json file
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}constitutions.json`);
    if (response.ok) {
      const data = await response.json();
      const constitution = data.constitutions.find((p: any) => p.id === constitutionId);
      if (constitution) {
        return constitution.content;
      } else {
        console.error(`Constitution with ID ${constitutionId} not found in constitutions.json`);
      }
    } else {
      console.error('Failed to load constitutions.json file');
    }
  } catch (error) {
    console.error('Error loading constitutions.json file:', error);
  }
  
  // Throw an error if the constitution cannot be found
  throw new Error(`Constitution with ID ${constitutionId} not found. Make sure constitutions.json is properly configured.`);
}

/**
 * Get the assistant prompt based on the prompt ID
 */
export async function getAssistantPrompt(promptId: string = "assistant_default"): Promise<string> {
  // Try to fetch from the prompts.json file
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}prompts.json`);
    if (response.ok) {
      const data = await response.json();
      const prompt = data.prompts.find((p: any) => p.id === promptId);
      if (prompt) {
        return prompt.content;
      } else {
        console.error(`Assistant prompt with ID ${promptId} not found in prompts.json`);
      }
    } else {
      console.error('Failed to load prompts.json file');
    }
  } catch (error) {
    console.error('Error loading prompts.json file:', error);
  }
  
  // Return a default prompt if the requested one cannot be found
  console.warn(`Using default assistant prompt as ${promptId} was not found`);
  return "You are equipped with a superego agent that screens user requests for potential harm before they reach you. You may see outputs from this superego agent in the chat alongside user messages. The superego evaluates each user message and decides whether to allow it to proceed to you. \n\nWhen you see messages from the superego, they represent this screening process and are not part of the user's direct communication with you. You should not respond to or mention these superego messages in your replies. Simply take them into consideration when formulating your responses to the user.";
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
  onContent: OnContentCallback,
  onThinking?: OnContentCallback, // Optional callback for thinking content
  conversationContext?: Message[] // Optional conversation context
): Promise<Message> {
  // Get the provider-specific model name for superego
  const provider = config.defaultProvider;
  const model = provider === 'anthropic' 
    ? config.anthropicSuperEgoModel 
    : config.openrouterSuperEgoModel;
  
  // Initialize clients
  const { anthropicClient, openrouterClient } = initClients(config);
  
  // Apply message limit to conversation context if provided
  let limitedContext: Message[] | undefined = undefined;
  if (conversationContext) {
    limitedContext = applyMessageLimit(conversationContext, config.contextMessageLimit);
    console.log(`Superego message limit applied: ${limitedContext.length}/${conversationContext.length} messages included`);
  }
  
  // Get instructions from the configured constitution file
  const systemPrompt = await getConstitution(config.superEgoConstitutionFile);
  // Check if this is the special test string for redacted thinking
  const isRedactedThinkingTest = userInput.includes('ANTHROPIC_MAGIC_STRING_TRIGGER_REDACTED_THINKING_46C9A13E193C177646C7398A98432ECCCE4C1253D5E2D82641AC0E52CC2876CB');
  
  // If it's the test string, use it directly; otherwise, prepend with the evaluation instruction
  const userMessage = isRedactedThinkingTest 
    ? userInput 
    : `Evaluate this user input: ${userInput}`;
  
  let fullResponse = '';
  let internalThinking = ''; // Store the thinking content
  
  try {
    if (provider === 'anthropic' && anthropicClient) {
      console.log('Using Anthropic API with model:', model);
      console.log('System prompt:', systemPrompt);
      console.log('User message:', userMessage);
      
      try {
        console.log('Initializing Anthropic stream with thinking enabled...');
        
        // Calculate max_tokens based on thinking budget
        // max_tokens must be higher than thinking budget
        const thinkingBudget = config.superEgoThinkingBudget || 4000;
        const maxTokens = Math.max(1000, thinkingBudget + 1000); // Ensure max_tokens is at least 1000 more than thinking budget
        
        console.log(`Using thinking budget: ${thinkingBudget}, max_tokens: ${maxTokens}`);
        
        const stream = await anthropicClient.messages.stream({
          model: model,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          max_tokens: maxTokens,
          thinking: {
            type: "enabled",
            budget_tokens: thinkingBudget
          }
        });
        console.log('Anthropic stream initialized successfully');
        
        for await (const chunk of stream) {
          // Handle different types of chunks from Anthropic API
          if (chunk.type === 'content_block_delta' && chunk.delta) {
            // Handle thinking content
            // The property might be 'thinking_delta', 'thinking', or 'redacted_thinking' depending on the API version
            if ('thinking_delta' in chunk.delta) {
              internalThinking += chunk.delta.thinking_delta;
              console.log('Received thinking_delta chunk:', chunk.delta.thinking_delta);
              // Call the onThinking callback if provided
              if (onThinking && typeof chunk.delta.thinking_delta === 'string') {
                onThinking(chunk.delta.thinking_delta);
              }
            } else if ('thinking' in chunk.delta) {
              internalThinking += chunk.delta.thinking;
              console.log('Received thinking chunk:', chunk.delta.thinking);
              // Call the onThinking callback if provided
              if (onThinking && typeof chunk.delta.thinking === 'string') {
                onThinking(chunk.delta.thinking);
              }
            } else if ('redacted_thinking' in chunk.delta) {
              // Handle redacted thinking - this is encrypted content
              console.log('Received redacted_thinking chunk:', chunk.delta.redacted_thinking);
              // Include the encrypted content directly - it will be passed back to the API in future requests
              const redactedContent = `[REDACTED THINKING (encrypted): ${chunk.delta.redacted_thinking}]`;
              internalThinking += redactedContent;
              // Call the onThinking callback if provided
              if (onThinking) {
                onThinking(redactedContent);
              }
            } else if ('text' in chunk.delta) {
              // This is the final decision to show to the user
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
  
  // Calculate approximate token count (rough estimate: ~4 chars per token)
  const thinkingTokenCount = Math.round(internalThinking.length / 4);
  
  // Return the full response with thinking data
  return {
    id: Date.now().toString(),
    role: 'superego',
    content: fullResponse,
    timestamp: new Date().toISOString(),
    decision: 'ANALYZED',
    thinking: internalThinking, // Store the thinking content
    thinkingTime: thinkingTokenCount.toString() // Store thinking token count as a string
  };
}

/**
 * Apply message limit to conversation context
 */
function applyMessageLimit(messages: Message[], limit: number | null): Message[] {
  if (limit === null || limit <= 0 || messages.length <= limit) {
    return messages; // Return all messages if no limit or limit is not exceeded
  }
  
  // Return the most recent 'limit' messages
  return messages.slice(-limit);
}

/**
 * Stream a response from the base LLM model without superego context
 * This is used for comparison purposes
 */
export async function streamBaseLLMResponseWithoutSuperego(
  userInput: string,
  conversationContext: Message[],
  config: Config
): Promise<string> {
  // Get the provider-specific model name for base LLM
  const provider = config.defaultProvider;
  const model = provider === 'anthropic' 
    ? config.anthropicBaseModel 
    : config.openrouterBaseModel;
  
  console.log('Using provider for base LLM (without superego):', provider);
  console.log('Using model for base LLM (without superego):', model);
  
  // Initialize clients
  const { anthropicClient, openrouterClient } = initClients(config);
  
  // Apply message limit if configured
  const limitedContext = applyMessageLimit(conversationContext, config.contextMessageLimit);
  console.log(`Message limit applied: ${limitedContext.length}/${conversationContext.length} messages included`);
  
  // Prepare messages without superego context
  const filteredMessages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = [];
  
  // Filter out superego messages from the conversation context
  for (let i = 0; i < limitedContext.length; i++) {
    const msg = limitedContext[i];
    
    if (msg.role === 'user') {
      // Include user messages as-is
      filteredMessages.push({
        role: 'user',
        content: msg.content
      });
    } else if (msg.role === 'assistant') {
      // Include assistant messages as-is
      filteredMessages.push({
        role: 'assistant',
        content: msg.content
      });
    }
    // Skip superego messages entirely
  }
  
  const messages = filteredMessages;
  
  // Add the current user input if it's not already in the context
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== userInput) {
    messages.push({
      role: 'user',
      content: userInput
    });
  }
  
  console.log('Filtered messages array length (without superego):', messages.length);
  
  let fullResponse = '';
  
  try {
    if (provider === 'anthropic' && anthropicClient) {
      console.log('Using Anthropic API for base LLM (without superego)');
      
      try {
        // Convert messages to Anthropic format
        const anthropicMessages: Array<{role: 'user' | 'assistant', content: string}> = [];
        
        // Anthropic requires alternating user/assistant messages starting with a user message
        if (messages.length > 0) {
          // Ensure the first message is from a user
          if (messages[0].role !== 'user') {
            anthropicMessages.push({
              role: 'user',
              content: 'Hello'
            });
          }
          
          // Process the messages
          for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            
            if (msg.role === 'system') {
              // For system messages, add them to the previous user message or create a new user message
              if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === 'user') {
                anthropicMessages[anthropicMessages.length - 1].content += '\n\n' + msg.content;
              } else {
                anthropicMessages.push({
                  role: 'user',
                  content: msg.content
                });
              }
            } else if (msg.role === 'user' || msg.role === 'assistant') {
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
        } else {
          // If we have no messages, add the user input
          anthropicMessages.push({
            role: 'user',
            content: userInput
          });
        }
        
        // Get the assistant system prompt from the prompts.json file
        const systemPrompt = await getAssistantPrompt("assistant_default");
        
        // Make the API call without streaming
        const response = await anthropicClient.messages.create({
          model: model,
          system: systemPrompt,
          messages: anthropicMessages,
          max_tokens: 4000,
        });
        
        if (response.content && response.content.length > 0) {
          for (const block of response.content) {
            if (block.type === 'text') {
              fullResponse += block.text;
            }
          }
        }
      } catch (error: any) {
        console.error('Anthropic API error in base LLM (without superego):', error);
        throw new Error(`Anthropic API Error in base LLM (without superego): ${error.message || error}`);
      }
    } else if (provider === 'openrouter' && openrouterClient) {
      console.log('Using OpenRouter API for base LLM (without superego)');
      
      try {
        const openaiMessages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];
        
        // Process the messages
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          // Map roles to OpenAI format
          if (msg.role === 'user') {
            openaiMessages.push({
              role: 'user',
              content: msg.content
            });
          } else if (msg.role === 'assistant') {
            openaiMessages.push({
              role: 'assistant',
              content: msg.content
            });
          } else if (msg.role === 'system') {
            openaiMessages.push({
              role: 'system',
              content: msg.content
            });
          }
        }
        
        // Get the assistant system prompt from the prompts.json file
        const systemPrompt = await getAssistantPrompt("assistant_default");
        
        // Add system message to the beginning of the messages array
        openaiMessages.unshift({
          role: 'system',
          content: systemPrompt
        });
        
        // Make the API call without streaming
        const response = await openrouterClient.chat.completions.create({
          model: model,
          messages: openaiMessages,
        });
        
        if (response.choices && response.choices.length > 0 && response.choices[0].message.content) {
          fullResponse = response.choices[0].message.content;
        }
      } catch (error: any) {
        console.error('OpenRouter API error in base LLM (without superego):', error);
        throw new Error(`OpenRouter API Error in base LLM (without superego): ${error.message || error}`);
      }
    } else {
      throw new Error(`Provider ${provider} not configured or not supported`);
    }
  } catch (error: any) {
    console.error(`Error in streamBaseLLMResponseWithoutSuperego: ${error.message || error}`);
    throw error;
  }
  
  return fullResponse;
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
  
  // Apply message limit if configured
  const limitedContext = applyMessageLimit(conversationContext, config.contextMessageLimit);
  console.log(`Message limit applied: ${limitedContext.length}/${conversationContext.length} messages included`);
  console.log('Limited conversation context:', JSON.stringify(limitedContext, null, 2));
  
  // Prepare messages with conversation context
  // We'll create a new array to hold the processed messages
  const processedMessages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = [];
  
  // First, let's process all messages in the conversation context
  for (let i = 0; i < limitedContext.length; i++) {
    const msg = limitedContext[i];
    
    if (msg.role === 'user') {
      // Include user messages as-is
      processedMessages.push({
        role: 'user',
        content: msg.content
      });
    } else if (msg.role === 'assistant') {
      // Include assistant messages as-is
      processedMessages.push({
        role: 'assistant',
        content: msg.content
      });
    } else if (msg.role === 'superego') {
      // Include superego messages as system messages
      processedMessages.push({
        role: 'system',
        content: `[SUPEREGO EVALUATION]: ${msg.content}`
      });
      
      // If this superego message has thinking content, include it as well
      if (msg.thinking && msg.thinking.length > 0) {
        processedMessages.push({
          role: 'system',
          content: `[SUPEREGO THINKING]: ${msg.thinking}`
        });
      }
    }
  }
  
  const messages = processedMessages;
  
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
  console.log('Processed messages:', JSON.stringify(messages, null, 2));
  
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
            
            if (msg.role === 'system') {
              // For system messages, add them to the previous user message or create a new user message
              if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === 'user') {
                // Add to previous user message
                anthropicMessages[anthropicMessages.length - 1].content += '\n\n' + msg.content;
              } else {
                // Create a new user message
                anthropicMessages.push({
                  role: 'user',
                  content: msg.content
                });
              }
            } else if (msg.role === 'user' || msg.role === 'assistant') {
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
        console.log('Anthropic messages:', JSON.stringify(anthropicMessages, null, 2));
        
        // Get the assistant system prompt from the prompts.json file
        const systemPrompt = await getAssistantPrompt("assistant_default");
        
        // Initialize the stream
        console.log('Initializing Anthropic stream for base LLM...');
        const stream = await anthropicClient.messages.stream({
          model: model,
          system: systemPrompt,
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
        const openaiMessages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];
        
        // Process the messages
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          // Map roles to OpenAI format
          if (msg.role === 'user') {
            openaiMessages.push({
              role: 'user',
              content: msg.content
            });
          } else if (msg.role === 'assistant') {
            openaiMessages.push({
              role: 'assistant',
              content: msg.content
            });
          } else if (msg.role === 'system') {
            openaiMessages.push({
              role: 'system',
              content: msg.content
            });
          }
        }
        
        console.log('OpenRouter messages prepared:', openaiMessages.length);
        console.log('OpenRouter messages:', JSON.stringify(openaiMessages, null, 2));
        
        // Get the assistant system prompt from the prompts.json file
        const systemPrompt = await getAssistantPrompt("assistant_default");
        
        // Add system message to the beginning of the messages array
        openaiMessages.unshift({
          role: 'system',
          content: systemPrompt
        });
        
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
  
  // Also generate a response without superego context for comparison
  try {
    const withoutSuperego = await streamBaseLLMResponseWithoutSuperego(userInput, conversationContext, config);
    console.log('Generated response without superego for comparison');
    
    // Store the withoutSuperego response in a global variable that can be accessed by the Chat component
    (window as any).lastResponseWithoutSuperego = withoutSuperego;
  } catch (error) {
    console.error('Error generating response without superego:', error);
    // Don't throw the error, just log it - we still want to return the main response
  }
  
  return fullResponse;
}
