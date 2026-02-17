import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useRunner — custom hook for sandboxed JavaScript execution.
 *
 * How the sandbox works:
 * ┌──────────────────────────────────────────────────────────┐
 * │  Parent window (React app)                              │
 * │                                                         │
 * │  1. Creates a hidden <iframe sandbox="allow-scripts">   │
 * │  2. Injects user code wrapped with console overrides    │
 * │  3. Listens for messages via window.addEventListener    │
 * │                                                         │
 * │  ┌────────────────────────────────────────────────────┐  │
 * │  │  Sandboxed Iframe                                  │  │
 * │  │                                                    │  │
 * │  │  - Cannot access parent DOM                        │  │
 * │  │  - Cannot access localStorage / cookies            │  │
 * │  │  - Cannot make network requests                    │  │
 * │  │  - CAN run JavaScript (allow-scripts)              │  │
 * │  │                                                    │  │
 * │  │  console.log/warn/error/info are overridden to     │  │
 * │  │  call: parent.postMessage({ type, level, args })   │  │
 * │  │                                                    │  │
 * │  │  On completion: postMessage({ type: 'done' })      │  │
 * │  │  On error:      postMessage({ type: 'error' })     │  │
 * │  └────────────────────────────────────────────────────┘  │
 * │                                                         │
 * │  4. Parent receives messages → updates output state     │
 * │  5. Timeout (10s) kills iframe if code hangs            │
 * │  6. Iframe is DESTROYED and RECREATED on every run      │
 * └──────────────────────────────────────────────────────────┘
 */

const EXECUTION_TIMEOUT_MS = 10000;

export default function useRunner() {
    const [output, setOutput] = useState([]);
    const [running, setRunning] = useState(false);
    const iframeRef = useRef(null);
    const handlerRef = useRef(null);
    const timeoutRef = useRef(null);
    const cleanupTimerRef = useRef(null);

    // ── Destroy old iframe completely ──
    const destroyIframe = useCallback(() => {
        // Remove message listener
        if (handlerRef.current) {
            window.removeEventListener('message', handlerRef.current);
            handlerRef.current = null;
        }

        // Clear timers
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (cleanupTimerRef.current) {
            clearTimeout(cleanupTimerRef.current);
            cleanupTimerRef.current = null;
        }

        // Remove iframe from DOM
        if (iframeRef.current) {
            try {
                iframeRef.current.remove();
            } catch (e) {
                /* already removed */
            }
            iframeRef.current = null;
        }
    }, []);

    // ── Cleanup on unmount ──
    useEffect(() => {
        return () => destroyIframe();
    }, [destroyIframe]);

    // ── Run code in sandbox ──
    const runCode = useCallback(
        (code) => {
            if (!code || !code.trim()) {
                setOutput([{ type: 'warn', text: '⚠ No code to run.' }]);
                return;
            }

            // 1. Destroy any previous iframe (fresh sandbox every run)
            destroyIframe();

            // 2. Reset state
            setRunning(true);
            const results = [{ type: 'info', text: '▶ Running...' }];
            setOutput([...results]);

            let hasFinished = false;

            // 3. Create a brand-new sandboxed iframe
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.sandbox = 'allow-scripts'; // Only JS execution, nothing else
            document.body.appendChild(iframe);
            iframeRef.current = iframe;

            // 4. Listen for postMessage from the iframe
            const handler = (event) => {
                // Only accept messages from OUR iframe
                if (!iframeRef.current || event.source !== iframeRef.current.contentWindow)
                    return;

                const msg = event.data;
                if (!msg || !msg.type) return;

                if (msg.type === 'console') {
                    results.push({
                        type: msg.level || 'log',
                        text: Array.isArray(msg.args) ? msg.args.join(' ') : String(msg.args),
                    });
                    setOutput([...results]);
                } else if (msg.type === 'error') {
                    results.push({ type: 'error', text: `❌ ${msg.message}` });
                    setOutput([...results]);
                } else if (msg.type === 'done') {
                    if (!hasFinished) {
                        hasFinished = true;
                        results.push({
                            type: 'info',
                            text: `✅ Finished in ${msg.duration}ms`,
                        });
                        setOutput([...results]);
                        setRunning(false);
                    }
                }
            };

            window.addEventListener('message', handler);
            handlerRef.current = handler;

            // 5. Timeout — kill execution after 10 seconds
            timeoutRef.current = setTimeout(() => {
                if (!hasFinished) {
                    hasFinished = true;
                    results.push({
                        type: 'error',
                        text: `⏱ Execution timed out (${EXECUTION_TIMEOUT_MS / 1000}s limit)`,
                    });
                    setOutput([...results]);
                    setRunning(false);
                    destroyIframe();
                }
            }, EXECUTION_TIMEOUT_MS);

            // 6. Build the injected code
            //    - Override console.log/warn/error/info to postMessage
            //    - Wrap user code in try/catch
            //    - Send 'done' message when finished
            const injectedHTML = `
        <script>
          (function() {
            var _startTime = Date.now();

            // Override console methods
            ['log', 'warn', 'error', 'info'].forEach(function(level) {
              console[level] = function() {
                var args = [];
                for (var i = 0; i < arguments.length; i++) {
                  try {
                    args.push(
                      typeof arguments[i] === 'object'
                        ? JSON.stringify(arguments[i], null, 2)
                        : String(arguments[i])
                    );
                  } catch(e) {
                    args.push('[Unserializable]');
                  }
                }
                parent.postMessage({ type: 'console', level: level, args: args }, '*');
              };
            });

            try {
              ${code}
              parent.postMessage({ type: 'done', duration: Date.now() - _startTime }, '*');
            } catch(err) {
              parent.postMessage({ type: 'error', message: err.toString() }, '*');
              parent.postMessage({ type: 'done', duration: Date.now() - _startTime }, '*');
            }
          })();
        <\/script>
      `;

            // 7. Inject code into iframe — this triggers execution
            iframe.srcdoc = injectedHTML;

            // 8. Safety cleanup timer (runs after timeout + 1s buffer)
            cleanupTimerRef.current = setTimeout(() => {
                if (handlerRef.current) {
                    window.removeEventListener('message', handlerRef.current);
                    handlerRef.current = null;
                }
            }, EXECUTION_TIMEOUT_MS + 1000);
        },
        [destroyIframe]
    );

    // ── Stop execution ──
    const stopExecution = useCallback(() => {
        destroyIframe();
        setOutput((prev) => [...prev, { type: 'warn', text: '⛔ Execution stopped.' }]);
        setRunning(false);
    }, [destroyIframe]);

    // ── Clear output ──
    const clearOutput = useCallback(() => {
        setOutput([]);
    }, []);

    return { output, running, runCode, stopExecution, clearOutput };
}
