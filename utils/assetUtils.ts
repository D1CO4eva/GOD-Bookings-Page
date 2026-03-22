export const resolvePublicAssetUrl = (url: string): string => {
  if (!url) {
    return url;
  }

  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const trimmedBase = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const normalizedPath = url.replace(/^\/+/, '');
  return `${trimmedBase}/${normalizedPath}`;
};
