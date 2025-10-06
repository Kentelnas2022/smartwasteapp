"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Typing animation
  const messages = ["Welcome!", "Hello There!", "Log In to Start!"];
  const [displayedText, setDisplayedText] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const speed = isDeleting ? 50 : 120;
    const timeout = setTimeout(() => {
      const currentMessage = messages[messageIndex];
      if (!isDeleting) {
        setDisplayedText(currentMessage.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
        if (charIndex + 1 === currentMessage.length) {
          setTimeout(() => setIsDeleting(true), 1000);
        }
      } else {
        setDisplayedText(currentMessage.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
        if (charIndex - 1 === 0) {
          setIsDeleting(false);
          setMessageIndex((messageIndex + 1) % messages.length);
        }
      }
    }, speed);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, messageIndex]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    const user = data.user;
    if (!user) return;

    // Ensure resident profile exists
    const { data: resident, error: fetchError } = await supabase
      .from("residents")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!resident && !fetchError) {
      await supabase.from("residents").insert([
        {
          id: user.id,
          fullname: user.email?.split("@")[0] || "Unnamed",
          address: "Unknown",
          email: user.email,
        },
      ]);
    }

    // Role-based redirect
    const adminEmail = "tristandominicparajes.202200583@gmail.com"; // Admin
    const collectorEmail = "parajestristan4@gmail.com"; // Collector
    
    if (user.email === adminEmail) {
      router.push("/"); // official section
    } else if (user.email === collectorEmail) {
      router.push("/collector");
    } else {
      router.push("/residents");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 px-2 py-8">
      {/* Typing Animation Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center mb-8 md:mb-0">
        <div className="text-center px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 border-r-4 pr-2 animate-blink-cursor text-gray-800 min-h-[48px]">
            {displayedText}
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Log in to continue exploring your dashboard.
          </p>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="bg-white/80 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            Login
          </h2>
          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
          )}

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-6 bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition"
          >
            Login
          </button>

          <p className="mt-6 text-sm text-center text-gray-600">
            Don't have an account?{" "}
            <a href="/register" className="text-blue-600 hover:underline">
              Sign Up
            </a>
          </p>
        </form>
      </div>

      <style jsx>{`
        .animate-blink-cursor {
          animation: blink 0.7s infinite;
        }
        @keyframes blink {
          0%,
          100% {
            border-color: transparent;
          }
          50% {
            border-color: gray;
          }
        }
      `}</style>
    </div>
  );
}