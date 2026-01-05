'use client';

interface RideLogoProps {
  className?: string;
  size?: number;
}

/**
 * RIDE Logo - Classic bicycle icon
 */
const RideLogoComponent = ({ className, size = 24 }: RideLogoProps) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Back wheel */}
      <circle cx="4" cy="17" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Front wheel */}
      <circle cx="20" cy="17" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Top bar */}
      <line x1="7" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Back diagonal - wheel to top bar */}
      <line x1="4" y1="17" x2="7" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Front diagonal - top bar to wheel */}
      <line x1="17" y1="10" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Seat post */}
      <line x1="7" y1="10" x2="7" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Seat */}
      <line x1="5" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Handlebar stem */}
      <line x1="17" y1="10" x2="17" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Handlebar */}
      <line x1="15" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export default RideLogoComponent;
