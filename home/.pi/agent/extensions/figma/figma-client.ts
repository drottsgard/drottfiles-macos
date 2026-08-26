const FIGMA_API_BASE_URL = "https://api.figma.com/v1";
const FIGMA_FILE_ROUTE_TYPES = new Set(["board", "design", "file", "proto", "slides"]);

type Fetch = typeof fetch;
type JsonObject = Record<string, unknown>;

export interface FigmaNodeReference {
  fileKey: string;
  nodeId: string;
}

export interface FigmaNodeResult {
  file: {
    name: string;
    role?: string;
    lastModified?: string;
    editorType?: string;
    thumbnailUrl?: string;
    version?: string;
  };
  node: JsonObject;
}

interface FigmaClientOptions {
  token: string;
  fetch?: Fetch;
}

export class FigmaClient {
  private readonly token: string;
  private readonly fetch: Fetch;

  constructor(options: FigmaClientOptions) {
    this.token = options.token;
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  async readNode(
    reference: FigmaNodeReference,
    depth: number,
    signal?: AbortSignal,
  ): Promise<FigmaNodeResult> {
    const url = new URL(`${FIGMA_API_BASE_URL}/files/${encodeURIComponent(reference.fileKey)}/nodes`);
    url.searchParams.set("ids", reference.nodeId);
    url.searchParams.set("depth", String(depth));

    const response = await this.fetch(url, {
      headers: { "X-Figma-Token": this.token },
      signal,
    });

    const body = await readJson(response);
    if (!response.ok) {
      throw new Error(formatFigmaError(response.status, body));
    }

    const nodes = asObject(body.nodes);
    const node = nodes?.[reference.nodeId];
    if (!isObject(node)) {
      throw new Error(`Figma node ${reference.nodeId} was not found in file ${reference.fileKey}`);
    }

    return {
      file: {
        name: readRequiredString(body, "name"),
        role: readOptionalString(body, "role"),
        lastModified: readOptionalString(body, "lastModified"),
        editorType: readOptionalString(body, "editorType"),
        thumbnailUrl: readOptionalString(body, "thumbnailUrl"),
        version: readOptionalString(body, "version"),
      },
      node,
    };
  }
}

export function parseFigmaNodeUrl(value: string): FigmaNodeReference {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Expected a valid Figma node URL");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname !== "figma.com" && !hostname.endsWith(".figma.com")) {
    throw new Error("Expected a figma.com URL");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const routeIndex = segments.findIndex((segment) => FIGMA_FILE_ROUTE_TYPES.has(segment));
  const fileKey = routeIndex >= 0 ? segments[routeIndex + 1] : undefined;
  if (!fileKey) {
    throw new Error("Figma URL does not contain a file key");
  }

  const rawNodeId = url.searchParams.get("node-id") ?? url.searchParams.get("node_id");
  if (!rawNodeId) {
    throw new Error("Figma URL does not contain a node-id query parameter");
  }

  return { fileKey, nodeId: normalizeNodeId(rawNodeId) };
}

function normalizeNodeId(nodeId: string): string {
  return /^\d+-\d+$/.test(nodeId) ? nodeId.replace("-", ":") : nodeId;
}

async function readJson(response: Response): Promise<JsonObject> {
  const text = await response.text();
  if (!text) return {};

  try {
    const value: unknown = JSON.parse(text);
    return asObject(value) ?? {};
  } catch {
    throw new Error(`Figma returned an invalid JSON response (HTTP ${response.status})`);
  }
}

function formatFigmaError(status: number, body: JsonObject): string {
  const message = readOptionalString(body, "err") ?? readOptionalString(body, "message");
  return `Figma request failed (HTTP ${status})${message ? `: ${message}` : ""}`;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

function readRequiredString(object: JsonObject, key: string): string {
  const value = readOptionalString(object, key);
  if (value === undefined) throw new Error(`Figma response is missing ${key}`);
  return value;
}

function readOptionalString(object: JsonObject, key: string): string | undefined {
  const value = object[key];
  return typeof value === "string" ? value : undefined;
}
