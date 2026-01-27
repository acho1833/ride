'use client';

import { ToolbarPositions } from '@/stores/ui/ui.store';
import MainPanelsComponent from '@/components/main-panels/main-panels.component';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send } from 'lucide-react';

interface Props {
  pos: ToolbarPositions;
}

/** Simulated AI response delay in milliseconds */
const AI_RESPONSE_DELAY_MS = 1500;

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const PromptsComponent = ({ pos }: Props) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Claude, your AI assistant. How can I help you today?",
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '2',
      role: 'user',
      content: 'Can you help me understand React hooks?',
      timestamp: new Date(Date.now() - 240000)
    },
    {
      id: '3',
      role: 'assistant',
      content:
        'Of course! React hooks are functions that let you use state and other React features in functional components. The most common hooks are useState for managing state, useEffect for side effects, and useContext for consuming context. Would you like me to explain any specific hook in detail?',
      timestamp: new Date(Date.now() - 180000)
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'd be happy to help with that! This is a mock response. In a real application, this would be replaced with an actual API call to an AI service.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, AI_RESPONSE_DELAY_MS);
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <MainPanelsComponent title="AI Prompts" pos={pos} focusPanelType="prompt">
      <div className="bg-background flex h-full flex-col">
        <div className="flex-1 p-5">
          <div className="h-full rounded-2xl border p-2">Sample Response</div>
        </div>
        {/* Input Area */}
        <div className="border-border bg-background border-t px-6 py-4">
          <div className="flex items-end gap-3">
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="max-h-32 resize-none rounded-2xl px-4 py-3 pr-12"
                rows={1}
                disabled={isLoading}
              />
              <Button variant="ghost" size="icon" type="button" className="absolute right-2 bottom-2">
                <Paperclip className="h-5 w-5" />
              </Button>
            </div>
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} className="rounded-2xl px-5 py-3">
              <span>Send</span>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </MainPanelsComponent>
  );
};

export default PromptsComponent;
