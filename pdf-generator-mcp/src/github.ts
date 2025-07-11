/**
 * GitHub publishing utilities for PDF Generator MCP
 * Adapted from web-scraper-mcp
 */

import { Octokit } from '@octokit/rest';

export async function publishToGithub(args: {
  owner: string;
  repo: string;
  branch?: string;
  content: Array<{ path: string; content: string | Buffer }>;
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
  const commitMessage = args.commitMessage || 'Add generated PDF documents';

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
        // Handle both string and Buffer content
        let base64Content: string;
        if (Buffer.isBuffer(file.content)) {
          base64Content = file.content.toString('base64');
        } else {
          base64Content = Buffer.from(file.content).toString('base64');
        }

        const { data: blob } = await octokit.git.createBlob({
          owner: args.owner,
          repo: args.repo,
          content: base64Content,
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
      message: 'PDFs published successfully to GitHub',
      commit: newCommit.sha,
      files: args.content.map(f => f.path),
      urls: args.content.map(f =>
        `https://github.com/${args.owner}/${args.repo}/blob/${branch}/${f.path}`
      ),
    };
  } catch (error) {
    throw new Error(
      `Failed to publish PDFs to GitHub: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
