import { useEffect, useState } from "react";
import { ArrowLeft, HeartPulse, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../assets/logo-stuntrack.png";

type AboutSections = {
  main: string;
  theSite: string;
  story: string;
  credits: string;
  people: string;
  papers: string;
  press: string;
};

const emptySections: AboutSections = { main: "", theSite: "", story: "", credits: "", people: "", papers: "", press: "" };

const sectionMeta = [
  ["the-site", "The Site", "theSite"],
  ["story", "Story", "story"],
  ["credits", "Credits", "credits"],
  ["people", "People", "people"],
  ["papers", "Papers", "papers"],
  ["press", "Press", "press"],
] as const;

export default function AboutPage() {
  const [sections, setSections] = useState<AboutSections>(emptySections);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAbout() {
      try {
        const response = await fetch("http://localhost:3000/api/about");
        const data = await response.json();
        setSections({ ...emptySections, ...(data.sections || {}), main: data.sections?.main || data.content || "" });
      } catch {
        setSections({ ...emptySections, main: "Gagal memuat informasi dari server." });
      } finally {
        setIsLoading(false);
      }
    }
    void fetchAbout();
  }, []);

  return (
    <main className="min-h-screen bg-[#f3efea] bg-[linear-gradient(135deg,rgba(18,132,122,0.12),transparent_34%),linear-gradient(315deg,rgba(219,94,68,0.13),transparent_31%)] px-3 py-3 text-[#24313a] sm:px-5 sm:py-7 sm:pb-14">
      <section className="mx-auto w-full max-w-[900px] overflow-hidden rounded-lg border border-[#d7d0c9] bg-[#fffdf9] shadow-[0_18px_60px_rgba(70,53,39,0.13)]">
        <nav className="flex items-center justify-between border-b border-[#e7dfd7] bg-white/75 px-5 py-4 md:px-7">
          <div className="flex items-center gap-3"><Link to="/" className="flex items-center gap-3 text-[#1d61bc]"><img className="h-10 w-10 object-contain" src={logo} alt="StunTrack Logo" /><strong className="text-xl font-black">StunTrack</strong></Link><Link to="/labels" className="ml-2 rounded-lg border border-[#b4ccef] bg-[#eaf2ff] px-5 py-2.5 text-base font-black text-[#1c5fbd] shadow-[0_3px_0_#9db9e8]">Label</Link></div>
          <Link to="/" className="inline-flex items-center gap-2 font-extrabold text-[#4f6267] hover:text-[#1d61bc]"><ArrowLeft size={18} /> Kembali ke Beranda</Link>
        </nav>

        <div className="px-6 py-10 sm:px-12 sm:py-14">
          {isLoading ? <div className="flex flex-col items-center justify-center py-20 text-[#8a9aa6]"><Loader2 className="mb-4 h-10 w-10 animate-spin text-[#1c5fbd]" /><p className="font-bold">Memuat informasi...</p></div> : <>
            <section className="border-b border-[#e7dfd7] pb-7"><div className="mb-5 flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2ff] text-[#1c5fbd]"><HeartPulse size={28} /></div><div><h1 className="text-3xl font-black text-[#1d61bc]">About StunTrack</h1><p className="mt-1 font-extrabold uppercase tracking-wide text-sm text-[#657b86]">Informasi & Latar Belakang StunTrack</p></div></div><div className="about-rich-preview prose prose-blue max-w-none text-[#263744]" dangerouslySetInnerHTML={{ __html: sections.main || "<p>Belum ada informasi yang tersedia.</p>" }} /></section>
            <nav className="flex flex-wrap justify-center gap-x-7 gap-y-3 border-b border-[#e7dfd7] py-5 text-base font-normal text-[#a04435]">{sectionMeta.map(([id, title]) => <a key={id} href={`#${id}`} className="transition-colors hover:text-[#1c5fbd] hover:underline">{title.toLowerCase()}</a>)}</nav>
            {sectionMeta.map(([id, title, key]) => <section key={id} id={id} className="scroll-mt-5 border-b border-[#e7dfd7] py-8 last:border-b-0"><h2 className="mb-3 text-xl font-black uppercase tracking-wide text-[#303b45]">{title}</h2><div className="about-rich-preview prose prose-blue max-w-none text-[#405155]" dangerouslySetInnerHTML={{ __html: sections[key] || `<p>Belum ada konten ${title.toLowerCase()}.</p>` }} /></section>)}
          </>}
        </div>
      </section>
    </main>
  );
}
