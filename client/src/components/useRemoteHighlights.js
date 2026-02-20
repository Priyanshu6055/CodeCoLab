import { useEffect } from 'react';

export default function useRemoteHighlights({
  providerRef,
  editorRef,
  monacoRef,
  username,
  remoteDecorationsRef,
  fadeTimeoutsRef,
  setTypingUsers,
}) {
  useEffect(() => {
    const provider = providerRef.current;
    const awareness = provider.awareness;
    const localClientID = awareness.clientID;

    const handleAwarenessChange = ({ added, updated }) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      const states = awareness.getStates();
      const typingNames = [];

      for (const [clientId, state] of states) {
        if (clientId === localClientID) continue;

        if (state.typing && state.user?.name) {
          typingNames.push(state.user.name);
        }

        const range = state.highlightRange;
        const user = state.user;

        if (range && user) {
          const { startLine, startCol, endLine, endCol } = range;

          if (
            typeof startLine !== 'number' || typeof startCol !== 'number' ||
            typeof endLine !== 'number' || typeof endCol !== 'number' ||
            (startLine === endLine && startCol === endCol)
          ) {
            continue;
          }

          const className = `remote-highlight-${clientId}`;
          const styleId = `style-${className}`;

          if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
              .${className} {
                background-color: ${user.color}80;
                border-radius: 3px;
                transition: background-color 2s ease;
              }
              .${className}.fade-out {
                background-color: transparent !important;
              }
            `;
            document.head.appendChild(style);
          }

          if (remoteDecorationsRef.current[clientId]) {
            editor.deltaDecorations(remoteDecorationsRef.current[clientId], []);
          }

          const newRange = new monaco.Range(startLine, startCol, endLine, endCol);
          remoteDecorationsRef.current[clientId] = editor.deltaDecorations([], [{
            range: newRange,
            options: {
              inlineClassName: className,
            },
          }]);

          clearTimeout(fadeTimeoutsRef.current.get(clientId));
          fadeTimeoutsRef.current.set(clientId, setTimeout(() => {
            remoteDecorationsRef.current[clientId] = editor.deltaDecorations(
              remoteDecorationsRef.current[clientId],
              [{
                range: newRange,
                options: {
                  inlineClassName: `${className} fade-out`,
                },
              }]
            );
            setTimeout(() => {
              editor.deltaDecorations(remoteDecorationsRef.current[clientId], []);
              remoteDecorationsRef.current[clientId] = [];
              fadeTimeoutsRef.current.delete(clientId);
            }, 2000);
          }, 3000));
        } else {
          if (remoteDecorationsRef.current[clientId]) {
            editor.deltaDecorations(remoteDecorationsRef.current[clientId], []);
            remoteDecorationsRef.current[clientId] = [];
          }
        }
      }

      setTypingUsers(typingNames);
    };

    awareness.on('change', handleAwarenessChange);
    return () => {
      awareness.off('change', handleAwarenessChange);
      fadeTimeoutsRef.current.forEach(clearTimeout);
    };
  }, [providerRef, editorRef, monacoRef, username]);
}
