import React, { useEffect, useRef } from 'react';

export function StarfieldBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    // Delay video appearance by 1.5 seconds with fade-in transition
    const timer = setTimeout(() => {
      setIsVisible(true);
      if (videoRef.current) {
        videoRef.current.playbackRate = 0.5;
        videoRef.current.play().catch(err => {
          console.log('Video autoplay prevented:', err);
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
      style={{
        backgroundColor: '#191a1a',
      }}
    >
      {/* Animated Video Background */}
      <div 
        style={{
          position: 'absolute',
          inset: '0 0 -140px 0',
          filter: 'grayscale(100%) blur(10px)',
          opacity: isVisible ? 0.4 : 0,
          zIndex: 1,
          transition: 'opacity 2s ease-in',
        }}
      >
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          preload="auto"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: '50% 50%',
            display: 'block',
          }}
        >
          <source src="https://framerusercontent.com/assets/1g8IkhtJmlWcC4zEYWKUmeGWzI.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Black Overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.28)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Radial Gradient Overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(75% 64% at 50% 50%, rgba(255, 255, 255, 0) 17.5676%, #04070d 100%)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Bottom Blur Layers for Glass Effect */}
      <div 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100px',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* Layer 1 */}
          <div style={{
            opacity: 1,
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 37.5%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 37.5%)',
            borderRadius: 0,
            pointerEvents: 'none',
            backdropFilter: 'blur(0.0546875px)',
          }} />
          
          {/* Layer 2 */}
          <div style={{
            opacity: 1,
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 0) 50%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 0) 50%)',
            borderRadius: 0,
            pointerEvents: 'none',
            backdropFilter: 'blur(0.109375px)',
          }} />
          
          {/* Layer 3 */}
          <div style={{
            opacity: 1,
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) 62.5%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) 62.5%)',
            borderRadius: 0,
            pointerEvents: 'none',
            backdropFilter: 'blur(0.21875px)',
          }} />
          
          {/* Layer 4 */}
          <div style={{
            opacity: 1,
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 0) 75%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 0) 75%)',
            borderRadius: 0,
            pointerEvents: 'none',
            backdropFilter: 'blur(0.4375px)',
          }} />
          
          {/* Layer 5 */}
          <div style={{
            opacity: 1,
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 87.5%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 87.5%)',
            borderRadius: 0,
            pointerEvents: 'none',
            backdropFilter: 'blur(0.875px)',
          }} />
          
          {/* Layer 6 */}
          <div style={{
            opacity: 1,
            position: 'absolute',
            inset: 0,
            zIndex: 6,
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 0) 100%)',
            borderRadius: 0,
            pointerEvents: 'none',
            backdropFilter: 'blur(1.75px)',
          }} />
          
          {/* Layer 7 */}
          <div style={{
            opacity: 1,
            position: 'absolute',
            inset: 0,
            zIndex: 7,
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 1) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 1) 100%)',
            borderRadius: 0,
            pointerEvents: 'none',
            backdropFilter: 'blur(3.5px)',
          }} />
          
          {/* Layer 8 */}
          <div style={{
            opacity: 1,
            position: 'absolute',
            inset: 0,
            zIndex: 8,
            maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 87.5%, rgba(0, 0, 0, 1) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 87.5%, rgba(0, 0, 0, 1) 100%)',
            borderRadius: 0,
            pointerEvents: 'none',
            backdropFilter: 'blur(7px)',
          }} />
        </div>
      </div>
    </div>
  );
}

