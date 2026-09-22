import { Star } from "lucide-react";
import type { Review } from "@/lib/reviews";

export default function ReviewCard({ review }: { review: Review }) {
	const date = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(new Date(review.created_at));

	return (
		<article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
			<div className="flex gap-1" aria-label={`${review.rating} stelle su 5`}>
				{Array.from({ length: 5 }, (_, index) => (
					<Star key={index} aria-hidden="true" className={`size-4 ${index < review.rating ? "fill-brand text-brand" : "text-zinc-300"}`} />
				))}
			</div>
			<p className="mt-4 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700">{review.comment}</p>
			<div className="mt-5 border-t border-zinc-200 pt-4 text-sm">
				<p className="font-semibold text-zinc-900">{review.author_name}</p>
				<p className="mt-0.5 capitalize text-zinc-500">{date}</p>
			</div>
		</article>
	);
}
