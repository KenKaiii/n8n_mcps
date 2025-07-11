/**
 * GitHub publishing utilities
 */

import { Octokit } from '@octokit/rest';

export async function publishToGithub(args: {
  owner: string;
  repo: string;
  branch?: string;
  content: Array<{ path: string; content: string }>;
  commitMessage?: string;
  token: string;
}) {
  if (!args.owner || !args.repo || !args.content || !args.token) {
    throw new Error('owner, repo, content, and token are required');
  }

  const octokit = new Octokit({
    auth: args.token,
  });

  const branch = args.branch || 'main';
  const commitMessage = args.commitMessage || 'Add scraped content';

  try {
    // Get the latest commit SHA
    const { data: ref } = await octokit.git.getRef({
      owner: args.owner,
      repo: args.repo,
      ref: `heads/${branch}`,
    });

    const latestCommitSha = ref.object.sha;

    // Get the tree SHA
    const { data: commit } = await octokit.git.getCommit({
      owner: args.owner,
      repo: args.repo,
      commit_sha: latestCommitSha,
    });

    const treeSha = commit.tree.sha;

    // Create blobs for each file
    const blobs = await Promise.all(
      args.content.map(async file => {
        const { data: blob } = await octokit.git.createBlob({
          owner: args.owner,
          repo: args.repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        });

        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      })
    );

    // Create tree
    const { data: tree } = await octokit.git.createTree({
      owner: args.owner,
      repo: args.repo,
      tree: blobs,
      base_tree: treeSha,
    });

    // Create commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner: args.owner,
      repo: args.repo,
      message: commitMessage,
      tree: tree.sha,
      parents: [latestCommitSha],
    });

    // Update reference
    await octokit.git.updateRef({
      owner: args.owner,
      repo: args.repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return {
      success: true,
      message: 'Content published successfully',
      commit: newCommit.sha,
      files: args.content.map(f => f.path),
    };
  } catch (error) {
    throw new Error(
      `Failed to publish to GitHub: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
