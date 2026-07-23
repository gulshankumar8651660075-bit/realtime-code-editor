import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
  isDocker: boolean;
}

// Check if Docker is available
let isDockerAvailable: boolean | null = null;
async function checkDocker(): Promise<boolean> {
  if (isDockerAvailable !== null) return isDockerAvailable;
  try {
    await execAsync('docker --version');
    isDockerAvailable = true;
  } catch (err) {
    isDockerAvailable = false;
  }
  return isDockerAvailable;
}

// Configs per language
const languageConfig = {
  javascript: {
    ext: 'js',
    dockerImage: 'node:18-alpine',
    localCmd: 'node',
    localArgs: (filePath: string) => [filePath],
    dockerCmd: (fileName: string) => ['node', fileName],
  },
  python: {
    ext: 'py',
    dockerImage: 'python:3.10-alpine',
    localCmd: process.platform === 'win32' ? 'python' : 'python3',
    localArgs: (filePath: string) => [filePath],
    dockerCmd: (fileName: string) => ['python', fileName],
  },
  cpp: {
    ext: 'cpp',
    dockerImage: 'gcc:12-alpine',
    // C++ requires compilation first, so local commands will be run in a shell wrapper
    localCmd: process.platform === 'win32' ? 'cmd.exe' : 'sh',
    localArgs: (filePath: string) => {
      const dir = path.dirname(filePath);
      const outPath = path.join(dir, 'prog.exe');
      if (process.platform === 'win32') {
        return ['/c', `g++ -O3 -o "${outPath}" "${filePath}" && "${outPath}"`];
      } else {
        return ['-c', `g++ -O3 -o "${dir}/prog" "${filePath}" && "${dir}/prog"`];
      }
    },
    dockerCmd: (fileName: string) => [
      'sh',
      '-c',
      `g++ -O3 -o prog ${fileName} && ./prog`,
    ],
  },
  go: {
    ext: 'go',
    dockerImage: 'golang:1.20-alpine',
    localCmd: 'go',
    localArgs: (filePath: string) => ['run', filePath],
    dockerCmd: (fileName: string) => ['go', 'run', fileName],
  },
};

export async function executeCode(
  code: string,
  language: string,
  timeoutMs: number = 8000
): Promise<ExecutionResult> {
  const config = languageConfig[language as keyof typeof languageConfig];
  if (!config) {
    return {
      stdout: '',
      stderr: '',
      exitCode: 400,
      error: `Unsupported language: ${language}`,
      isDocker: false,
    };
  }

  const useDocker = await checkDocker();
  const runId = uuidv4();
  // Store temp files inside workspace backend directory
  const tempDir = path.join(process.cwd(), 'temp', runId);
  fs.mkdirSync(tempDir, { recursive: true });

  const fileName = `code.${config.ext}`;
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, code);

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killedByTimeout = false;

    if (useDocker) {
      // In Windows, mount path must be correctly formatted for Docker (especially with backslashes)
      // We convert tempDir to a format suitable for Docker volumes.
      // E.g., d:\task 6\backend\temp\uuid -> /d/task 6/backend/temp/uuid or similar.
      // Docker on Windows accepts standard Windows absolute paths if inside double quotes
      const volumePath = tempDir;
      const containerDest = '/app';
      const dockerArgs = [
        'run',
        '--rm',
        '--memory=128m',
        '--cpus=0.5',
        '-v',
        `${volumePath}:${containerDest}`,
        '-w',
        containerDest,
        config.dockerImage,
        ...config.dockerCmd(fileName),
      ];

      const child = spawn('docker', dockerArgs);

      const timer = setTimeout(() => {
        killedByTimeout = true;
        child.kill();
        // Since docker runs a container, we may need to docker kill it
        exec(`docker ps -q --filter ancestor=${config.dockerImage} | xargs -r docker kill`, () => {});
      }, timeoutMs);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr || err.message,
          exitCode: 1,
          error: `Docker execution error: ${err.message}`,
          isDocker: true,
        });
        cleanup(tempDir);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code,
          error: killedByTimeout ? 'Execution Timed Out (Limit: 8s)' : undefined,
          isDocker: true,
        });
        cleanup(tempDir);
      });
    } else {
      // Local fallback running child process
      const localCmd = config.localCmd;
      const localArgs = config.localArgs(filePath);

      const child = spawn(localCmd, localArgs);

      const timer = setTimeout(() => {
        killedByTimeout = true;
        child.kill('SIGKILL');
        // On windows, we might need taskkill to force kill processes and sub-processes
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${child.pid} /f /t`, () => {});
        }
      }, timeoutMs);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr || err.message,
          exitCode: 1,
          error: `Local execution error (Make sure '${localCmd}' is installed): ${err.message}`,
          isDocker: false,
        });
        cleanup(tempDir);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code,
          error: killedByTimeout ? 'Execution Timed Out (Limit: 8s)' : undefined,
          isDocker: false,
        });
        cleanup(tempDir);
      });
    }
  });
}

function cleanup(dirPath: string) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Failed to clean up path: ${dirPath}`, err);
  }
}
