const core = require("@actions/core");
const github = require("@actions/github");
const Heroku = require("heroku-client");
const { Toolkit } = require('actions-toolkit');
const { lighthouseCheck } = require("@foo-software/lighthouse-check");

function buildUrls(web_url, paths) {
  const app_domain = web_url.replace(/\/$/, '')
  return paths.map(path => `${app_domain}${path}`);
}

async function action() {
  try {
    const tools = new Toolkit({ secrets: ['GITHUB_TOKEN', 'HEROKU_AUTH_TOKEN'] });
    const prNumber = tools.context.payload.pull_request.number;
    const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

    // Fetch Review App
    const reviewApps = await heroku.get(
      `/pipelines/${process.env.HEROKU_PIPELINE_ID}/review-apps`
    );
    const appId = reviewApps.find((app) => app.pr_number == pr_number).id;
    const app = await heroku.get(`/apps/${appId}`);

    // Run Lighthouse
    const response = await lighthouseCheck({
      urls: buildUrls(app.web_url, core.getInput('urls')),
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
