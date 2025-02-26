/**
 * Interface for a superego constitution
 */
export interface Prompt {
  id: string;
  name: string;
  content: string;
  isBuiltIn: boolean;
  lastUpdated: string;
}
