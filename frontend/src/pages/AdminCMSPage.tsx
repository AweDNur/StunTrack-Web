import { FileText } from "lucide-react";

export default function AdminCMSPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-[#e3eaf2] bg-white p-6 shadow-sm sm:p-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#eaf2ff] text-[#1c5fbd]">
          <FileText size={32} />
        </div>
        <h2 className="text-2xl font-black text-[#303b45]">Kelola Konten Landing Page</h2>
        <p className="mt-2 text-sm text-[#71838d]">
          Halaman ini nantinya akan digunakan untuk menambah, mengubah, atau menghapus artikel edukasi yang tampil di beranda utama (Guest).
        </p>
        
        <div className="mt-8 rounded-xl border border-dashed border-[#d1dbe5] bg-[#f8fafc] p-10">
          <p className="font-bold text-[#8a9aa6] uppercase tracking-widest text-xs">Form CMS Coming Soon</p>
        </div>
      </div>
    </div>
  );
}