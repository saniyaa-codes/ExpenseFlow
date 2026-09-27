import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Mic,
  MicOff,
  Send,
  X,
  Check,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { handleTransactionBudgetAlerts } from '../../utils/mobileNotification';
import './AIChatDrawer.css';

const QUICK_PROMPTS = [
  'What is my total income?',
  'What is my remaining budget?',
  'What category do I spend the most on?',
  'What are my recent expenses?',
  'How do I use recurring income and budget?',
  'How can I reduce my spending?',
];

export default function AIChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am ExpenseFlow AI. You can ask me about your spending trends, affordability for large purchases, or log expenses by speaking.',
      time: 'Just now',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [stagedProposal, setStagedProposal] = useState(null);
  const [statusFeedback, setStatusFeedback] = useState('');

  const messagesEndRef = useRef(null);
  const { formatAmount } = useCurrency();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, stagedProposal, isOpen]);

  // Listen for global open event
  useEffect(() => {
    const handleOpenChatEvent = (e) => {
      setIsOpen(true);
      if (e.detail?.voice) {
        setTimeout(() => {
          handleVoiceListen();
        }, 350);
      }
    };

    window.addEventListener('open-ai-chat', handleOpenChatEvent);
    return () => window.removeEventListener('open-ai-chat', handleOpenChatEvent);
  }, []);

  // Text-To-Speech
  const speakText = (text) => {
    if (!isTTSEnabled || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const cleanText = text
        .replace(/[*_#`~]/g, '')
        .replace(/🎙️|✅|⚠️|•/g, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis warning:', err);
      setIsSpeaking(false);
    }
  };

  // Helper: Detect if user input is an in-flight correction
  const handlePotentialCorrection = (text) => {
    if (!stagedProposal || stagedProposal.length === 0) return false;

    const lower = text.toLowerCase();
    const isCorrection =
      lower.includes('actually') ||
      lower.includes('change') ||
      lower.includes('make it') ||
      lower.includes('instead') ||
      lower.includes('no ');

    if (!isCorrection) return false;

    const numMatch = text.match(/(\d+[\d,]*)/);
    if (numMatch) {
      const newAmount = parseInt(numMatch[0].replace(/,/g, ''), 10);
      const updated = stagedProposal.map((p) => ({ ...p, amount: newAmount }));
      setStagedProposal(updated);

      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'user', text, time: 'Just now' },
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `Updated the amount to ${formatAmount(newAmount)}. Ready to confirm?`,
          time: 'Just now',
        },
      ]);
      speakText(`Updated the amount to ${newAmount} rupees.`);
      return true;
    }

    return false;
  };

  // Web Speech Recognition Handler
  const handleVoiceListen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setStatusFeedback('🎙️ Listening... Speak now (e.g. "I spent 850 on groceries")');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setStatusFeedback(`Heard: "${transcript}"`);

      // 1. Check if it's a correction to an existing proposal
      if (handlePotentialCorrection(transcript)) {
        return;
      }

      // 2. Check if it's a confirmation or cancellation keyword
      if (stagedProposal) {
        const lowerText = transcript.toLowerCase();
        if (lowerText.includes('confirm') || lowerText.includes('yes') || lowerText.includes('add it') || lowerText.includes('delete it')) {
          handleConfirmProposal();
          return;
        }
        if (lowerText.includes('cancel') || lowerText.includes('no') || lowerText.includes('stop') || lowerText.includes('abort')) {
          setStagedProposal(null);
          setStatusFeedback('Cancelled.');
          setMessages((prev) => [
            ...prev,
            { id: Date.now(), sender: 'user', text: `🎙️ "${transcript}"`, time: 'Just now' },
            { id: Date.now() + 1, sender: 'ai', text: 'Action cancelled.', time: 'Just now' },
          ]);
          speakText('Action cancelled.');
          return;
        }
      }

      // 3. Add as user message
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'user', text: `🎙️ "${transcript}"`, time: 'Just now' },
      ]);

      // 4. Check if it's a question or a transaction entry
      const lower = transcript.toLowerCase();
      const isQuestion =
        lower.includes('how much') ||
        lower.includes('how do i') ||
        lower.includes('how to') ||
        lower.includes('afford') ||
        lower.includes('where did') ||
        lower.includes('how can') ||
        lower.includes('summary') ||
        lower.includes('what is') ||
        lower.includes('what are') ||
        lower.includes('what does') ||
        lower.includes('did i') ||
        lower.includes('compare') ||
        lower.includes('budget') ||
        lower.includes('recurring') ||
        lower.includes('goal') ||
        lower.includes('who are you') ||
        lower.includes('how are you') ||
        lower.includes('save');

      if (isQuestion) {
        setIsLoading(true);
        try {
          const historyPayload = messages.slice(-8).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            text: m.text,
          }));

          const res = await api.post('/ai/chat', {
            message: transcript,
            conversationHistory: historyPayload,
          });

          if (res.success && res.data) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 1,
                sender: 'ai',
                text: res.data.reply,
                actionSuggestion: res.data.actionSuggestion,
                time: 'Just now',
              },
            ]);
            speakText(res.data.reply);
          }
        } catch (err) {
          setMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', text: `⚠️ ${err.message}`, time: 'Just now' },
          ]);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 5. Parse voice transaction (Add or Delete)
      try {
        setIsLoading(true);
        const res = await api.post('/ai/parse-voice', { transcript });

        if (res.success && res.data?.type === 'INCOMPLETE_PROPOSAL') {
          const askMsg = res.data.reply || 'Please specify the amount and category.';
          setMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', text: askMsg, time: 'Just now' },
          ]);
          speakText(askMsg);
          setStatusFeedback('Please clarify transaction details.');
        } else if (res.success && res.data?.proposals) {
          const promptQuestion = res.data.confirmationPrompt || `Add ${formatAmount(res.data.proposals[0].amount)} ${res.data.proposals[0].type || 'Expense'} → ${res.data.proposals[0].category} → Today?`;

          setStagedProposal({ type: 'ADD', items: res.data.proposals, promptQuestion });
          setStatusFeedback('Please say "Confirm" to save, or "Cancel" to abort.');
          setMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', text: promptQuestion, time: 'Just now' },
          ]);
          speakText(promptQuestion);
        } else if (res.success && res.data?.type === 'DELETE_PROPOSAL') {
          const tx = res.data.transactionToDelete;
          const deletePrompt = res.data.confirmationPrompt || `Delete ${formatAmount(tx.amount)} ${tx.category} transaction?`;

          setStagedProposal({ type: 'DELETE', item: tx, promptQuestion: deletePrompt });
          setStatusFeedback('Please say "Confirm" to delete, or "Cancel" to abort.');
          setMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', text: deletePrompt, time: 'Just now' },
          ]);
          speakText(deletePrompt);
        }
      } catch (err) {
        setStatusFeedback('');
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: 'ai', text: `Could not parse: ${err.message}`, time: 'Just now' },
        ]);
        speakText('Could not understand the transaction details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setStatusFeedback('Microphone permission was denied. Please allow microphone access in your browser settings.');
      } else if (e.error === 'no-speech') {
        setStatusFeedback('No speech was detected. Please try speaking again.');
      } else {
        setStatusFeedback(`Microphone notice: ${e.error}`);
      }
      console.warn('Speech recognition notice:', e.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn('Could not start recognition:', err);
      setIsListening(false);
    }
  };

  // Text Message Submission
  const handleSendMessage = async (textToSend) => {
    const text = (typeof textToSend === 'string' ? textToSend : inputMessage).trim();
    if (!text) return;

    setInputMessage('');

    // Stop ongoing speech
    if (isSpeaking && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    // Check for correction
    if (handlePotentialCorrection(text)) {
      return;
    }

    const newMessages = [
      ...messages,
      { id: Date.now(), sender: 'user', text, time: 'Just now' },
    ];
    setMessages(newMessages);

    setIsLoading(true);
    setStatusFeedback('');

    try {
      const historyPayload = newMessages.slice(-8).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        text: m.text,
      }));

      const res = await api.post('/ai/chat', {
        message: text,
        conversationHistory: historyPayload,
      });

      if (res.success && res.data) {
        if (res.data.isTransactionProposal && res.data.proposals) {
          const promptQuestion = res.data.confirmationPrompt || res.data.reply;
          setStagedProposal({ type: 'ADD', items: res.data.proposals, promptQuestion });
          setStatusFeedback('Please say "Confirm" to save, or "Cancel" to abort.');
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              sender: 'ai',
              text: promptQuestion,
              time: 'Just now',
            },
          ]);
          speakText(promptQuestion);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              sender: 'ai',
              text: res.data.reply,
              actionSuggestion: res.data.actionSuggestion,
              time: 'Just now',
            },
          ]);
          speakText(res.data.reply);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: `Error: ${err.message}`, time: 'Just now' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save or Delete Confirmed Transactions
  const handleConfirmProposal = async () => {
    if (!stagedProposal) return;

    setIsLoading(true);
    try {
      if (stagedProposal.type === 'ADD' && stagedProposal.items) {
        for (const item of stagedProposal.items) {
          const res = await api.post('/transactions', item);
          if (res.data?.budgetAlerts?.length > 0) {
            handleTransactionBudgetAlerts(res.data.budgetAlerts);
          }
        }

        const count = stagedProposal.items.length;
        const first = stagedProposal.items[0];
        const successMsg = count === 1
          ? `Added ${formatAmount(first.amount)} ${first.type || 'expense'} for ${first.category}.`
          : `Added ${count} transaction(s) successfully!`;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: 'ai',
            text: `✅ ${successMsg}`,
            time: 'Just now',
          },
        ]);
        speakText(count === 1 ? `Added ${first.amount} rupees for ${first.category}.` : 'Transactions saved.');
      } else if (stagedProposal.type === 'DELETE' && stagedProposal.item) {
        await api.delete(`/transactions/${stagedProposal.item.id}`);
        const delMsg = `Deleted ${stagedProposal.item.category} transaction of ${formatAmount(stagedProposal.item.amount)}.`;
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: 'ai',
            text: `🗑️ ${delMsg}`,
            time: 'Just now',
          },
        ]);
        speakText(`Deleted ${stagedProposal.item.amount} rupees for ${stagedProposal.item.category}.`);
      }

      setStagedProposal(null);
      setStatusFeedback('');
      window.dispatchEvent(new CustomEvent('transaction-updated'));
    } catch (err) {
      alert(`Operation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          className="ef-ai-fab"
          onClick={() => setIsOpen(true)}
          title="Open ExpenseFlow AI"
        >
          <Bot size={20} />
          <span className="ef-ai-fab__label">Ask ExpenseFlow AI</span>
          <span className="ef-ai-fab__sparkle">
            <Sparkles size={14} />
          </span>
        </button>
      )}

      {/* AI Assistant Drawer */}
      {isOpen && (
        <div className="ef-ai-drawer">
          <div className="ef-ai-drawer__header">
            <div className="ef-ai-drawer__title-wrap">
              <div className="ef-ai-avatar">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="ef-ai-drawer__title">ExpenseFlow AI</h3>
                <span className="ef-ai-drawer__status">Financial Assistant</span>
              </div>
            </div>

            <div className="ef-ai-header-actions">
              {/* Mute / Unmute Voice */}
              <button
                type="button"
                className={`ef-ai-icon-btn ${isTTSEnabled ? 'ef-ai-icon-btn--active' : ''}`}
                onClick={() => {
                  if (isSpeaking) {
                    window.speechSynthesis?.cancel();
                    setIsSpeaking(false);
                  }
                  setIsTTSEnabled(!isTTSEnabled);
                }}
                title={isTTSEnabled ? 'Voice output active (Click to mute)' : 'Voice output muted (Click to enable)'}
              >
                {isTTSEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                type="button"
                className="ef-ai-close-btn"
                onClick={() => {
                  if (isSpeaking) {
                    window.speechSynthesis?.cancel();
                    setIsSpeaking(false);
                  }
                  setIsOpen(false);
                }}
                aria-label="Close AI chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Status banner */}
          {statusFeedback && (
            <div className="ef-ai-feedback-banner">
              <span>{statusFeedback}</span>
            </div>
          )}

          {/* Quick Prompt Chips */}
          <div className="ef-ai-quick-chips">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="ef-ai-chip"
                onClick={() => handleSendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="ef-ai-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`ef-ai-msg ${msg.sender === 'user' ? 'ef-ai-msg--user' : 'ef-ai-msg--ai'}`}
              >
                <p className="ef-ai-msg__text">{msg.text}</p>
                <span className="ef-ai-msg__time">{msg.time}</span>
              </div>
            ))}

            {/* Staged Confirmation Card */}
            {stagedProposal && (
              <div className="ef-staged-proposal-card">
                <div className="ef-proposal-head">
                  <Badge variant={stagedProposal.type === 'DELETE' ? 'danger' : 'accent'} size="sm">
                    {stagedProposal.type === 'DELETE' ? 'CONFIRM DELETION' : 'CONFIRM TRANSACTION'}
                  </Badge>
                  <span className="ef-prop-meta">Confirmation Required</span>
                </div>

                {stagedProposal.promptQuestion && (
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                      marginBottom: '8px',
                    }}
                  >
                    {stagedProposal.promptQuestion}
                  </div>
                )}

                {stagedProposal.type === 'ADD' && stagedProposal.items && (
                  <div className="ef-proposal-list">
                    {stagedProposal.items.map((prop, idx) => (
                      <div key={idx} className="ef-proposal-row">
                        <div>
                          <strong>{prop.category}</strong>
                          <span className="ef-prop-date"> ({prop.date})</span>
                        </div>
                        <strong className={prop.type === 'income' ? 'text-income' : 'text-expense'}>
                          {prop.type === 'income' ? '+' : '-'}{formatAmount(prop.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                {stagedProposal.type === 'DELETE' && stagedProposal.item && (
                  <div className="ef-proposal-list">
                    <div className="ef-proposal-row">
                      <div>
                        <strong>{stagedProposal.item.category}</strong>
                        <span className="ef-prop-date"> ({new Date(stagedProposal.item.date).toLocaleDateString()})</span>
                      </div>
                      <strong className="text-expense">
                        -{formatAmount(stagedProposal.item.amount)}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="ef-proposal-btns">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStagedProposal(null);
                      setStatusFeedback('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={stagedProposal.type === 'DELETE' ? 'danger' : 'primary'}
                    size="sm"
                    onClick={handleConfirmProposal}
                    isLoading={isLoading}
                    icon={Check}
                  >
                    {stagedProposal.type === 'DELETE' ? 'Confirm Delete' : 'Confirm'}
                  </Button>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="ef-ai-typing-indicator">
                <span>ExpenseFlow AI is thinking...</span>
              </div>
            )}

            {isSpeaking && (
              <div className="ef-ai-speaking-indicator">
                <Volume2 size={13} />
                <span>AI Speaking voice response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form */}
          <form className="ef-ai-input-form" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
            <button
              type="button"
              className={`ef-ai-mic-btn ${isListening ? 'ef-ai-mic-btn--active' : ''}`}
              onClick={handleVoiceListen}
              title={isListening ? 'Listening...' : 'Speak transaction or question'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              type="text"
              placeholder={isListening ? 'Listening to speech...' : 'Ask ExpenseFlow AI or speak...'}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="ef-ai-text-input"
              disabled={isListening}
            />

            <button
              type="submit"
              className="ef-ai-send-btn"
              disabled={!inputMessage.trim() || isLoading}
              title="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
