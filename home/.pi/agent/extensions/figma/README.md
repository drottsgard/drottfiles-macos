# Figma extension

A deliberately small pi extension for reading one Figma node through the Figma REST API.

## Setup

Create a Figma personal access token with the `file_content:read` scope, then expose it to pi:

```bash
# Put this in ~/.zshrc.local, not in this repository.
export FIGMA_API_TOKEN="..."
```

Restart pi, or reload it after updating the extension with `/reload`.

Do not commit the token. For local tooling against your own account, Figma recommends a personal access token; OAuth is the appropriate next step only if this becomes a multi-user integration.

## Capability

The extension registers one tool:

```text
figma_read_node({ url, depth? })
```

- `url` is a Figma URL containing `node-id`, for example `https://www.figma.com/design/FILE_KEY/Title?node-id=1-2`.
- `depth` is the number of descendant levels to retrieve, from 1 to 10. It defaults to 1 to keep context use predictable.
- Results larger than pi's 50KB or 2000-line tool limit are truncated. The complete response is written to a private temporary file and its path is included in the result.

## Architecture

- `index.ts` is the pi adapter: tool schema, environment configuration, and output limits.
- `figma-client.ts` owns Figma-specific behavior: URL parsing, authentication, HTTP calls, response validation, and errors.

The tool interface accepts a URL rather than exposing Figma's file-key/node-ID split to callers. The Figma client is the only module that knows the REST endpoint and `X-Figma-Token` header. There is no extra interface/adapter layer while only one Figma transport exists.

## Small next steps

Add capabilities only when a concrete use case needs them. Likely next slices are:

1. Render a node as an image with `GET /v1/images/{file_key}`.
2. Read selected nodes at greater depth or in a batch.
3. Summarize design tokens/styles referenced by a node.
4. Add OAuth only if other users need to authenticate.

## Sources

- [Figma authentication](https://developers.figma.com/docs/rest-api/authentication/)
- [Figma personal access tokens](https://developers.figma.com/docs/rest-api/personal-access-tokens/)
- [Figma file node endpoints](https://developers.figma.com/docs/rest-api/file-node-endpoints/)
- [Figma REST API OpenAPI specification](https://github.com/figma/rest-api-spec)
