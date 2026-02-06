/**
 * InlineDiscuss Component
 * 
 * Provides follow-up discussion capability for analysis results.
 */

import * as React from 'react';
import { MessageCircle, Send } from 'lucide-react';

interface InlineDiscussProps {
  anchorText: string;
  anchorType: 'clause' | 'output' | 'document' | 'general';
}

export const InlineDiscuss: React.FC<InlineDiscussProps> = ({
  anchorText,
  anchorType,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    try {
      // TODO: Implement follow-up discussion API call
      console.log('[InlineDiscuss] Submitting:', { message, anchorText, anchorType });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('');
    } catch (error) {
      console.error('[InlineDiscuss] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="inline-discuss">
      <button
        type="button"
        className="inline-discuss-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageCircle size={14} />
        <span>Follow up</span>
      </button>

      {isOpen && (
        <form className="inline-discuss-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="inline-discuss-input"
            placeholder="Ask a follow-up question..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="inline-discuss-submit"
            disabled={!message.trim() || isLoading}
          >
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  );
};

export default InlineDiscuss;


