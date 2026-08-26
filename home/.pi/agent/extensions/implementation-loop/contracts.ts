import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

const ValidationEvidenceSchema = Type.Object(
	{
		command: Type.String({ minLength: 1 }),
		status: Type.Union([
			Type.Literal("PASSED"),
			Type.Literal("FAILED"),
			Type.Literal("NOT_APPLICABLE"),
		]),
		summary: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);

const ImplementorResultSchema = Type.Object(
	{
		status: Type.Union([Type.Literal("COMPLETED"), Type.Literal("BLOCKED")]),
		summary: Type.Array(Type.String()),
		validation: Type.Array(ValidationEvidenceSchema),
		notes: Type.Array(Type.String()),
	},
	{ additionalProperties: false },
);

const BlockingFindingSchema = Type.Object(
	{
		standard: Type.String({ minLength: 1 }),
		location: Type.String({ minLength: 1 }),
		problem: Type.String({ minLength: 1 }),
		requiredChange: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);

const AdvisoryNoteSchema = Type.Object(
	{
		summary: Type.String({ minLength: 1 }),
		location: Type.String({ minLength: 1 }),
		rationale: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);

const ReviewerResultSchema = Type.Object(
	{
		verdict: Type.Union([Type.Literal("APPROVED"), Type.Literal("CHANGES_REQUESTED")]),
		blockingFindings: Type.Array(BlockingFindingSchema),
		advisoryNotes: Type.Array(AdvisoryNoteSchema),
	},
	{ additionalProperties: false },
);

export type ValidationEvidence = Static<typeof ValidationEvidenceSchema>;
export type ImplementorResult = Static<typeof ImplementorResultSchema>;
export type BlockingFinding = Static<typeof BlockingFindingSchema>;
export type AdvisoryNote = Static<typeof AdvisoryNoteSchema>;
export type ReviewerResult = Static<typeof ReviewerResultSchema>;

export interface RunDiff {
	patch: string;
	changedFiles: string[];
}

export type TerminalOutcome =
	| {
			status: "APPROVED";
			reviewRevisionCount: number;
			changedFiles: string[];
			implementorSummary: string[];
			validation: ValidationEvidence[];
			advisoryNotes: AdvisoryNote[];
	  }
	| {
			status: "HUMAN_REQUIRED";
			reason: string;
			changedFiles: string[];
			latestImplementor?: ImplementorResult;
			latestReviewerFindings?: BlockingFinding[];
			diagnostics: string[];
	  }
	| {
			status: "FAILED";
			reason: string;
			cancelled?: boolean;
	  };

function parseJsonObject(text: string, role: string): unknown {
	const trimmed = text.trim();
	if (!trimmed) throw new Error(`${role} returned no final text output`);
	let value: unknown;
	try {
		value = JSON.parse(trimmed);
	} catch (error) {
		throw new Error(`${role} returned malformed JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${role} output must be exactly one JSON object`);
	}
	return value;
}

function schemaErrors(schema: TSchema, value: unknown): string {
	return [...Value.Errors(schema, value)]
		.slice(0, 5)
		.map((error) => `${error.path || "/"}: ${error.message}`)
		.join("; ");
}

export function parseImplementorResult(text: string): ImplementorResult {
	const value = parseJsonObject(text, "Implementor");
	if (!Value.Check(ImplementorResultSchema, value)) {
		throw new Error(`Implementor output failed schema validation: ${schemaErrors(ImplementorResultSchema, value)}`);
	}
	const result = value as ImplementorResult;
	if (result.status === "COMPLETED" && result.validation.some((item) => item.status === "FAILED")) {
		throw new Error("Implementor returned COMPLETED with failed validation");
	}
	return result;
}

export function parseReviewerResult(text: string): ReviewerResult {
	const value = parseJsonObject(text, "Reviewer");
	if (!Value.Check(ReviewerResultSchema, value)) {
		throw new Error(`Reviewer output failed schema validation: ${schemaErrors(ReviewerResultSchema, value)}`);
	}
	const result = value as ReviewerResult;
	if (result.verdict === "APPROVED" && result.blockingFindings.length !== 0) {
		throw new Error("Reviewer returned APPROVED with blocking findings");
	}
	if (result.verdict === "CHANGES_REQUESTED" && result.blockingFindings.length === 0) {
		throw new Error("Reviewer returned CHANGES_REQUESTED without blocking findings");
	}
	return result;
}
