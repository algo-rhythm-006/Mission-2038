"use client";

import React from 'react';
import { motion } from 'framer-motion';

// --- FadeIn Component Configurations ---
const variants = {
    hidden: (y) => ({
        opacity: 0,
        y,
    }),
    visible: (y) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.7,
            ease: [0.25, 0.1, 0.25, 1],
        },
    }),
};

// --- FadeIn Component ---
function FadeIn({
    children,
    delay = 0,
    duration = 0.7,
    x = 0,
    y = 30,
    className,
    style,
    as = 'div',
}) {
    const Component = motion.create ? motion.create(as) : motion(as);

    return (
        <Component
            variants={{
                hidden: { opacity: 0, x, y },
                visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration, ease: [0.25, 0.1, 0.25, 1], delay },
                },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "50px", amount: 0 }}
            className={className}
            style={style}
        >
            {children}
        </Component>
    );
}

// --- History Data ---
const history = [
    {
        number: '01',
        name: '3D Modeling',
        description: 'Creation of detailed objects, characters, or environments tailored to specific client needs, ideal for games, products, and visualizations.',
    },
    {
        number: '02',
        name: 'Rendering',
        description: 'High-quality, photorealistic renders that showcase designs with custom lighting, textures, and materials to bring concepts to life.',
    },
    {
        number: '03',
        name: 'Motion Design',
        description: 'Dynamic animations and motion graphics that add energy and storytelling to brands, products, and digital experiences.',
    },
    {
        number: '04',
        name: 'Branding',
        description: 'Crafting cohesive visual identities — from logos to full brand systems — that communicate a clear and memorable presence.',
    },
    {
        number: '05',
        name: 'Web Design',
        description: 'Designing clean, modern, and conversion-focused websites with attention to layout, typography, and user experience.',
    },
];

// --- Main History Section Component ---
export default function HistorySection() {
    return (
        <section
            className="flex flex-col px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32 rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px]"
            style={{ backgroundColor: '#FFFFFF' }}
        >
            <h2
                className="font-black uppercase leading-none tracking-tight text-center w-full mb-16 sm:mb-20 md:mb-28"
                style={{ fontSize: 'clamp(3rem, 12vw, 160px)', color: '#0C0C0C' }}
            >
                History
            </h2>

            <div className="flex flex-col w-full items-center">
                {history.map((item, i) => (
                    <FadeIn
                        key={item.number}
                        delay={i * 0.1}
                        y={30}
                        className="flex flex-col items-center w-full max-w-5xl"
                    >
                        {i > 0 && (
                            <div
                                className="w-full"
                                style={{ borderTop: '1px solid rgba(12, 12, 12, 0.15)' }}
                            />
                        )}
                        <div className="flex items-start gap-6 sm:gap-8 md:gap-10 py-8 sm:py-10 md:py-12 w-full">
                            <span
                                className="font-black uppercase leading-none flex-shrink-0"
                                style={{ fontSize: 'clamp(3rem, 10vw, 140px)', color: '#0C0C0C' }}
                            >
                                {item.number}
                            </span>

                            <div className="flex flex-col gap-2 sm:gap-4 md:gap-5 pt-1">
                                <span
                                    className="font-medium uppercase"
                                    style={{ fontSize: 'clamp(1rem, 2.2vw, 2.1rem)', color: '#0C0C0C' }}
                                >
                                    {item.name}
                                </span>
                                <p
                                    className="leading-relaxed opacity-80"
                                    style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)', color: '#0C0C0C' }}
                                >
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    </FadeIn>
                ))}
            </div>
        </section>
    );
}