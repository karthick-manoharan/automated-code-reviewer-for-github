import * as core from '@actions/core';
import * as github from '@actions/github';
import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';

// Define the structure of a review comment from the LLM
interface ReviewComment {
  file: string;
  line: number;
  comment: string;
}

// Define the structure of the JSON response from the LLM
interface ReviewResponse {
  comments: ReviewComment[];
}

async function run(): Promise<void> {
  try {
    // 1. Get Inputs and Secrets
    const token = core.getInput('github-token', { required: true });
    const geminiApiKey = core.getInput('gemini-api-key', { required: true });
    const promptFilePath = core.getInput('prompt-file-path', { required: true });

    // 2. Initialize clients
    const octokit = github.getOctokit(token);
    const genAI = new GoogleGenAI({apiKey: geminiApiKey});

    // 3. Get PR context
    const { pull_request } = github.context.payload;
    if (!pull_request) {
      core.setFailed('This action can only be run on pull requests.');
      return;
    }
    const { owner, repo } = github.context.repo;
    const prNumber = pull_request.number;

    // 4. Get PR diff
    core.info('Fetching PR diff...');
    const diffResponse = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
    });
    // The 'data' property is expected to be a string for the 'diff' media type
    const diff = diffResponse.data as unknown as string;
    core.info(`Diff fetched successfully. Size: ${diff.length} bytes.`);

    // 5. Read and prepare the prompt
    core.info(`Reading prompt file from: ${promptFilePath}`);
    const promptTemplate = await fs.promises.readFile(promptFilePath, 'utf8');
    const prompt = promptTemplate.replace('{diff}', diff);

    // 6. Call Gemini API for review
    core.info('Sending prompt to Gemini for review...');
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt
    })
    const reviewJson = result.text;
    core.info(`Response from Gemini: ${reviewJson}`);

    // 7. Parse LLM response
    const cleanedJson = reviewJson && reviewJson.replace(/```json\n|```/g, '').trim();
    const review: ReviewResponse = cleanedJson && JSON.parse(cleanedJson);

    if (!review.comments || !Array.isArray(review.comments)) {
      core.warning('No comments found in the review response.');
      return;
    }

    // 8. Post comments to PR
    core.info(`Found ${review.comments.length} comments to post.`);
    const comments = review.comments.map(comment => ({
      path: comment.file,
      body: comment.comment,
      line: comment.line,
    }));

    if (comments.length > 0) {
      await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event: 'COMMENT',
        comments,
      });
      core.info('Successfully posted review comments to the PR.');
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();