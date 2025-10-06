"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";

type ContentItem = {
	id?: number;
	title?: string;
	description?: string;
	category?: string;
	audience?: string;
	media_url?: string | null;
	media_type?: string | null;
	status?: string | null;
	created_at?: string | null;
};

export default function EducationalPage() {
	const router = useRouter();
	const [items, setItems] = useState<ContentItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const fetchContents = async () => {
			setLoading(true);
			try {
				const { data, error } = await supabase
					.from("educational_contents")
					.select("*")
					.order("created_at", { ascending: false });

				if (error) throw error;
				if (mounted) setItems((data as ContentItem[]) || []);
			} catch (err: any) {
				console.error("fetch educational contents error", err);
				if (mounted) setError(err.message || String(err));
			} finally {
				if (mounted) setLoading(false);
			}
		};

		fetchContents();
		return () => {
			mounted = false;
		};
	}, []);

		return (
			<div className="p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						<button
							onClick={() => router.back()}
							aria-label="Go back"
							title="Back"
							className="w-9 h-9 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:shadow-sm transition-transform transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#AD2B49]"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#AD2B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<div>
							<h1 className="text-2xl font-bold">Educational Content</h1>
							<p className="text-sm text-gray-600">Materials published by the officials.</p>
						</div>
					</div>
				</div>

			{loading && <p className="text-gray-500">Loading...</p>}
			{error && <p className="text-red-500">{error}</p>}

			{!loading && !items.length && <p className="text-gray-500">No educational content found.</p>}

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{items.map((it) => (
					<article key={it.id ?? Math.random()} className="bg-white rounded-2xl shadow p-4 border">
						<div className="h-44 mb-3 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
							{it.media_url ? (
								it.media_type && it.media_type.startsWith("image") ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img src={it.media_url} alt={it.title || "media"} className="w-full h-full object-cover" />
								) : it.media_type && it.media_type.startsWith("video") ? (
									<video src={it.media_url} controls className="w-full h-full object-cover" />
								) : (
									<a href={it.media_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
										View attachment
									</a>
								)
							) : (
								<div className="text-gray-400">No media</div>
							)}
						</div>
						<h3 className="text-lg font-semibold mb-1">{it.title}</h3>
						<p className="text-sm text-gray-600 mb-2 line-clamp-3">{it.description}</p>
						<div className="flex items-center justify-between text-xs text-gray-500">
							<span>{it.category || "General"}</span>
							<span>{it.status || "Draft"}</span>
						</div>
					</article>
				))}
			</div>
		</div>
	);
}
