'use client';

import React from 'react';

export function StarBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-black">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <style jsx global>{`
        @keyframes moveUp {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-100vh);
          }
        }
        
        .stars-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: transparent;
        }

        .stars-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 200vh;
          background-image: 
            radial-gradient(1px 1px at 10% 10%, rgba(255, 255, 255, 0.8) 1px, transparent 0),
            radial-gradient(1px 1px at 20% 30%, rgba(255, 255, 255, 0.7) 1px, transparent 0),
            radial-gradient(1px 1px at 30% 70%, rgba(255, 255, 255, 0.6) 1px, transparent 0),
            radial-gradient(1px 1px at 40% 40%, rgba(255, 255, 255, 0.8) 1px, transparent 0),
            radial-gradient(1px 1px at 50% 90%, rgba(255, 255, 255, 0.5) 1px, transparent 0),
            radial-gradient(1px 1px at 60% 20%, rgba(255, 255, 255, 0.9) 1px, transparent 0),
            radial-gradient(2px 2px at 70% 60%, rgba(255, 255, 255, 0.4) 1px, transparent 0),
            radial-gradient(1px 1px at 80% 10%, rgba(255, 255, 255, 0.7) 1px, transparent 0),
            radial-gradient(1px 1px at 90% 80%, rgba(255, 255, 255, 0.6) 1px, transparent 0);
          background-size: 400px 400px;
          animation: moveUp 60s linear infinite;
        }

        .stars-layer-2 {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 200vh;
          background-image: 
            radial-gradient(1px 1px at 15% 15%, rgba(255, 255, 255, 0.5) 1px, transparent 0),
            radial-gradient(1px 1px at 25% 35%, rgba(255, 255, 255, 0.4) 1px, transparent 0),
            radial-gradient(2px 2px at 65% 65%, rgba(255, 255, 255, 0.6) 1px, transparent 0);
          background-size: 600px 600px;
          animation: moveUp 100s linear infinite;
        }
      `}</style>

      <div className="stars-container">
        <div className="stars-layer" />
        <div className="stars-layer-2" />
      </div>
    </div>
  );
}
