"use client";

import React, { useState } from "react";
import { Announcement } from "../types";
import { API_URL, getToken } from "@/lib/auth";
import { Plus, Trash2, Loader2, X, Image as ImageIcon, Bell } from "lucide-react";

export default function AnnouncementManager({ announcements, refresh }: { announcements: Announcement[]; refresh: () => void }) {
    const [loading, setLoading] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setSelectedImages((prev) => [...prev, ...files]);
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreviews((prev) => [...prev, ev.target?.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const title = formData.get("title") as string;
        const message = formData.get("message") as string;
        const fileUrl = formData.get("fileUrl") as string;
        try {
            let imageUrls: string[] = [];
            if (selectedImages.length > 0) {
                const uploadData = new FormData();
                selectedImages.forEach((img) => uploadData.append("images", img));
                const uploadRes = await fetch(`${API_URL}/announcements/upload`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: uploadData });
                if (uploadRes.ok) { const result = await uploadRes.json(); imageUrls = result.urls || []; }
            }
            await fetch(`${API_URL}/announcements`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ title, message, fileUrl: fileUrl || undefined, images: imageUrls }) });
            form.reset(); setSelectedImages([]); setImagePreviews([]); refresh();
        } finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        await fetch(`${API_URL}/announcements/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
        refresh();
    };

    return (
        <div className="space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 gap-4">
                <div className="relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">Total Announcements</p><p className="text-2xl font-bold">{announcements.length}</p></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/30 p-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20" />
                    <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-1">With Attachments</p><p className="text-2xl font-bold">{announcements.filter((a) => a.fileUrl || (a.images && a.images.length > 0)).length}</p></div>
                </div>
            </div>

            <div className="grid md:grid-cols-[380px_1fr] gap-8">
                {/* Post Form */}
                <div>
                    <h2 className="text-lg font-bold mb-4">Post Announcement</h2>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input name="title" placeholder="Title" required className="coord-input" />
                        <textarea name="message" placeholder="Message content..." required rows={4} className="coord-input resize-none" />
                        <input name="fileUrl" placeholder="Attachment URL (PDF etc) - optional" className="coord-input" />

                        <div className="space-y-2">
                            <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                                <ImageIcon size={16} className="text-foreground/30" />
                                <span className="text-xs text-foreground/40">Click to add images</span>
                                <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                            </label>
                            {imagePreviews.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {imagePreviews.map((src, i) => (
                                        <div key={i} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700">
                                            <img src={src} alt="" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removeImage(i)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <X size={14} className="text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button disabled={loading} className="w-full cta-gradient text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {loading ? "Publishing..." : "Publish"}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div>
                    <h2 className="text-lg font-bold mb-4">Recent Announcements</h2>
                    <div className="grid gap-3">
                        {announcements.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
                                <Bell size={32} className="mx-auto text-foreground/10 mb-2" />
                                <p className="text-foreground/40 text-sm">No announcements posted</p>
                            </div>
                        )}
                        {announcements.map((a) => (
                            <div key={a._id} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 group">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold">{a.title}</h3>
                                    <button onClick={() => handleDelete(a._id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <p className="text-foreground/60 text-sm whitespace-pre-wrap mb-3">{a.message}</p>
                                {a.images && a.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {a.images.map((url, i) => (
                                            <a key={i} href={`${API_URL.replace("/api", "")}${url}`} target="_blank" rel="noopener noreferrer">
                                                <img src={`${API_URL.replace("/api", "")}${url}`} alt={`Attachment ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-gray-100 dark:border-zinc-800 hover:opacity-80 transition-opacity" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                                {a.fileUrl && <a href={a.fileUrl} target="_blank" className="text-primary text-sm hover:underline font-medium">View Attachment →</a>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
