export const resolvePublicAssetUrl = (url: string, baseUrl: string): string => {
  if (!url) {
    return url;
  }

  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = url.replace(/^\/+/, '');
  return `${trimmedBase}/${normalizedPath}`;
};
