/**
 * Pure helpers for discovering the dsh web server URL from its stdout, kept
 * free of `electron` imports so unit tests can exercise them in plain Node.
 * @module @deepseek-ai/dsh-desktop/web-url
 */

/** The readiness line the web-app bundle prints once its Loader tree settles. */
const URL_LINE = /dsh web: (https?:\/\/\S+)/

/**
 * Extract the canonical local URL from one stdout chunk of the `dsh web`
 * process. The line may carry a ` (LAN: ...)` suffix, which the match leaves
 * out.
 * @param chunk - stdout text received so far (the URL line arrives whole).
 * @returns the `http(s)://host:port` URL, or undefined when the line has not
 * been seen yet.
 */
export function extractWebUrl(chunk: string): string | undefined {
  return URL_LINE.exec(chunk)?.[1]
}
