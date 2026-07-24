"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import gsap from "gsap";
import AnimatedInput from "./AnimatedInput";
import MagneticButton from "./MagneticButton";

export default function LoginScene({ role, onBack }) {
  const root = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".login-reveal", {
        opacity: 0,
        y: 60,
        stagger: 0.12,
        duration: 1,
        ease: "power4.out"
      });
      gsap.from(".login-character", {
        x: -120,
        opacity: 0,
        duration: 1.2,
        ease: "power4.out"
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative flex min-h-screen overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,.12),transparent_60%)]" />
      <div className="relative hidden lg:flex w-1/2 items-end justify-center overflow-hidden">
        <Image src={role.image} alt={role.title} width={900} height={1000}
          className="login-character h-[90vh] w-auto object-contain" />
      </div>

      <div className="relative flex w-full lg:w-1/2 items-center px-8 md:px-16">
        <div className="w-full max-w-xl">
          <button onClick={onBack}
            className="login-reveal mb-10 text-sm uppercase tracking-[.3em] text-zinc-400 hover:text-yellow-400">
            ← Back
          </button>

          <p className="login-reveal text-yellow-400 uppercase tracking-[.45em] text-xs">
            {role.title} Portal
          </p>

          <h1 className="login-reveal mt-3 text-6xl md:text-8xl font-black leading-none text-white">
            WELCOME<br />BACK
          </h1>

          <p className="login-reveal mt-6 text-zinc-400">
            Continue your football journey.
          </p>

          <div className="login-reveal mt-12 space-y-8">
            <AnimatedInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <AnimatedInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="login-reveal mt-12">
            <MagneticButton>
              ENTER THE PITCH →
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}
