import React from 'react';

interface IPhoneMockupProps {
  children: React.ReactNode;
  isLandscape?: boolean;
}

export const IPhoneMockup: React.FC<IPhoneMockupProps> = ({ children, isLandscape = false }) => {
  // Base dimensions from the mockup image
  const baseWidth = 245;
  const baseHeight = 499.945;

  if (isLandscape) {
    // For landscape mode, rotate the entire mockup
    // When rotated, width and height are swapped from the viewer's perspective
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Rotated wrapper for both image and content */}
        <div
          style={{
            position: 'relative',
            width: 'auto',
            height: '90%',
            maxWidth: '90%',
            aspectRatio: `${baseWidth} / ${baseHeight}`,
            transform: 'rotate(90deg)',
            transformOrigin: 'center center',
          }}
        >
          {/* Content area (iframe will go here) - rendered BEHIND the mockup */}
          <div
            style={{
              position: 'absolute',
              top: '2%',
              left: '3.5%',
              width: '93%',
              height: '96%',
              borderRadius: '6%',
              overflow: 'hidden',
              zIndex: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'white',
            }}
          >
            {children}
          </div>

          {/* iPhone mockup image as overlay */}
          <img
            decoding="async"
            width={1888}
            height={3832}
            srcSet="
              https://framerusercontent.com/images/H2xOBKfRU2M06U4j9LF5WN8z6pA.png?scale-down-to=2048 1009w,
              https://framerusercontent.com/images/H2xOBKfRU2M06U4j9LF5WN8z6pA.png                    1888w
            "
            src="https://framerusercontent.com/images/H2xOBKfRU2M06U4j9LF5WN8z6pA.png"
            alt="iPhone Mockup"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        </div>
      </div>
    );
  }

  // Portrait mode (default)
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Wrapper to scale mockup */}
      <div
        style={{
          position: 'relative',
          width: 'auto',
          height: '90%',
          maxWidth: '90%',
          aspectRatio: `${baseWidth} / ${baseHeight}`,
        }}
      >
        {/* Content area (iframe will go here) - rendered BEHIND the mockup */}
        <div
          style={{
            position: 'absolute',
            // Percentages based on the actual iPhone mockup screen area
            top: '2%',
            left: '3.5%',
            width: '93%',
            height: '96%',
            borderRadius: '6%',
            overflow: 'hidden',
            zIndex: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
          }}
        >
          {children}
        </div>

        {/* iPhone mockup image as overlay */}
        <img
          decoding="async"
          width={1888}
          height={3832}
          srcSet="
            https://framerusercontent.com/images/H2xOBKfRU2M06U4j9LF5WN8z6pA.png?scale-down-to=2048 1009w,
            https://framerusercontent.com/images/H2xOBKfRU2M06U4j9LF5WN8z6pA.png                    1888w
          "
          src="https://framerusercontent.com/images/H2xOBKfRU2M06U4j9LF5WN8z6pA.png"
          alt="iPhone Mockup"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      </div>
    </div>
  );
};

