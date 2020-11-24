import core from '@actions/core';
import github from '@actions/github';
import { Toolkit } from 'actions-toolkit';

//const comment = require('./comment');
import audit from './audit.js';
import comment from './comment.js';

import core from '@actions/core';
import github from '@actions/github';
import { Toolkit } from 'actions-toolkit';

function buildUrls(web_url, paths) {
  const app_domain = web_url.replace(/\/$/, '')
  return paths.split(',').map(path => `${app_domain}${path}`);
}

async function action() {
  try {
    const tools = new Toolkit({
      event: ['deployment_status'],
      secrets: ['GITHUB_TOKEN', 'HEROKU_AUTH_TOKEN']
    });

    const deployState = tools.context.payload.deployment_status.state;
    if (deployState === 'failure') {
      tools.exit.neutral('Deploy failed.');
    }

    // Retrieve app's url
    const deployment = tools.context.payload.deployment;
    const webUrl = deployment.payload.web_url;

    // Get the PR's number
    const prNumber = deployment.environment.replace(`${tools.context.payload.repository.name}-pr-`, '');
    const prCommentUrl = `${deployment.repository_url}/pulls/${prNumber}/reviews`;

    const urls = buildUrls(webUrl, core.getInput('urls'));

    const results = await audit({ urls });

    let prComment = await comment({
      accessToken: process.env.GITHUB_TOKEN,
      commentUrl: prCommentUrl,
      results
    });

    core.setOutput('lighthouseCheckResults', JSON.stringify(prComment));
  } catch (error) {
    core.setFailed(error.message);
  }
}

await action();
