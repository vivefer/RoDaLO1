import React, { useRef, useEffect } from 'react';
import './MessageLog.css';

const MessageLog = ({ messages }) => {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="message-log">
      <h3>Command Log</h3>
      <div className="log-container" ref={logRef}>
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet...</div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="message-item">
              <span className="message-time">{message.time}</span>
              <span className="message-text">{message.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MessageLog;
