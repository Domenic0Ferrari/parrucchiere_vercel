export type CategoryStatusFilterValue = "all" | "active" | "inactive";

const options: { value: CategoryStatusFilterValue; label: string }[] = [
	{ value: "all", label: "Tutte" },
	{ value: "active", label: "Attive" },
	{ value: "inactive", label: "Disattive" },
];

export function CategoryStatusFilter({
	value,
	onChange,
}: {
	value: CategoryStatusFilterValue;
	onChange: (value: CategoryStatusFilterValue) => void;
}) {
	return (
		<div>
			<p className="mb-1.5 text-sm font-semibold text-zinc-900">Stato</p>
			<div className="flex flex-wrap gap-2" role="group" aria-label="Filtra categorie per stato">
				{options.map((option) => (
					<button
						key={option.value}
						type="button"
						aria-pressed={value === option.value}
						onClick={() => onChange(option.value)}
						className={`rounded-full px-4 py-2 text-sm font-semibold transition ${value === option.value ? "bg-brand text-white" : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"}`}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}
