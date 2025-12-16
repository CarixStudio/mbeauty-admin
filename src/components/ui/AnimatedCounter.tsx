
import React from 'react';
import { useSpring, animated } from '@react-spring/web';

interface AnimatedCounterProps {
  value: number;
  format?: (val: number) => string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, format = (v) => Math.floor(v).toLocaleString(), className }) => {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    delay: 200,
    config: { mass: 1, tension: 20, friction: 10 },
  });

  return <animated.span className={className}>{number.to(n => format(n))}</animated.span>;
};
