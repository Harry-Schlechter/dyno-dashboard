import React from 'react';
import { Box, Typography } from '@mui/material';

export interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
  href?: string;
}

interface Props {
  images: GalleryImage[];
  /** Columns on md+. Default 3. */
  columns?: 2 | 3 | 4;
}

const GalleryGrid: React.FC<Props> = ({ images, columns = 3 }) => (
  <Box
    sx={{
      display: 'grid',
      gap: 1.25,
      gridTemplateColumns: {
        xs: 'repeat(2, 1fr)',
        sm: `repeat(${Math.min(columns, 3)}, 1fr)`,
        md: `repeat(${columns}, 1fr)`,
      },
    }}
  >
    {images.map((img, i) => {
      const inner = (
        <Box
          sx={{
            position: 'relative',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            aspectRatio: '4 / 3',
            backgroundImage: `url(${img.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'transform 0.2s',
            cursor: img.href ? 'pointer' : 'default',
            '&:hover': img.href ? { transform: 'scale(1.02)' } : {},
          }}
        >
          {img.caption && (
            <Box
              sx={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                p: 1, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
              }}
            >
              <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem' }}>
                {img.caption}
              </Typography>
            </Box>
          )}
        </Box>
      );

      if (img.href) {
        return (
          <a
            key={i}
            href={img.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={img.alt}
            style={{ textDecoration: 'none' }}
          >
            {inner}
          </a>
        );
      }
      return <div key={i} aria-label={img.alt}>{inner}</div>;
    })}
  </Box>
);

export default GalleryGrid;
