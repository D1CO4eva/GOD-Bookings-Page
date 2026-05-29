import { PROGRAM_IMAGE_MANIFEST } from '../../../../packages/shared/src/programImageManifest';
import { DevotionalProgram, resolvePublicAssetUrl } from '../../../../packages/shared/src';

const WEB_BOOKINGS_BASE = 'https://atlanta.godivinity.org/homebookings/';

export const getProgramImageUrls = (program: DevotionalProgram): string[] => {
  const manifestImages = PROGRAM_IMAGE_MANIFEST[program.id] || [];
  const fallbackImages = program.imageUrl ? [program.imageUrl] : [];
  const rawUrls = manifestImages.length > 0 ? manifestImages : fallbackImages;

  return Array.from(
    new Set(
      rawUrls
        .filter(Boolean)
        .map((url) => resolvePublicAssetUrl(url, WEB_BOOKINGS_BASE))
    )
  );
};
