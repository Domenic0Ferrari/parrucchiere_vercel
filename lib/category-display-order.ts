export type CategoryPositionRef = {
	id: string;
	name: string;
	displayOrder: number | null;
	isActive: boolean;
};

export function findActivePositionConflict(
	categories: CategoryPositionRef[],
	displayOrder: number,
	excludeId?: string
): CategoryPositionRef | null {
	return (
		categories.find(
			(category) =>
				category.isActive &&
				category.displayOrder === displayOrder &&
				category.id !== excludeId
		) ?? null
	);
}

export function activePositionConflictMessage(
	displayOrder: number,
	conflictName: string
): string {
	return `La posizione ${displayOrder} è già usata dalla categoria attiva "${conflictName}".`;
}

export function reactivatePositionConflictMessage(
	displayOrder: number,
	conflictName: string
): string {
	return `Impossibile riattivare: la posizione ${displayOrder} è già usata da "${conflictName}". Modifica la posizione prima di riattivare.`;
}
