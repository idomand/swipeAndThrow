// Strips the filename off a file:// uri, leaving the containing folder.

export function getFolderName(uri: string) {
  return decodeURI(uri)
    .replace(/^file:\/\//, "")
    .replace(/\/[^/]*$/, "");
}
