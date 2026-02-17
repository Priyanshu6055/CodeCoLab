import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useLiveAwareness — unified hook for all remote user awareness rendering.
 *
 * Handles:
 *   1. Remote cursor markers (colored thin line)
 *   2. Remote selection highlights (transparent user-color background)
 *   3. Floating username labels (pill near cursor)
 *   4. Typing pulse animation on cursor when user is typing
 *   5. Active users list with typing/idle status
 *
 * Awareness data flow:
 *   Local user types → onDidChangeModelContent → typing = true (debounced 1200ms)
 *   Local user moves cursor → onDidChangeCursorPosition → cursor = { lineNumber, column }
 *   Local user selects → onDidChangeCursorSelection → selection = { start, end }
 *   All above → awareness.setLocalStateField() → syncs to all peers
 *   Remote peers → awareness 'change' event → this hook renders decorations
 */

export default function useLiveAwareness({
    providerRef,
    editorRef,
    monacoRef,
    username,
    isReady,
}) {
    // Decorations tracking
    const cursorDecosRef = useRef({});
    const selectionDecosRef = useRef({});
    const widgetsRef = useRef({});
    const injectedStylesRef = useRef(new Set());

    // State refs for the render loop
    const rafIdRef = useRef(null);
    const awarenessRef = useRef(null);

    // Active users state (returned for UI)
    const [activeUsers, setActiveUsers] = useState([]);

    // ── Inject per-client CSS (cursor + selection colors) ──
    const ensureClientStyle = useCallback((clientId, color) => {
        const styleId = `awareness-style-${clientId}`;
        if (injectedStylesRef.current.has(clientId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      .aw-cursor-${clientId} {
        border-left: 2px solid ${color};
        margin-left: -1px;
        position: relative;
      }
      .aw-cursor-${clientId}.typing {
        animation: cursorPulse 0.8s ease-in-out infinite;
      }
      .aw-cursor-line-${clientId} {
        background: ${color}0D;
      }
      .aw-selection-${clientId} {
        background: ${color}30;
        border-radius: 2px;
      }
    `;
        document.head.appendChild(style);
        injectedStylesRef.current.add(clientId);
    }, []);

    // ── Remove all artifacts for a given client ──
    const cleanupClient = useCallback((clientId, editor) => {
        // Decorations
        if (cursorDecosRef.current[clientId]) {
            editor.deltaDecorations(cursorDecosRef.current[clientId], []);
            delete cursorDecosRef.current[clientId];
        }
        if (selectionDecosRef.current[clientId]) {
            editor.deltaDecorations(selectionDecosRef.current[clientId], []);
            delete selectionDecosRef.current[clientId];
        }

        // Widget
        if (widgetsRef.current[clientId]) {
            try {
                editor.removeContentWidget(widgetsRef.current[clientId]);
            } catch (e) { /* ignore */ }
            delete widgetsRef.current[clientId];
        }

        // Style
        const styleEl = document.getElementById(`awareness-style-${clientId}`);
        if (styleEl) styleEl.remove();
        injectedStylesRef.current.delete(clientId);
    }, []);

    // ── Render loop (one frame per update) ──
    const renderDecorations = useCallback(() => {
        const provider = providerRef.current;
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const awareness = awarenessRef.current;

        if (!provider || !editor || !monaco || !awareness) return;

        const states = awareness.getStates();
        const localClientID = awareness.clientID;
        const activeClientIds = new Set();
        const users = [];

        for (const [clientId, state] of states) {
            const user = state.user;
            if (!user || !user.name) continue;

            const isLocal = clientId === localClientID;
            const isTyping = state.typing === true;

            // Track all users for the active users list
            users.push({
                clientId,
                name: user.name,
                color: user.color,
                isTyping,
                isLocal,
            });

            if (isLocal) continue;

            activeClientIds.add(clientId);
            ensureClientStyle(clientId, user.color);

            // ── 1. Cursor decoration ──
            const cursor = state.cursor;
            if (cursor && typeof cursor.lineNumber === 'number' && typeof cursor.column === 'number') {
                const { lineNumber, column } = cursor;
                const range = new monaco.Range(lineNumber, column, lineNumber, column);

                const cursorClassName = isTyping
                    ? `aw-cursor-${clientId} typing`
                    : `aw-cursor-${clientId}`;

                // Apply cursor decorations (Monaco handles diffing internally)
                cursorDecosRef.current[clientId] = editor.deltaDecorations(
                    cursorDecosRef.current[clientId] || [],
                    [
                        {
                            range,
                            options: {
                                className: `aw-cursor-line-${clientId}`,
                                isWholeLine: true,
                                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                            },
                        },
                        {
                            range,
                            options: {
                                beforeContentClassName: cursorClassName,
                                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                            },
                        },
                    ]
                );

                // ── 3. Floating username label ──
                const widgetId = `aw-widget-${clientId}`;
                const widgetPosition = {
                    position: { lineNumber, column },
                    preference: [
                        monaco.editor.ContentWidgetPositionPreference.ABOVE,
                        monaco.editor.ContentWidgetPositionPreference.BELOW,
                    ],
                };

                if (!widgetsRef.current[clientId]) {
                    // Create new widget if it doesn't exist
                    const widget = {
                        getId: () => widgetId,
                        getDomNode: () => {
                            let node = document.getElementById(widgetId);
                            if (!node) {
                                node = document.createElement('div');
                                node.id = widgetId;
                                node.className = 'aw-label';
                            }
                            node.style.cssText = `
                                background: ${user.color};
                                color: #fff;
                                font-size: 10px;
                                font-weight: 700;
                                padding: 1px 8px;
                                border-radius: 3px 3px 3px 0;
                                white-space: nowrap;
                                pointer-events: none;
                                position: relative;
                                top: -2px;
                                z-index: 100;
                                line-height: 16px;
                                box-shadow: 0 1px 4px rgba(0,0,0,0.35);
                                letter-spacing: 0.3px;
                            `;
                            node.textContent = isTyping ? `${user.name} ···` : user.name;
                            return node;
                        },
                        getPosition: () => widgetPosition,
                    };
                    editor.addContentWidget(widget);
                    widgetsRef.current[clientId] = widget;
                } else {
                    // Update existing widget
                    const widget = widgetsRef.current[clientId];
                    // Update the getPosition method to return new coordinates
                    widget.getPosition = () => widgetPosition;

                    // Update text content directly
                    const node = document.getElementById(widgetId);
                    if (node) {
                        node.textContent = isTyping ? `${user.name} ···` : user.name;
                    }
                    // Tell Monaco to re-layout this widget
                    editor.layoutContentWidget(widget);
                }
            }

            // ── 2. Selection highlight decoration ──
            const sel = state.highlightRange;
            if (sel && typeof sel.startLine === 'number') {
                const { startLine, startCol, endLine, endCol } = sel;
                const hasSelection = !(startLine === endLine && startCol === endCol);

                if (hasSelection) {
                    const selRange = new monaco.Range(startLine, startCol, endLine, endCol);
                    selectionDecosRef.current[clientId] = editor.deltaDecorations(
                        selectionDecosRef.current[clientId] || [],
                        [
                            {
                                range: selRange,
                                options: {
                                    className: `aw-selection-${clientId}`,
                                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                                },
                            },
                        ]
                    );
                } else {
                    // No selection — clear highlight
                    if (selectionDecosRef.current[clientId]) {
                        editor.deltaDecorations(selectionDecosRef.current[clientId], []);
                        selectionDecosRef.current[clientId] = [];
                    }
                }
            }
        }

        // ── Clean up disconnected users ──
        for (const clientId of Object.keys(cursorDecosRef.current)) {
            const cid = Number(clientId);
            if (!activeClientIds.has(cid)) {
                cleanupClient(cid, editor);
            }
        }
        for (const clientId of Object.keys(widgetsRef.current)) {
            const cid = Number(clientId);
            if (!activeClientIds.has(cid)) {
                cleanupClient(cid, editor);
            }
        }

        // ── Update active users list (sorted: local first, then alphabetical) ──
        users.sort((a, b) => {
            if (a.isLocal) return -1;
            if (b.isLocal) return 1;
            return a.name.localeCompare(b.name);
        });
        setActiveUsers(users);

        rafIdRef.current = null;
    }, [ensureClientStyle, cleanupClient, providerRef, editorRef, monacoRef]);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        const provider = providerRef.current;
        const editor = editorRef.current;
        const monaco = monacoRef.current;

        if (!provider || !editor || !monaco) {
            return;
        }

        const awareness = provider.awareness;
        const localClientID = awareness.clientID;
        awarenessRef.current = awareness;

        const handleAwarenessChange = () => {
            // Schedule render if not already scheduled
            if (rafIdRef.current === null) {
                rafIdRef.current = requestAnimationFrame(renderDecorations);
            }
        };

        awareness.on('change', handleAwarenessChange);
        // Initial render
        handleAwarenessChange();

        return () => {
            awareness.off('change', handleAwarenessChange);
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }

            // Full cleanup
            const editor = editorRef.current;
            if (editor) {
                for (const cid of Object.keys(cursorDecosRef.current)) {
                    cleanupClient(Number(cid), editor);
                }
            }
            cursorDecosRef.current = {};
            selectionDecosRef.current = {};
            widgetsRef.current = {};
        };
    }, [isReady, providerRef, editorRef, monacoRef, username, ensureClientStyle, cleanupClient, renderDecorations]);

    return { activeUsers };
}
