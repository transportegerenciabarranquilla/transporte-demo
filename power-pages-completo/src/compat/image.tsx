import type { ImgHTMLAttributes } from 'react';

type Props = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean; unoptimized?: boolean; quality?: number };
export default function Image({ fill, priority, unoptimized: _unoptimized, quality: _quality, style, ...props }: Props) {
  return <img {...props} loading={priority ? 'eager' : props.loading || 'lazy'} style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style } : style} />;
}
