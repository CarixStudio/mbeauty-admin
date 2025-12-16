
import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { useSpring } from '@react-spring/web';

interface GlobeMarker {
  location: [number, number];
  size: number;
}

interface LiveGlobeProps {
  className?: string;
  markers?: GlobeMarker[];
}

export const LiveGlobe: React.FC<LiveGlobeProps> = ({ className, markers = [] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);
  const [{ r }, api] = useSpring(() => ({
    r: 0,
    config: {
      mass: 1,
      tension: 280,
      friction: 40,
      precision: 0.001,
    },
  }));

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    let phi = 0;
    
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: dimensions.width * 2,
      height: dimensions.height * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.83, 0.65, 0.45], // Brand accent #d4a574
      glowColor: [0.1, 0.1, 0.1],
      opacity: 0.9,
      markers: markers.length > 0 ? markers : [
        { location: [37.7595, -122.4367], size: 0.08 }, // Default fallback
        { location: [40.7128, -74.0060], size: 0.1 },
      ],
      onRender: (state) => {
        if (!pointerInteracting.current) {
          phi += 0.003;
        }
        state.phi = phi + r.get();
        state.width = dimensions.width * 2;
        state.height = dimensions.height * 2;
      },
    });
    
    // Fade in
    setTimeout(() => {
        if (canvasRef.current) canvasRef.current.style.opacity = '1';
    }, 100);

    return () => globe.destroy();
  }, [dimensions, r, markers]);

  return (
    <div ref={containerRef} className={`w-full h-full relative flex items-center justify-center min-h-[300px] ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ 
            width: '100%', 
            height: '100%', 
            maxWidth: '100%', 
            aspectRatio: '1', 
            opacity: 0, 
            transition: 'opacity 1s ease',
            cursor: 'grab' 
        }}
        onPointerDown={(e) => {
          // @ts-ignore
          pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
          canvasRef.current!.style.cursor = 'grabbing';
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          canvasRef.current!.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          canvasRef.current!.style.cursor = 'grab';
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            api.start({ r: delta / 200 });
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            // @ts-ignore
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            api.start({ r: delta / 100 });
          }
        }}
      />
    </div>
  );
};
