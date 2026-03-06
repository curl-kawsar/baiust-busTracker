"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Bell, FileText, CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace("/api", "");

function ImageGallery({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <>
      <div className={`mb-6 grid gap-2 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>
        {images.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className="relative overflow-hidden rounded-xl border border-border aspect-video bg-accent hover:opacity-90 transition-opacity"
          >
            <img
              src={`${API_BASE}${url}`}
              alt={`Image ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + images.length) % images.length); }}
                className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % images.length); }}
                className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <img
            src={`${API_BASE}${images[lightbox]}`}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <div className="absolute bottom-4 text-white/60 text-sm">
              {lightbox + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/announcements`)
      .then((res) => res.json())
      .then((data) => {
        setAnnouncements(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <main className="w-full min-h-screen bg-background flex flex-col pt-20">
      <Navbar />

      <div className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              University Announcements
            </h1>
            <p className="text-foreground/60">
              Updates, notices, and transport schedules
            </p>
          </div>
        </div>

        {loading ? (
          <div className="w-full h-40 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid gap-6">
            {announcements.length === 0 && (
              <div className="text-center py-12 text-foreground/50 bg-card rounded-3xl border border-border">
                No announcements at this time.
              </div>
            )}
            {announcements.map(
              (a: {
                _id: string;
                title: string;
                message: string;
                fileUrl?: string;
                images?: string[];
                createdAt: string;
                postedBy?: { name: string; role: string };
              }) => (
                <article
                  key={a._id}
                  className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-wrap gap-4 justify-between items-start mb-4">
                    <h2 className="font-bold text-xl md:text-2xl">{a.title}</h2>
                    <div className="flex items-center gap-2 text-sm text-foreground/50 bg-accent px-3 py-1.5 rounded-full">
                      <CalendarDays size={14} />
                      {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <p className="text-foreground/80 whitespace-pre-wrap mb-6 leading-relaxed">
                    {a.message}
                  </p>

                  {a.images && a.images.length > 0 && (
                    <ImageGallery images={a.images} />
                  )}

                  {a.fileUrl && (
                    <a
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary hover:bg-primary/10 rounded-lg font-medium transition-colors"
                    >
                      <FileText size={18} /> View Attachment
                    </a>
                  )}

                  <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-sm text-foreground/50">
                    <span className="font-medium text-foreground">
                      {a.postedBy?.name}
                    </span>
                    <span>•</span>
                    <span>{a.postedBy?.role}</span>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </main>
  );
}
