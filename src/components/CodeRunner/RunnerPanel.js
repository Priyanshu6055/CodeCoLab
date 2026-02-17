import React, { useEffect, useRef } from 'react';
import useRunner from './useRunner';

/**
 * RunnerPanel — UI component for the code execution output panel.
 *
 * Props:
 *   getCode: () => string  — returns the current editor code
 *
 * Layout:
 *   ┌─── Header ──────────────────────────────────┐
 *   │  CONSOLE              [▶ Run]  [🗑 Clear]   │
 *   ├─── Output ──────────────────────────────────┤
 *   │  › console.log output                        │
 *   │  ✗ errors in red                             │
 *   │  ⚠ warnings in yellow                       │
 *   │  › info in purple                            │
 *   │  ✅ Finished in 42ms                         │
 *   └────────────────────────────────────────────-─┘
 */
const RunnerPanel = ({ getCode }) => {
    const { output, running, runCode, stopExecution, clearOutput } = useRunner();
    const outputEndRef = useRef(null);

    // Auto-scroll to bottom when new output appears
    useEffect(() => {
        outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [output]);

    const handleRun = () => {
        const code = getCode();
        runCode(code);
    };

    const getLineColor = (type) => {
        switch (type) {
            case 'error':
                return '#ff6b6b';
            case 'warn':
                return '#ffd93d';
            case 'info':
                return '#6c63ff';
            default:
                return '#e0e0e0';
        }
    };

    const getLinePrefix = (type) => {
        switch (type) {
            case 'error':
                return '✗';
            case 'warn':
                return '⚠';
            default:
                return '›';
        }
    };

    return (
        <div className="codeRunnerPanel">
            {/* ── Header with Run + Clear buttons ── */}
            <div className="codeRunnerHeader">
                <span className="codeRunnerTitle">Console</span>
                <div className="codeRunnerActions">
                    <button
                        className="btn runBtn"
                        onClick={handleRun}
                        disabled={running}
                    >
                        {running ? '⏳ Running...' : '▶ Run'}
                    </button>
                    {running && (
                        <button
                            className="btn stopBtn"
                            onClick={stopExecution}
                        >
                            ⏹ Stop
                        </button>
                    )}
                    <button
                        className="btn clearBtn"
                        onClick={clearOutput}
                        disabled={running}
                    >
                        🗑 Clear
                    </button>
                </div>
            </div>

            {/* ── Output terminal ── */}
            <div className="codeRunnerOutput">
                {output.length === 0 ? (
                    <div className="codeRunnerPlaceholder">
                        Click "▶ Run" to execute your JavaScript code
                    </div>
                ) : (
                    output.map((line, i) => (
                        <div
                            key={i}
                            className="codeRunnerLine"
                            style={{ color: getLineColor(line.type) }}
                        >
                            <span className="codeRunnerLinePrefix">
                                {getLinePrefix(line.type)}
                            </span>
                            <pre className="codeRunnerLineText">{line.text}</pre>
                        </div>
                    ))
                )}
                <div ref={outputEndRef} />
            </div>
        </div>
    );
};

export default RunnerPanel;
