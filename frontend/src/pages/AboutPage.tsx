import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, HeartPulse } from "lucide-react";

import logo from "../assets/logo-stuntrack.png";

export default function AboutPage() {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAbout() {
      try {
        const res = await fetch("http://localhost:3000/api/about");
        const data = await res.json();
        setContent(data.content || "Belum ada informasi yang tersedia.");
      } catch (error) {
        setContent("Gagal memuat informasi dari server.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAbout();
  }, []);

  return (
    <main className="min-h-screen bg-[#f3efea] bg-[linear-gradient(135deg,rgba(18,132,122,0.12),transparent_34%),linear-gradient(315deg,rgba(219,94,68,0.13),transparent_31%)] px-3 py-3 text-[#24313a] sm:px-5 sm:py-7 sm:pb-14">
      <section className="mx-auto w-full max-w-[900px] overflow-hidden rounded-lg border border-[#d7d0c9] bg-[#fffdf9] shadow-[0_18px_60px_rgba(70,53,39,0.13)]">
        
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between border-b border-[#e7dfd7] bg-white/75 px-5 py-4 md:px-7">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 text-[#1d61bc]">
              <img className="h-[40px] w-[40px] shrink-0 object-contain" src={logo} alt="StunTrack Logo" />
              <strong className="text-xl font-black text-[#1d61bc]">StunTrack</strong>
            </Link>
            <Link
              to="/labels"
              className="ml-2 rounded-lg border border-[#b4ccef] bg-[#eaf2ff] px-5 py-2.5 text-base font-black text-[#1c5fbd] shadow-[0_3px_0_#9db9e8] transition hover:-translate-y-0.5 hover:bg-[#dceaff] hover:shadow-[0_4px_0_#8eafe4]"
            >
              Label
            </Link>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-extrabold text-[#4f6267] transition hover:text-[#1d61bc]"
          >
            <ArrowLeft size={18} /> Kembali ke Beranda
          </Link>
        </nav>

        {/* Content Area */}
        <div className="px-6 py-10 sm:px-12 sm:py-14">
          <div className="mb-8 flex items-center gap-4 border-b border-[#e7dfd7] pb-6">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2ff] text-[#1c5fbd]">
              <HeartPulse size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#1d61bc]">Tentang Kami</h1>
              <p className="mt-1 font-extrabold uppercase tracking-wide text-[#657b86] text-sm">
                Informasi & Latar Belakang StunTrack
              </p>
            </div>
          </div>

          <div className="min-h-[300px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#8a9aa6]">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#1c5fbd]" />
                <p className="font-bold">Memuat informasi...</p>
              </div>
            ) : (
              <div className="prose prose-blue max-w-none text-[#263744]">
                <p className="whitespace-pre-wrap text-[1.08rem] leading-relaxed">
                  {content}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
