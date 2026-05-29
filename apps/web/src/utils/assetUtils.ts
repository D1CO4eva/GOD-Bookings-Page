import { resolvePublicAssetUrl as resolveSharedPublicAssetUrl } from '@shared/assetUtils';

export const resolvePublicAssetUrl = (url: string): string => {
  return resolveSharedPublicAssetUrl(url, import.meta.env.BASE_URL);
};
