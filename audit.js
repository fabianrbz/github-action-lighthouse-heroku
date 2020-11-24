import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import config from 'lighthouse/lighthouse-core/config/lr-desktop-config.js';

const buildResult = (url, audit) => {
  let result = {
    url: url,
    scores: {
      performance: Math.round(audit.performance.score * 100),
      accessibility: Math.round(audit.accessibility.score * 100),
      bestPractices: Math.round(audit['best-practices'].score * 100),
      seo: Math.round(audit.seo.score * 100)
    }
  };

  return result;
};

export default async ({
  urls
}) => {
  let results = [];
  let chrome;

  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox', '--ignore-certificate-errors']
    });

    const lighthouseOptions = {
      output: 'html',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
      disableDeviceEmulation: true,
      throttlingMethod: 'devtools',
      chromeFlags: ['--disable-mobile-emulation', '--disable-storage-reset'],
      emulatedFormFactor: 'mobile',
    };

    for(const url of urls) {
      let audit = await lighthouse(url, lighthouseOptions, config);
      let result = buildResult(url, audit.lhr.categories);

      results.push(result);
    };
  } catch (error) {
    console.log(error);
  } finally {
    await chrome.kill();

    return results;
  }
};
