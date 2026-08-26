import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateHead,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { FigmaClient, parseFigmaNodeUrl } from "./figma-client";

const DEFAULT_DEPTH = 1;

export default function figmaExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "figma_read_node",
    label: "Read Figma Node",
    description:
      "Read a Figma node and its descendants from a Figma node URL. Requires FIGMA_API_TOKEN. " +
      "Defaults to one descendant level and truncates output after 50KB or 2000 lines.",
    promptSnippet: "Read a Figma node from a URL",
    parameters: Type.Object({
      url: Type.String({
        description: "Figma URL containing a file key and node-id query parameter",
      }),
      depth: Type.Optional(
        Type.Integer({
          description: "How many descendant levels to include; defaults to 1",
          minimum: 1,
          maximum: 10,
        }),
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const token = process.env.FIGMA_API_TOKEN?.trim();
      if (!token) {
        throw new Error(
          "FIGMA_API_TOKEN is not set. Export a Figma personal access token and reload pi.",
        );
      }

      const reference = parseFigmaNodeUrl(params.url);
      const depth = params.depth ?? DEFAULT_DEPTH;
      const result = await new FigmaClient({ token }).readNode(reference, depth, signal);
      const json = JSON.stringify(result, null, 2);
      const truncation = truncateHead(json, {
        maxBytes: DEFAULT_MAX_BYTES,
        maxLines: DEFAULT_MAX_LINES,
      });

      let text = truncation.content;
      let fullOutputPath: string | undefined;
      if (truncation.truncated) {
        fullOutputPath = await saveFullOutput(json);
        text +=
          `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines ` +
          `(${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). ` +
          `Full output saved to: ${fullOutputPath}]`;
      }

      return {
        content: [{ type: "text", text }],
        details: {
          fileKey: reference.fileKey,
          nodeId: reference.nodeId,
          depth,
          truncated: truncation.truncated,
          fullOutputPath,
        },
      };
    },
  });
}

async function saveFullOutput(json: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "pi-figma-"));
  const path = join(directory, "node.json");
  await writeFile(path, json, { encoding: "utf8", mode: 0o600 });
  return path;
}
