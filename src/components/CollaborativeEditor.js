import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import TypingIndicator from './TypingIndicator';

const getColorFromName = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

const CollaborativeEditor = ({ roomId, username }) => {
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const yTextRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [status, setStatus] = useState('disconnected');

  const userColor = getColorFromName(username);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(
      'wss://yjs-websocket-server-wuwh.onrender.com',
      roomId,
      ydoc
    );
    providerRef.current = provider;

    const yText = ydoc.getText('monaco');
    yTextRef.current = yText;

    provider.awareness.setLocalStateField('user', {
      name: username,
      color: userColor,
    });

    provider.on('status', (event) => {
      setStatus(event.status);
    });

    const awarenessUpdateHandler = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const othersTyping = states
        .filter((s) => s.user?.name !== username && s.typing)
        .map((s) => s.user?.name);
      setTypingUsers(othersTyping);
    };

    provider.awareness.on('change', awarenessUpdateHandler);

    return () => {
      provider.awareness.off('change', awarenessUpdateHandler);
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId, username, userColor]);

  const handleEditorDidMount = (editor, monaco) => {
    if (!editor || !monaco) return;
    editorRef.current = editor;
    monacoRef.current = monaco;

    new MonacoBinding(
      yTextRef.current,
      editor.getModel(),
      new Set([editor]),
      providerRef.current.awareness
    );

    let typingTimeout;
    editor.onDidChangeModelContent(() => {
      const provider = providerRef.current;
      if (!provider) return;

      provider.awareness.setLocalStateField('typing', true);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        provider.awareness.setLocalStateField('typing', false);
      }, 1500);
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          backgroundColor: status === 'connected' ? '#11491e' : '#7e1515',
          color: '#fff',
          padding: '6px 12px',
          fontWeight: 'bold',
        }}
      >
        Server Status: {status.toUpperCase()} | User: {username}
      </div>

      <TypingIndicator typingUsers={typingUsers} currentUser={username} />

      <Editor
        height="calc(100vh - 70px)"
        theme="vs-dark"
        language="javascript"
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default CollaborativeEditor;
