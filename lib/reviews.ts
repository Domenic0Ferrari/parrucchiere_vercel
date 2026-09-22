export type ReviewStatus = "pending" | "approved" | "rejected";

export type Review = {
	id: string;
	author_name: string;
	rating: number;
	comment: string;
	status: ReviewStatus;
	created_at: string;
	moderated_at?: string | null;
};

export const reviewSelect = "id, author_name, rating, comment, status, created_at, moderated_at";
