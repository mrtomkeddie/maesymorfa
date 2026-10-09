'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

// Fades and lifts its children into place the first time they scroll into view.
// data-reveal lets the <noscript> rule in the root layout show it when JS is off.
export function Reveal({ children, className, delay = 0, x = 0 }: { children: ReactNode; className?: string; delay?: number; x?: number }) {
    const reduce = useReducedMotion();
    if (reduce) return <div className={className}>{children}</div>;
    return (
        <motion.div
            data-reveal
            className={className}
            initial={{ opacity: 0, y: x ? 0 : 28, x }}
            whileInView={{ opacity: 1, y: 0, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: EASE, delay }}
        >
            {children}
        </motion.div>
    );
}

// Parent for a row of cards: each RevealItem enters 0.1s after the one before.
export function RevealGroup({ children, className, stagger = 0.1 }: { children: ReactNode; className?: string; stagger?: number }) {
    const reduce = useReducedMotion();
    if (reduce) return <div className={className}>{children}</div>;
    return (
        <motion.div
            data-reveal
            className={className}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
        >
            {children}
        </motion.div>
    );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
    const reduce = useReducedMotion();
    if (reduce) return <div className={className}>{children}</div>;
    return (
        <motion.div data-reveal className={className} variants={itemVariants}>
            {children}
        </motion.div>
    );
}
