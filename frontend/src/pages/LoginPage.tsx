import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole, LogIn, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import logo from "../assets/logo-stuntrack.png";

function LoginPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        token?: string;
        role?: "orang_tua" | "volunteer" | "admin";
        name?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok || !result.token || !result.role) {
        throw new Error(result.message || result.error || "Email atau password tidak sesuai.");
      }

      localStorage.setItem(
        "stuntrack_session",
        JSON.stringify({ token: result.token, role: result.role, name: result.name }),
      );
      navigate(`/dashboard/${result.role}`);
    } catch (submitError) {
      setError(
        submitError instanceof TypeError
          ? "Tidak dapat terhubung ke server. Pastikan backend StunTrack sedang berjalan di port 3000."
          : submitError instanceof Error
            ? submitError.message
            : "Login belum berhasil. Coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3efea] bg-[linear-gradient(135deg,rgba(28,95,189,0.13),transparent_38%),linear-gradient(315deg,rgba(22,134,121,0.12),transparent_35%)] px-3 py-3 text-[#24313a] sm:px-5 sm:py-7">
      <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1138px] flex-col overflow-hidden rounded-lg border border-[#d7d0c9] bg-[#fffdf9] shadow-[0_18px_60px_rgba(70,53,39,0.13)] sm:min-h-[calc(100vh-3.5rem)]">
        <nav className="flex items-center justify-between gap-4 border-b border-[#e7dfd7] bg-white/75 px-5 py-4 md:px-7" aria-label="Site">
          <Link className="inline-flex items-center gap-3 text-[#1c5fbd]" to="/" aria-label="StunTrack home">
            <img className="h-[50px] w-[50px] shrink-0 object-contain" src={logo} alt="" />
            <span className="grid gap-0.5 leading-none"><strong className="text-[1.28rem] font-black text-[#1d61bc]">StunTrack</strong><small className="text-xs font-extrabold uppercase text-[#657b86]">Baby growth monitor</small></span>
          </Link>
          <Link className="inline-flex items-center gap-2 font-extrabold text-[#4f6267] transition hover:text-[#1d61bc]" to="/"><ArrowLeft size={18} />Back to home</Link>
        </nav>

        <div className="grid flex-1 lg:grid-cols-[minmax(280px,0.82fr)_minmax(430px,1fr)]">
          <aside className="relative hidden overflow-hidden bg-[#1c5fbd] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border-[34px] border-white/10" />
            <div className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-[#168679]/40" />
            <div className="relative"><p className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-blue-100">Welcome back</p><h1 className="max-w-sm text-4xl font-black leading-tight">Lanjutkan perjalanan tumbuh sehat bersama StunTrack.</h1><p className="mt-5 max-w-sm leading-relaxed text-blue-100">Masuk untuk melihat ruang pemantauan pertumbuhan dan dukungan komunitasmu.</p></div>
            <div className="relative rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur-sm"><CheckCircle2 className="mb-3" size={22} /><p className="font-extrabold">Satu akun, satu ruang tumbuh</p><p className="mt-1 text-sm leading-relaxed text-blue-100">Akses pengalaman yang sesuai dengan peranmu.</p></div>
          </aside>

          <section className="flex items-center justify-center px-5 py-9 sm:px-10 lg:px-14" aria-labelledby="login-title">
            <div className="w-full max-w-[510px]">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.14em] text-[#1c5fbd]">Welcome back</p>
              <h1 id="login-title" className="font-serif text-4xl font-bold text-[#303b45] sm:text-[2.8rem]">Sign in to StunTrack</h1>
              <p className="mt-3 leading-relaxed text-[#65747b]">Masuk untuk melanjutkan ke dashboard kamu.</p>

              <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
                <label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="email"><span className="inline-flex items-center gap-2"><Mail size={17} className="text-[#1c5fbd]" />Email</span><input className="h-12 rounded-lg border border-[#cbd8df] bg-white px-4 font-medium text-[#24313a] outline-none transition placeholder:text-[#9aa8af] focus:border-[#1c5fbd] focus:ring-4 focus:ring-[#1c5fbd]/10" id="email" name="email" type="email" placeholder="nama@email.com" required /></label>
                <label className="grid gap-2 text-sm font-extrabold text-[#405155]" htmlFor="password"><span className="inline-flex items-center gap-2"><LockKeyhole size={17} className="text-[#1c5fbd]" />Password</span><input className="h-12 rounded-lg border border-[#cbd8df] bg-white px-4 font-medium text-[#24313a] outline-none transition placeholder:text-[#9aa8af] focus:border-[#1c5fbd] focus:ring-4 focus:ring-[#1c5fbd]/10" id="password" name="password" type="password" placeholder="Masukkan password" required /></label>
                {error && <p className="rounded-lg border border-[#f1c5be] bg-[#fff1ee] px-4 py-3 text-sm font-semibold text-[#a43b2c]" role="alert">{error}</p>}
                <button className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1c5fbd] px-5 font-black text-white shadow-[0_3px_0_#124a98] transition hover:bg-[#174f9d] focus:outline-none focus:ring-4 focus:ring-[#1c5fbd]/25 disabled:cursor-wait disabled:opacity-70" type="submit" disabled={isSubmitting}><LogIn size={19} />{isSubmitting ? "Signing in..." : "Sign in"}</button>
              </form>
              <p className="mt-6 text-center text-sm text-[#65747b]">Belum punya akun? <Link className="font-black text-[#1c5fbd] hover:underline" to="/register">Register sekarang</Link></p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
