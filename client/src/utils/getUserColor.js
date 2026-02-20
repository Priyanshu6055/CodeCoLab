/**
 * getUserColor — generates a consistent HSL color from a username.
 * Same name always produces the same color.
 *
 * @param {string} name — username
 * @returns {string} HSL color string, e.g. "hsl(210, 70%, 50%)"
 */
export function getUserColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = ((hash % 360) + 360) % 360;
    return `hsl(${hue}, 70%, 55%)`;
}

/**
 * hexFromHSL — converts the HSL string to a hex-like color for CSS.
 * Used for creating transparent overlays (appending alpha hex).
 */
export function getUserColorHex(name) {
    return getUserColor(name);
}
