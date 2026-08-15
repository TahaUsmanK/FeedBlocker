

export interface LogoProps {
    size?: number | string;
    className?: string;
}

/**
 * FeedBlocker Logo
 * 
 * Design: Combines a shield (protecting your time) with a central 
 * focal point or eye (representing focus and awareness).
 * Designed for extreme legibility at small sizes (16x16 toolbar icon up to 128x128).
 */
export const Logo = ({ size = 24, className }: LogoProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.12" />
        <circle cx="12" cy="11" r="3.5" fill="currentColor" stroke="none" />
    </svg>
);
