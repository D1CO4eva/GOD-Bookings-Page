import fs from 'fs/promises';
import path from 'path';
import { Client } from 'basic-ftp';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const REQUIRED_ENV_KEYS = ['FTPS_HOST', 'FTPS_USER', 'FTPS_PASSWORD', 'FTPS_REMOTE_DIR'];

const readEnv = (key, fallback = '') => {
  const value = process.env[key];
  if (typeof value !== 'string') return fallback;
  return value.trim();
};

const readBooleanEnv = (key, fallback) => {
  const raw = readEnv(key);
  if (!raw) return fallback;
  const normalized = raw.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const normalizeRemoteDir = (remoteDir) => remoteDir.replace(/\\/g, '/');

const assertRequiredEnv = () => {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !readEnv(key));
  if (!missing.length) return;

  console.error('Missing required environment variables:', missing.join(', '));
  process.exitCode = 1;
  process.exit();
};

const assertLocalDirExists = async (localDir) => {
  try {
    const stats = await fs.stat(localDir);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${localDir}`);
    }
  } catch (error) {
    console.error(`Local directory not found: ${localDir}`);
    console.error('Run `npm run build` first or set FTPS_LOCAL_DIR.');
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    process.exitCode = 1;
    process.exit();
  }
};

const removeLocalHtaccessIfPresent = async (localDir) => {
  const filePath = path.join(localDir, '.htaccess');
  try {
    await fs.unlink(filePath);
    console.log(`Removed local file before upload: ${filePath}`);
  } catch (error) {
    const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : '';
    if (errorCode !== 'ENOENT') {
      throw error;
    }
  }
};

const run = async () => {
  assertRequiredEnv();

  const host = readEnv('FTPS_HOST');
  const user = readEnv('FTPS_USER');
  const password = readEnv('FTPS_PASSWORD');
  const remoteDir = normalizeRemoteDir(readEnv('FTPS_REMOTE_DIR'));
  const localDir = path.resolve(process.cwd(), readEnv('FTPS_LOCAL_DIR', 'dist'));
  const port = Number(readEnv('FTPS_PORT', '21')) || 21;
  const secure = readBooleanEnv('FTPS_SECURE', true);
  const clearRemote = readBooleanEnv('FTPS_CLEAR_REMOTE', false);
  const verbose = readBooleanEnv('FTPS_VERBOSE', false);

  await assertLocalDirExists(localDir);
  await removeLocalHtaccessIfPresent(localDir);

  const client = new Client(30000);
  client.ftp.verbose = verbose;

  try {
    console.log(`Connecting to ${host}:${port} (secure=${secure})`);
    await client.access({
      host,
      port,
      user,
      password,
      secure
    });

    console.log(`Preparing remote directory: ${remoteDir}`);
    await client.ensureDir(remoteDir);
    await client.cd(remoteDir);

    if (clearRemote) {
      console.log('Clearing remote directory before upload...');
      await client.clearWorkingDir();
    }

    console.log(`Uploading ${localDir} -> ${remoteDir}`);
    await client.uploadFromDir(localDir);
    console.log('FTPS deployment complete.');
  } catch (error) {
    console.error('FTPS deployment failed.');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  } finally {
    client.close();
  }
};

void run();
