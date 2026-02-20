import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import useLiveAwareness from '../hooks/useLiveAwareness';
import { getUserColor } from '../utils/getUserColor';
import '../styles/awareness.css';

const CollaborativeEditor = ({ roomId, username, onCodeChange, onActiveUsers }) => {
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const yTextRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [status, setStatus] = useState('disconnected');
  const [isReady, setIsReady] = useState(false);
  const cursorThrottleRef = useRef(null);

  const userColor = getUserColor(username);

  // ── Unified awareness hook — cursors, selections, labels, typing pulse ──
  const { activeUsers } = useLiveAwareness({
    providerRef,
    editorRef,
    monacoRef,
    username,
    isReady,
  });

  // ── Pass active users up to EditorPage for sidebar ──
  useEffect(() => {
    if (onActiveUsers) {
      onActiveUsers(activeUsers);
    }
  }, [activeUsers, onActiveUsers]);

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

    return () => {
      setIsReady(false);
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId, username, userColor]);

  // ── Listen for project loaded events to set code ──
  useEffect(() => {
    const handleProjectLoaded = () => {
      const code = window.__loadedProjectCode;
      if (code !== undefined && yTextRef.current && ydocRef.current) {
        const yText = yTextRef.current;
        const ydoc = ydocRef.current;
        ydoc.transact(() => {
          yText.delete(0, yText.length);
          yText.insert(0, code);
        });
        window.__loadedProjectCode = undefined;
      }
    };

    window.addEventListener('projectLoaded', handleProjectLoaded);
    return () => window.removeEventListener('projectLoaded', handleProjectLoaded);
  }, []);

  // ── Throttled cursor broadcast (60ms) ──
  const broadcastCursor = useCallback(
    (position) => {
      if (cursorThrottleRef.current) return;
      cursorThrottleRef.current = setTimeout(() => {
        cursorThrottleRef.current = null;
      }, 60);

      const provider = providerRef.current;
      if (!provider) return;

      provider.awareness.setLocalStateField('cursor', {
        lineNumber: position.lineNumber,
        column: position.column,
      });
    },
    []
  );

  const handleEditorDidMount = (editor, monaco) => {
    if (!editor || !monaco) return;
    editorRef.current = editor;
    monacoRef.current = monaco;

    new MonacoBinding(
      yTextRef.current,
      editor.getModel(),
      new Set([editor]),
      null // Disable built-in awareness to prevent conflict with useLiveAwareness
    );

    // Signal that both provider + editor are ready for awareness
    setIsReady(true);
    console.log('[Awareness] Editor + Provider ready. Awareness enabled.');

    // ── Broadcast cursor position ──
    editor.onDidChangeCursorPosition((e) => {
      broadcastCursor(e.position);
    });

    // ── Broadcast selection range ──
    editor.onDidChangeCursorSelection((e) => {
      const provider = providerRef.current;
      if (!provider) return;

      const sel = e.selection;
      provider.awareness.setLocalStateField('highlightRange', {
        startLine: sel.startLineNumber,
        startCol: sel.startColumn,
        endLine: sel.endLineNumber,
        endCol: sel.endColumn,
      });
    });

    // ── Typing awareness (debounced 1200ms) ──
    let typingTimeout;
    editor.onDidChangeModelContent(() => {
      const provider = providerRef.current;
      if (!provider) return;

      provider.awareness.setLocalStateField('typing', true);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        provider.awareness.setLocalStateField('typing', false);
      }, 1200);

      if (onCodeChange) {
        onCodeChange(editor.getValue());
      }
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', flex: 1, minHeight: 0 }}>
      <div className="editorStatusBar">
        <div className={`statusIndicator ${status === 'connected' ? 'connected' : 'disconnected'}`}>
          <span className="statusDot" />
          <span className="statusLabel">
            {status === 'connected' ? 'Live' : 'Offline'}
          </span>
        </div>
        <span className="statusUser">{username}</span>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          theme="vs-dark"
          language="javascript"
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
};

export default CollaborativeEditor;
