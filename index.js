const core = require("@actions/core");
const github = require("@actions/github");
const { Toolkit } = require('actions-toolkit');
const { lighthouseCheck } = require("@foo-software/lighthouse-check");

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

    console.log(tools.context.payload)
    const baseSha = tools.context.payload.pull_request.base.sha;
    const headSha = tools.context.payload.pull_request.head.sha;
    const owner = tools.context.payload.repository.owner.login;
    const repo = tools.context.payload.repository.name;

    const changes = await tools.github.repos.compareCommits({
      owner,
      repo,
      base: baseSha,
      head: headSha
    });

    if (!changes.data.files.includes('Gemfile.lock')) {
      tools.exit.success('Gemfile.lock didn\'t change, skipping...');
    } else {

      // Retrieve app's url
      const deployment = tools.context.payload.deployment;
      const webUrl = deployment.payload.web_url;

      // Get the PR's number
      const prNumber = deployment.environment.replace(`${tools.context.payload.repository.name}-pr-`, '');
      const prCommentUrl = `${deployment.repository_url}/pulls/${prNumber}/reviews`;

      console.log(prNumber);
      console.log(prCommentUrl);

      // Run Lighthouse
      const response = await lighthouseCheck({
        urls: buildUrls(webUrl, core.getInput('urls')),
        emulatedFormFactor: 'desktop',
        isGitHubAction: true,
        outputDirectory: core.getInput('outputDirectory'),
        prCommentEnabled: true,
        prCommentSaveOld: true,
        prCommentAccessToken: process.env.GITHUB_TOKEN,
        prCommentUrl: prCommentUrl,
      });

      core.setOutput('lighthouseCheckResults', JSON.stringify(response));
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  action();
}

module.exports = action;
