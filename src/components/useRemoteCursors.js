import { useEffect, useRef } from 'react';

/**
 * useRemoteCursors — renders live remote cursor markers + floating name labels
 * inside Monaco editor using Yjs awareness states.
 *
 * Reads `cursor` field from each awareness state:
 *   { lineNumber, column, user: { name, color } }
 *
 * Renders a colored thin cursor line + a small floating name tag above it.
 */
export default function useRemoteCursors({
    providerRef,
    editorRef,
    monacoRef,
    username,
}) {
    const decorationsRef = useRef({});
    const widgetsRef = useRef({});

    useEffect(() => {
        const provider = providerRef.current;
        if (!provider) return;

        const awareness = provider.awareness;
        const localClientID = awareness.clientID;

        const handleAwarenessChange = () => {
            const editor = editorRef.current;
            const monaco = monacoRef.current;
            if (!editor || !monaco) return;

            const states = awareness.getStates();
            const activeClientIds = new Set();

            for (const [clientId, state] of states) {
                if (clientId === localClientID) continue;

                const cursor = state.cursor;
                const user = state.user;

                if (!cursor || !user || !user.name) continue;

                activeClientIds.add(clientId);
                const { lineNumber, column } = cursor;

                if (typeof lineNumber !== 'number' || typeof column !== 'number') continue;

                // ── Inject dynamic CSS for this client (once) ──
                const styleId = `remote-cursor-style-${clientId}`;
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = `
            .remote-cursor-${clientId} {
              border-left: 2px solid ${user.color};
              margin-left: -1px;
            }
            .remote-cursor-line-${clientId} {
              background: ${user.color}12;
            }
          `;
                    document.head.appendChild(style);
                }

                // ── Decorations — colored cursor line + subtle line highlight ──
                const range = new monaco.Range(lineNumber, column, lineNumber, column);
                const newDecos = editor.deltaDecorations(
                    decorationsRef.current[clientId] || [],
                    [
                        {
                            range,
                            options: {
                                className: `remote-cursor-line-${clientId}`,
                                isWholeLine: true,
                                stickiness:
                                    monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                            },
                        },
                        {
                            range,
                            options: {
                                beforeContentClassName: `remote-cursor-${clientId}`,
                                stickiness:
                                    monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                            },
                        },
                    ]
                );
                decorationsRef.current[clientId] = newDecos;

                // ── Floating name label (content widget) ──
                const widgetId = `cursor-widget-${clientId}`;

                // Remove old widget
                if (widgetsRef.current[clientId]) {
                    try {
                        editor.removeContentWidget(widgetsRef.current[clientId]);
                    } catch (e) {
                        /* ignore */
                    }
                }

                const widget = {
                    getId: () => widgetId,
                    getDomNode: () => {
                        let node = document.getElementById(widgetId);
                        if (!node) {
                            node = document.createElement('div');
                            node.id = widgetId;
                            node.className = 'remote-cursor-label';
                            node.style.cssText = `
                background: ${user.color};
                color: #fff;
                font-size: 11px;
                font-weight: 600;
                padding: 1px 6px;
                border-radius: 3px 3px 3px 0;
                white-space: nowrap;
                pointer-events: none;
                position: relative;
                top: -2px;
                z-index: 100;
                line-height: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
              `;
                        }
                        node.textContent = user.name;
                        return node;
                    },
                    getPosition: () => ({
                        position: { lineNumber, column },
                        preference: [
                            monaco.editor.ContentWidgetPositionPreference.ABOVE,
                            monaco.editor.ContentWidgetPositionPreference.BELOW,
                        ],
                    }),
                };

                editor.addContentWidget(widget);
                widgetsRef.current[clientId] = widget;
            }

            // ── Clean up disconnected users ──
            for (const clientId of Object.keys(decorationsRef.current)) {
                const cid = Number(clientId);
                if (!activeClientIds.has(cid)) {
                    // Remove decorations
                    editor.deltaDecorations(decorationsRef.current[cid] || [], []);
                    delete decorationsRef.current[cid];

                    // Remove widget
                    if (widgetsRef.current[cid]) {
                        try {
                            editor.removeContentWidget(widgetsRef.current[cid]);
                        } catch (e) {
                            /* ignore */
                        }
                        delete widgetsRef.current[cid];
                    }

                    // Remove injected style
                    const styleEl = document.getElementById(`remote-cursor-style-${cid}`);
                    if (styleEl) styleEl.remove();
                }
            }
        };

        awareness.on('change', handleAwarenessChange);

        return () => {
            awareness.off('change', handleAwarenessChange);

            // Full cleanup
            const editor = editorRef.current;
            if (editor) {
                for (const clientId of Object.keys(decorationsRef.current)) {
                    editor.deltaDecorations(decorationsRef.current[clientId] || [], []);
                }
                for (const clientId of Object.keys(widgetsRef.current)) {
                    try {
                        editor.removeContentWidget(widgetsRef.current[clientId]);
                    } catch (e) {
                        /* ignore */
                    }
                }
            }
            decorationsRef.current = {};
            widgetsRef.current = {};
        };
    }, [providerRef, editorRef, monacoRef, username]);
}
