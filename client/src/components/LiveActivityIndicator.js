import { useState, useEffect, useRef } from 'react';

/**
 * LiveActivityIndicator — shows a subtle animated dot indicator
 * when any remote user is actively typing. No usernames shown.
 *
 * Props:
 *   isActive: boolean — true when any remote user is typing
 */
const LiveActivityIndicator = ({ isActive }) => {
    const [visible, setVisible] = useState(false);
    const fadeTimerRef = useRef(null);

    useEffect(() => {
        if (isActive) {
            setVisible(true);
            // Clear any pending fade-out
            if (fadeTimerRef.current) {
                clearTimeout(fadeTimerRef.current);
                fadeTimerRef.current = null;
            }
        } else {
            // Fade out after 1.5s of inactivity
            fadeTimerRef.current = setTimeout(() => {
                setVisible(false);
            }, 1500);
        }

        return () => {
            if (fadeTimerRef.current) {
                clearTimeout(fadeTimerRef.current);
            }
        };
    }, [isActive]);

    if (!visible) return null;

    return (
        <div className={`liveActivityIndicator ${isActive ? 'active' : 'fading'}`}>
            <span className="liveActivityDots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
            </span>
            <span className="liveActivityText">Live activity</span>
        </div>
    );
};

export default LiveActivityIndicator;
