// /src/pages/Assistant.jsx
// Dedicated AI Assistant Page for Intellect Circle
// ChatGPT-inspired interface with Intellect Circle visual identity.

import React, { useState, useEffect, useRef, useCallback } from 'react';

const MAX_HISTORY = 6;

function renderMessageContent(text, navigateTo) {
  if (!text) return null;

  const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let searchIdx = 0;
  let mdMatch;

  while ((mdMatch = mdRegex.exec(text)) !== null) {
    const [fullMatch, label, url] = mdMatch;
    const matchStart = mdMatch.index;

    if (matchStart > searchIdx) {
      parts.push(text.slice(searchIdx, matchStart));
    }

    parts.push({ type: 'link', label, url });
    searchIdx = matchStart + fullMatch.length;
  }

  if (searchIdx < text.length) {
    parts.push(text.slice(searchIdx));
  }

  const finalElements = [];

  parts.forEach((part, partIdx) => {
    if (typeof part === 'object' && part.type === 'link') {
      const isInternal = part.url.startsWith('/') || part.url.includes('intellectcircle');
      const routePath = part.url.startsWith('/') ? part.url.slice(1) : '';

      finalElements.push(
        <a
          key={`mdlink-${partIdx}`}
          href={part.url}
          target={isInternal ? '_self' : '_blank'}
          rel={isInternal ? '' : 'noopener noreferrer'}
          onClick={(e) => {
            if (isInternal && navigateTo && routePath) {
              const cleanRoute = routePath.split('?')[0];
              if (['apply', 'contact', 'sessions', 'blog', 'verify', 'hierarchy', 'about', 'home'].includes(cleanRoute)) {
                e.preventDefault();
                navigateTo(cleanRoute);
              }
            }
          }}
          style={{
            color: 'var(--accent-color)',
            fontWeight: '600',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          {part.label}
        </a>
      );
    } else {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const subTokens = part.split(urlRegex);

      subTokens.forEach((token, tokIdx) => {
        if (!token) return;

        if (token.match(/^https?:\/\//)) {
          finalElements.push(
            <a
              key={`url-${partIdx}-${tokIdx}`}
              href={token}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent-color)',
                fontWeight: '600',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              {token}
            </a>
          );
        } else {
          finalElements.push(token);
        }
      });
    }
  });

  return finalElements;
}

export default function Assistant({ data, navigateTo }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  // Conversation (voice) mode state
  const [convoMode, setConvoMode] = useState(false);
  // Conversation states: 'idle' | 'listening' | 'thinking' | 'speaking'
  const [convoState, setConvoState] = useState('idle');
  // Dedicated user-only live transcript state
  const [liveUserTranscript, setLiveUserTranscript] = useState('');
  // Index of the message currently being spoken aloud (-1 = none)
  const [speakingIdx, setSpeakingIdx] = useState(-1);

  const messagesContainerRef = useRef(null);
  const transcriptScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');

  const convoModeRef = useRef(false);
  const convoStateRef = useRef('idle');
  const blockResultsRef = useRef(false);
  const inputRef = useRef('');
  const silenceTimerRef = useRef(null);
  const handleSendRef = useRef(null);
  const currentAudioRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const pendingTTSRef = useRef(false);

  // AbortControllers for active fetch requests to enable instant barge-in cancellation
  const chatbotAbortControllerRef = useRef(null);
  const ttsAbortControllerRef = useRef(null);

  // Helper to update state and ref synchronously
  const updateConvoState = useCallback((newState) => {
    convoStateRef.current = newState;
    setConvoState(newState);
  }, []);

  // Unlock browser audio context on user gesture
  const unlockAudio = useCallback(() => {
    try {
      const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
      silentAudio.play().catch(() => {});
      if (window.speechSynthesis && !window.speechSynthesis.speaking) {
        const dummy = new SpeechSynthesisUtterance("");
        dummy.volume = 0;
        window.speechSynthesis.speak(dummy);
      }
    } catch (_) {}
  }, []);

  // Auto-scroll the live user transcript box to bottom as speech streams in
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [liveUserTranscript, input]);

  // Stop speaking + cancel pending requests + reset state
  const stopSpeaking = useCallback(() => {
    isSpeakingRef.current = false;
    pendingTTSRef.current = false;
    
    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeakingIdx(-1);
  }, []);

  // Check for Web Speech API support and set up recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = '';

      let sessionTranscript = '';

      recognition.onstart = () => {
        sessionTranscript = '';
        setIsListening(true);
        if (convoModeRef.current && convoStateRef.current === 'idle') {
          updateConvoState('listening');
        }
      };

      recognition.onresult = (event) => {
        if (blockResultsRef.current) return;

        // BARGE-IN SUPPORT: If the user starts speaking while AI is speaking or thinking,
        // immediately stop AI audio playback, abort pending requests, and switch to listening!
        if (isSpeakingRef.current || pendingTTSRef.current || convoStateRef.current === 'thinking') {
          stopSpeaking();
          if (chatbotAbortControllerRef.current) {
            chatbotAbortControllerRef.current.abort();
            chatbotAbortControllerRef.current = null;
          }
          setLoading(false);
          updateConvoState('listening');
          baseTextRef.current = '';
          inputRef.current = '';
          sessionTranscript = '';
          setLiveUserTranscript('');
          setInput('');
        }

        let interimTranscript = '';
        let hasFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            sessionTranscript += event.results[i][0].transcript;
            hasFinal = true;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const combined = (baseTextRef.current ? baseTextRef.current + ' ' : '') +
          sessionTranscript + interimTranscript;
        const trimmed = combined.trimStart();
        inputRef.current = trimmed;
        setInput(trimmed);
        if (convoModeRef.current) {
          setLiveUserTranscript(trimmed);
        }

        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height =
            Math.min(textareaRef.current.scrollHeight, 140) + 'px';
        }

        // In conversation mode: reset silence timer to auto-send when user stops talking
        if (convoModeRef.current) {
          clearTimeout(silenceTimerRef.current);
          const silenceDelay = hasFinal ? 750 : 900;
          silenceTimerRef.current = setTimeout(() => {
            const text = inputRef.current.trim();
            if (text && convoModeRef.current && handleSendRef.current) {
              handleSendRef.current(text);
            }
          }, silenceDelay);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition error:', event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Auto-restart mic in conversation mode when naturally ended
        if (convoModeRef.current && !blockResultsRef.current && !isSpeakingRef.current && !pendingTTSRef.current && convoStateRef.current === 'listening') {
          setTimeout(() => {
            if (convoModeRef.current && !blockResultsRef.current && !isSpeakingRef.current && !pendingTTSRef.current) {
              try { recognition.start(); } catch (_) {}
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [stopSpeaking, updateConvoState]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => { convoModeRef.current = convoMode; }, [convoMode]);

  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
      if (chatbotAbortControllerRef.current) chatbotAbortControllerRef.current.abort();
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // ── Optimized Low-Latency Text-to-Speech (Cartesia streaming playback) ──
  const speakText = useCallback(async (text, idx, onDone) => {
    stopSpeaking();
    pendingTTSRef.current = true;
    isSpeakingRef.current = true;
    setSpeakingIdx(idx);
    if (convoModeRef.current) updateConvoState('speaking');

    let finished = false;
    const safeOnDone = () => {
      if (finished) return;
      finished = true;
      isSpeakingRef.current = false;
      pendingTTSRef.current = false;
      setSpeakingIdx(-1);
      onDone?.();
    };

    const watchdogTimer = setTimeout(() => {
      safeOnDone();
    }, 18000);

    const cleanup = () => {
      clearTimeout(watchdogTimer);
      safeOnDone();
    };

    const ttsAC = new AbortController();
    ttsAbortControllerRef.current = ttsAC;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: ttsAC.signal
      });

      if (!res.ok) throw new Error(`TTS API returned ${res.status}`);

      // Stream playback: process stream reader and trigger audio playback as fast as possible
      const reader = res.body.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      if (ttsAC.signal.aborted) {
        cleanup();
        return;
      }

      const audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
      const audioUrl  = URL.createObjectURL(audioBlob);
      const audio     = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        cleanup();
      };
      audio.onerror = (e) => {
        console.warn('Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        cleanup();
      };

      await audio.play();
    } catch (err) {
      if (err.name === 'AbortError') {
        cleanup();
        return;
      }
      console.warn('Cartesia TTS error, falling back to Web Speech API:', err);
      if (!window.speechSynthesis) {
        cleanup();
        return;
      }
      window.speechSynthesis.cancel();
      const clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/\S+/g, '');
      const utt = new SpeechSynthesisUtterance(clean);
      utt.rate = 1;
      utt.pitch = 1;
      utt.onend = () => cleanup();
      utt.onerror = () => cleanup();
      window.speechSynthesis.speak(utt);

      setTimeout(() => {
        if (!finished) cleanup();
      }, Math.max(3000, clean.length * 80));
    }
  }, [stopSpeaking, updateConvoState]);

  const toggleSpeak = useCallback((text, idx) => {
    if (speakingIdx === idx) { stopSpeaking(); return; }
    speakText(text, idx);
  }, [speakingIdx, speakText, stopSpeaking]);

  // ── Conversation Mode Toggle ──
  const toggleConvoMode = useCallback(() => {
    unlockAudio();
    setConvoMode(prev => {
      const next = !prev;
      if (next) {
        baseTextRef.current = '';
        inputRef.current = '';
        blockResultsRef.current = false;
        setInput('');
        setLiveUserTranscript('');
        updateConvoState('listening');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (_) {}
        }
      } else {
        clearTimeout(silenceTimerRef.current);
        if (chatbotAbortControllerRef.current) chatbotAbortControllerRef.current.abort();
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (_) {}
        }
        stopSpeaking();
        updateConvoState('idle');
      }
      return next;
    });
  }, [unlockAudio, stopSpeaking, updateConvoState]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  const buildHistory = useCallback(() => {
    return messages.slice(-MAX_HISTORY).map(m => ({
      role: m.role,
      content: m.text
    }));
  }, [messages]);

  const handleSend = useCallback(async (questionText) => {
    const q = (questionText || inputRef.current || input).trim();
    if (!q || loading) return;

    clearTimeout(silenceTimerRef.current);
    blockResultsRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }
    stopSpeaking();

    baseTextRef.current = '';
    inputRef.current = '';
    setInput('');
    if (convoModeRef.current) {
      setLiveUserTranscript(q);
      updateConvoState('thinking');
    }

    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setTimeout(() => { blockResultsRef.current = false; }, 250);

    const chatbotAC = new AbortController();
    chatbotAbortControllerRef.current = chatbotAC;

    let answerText = '';
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          history: buildHistory(),
          isVoice: convoModeRef.current
        }),
        signal: chatbotAC.signal
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        answerText = json.error || "Sorry, I couldn't answer that right now. Please try again.";
        setMessages(prev => [...prev, { role: 'assistant', text: answerText, isError: true }]);
      } else {
        answerText = json.answer || "I couldn't generate a response. Please try rephrasing.";
        setMessages(prev => [...prev, { role: 'assistant', text: answerText }]);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      answerText = "Sorry, I couldn't reach the assistant right now. Please check your connection and try again.";
      setMessages(prev => [...prev, { role: 'assistant', text: answerText, isError: true }]);
    } finally {
      setLoading(false);
      chatbotAbortControllerRef.current = null;

      if (convoModeRef.current && answerText) {
        setMessages(curr => {
          const replyIdx = curr.length - 1;
          speakText(answerText, replyIdx, () => {
            if (convoModeRef.current) {
              setLiveUserTranscript('');
              baseTextRef.current = '';
              inputRef.current = '';
              blockResultsRef.current = false;
              updateConvoState('listening');

              setTimeout(() => {
                if (convoModeRef.current && !isSpeakingRef.current && recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (_) {
                    try {
                      recognitionRef.current.abort();
                      setTimeout(() => recognitionRef.current?.start(), 80);
                    } catch (e) {}
                  }
                }
              }, 120);
            }
          });
          return curr;
        });
      } else {
        setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 50);
      }
    }
  }, [input, loading, buildHistory, speakText, stopSpeaking, updateConvoState]);

  handleSendRef.current = handleSend;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    inputRef.current = e.target.value;
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      baseTextRef.current = input.trimEnd();
      recognitionRef.current.start();
    }
  }, [isListening, input]);

  const clearChat = () => {
    clearTimeout(silenceTimerRef.current);
    if (chatbotAbortControllerRef.current) chatbotAbortControllerRef.current.abort();
    setMessages([]);
    setInput('');
    setLiveUserTranscript('');
    inputRef.current = '';
    if (recognitionRef.current) recognitionRef.current.abort();
    stopSpeaking();
    setConvoMode(false);
    updateConvoState('idle');
    baseTextRef.current = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus({ preventScroll: true });
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="assistant-page-wrapper">
      <div className="assistant-container">
        {/* Modern Minimal Header */}
        <header className="assistant-header-bar">
          <div className="assistant-header-branding">
            <div className="assistant-logo-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
              </svg>
            </div>
            <h1 className="assistant-header-title">
              Intellect Circle AI
              <span className="assistant-header-badge">Assistant</span>
            </h1>
          </div>

          <div className="assistant-header-actions">
            {hasMessages && (
              <button
                onClick={clearChat}
                className="assistant-clear-btn"
                title="Clear current conversation"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                <span>Clear</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Conversation Container */}
        <div ref={messagesContainerRef} className="assistant-messages-scroll">
          {!hasMessages ? (
            <div className="assistant-welcome-state">
              <div className="assistant-welcome-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 14.93V17a1 1 0 01-2 0v-.07A7 7 0 015.07 11H5a1 1 0 010-2h.07A7 7 0 0111 3.07V3a1 1 0 012 0v.07A7 7 0 0118.93 9H19a1 1 0 010 2h-.07A7 7 0 0113 16.93z" />
                </svg>
              </div>
              <h2 className="assistant-welcome-title">How can I help you today?</h2>
              <p className="assistant-welcome-subtitle">
                Get instant answers about Intellect Circle's community mission, learning sessions, articles, membership process, or digital certificates.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`assistant-message-row ${msg.role}`}
              >
                {msg.role === 'assistant' && (
                  <div className="assistant-avatar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                    </svg>
                  </div>
                )}
                <div className={`assistant-bubble ${msg.role} ${msg.isError ? 'error' : ''}`}>
                  {renderMessageContent(msg.text, navigateTo)}
                  {msg.role === 'assistant' && !msg.isError && window.speechSynthesis && (
                    <button
                      onClick={() => toggleSpeak(msg.text, idx)}
                      className={`assistant-speak-btn${speakingIdx === idx ? ' speaking' : ''}`}
                      title={speakingIdx === idx ? 'Stop reading' : 'Read aloud'}
                      aria-label={speakingIdx === idx ? 'Stop reading' : 'Read aloud'}
                    >
                      {speakingIdx === idx ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="assistant-message-row assistant">
              <div className="assistant-avatar">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                </svg>
              </div>
              <div className="assistant-typing-indicator">
                <span className="assistant-typing-dot" />
                <span className="assistant-typing-dot" />
                <span className="assistant-typing-dot" />
              </div>
            </div>
          )}
        </div>

        {/* Sticky Large Bottom Input Capsule */}
        <div className="assistant-input-fixed-container">
          <div className="assistant-input-box">
            <textarea
              ref={textareaRef}
              className={`assistant-input-textarea${isListening ? ' voice-active' : ''}`}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={isListening ? '🎙 Listening… speak now' : 'Message Intellect Circle AI...'}
              rows={1}
              maxLength={1000}
            />

            {/* Microphone Button */}
            {voiceSupported && (
              <button
                onClick={toggleVoice}
                disabled={loading}
                className={`assistant-mic-btn${isListening ? ' listening' : ''}`}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                title={isListening ? 'Click to stop listening' : 'Click to speak'}
              >
                {isListening ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                )}
              </button>
            )}

            {/* Start Voice Conversation Button (ChatGPT Voice Orb Icon) */}
            {voiceSupported && (
              <button
                onClick={toggleConvoMode}
                disabled={loading}
                className={`assistant-convo-btn${convoMode ? ' active' : ''}`}
                title={convoMode ? 'End voice conversation' : 'Start voice conversation'}
                aria-label={convoMode ? 'End voice conversation' : 'Start voice conversation'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="2"  y1="12" x2="2"  y2="12" className="convo-wave-bar" />
                  <line x1="6"  y1="8"  x2="6"  y2="16" className="convo-wave-bar" />
                  <line x1="10" y1="5"  x2="10" y2="19" className="convo-wave-bar" />
                  <line x1="14" y1="8"  x2="14" y2="16" className="convo-wave-bar" />
                  <line x1="18" y1="10" x2="18" y2="14" className="convo-wave-bar" />
                  <line x1="22" y1="12" x2="22" y2="12" className="convo-wave-bar" />
                </svg>
              </button>
            )}

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="assistant-send-btn"
              aria-label="Send message"
              title="Send message (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>

          <div className="assistant-disclaimer-text">
            Intellect Circle AI provides quick answers about community programs and membership.
            {navigateTo && (
              <div className="assistant-quick-actions">
                <button onClick={() => navigateTo('apply')} className="assistant-quick-action-btn">Apply for Membership</button>
                <span>•</span>
                <button onClick={() => navigateTo('contact')} className="assistant-quick-action-btn">Contact Us</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ChatGPT-Style Voice Conversation Overlay */}
      {convoMode && (
        <div className="assistant-voice-overlay">
          <div className="assistant-voice-header">
            <div className="assistant-voice-brand">
              <div className="assistant-voice-logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                </svg>
              </div>
              <div>
                <h3 className="assistant-voice-title">Intellect Circle AI</h3>
                <span className="assistant-voice-status-tag">Voice Conversation</span>
              </div>
            </div>
            <button
              onClick={toggleConvoMode}
              className="assistant-voice-close-btn"
              title="Close Voice Conversation"
              aria-label="Close Voice Conversation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Central Voice Orb & Dynamic Visualizer */}
          <div className="assistant-voice-body">
            <div className={`assistant-voice-orb ${convoState}`}>
              <div className="orb-ring ring-1"></div>
              <div className="orb-ring ring-2"></div>
              <div className="orb-ring ring-3"></div>
              <div className="orb-core">
                {convoState === 'thinking' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                    <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
                  </svg>
                ) : convoState === 'speaking' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="12" x2="4" y2="12" className="wave-line L1" />
                    <line x1="8" y1="8" x2="8" y2="16" className="wave-line L2" />
                    <line x1="12" y1="4" x2="12" y2="20" className="wave-line L3" />
                    <line x1="16" y1="8" x2="16" y2="16" className="wave-line L4" />
                    <line x1="20" y1="12" x2="20" y2="12" className="wave-line L5" />
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                )}
              </div>
            </div>

            <div className="assistant-voice-state-label">
              <span className={`assistant-voice-state-indicator ${convoState}`} />
              {convoState === 'thinking' ? (
                <span>Thinking...</span>
              ) : convoState === 'speaking' ? (
                <span>Speaking...</span>
              ) : convoState === 'listening' ? (
                <span>Listening...</span>
              ) : (
                <span>Voice Connected</span>
              )}
            </div>

            {/* Scrollable Live User Transcript Container (No AI text rendered) */}
            <div className="assistant-voice-transcript-box" ref={transcriptScrollRef}>
              {liveUserTranscript || input ? (
                <p className="transcript-user">"{liveUserTranscript || input}"</p>
              ) : (
                <p className="transcript-hint">Start speaking, I'm listening to you...</p>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="assistant-voice-controls">
            <button
              onClick={toggleConvoMode}
              className="assistant-voice-end-btn"
              title="End Voice Conversation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>End Conversation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




