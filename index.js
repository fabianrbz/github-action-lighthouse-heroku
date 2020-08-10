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

    // Retrieve app's url
    const deployment = tools.context.payload.deployment;
    const webUrl = deployment.payload.web_url;

    // Run Lighthouse
    const response = await lighthouseCheck({
      urls: buildUrls(webUrl, core.getInput('urls')),
      emulatedFormFactor: 'desktop',
      isGitHubAction: true,
      outputDirectory: core.getInput('outputDirectory'),
    });

    core.setOutput('lighthouseCheckResults', JSON.stringify(response));
  } catch (error) {
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  action();
}

module.exports = action;
