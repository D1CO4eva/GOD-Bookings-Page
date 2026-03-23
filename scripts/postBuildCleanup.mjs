import fs from 'fs/promises';
import path from 'path';

const removeIfExists = async (filePath) => {
  try {
    await fs.unlink(filePath);
    console.log(`Removed: ${filePath}`);
  } catch (error) {
    const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : '';
    if (errorCode === 'ENOENT') {
      return;
    }
    throw error;
  }
};

const run = async () => {
  const distHtaccess = path.resolve(process.cwd(), 'dist', '.htaccess');
  await removeIfExists(distHtaccess);
};

run().catch((error) => {
  console.error('Post-build cleanup failed.');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
