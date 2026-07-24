"use client";

import { useRef, useState } from "react";
import { TiLocationArrow } from "react-icons/ti";

const VIDEO_LINKS = {
    feature1:
        "https://93w95scdts.ufs.sh/f/AOfILeWJzqCc56aV03LYRyJDZsOPGdFTt0lQuHLkeqjKCao1",

    feature2:
        "https://93w95scdts.ufs.sh/f/AOfILeWJzqCclcn5JiTo8NUtBfpgkOmXZ2CT3DjMr19Yqlac",

    feature3:
        "https://93w95scdts.ufs.sh/f/AOfILeWJzqCcbZvH6O7fXDrfMZ6S457EQsgoxTCIz1kjlnVd",

    feature4:
        "https://93w95scdts.ufs.sh/f/AOfILeWJzqCcSrGHFCyiMbxBtTacUmFzn4dZpwVYNfvR6WLg",

    feature5:
        "https://93w95scdts.ufs.sh/f/AOfILeWJzqCc1qT68sSEu6tgkCBNP3FH45AUe70hrbTaxYDm",
};

const BentoTilt = ({ children, className = "" }) => {
    const itemRef = useRef(null);

    const handleMouseMove = (e) => {
        const item = itemRef.current;
        if (!item) return;

        const { left, top, width, height } = item.getBoundingClientRect();

        const relativeX = (e.clientX - left) / width;
        const relativeY = (e.clientY - top) / height;

        const tiltX = (relativeY - 0.5) * 5;
        const tiltY = (relativeX - 0.5) * -5;

        item.style.transform = `
            perspective(700px)
            rotateX(${tiltX}deg)
            rotateY(${tiltY}deg)
            scale3d(0.98,0.98,0.98)
        `;
    };

    const handleMouseLeave = () => {
        const item = itemRef.current;
        if (!item) return;
        item.style.transform = "";
    };

    return (
        <div
            ref={itemRef}
            className={`transition-transform duration-300 ease-out ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </div>
    );
};

const BentoCard = ({ src, title, description }) => {
    return (
        <article className="relative h-full w-full overflow-hidden rounded-3xl">
            <video
                src={src}
                loop
                muted
                autoPlay
                playsInline
                className="absolute top-0 left-0 h-full w-full object-cover"
            />

            <div className="relative z-10 flex h-full flex-col justify-between bg-black/30 p-6 text-white">
                <div>
                    <h1 className="special-font text-4xl md:text-6xl font-black uppercase leading-none">
                        <b>{title}</b>
                    </h1>

                    {description && (
                        <p className="mt-4 max-w-xs text-sm md:text-base text-gray-200">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </article>
    );
};

const Features = () => {
    return (
        <section className="bg-black pb-40 text-white">
            <div className="mx-auto max-w-[1400px] px-4 md:px-10">
                {/* TOP TEXT */}
                <div className="py-24">
                    <p className="special-font text-lg uppercase tracking-[0.2em] text-violet-400">
                        <b>Into the Metagame Layer</b>
                    </p>

                    <p className="mt-5 max-w-2xl text-lg text-gray-300">
                        Immerse yourself in a rich and ever-expanding universe where gaming,
                        AI, Web3, and futuristic experiences merge into one cinematic world.
                    </p>
                </div>

                {/* BIG CARD */}
                <BentoTilt className="mb-8 h-[70vh] overflow-hidden rounded-3xl border border-white/10">
                    <BentoCard
                        src={VIDEO_LINKS.feature1}
                        title={
                            <>
                                radia<span className="text-violet-400">n</span>t
                            </>
                        }
                        description="A cross-platform metagame app transforming gameplay into a rewarding cinematic adventure."
                    />
                </BentoTilt>

                {/* GRID */}
                <div className="grid auto-rows-[300px] grid-cols-1 gap-7 md:grid-cols-2">
                    <BentoTilt className="md:row-span-2 h-[620px] overflow-hidden rounded-3xl border border-white/10">
                        <BentoCard
                            src={VIDEO_LINKS.feature2}
                            title={
                                <>
                                    zig<span className="text-cyan-400">m</span>a
                                </>
                            }
                            description="Anime-inspired futuristic NFT universe built for expansion."
                        />
                    </BentoTilt>

                    <BentoTilt className="overflow-hidden rounded-3xl border border-white/10">
                        <BentoCard
                            src={VIDEO_LINKS.feature3}
                            title={
                                <>
                                    n<span className="text-violet-400">e</span>xus
                                </>
                            }
                            description="A social gaming hub bringing communities together."
                        />
                    </BentoTilt>

                    <BentoTilt className="overflow-hidden rounded-3xl border border-white/10">
                        <BentoCard
                            src={VIDEO_LINKS.feature4}
                            title={
                                <>
                                    az<span className="text-cyan-400">u</span>l
                                </>
                            }
                            description="AI-powered gameplay assistant for futuristic worlds."
                        />
                    </BentoTilt>

                    <BentoTilt className="flex min-h-[300px] items-center justify-center rounded-3xl bg-violet-400 p-8">
                        <div className="flex h-full w-full flex-col justify-between">
                            <h1 className="special-font max-w-xs text-4xl font-black uppercase text-black md:text-5xl">
                                <b>M<span className="text-white">o</span>re co
                                    <span className="text-white">m</span>ing so
                                    <span className="text-white">o</span>n!</b>
                            </h1>

                            <TiLocationArrow className="self-end text-7xl text-black" />
                        </div>
                    </BentoTilt>

                    <BentoTilt className="overflow-hidden rounded-3xl border border-white/10">
                        <video
                            src={VIDEO_LINKS.feature5}
                            loop
                            muted
                            autoPlay
                            playsInline
                            className="h-full w-full object-cover"
                        />
                    </BentoTilt>
                </div>
            </div>
        </section>
    );
};

export default Features;