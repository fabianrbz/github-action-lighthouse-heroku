const fetch = require('node-fetch');

const COMMENT_ID = '<!-- lighthouse-check -->';

const generateTable = (result) => {
  return `
\n
| URL | ${result.url} |
|:-|:-|
| Device | Desktop |
| Performance | ${result.scores.performance} |
| Accessibility | ${result.scores.accessibility} |
| Best Practices | ${result.scores.bestPractices} |
| SEO | ${result.scores.seo} |
\n\n`;

};

const generateComment = (results) => {
  let comment = '';

  results.forEach(result => comment += generateTable(result));
  comment += COMMENT_ID;

  return comment;
}

const findComment = async (accessToken, commentUrl) => {
  const existingComments = await fetch(commentUrl, {
    method: 'get',
    headers: {
      'content-type': 'application/json',
      authorization: `token ${accessToken}`
    }
  });
  const comments = await existingComments.json();

  let existingComment;

  if (Array.isArray(comments) && comments.length) {
    existingComment = comments.find(current => current.body.includes(COMMENT_ID));
  }

  return existingComment;
};

const buildUrl = (comment, commentUrl) => {
  return comment && `${commentUrl}/${comment.id}` || commentUrl;
};

const submitComment = async (comment, commentUrl, text, accessToken) => {
  const url = buildUrl(comment, commentUrl, text);

  const response = await fetch(url, {
    method: comment && 'put' || 'post',
    body: JSON.stringify({
      ...(comment && {} || { event: 'COMMENT' }),
      body: text
    }),
    headers: {
      'content-type': 'application/json',
      authorization: `token ${accessToken}`
    }
  });
  const result = await response.json();

  return result;
};

module.exports = async ({
  accessToken,
  commentUrl,
  results
}) => {
  try {
    let newComment = generateComment(results);
    console.log(newComment);

    let existingComment = await findComment(accessToken, commentUrl);
    console.log(existingComment);

    let result = await submitComment(existingComment, commentUrl, newComment, accessToken);

    if (!result.id) {
      throw new Error(result.message || 'something went wrong');
    }
  } catch(error) {
    console.log(error);

    throw error;
  }
};
