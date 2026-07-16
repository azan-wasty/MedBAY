'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BRAND_CONFIG } from '../lib/constants';

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {BRAND_CONFIG.name}
        </motion.h1>

        {/* Center expanding accent underline */}
        <motion.div
          style={{
            height: '3px',
            backgroundColor: 'var(--accent, #d97706)',
            marginTop: '0.5rem',
            marginBottom: '1.25rem',
            borderRadius: 'var(--radius-full)'
          }}
          initial={{ width: 0 }}
          animate={{ width: 80 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        />

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        >
          {BRAND_CONFIG.slogan}
        </motion.p>
      </div>
    </section>
  );
}
