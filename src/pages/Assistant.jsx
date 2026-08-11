// /src/pages/Assistant.jsx
// Dedicated AI Assistant Page for Intellect Circle
// ChatGPT-inspired interface with Intellect Circle visual identity.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const MAX_HISTORY = 6;

function renderMessageContent(text, navigateTo) {
  if (!text) return null;

  // Pattern for markdown links [Label](URL)
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
  // Conversation (talking) mode — TTS speaks replies then auto-starts mic
  const [convoMode, setConvoMode] = useState(false);
  // Index of the message currently being spoken aloud (-1 = none)
  const [speakingIdx, setSpeakingIdx] = useState(-1);

  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  // Holds whatever text was already in the box when mic started
  const baseTextRef = useRef('');
  // Ref so async callbacks can read the latest convoMode without stale closure
  const convoModeRef = useRef(false);
  // When true, onresult silently discards incoming transcript (used during/after send)
  const blockResultsRef = useRef(false);
  // Tracks the current input value so recognition callbacks can read it without staleness
  const inputRef = useRef('');
  // Timer that auto-sends after 2s of silence in conversation mode
  const silenceTimerRef = useRef(null);
  // Ref to the latest handleSend so the silence timer callback can invoke it
  const handleSendRef = useRef(null);
  // HTMLAudioElement used to play ElevenLabs audio
  const currentAudioRef = useRef(null);
  // Ref tracking if speech audio is currently playing
  const isSpeakingRef = useRef(false);

  // Prime/Unlock browser audio context on user gesture to bypass Chrome/Safari autoplay blocks
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

  // Check for Web Speech API support and set up recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // Empty string = browser auto-detects language → supports any language
      recognition.lang = '';

      let sessionTranscript = '';

      recognition.onstart = () => {
        sessionTranscript = '';
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        if (blockResultsRef.current) return;
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            sessionTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const combined = (baseTextRef.current ? baseTextRef.current + ' ' : '') +
          sessionTranscript + interimTranscript;
        const trimmed = combined.trimStart();
        inputRef.current = trimmed;
        setInput(trimmed);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height =
            Math.min(textareaRef.current.scrollHeight, 140) + 'px';
        }
        // In conversation mode: reset the 2-second silence timer on every result
        if (convoModeRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            const text = inputRef.current.trim();
            if (text && convoModeRef.current && handleSendRef.current) {
              handleSendRef.current(text);
            }
          }, 2000);
        }
      };

      recognition.onerror = (event) => {
        // 'no-speech' is benign; ignore it silently in convo mode
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition error:', event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // In conversation mode, auto-restart mic if ended naturally (not during send or AI speech)
        if (convoModeRef.current && !blockResultsRef.current && !isSpeakingRef.current) {
          setTimeout(() => {
            if (convoModeRef.current && !blockResultsRef.current && !isSpeakingRef.current) {
              try { recognition.start(); } catch (_) {}
            }
          }, 150);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Focus input field on mount without forced page scrolling
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, []);

  // Keep the convoMode ref in sync with state
  useEffect(() => { convoModeRef.current = convoMode; }, [convoMode]);

  // Stop listening + speaking + timers when component unmounts
  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Text-to-Speech helpers (ElevenLabs) ────────────────────────────────
  const stopSpeaking = useCallback(() => {
    isSpeakingRef.current = false;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel(); // fallback cleanup
    setSpeakingIdx(-1);
  }, []);

  const speakText = useCallback(async (text, idx, onDone) => {
    // Stop any currently playing audio first
    stopSpeaking();
    isSpeakingRef.current = true;
    setSpeakingIdx(idx);

    let finished = false;
    const safeOnDone = () => {
      if (finished) return;
      finished = true;
      isSpeakingRef.current = false;
      setSpeakingIdx(-1);
      onDone?.();
    };

    // Safety watchdog: ensure onDone is called within 15 seconds max so mic never stays muted
    const watchdogTimer = setTimeout(() => {
      safeOnDone();
    }, 15000);

    const cleanup = () => {
      clearTimeout(watchdogTimer);
      safeOnDone();
    };

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`TTS API returned ${res.status}`);

      const audioBlob = await res.blob();
      const audioUrl  = URL.createObjectURL(audioBlob);
      const audio     = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        cleanup();
      };
      audio.onerror = (e) => {
        console.warn('Audio element error:', e);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        cleanup();
      };

      await audio.play();
    } catch (err) {
      console.warn('ElevenLabs TTS failed, falling back to browser TTS:', err);
      // ── Browser TTS fallback ──────────────────────────────────────────
      if (!window.speechSynthesis) {
        cleanup();
        return;
      }
      window.speechSynthesis.cancel();
      const clean = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                        .replace(/https?:\/\/\S+/g, '');
      const utt = new SpeechSynthesisUtterance(clean);
      utt.rate = 1;
      utt.pitch = 1;
      utt.onend = () => cleanup();
      utt.onerror = () => cleanup();
      window.speechSynthesis.speak(utt);

      // Fallback fallback: if SpeechSynthesis does not fire events in Chrome
      setTimeout(() => {
        if (!finished) cleanup();
      }, Math.max(3000, clean.length * 80));
    }
  }, [stopSpeaking]);

  const toggleSpeak = useCallback((text, idx) => {
    if (speakingIdx === idx) { stopSpeaking(); return; }
    speakText(text, idx);
  }, [speakingIdx, speakText, stopSpeaking]);

  // ── Conversation mode toggle ────────────────────────────────────────────
  const toggleConvoMode = useCallback(() => {
    unlockAudio(); // Unlock browser audio permissions immediately on click!
    setConvoMode(prev => {
      const next = !prev;
      if (next) {
        // Turning ON: immediately start listening so the user can speak right away
        baseTextRef.current = '';
        inputRef.current = '';
        blockResultsRef.current = false;
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (_) {}
        }
      } else {
        // Turning OFF: stop mic, ElevenLabs/TTS audio, and any pending silence timer
        clearTimeout(silenceTimerRef.current);
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (_) {}
        }
        stopSpeaking();
      }
      return next;
    });
  }, [unlockAudio, stopSpeaking]);

  // Smooth scroll ONLY the internal messages container (never the page/window)
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

    // Block trailing onresult events + clear the silence timer
    clearTimeout(silenceTimerRef.current);
    blockResultsRef.current = true;
    if (recognitionRef.current) recognitionRef.current.abort();
    // Stop ElevenLabs audio + browser TTS
    stopSpeaking();
    baseTextRef.current = '';
    inputRef.current = '';

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Unblock results after a short delay so the next mic session works normally
    setTimeout(() => { blockResultsRef.current = false; }, 300);

    let answerText = '';
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          history: buildHistory(),
          isVoice: convoModeRef.current
        })
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        answerText = json.error || "Sorry, I couldn't answer that right now. Please try again.";
        setMessages(prev => [...prev, { role: 'assistant', text: answerText, isError: true }]);
      } else {
        answerText = json.answer || "I couldn't generate a response. Please try rephrasing.";
        setMessages(prev => [...prev, { role: 'assistant', text: answerText }]);
      }
    } catch {
      answerText = "Sorry, I couldn't reach the assistant right now. Please check your connection and try again.";
      setMessages(prev => [...prev, { role: 'assistant', text: answerText, isError: true }]);
    } finally {
      setLoading(false);
      if (convoModeRef.current && answerText) {
        // Speak reply, then reopen mic for the next turn
        setMessages(curr => {
          const replyIdx = curr.length - 1;
          speakText(answerText, replyIdx, () => {
            if (convoModeRef.current && recognitionRef.current) {
              baseTextRef.current = '';
              inputRef.current = '';
              blockResultsRef.current = false;
              setTimeout(() => {
                if (convoModeRef.current && !isSpeakingRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (_) {
                    try {
                      recognitionRef.current.abort();
                      setTimeout(() => recognitionRef.current?.start(), 100);
                    } catch (e) {}
                  }
                }
              }, 150);
            }
          });
          return curr;
        });
      } else {
        setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 50);
      }
    }
  }, [input, loading, buildHistory, speakText, stopSpeaking]);

  // Always keep the ref pointing to the latest handleSend so silence timer can call it
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
      // Pause mic — keep whatever has been transcribed so far
      recognitionRef.current.stop();
    } else {
      // Resume: capture the current input as the base so new speech appends
      baseTextRef.current = input.trimEnd();
      recognitionRef.current.start();
    }
  }, [isListening, input]);

  const clearChat = () => {
    clearTimeout(silenceTimerRef.current);
    setMessages([]);
    setInput('');
    inputRef.current = '';
    if (recognitionRef.current) recognitionRef.current.abort();
    stopSpeaking();
    setConvoMode(false);
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
            /* Simple Welcome State when no conversation exists */
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
            /* Conversation Messages List */
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
                  {/* Per-message speak button on assistant bubbles */}
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

          {/* Typing Indicator while AI is responding */}
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

        {/* Sticky Large Rounded Bottom Input Capsule */}
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

            {/* Talk / Conversation Mode Button — sits beside the mic in the input bar */}
            {voiceSupported && (
              <button
                onClick={toggleConvoMode}
                disabled={loading}
                className={`assistant-convo-btn${convoMode ? ' active' : ''}`}
                title={convoMode ? 'End conversation mode' : 'Start voice conversation'}
                aria-label={convoMode ? 'End conversation mode' : 'Start voice conversation'}
              >
                {convoMode ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="2"  y1="12" x2="2"  y2="12" className="convo-wave-bar" />
                    <line x1="6"  y1="8"  x2="6"  y2="16" className="convo-wave-bar" />
                    <line x1="10" y1="5"  x2="10" y2="19" className="convo-wave-bar" />
                    <line x1="14" y1="8"  x2="14" y2="16" className="convo-wave-bar" />
                    <line x1="18" y1="10" x2="18" y2="14" className="convo-wave-bar" />
                    <line x1="22" y1="12" x2="22" y2="12" className="convo-wave-bar" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
                  </svg>
                )}
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

      {/* ChatGPT-Style Full-Screen Voice Call Overlay */}
      {convoMode && (
        <div className="assistant-call-overlay">
          <div className="assistant-call-header">
            <div className="assistant-call-brand">
              <div className="assistant-call-logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                </svg>
              </div>
              <div>
                <h3 className="assistant-call-title">Intellect Circle AI</h3>
                <span className="assistant-call-status-tag">Live Voice Call</span>
              </div>
            </div>
            <button
              onClick={toggleConvoMode}
              className="assistant-call-close-btn"
              title="Close Voice Call"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Central Visualizer Area */}
          <div className="assistant-call-body">
            <div className={`assistant-voice-orb ${loading ? 'thinking' : (speakingIdx !== -1 ? 'speaking' : (isListening ? 'listening' : 'idle'))}`}>
              <div className="orb-ring ring-1"></div>
              <div className="orb-ring ring-2"></div>
              <div className="orb-ring ring-3"></div>
              <div className="orb-core">
                {loading ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                    <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
                  </svg>
                ) : speakingIdx !== -1 ? (
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

            <div className="assistant-call-state-label">
              {loading ? (
                <span>Thinking...</span>
              ) : speakingIdx !== -1 ? (
                <span>AI Speaking...</span>
              ) : isListening ? (
                <span>Listening...</span>
              ) : (
                <span>Call Connected</span>
              )}
            </div>

            {/* Transcript subtitle snippet */}
            <div className="assistant-call-transcript-box">
              {input ? (
                <p className="transcript-user">"{input}"</p>
              ) : messages.length > 0 && messages[messages.length - 1].role === 'assistant' ? (
                <p className="transcript-ai">
                  {messages[messages.length - 1].text.slice(0, 180)}
                  {messages[messages.length - 1].text.length > 180 ? '...' : ''}
                </p>
              ) : (
                <p className="transcript-hint">Speak clearly, I'm listening to you...</p>
              )}
            </div>
          </div>

          {/* Floating Call Action Bar */}
          <div className="assistant-call-controls">
            <button
              onClick={toggleVoice}
              className={`assistant-call-btn mic ${isListening ? 'active' : 'muted'}`}
              title={isListening ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isListening ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 10v-1m14 0v1a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
              )}
              <span>{isListening ? 'Mute' : 'Unmute'}</span>
            </button>

            <button
              onClick={toggleConvoMode}
              className="assistant-call-btn end"
              title="End Voice Call"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
              </svg>
              <span>End Call</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




