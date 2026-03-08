import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoPath = process.cwd();

export interface GitRemoteInfo {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitStatusInfo {
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  changedFiles: string[];
  remotes: GitRemoteInfo[];
}

async function git(args: string[]) {
  const result = await execFileAsync('git', args, { cwd: repoPath });
  return (result.stdout || '').trim();
}

export async function getGitStatus(): Promise<GitStatusInfo> {
  const [branch, upstreamRaw, statusRaw, remoteRaw] = await Promise.all([
    git(['branch', '--show-current']),
    git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).catch(() => ''),
    git(['status', '--porcelain=2', '--branch']),
    git(['remote', '-v']),
  ]);

  let ahead = 0;
  let behind = 0;
  const changedFiles: string[] = [];

  for (const line of statusRaw.split('\n')) {
    if (line.startsWith('# branch.ab')) {
      const aheadMatch = line.match(/\+(\d+)/);
      const behindMatch = line.match(/-(\d+)/);
      ahead = aheadMatch ? Number.parseInt(aheadMatch[1], 10) : 0;
      behind = behindMatch ? Number.parseInt(behindMatch[1], 10) : 0;
    }
    if (line.startsWith('1 ') || line.startsWith('2 ') || line.startsWith('u ')) {
      const parts = line.split(' ');
      const path = parts[parts.length - 1];
      if (path) changedFiles.push(path);
    }
  }

  const remoteMap = new Map<string, GitRemoteInfo>();
  for (const line of remoteRaw.split('\n')) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) continue;
    const [, name, url, type] = match;
    const existing = remoteMap.get(name) || { name, fetchUrl: '', pushUrl: '' };
    if (type === 'fetch') existing.fetchUrl = url;
    if (type === 'push') existing.pushUrl = url;
    remoteMap.set(name, existing);
  }

  return {
    branch: branch || 'main',
    upstream: upstreamRaw || null,
    ahead,
    behind,
    changedFiles,
    remotes: [...remoteMap.values()],
  };
}

export async function pushGitRemote(remote: string, branch: string) {
  const result = await execFileAsync('git', ['push', remote, `${branch}:${branch}`], { cwd: repoPath });
  return {
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}