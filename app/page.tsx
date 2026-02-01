import { Navbar } from "@/components/home/Navbar";
import { Hero } from "@/components/home/Hero";
import { Features } from "@/components/home/Features";
import { About } from "@/components/home/About";
import { Footer } from "@/components/home/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <Hero />
      <About />
      <Features />
      <Footer />
    </div>
  );
}