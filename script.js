import fetch from "node-fetch";
import csv from "csv-writer";

// Set the necessary authentication credentials

const username = "YOUR_USERNAME"; // the username of the user who created the app password
const workspace = "YOUR_WORKSPACE"; // the workspace where the repositories are located
const password = "YOUR_APP_PASSWORD"; // the app password used in your receptor

const auditStartDate = "0000-00-00"; // the date from which your audit was started in the format YYYY-MM-DD
const auditEndDate = "0000-00-00"; // the end date for you audit in the format YYYY-MM-DD
// get all repositories for a workspace
async function getRepositories() {
  let repositories = [];
  const url = `https://api.bitbucket.org/2.0/repositories/${workspace}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
          "base64"
        )}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      repositories = data.values.map((repo) => repo.name);
    } else {
      console.log(`Error: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
  return repositories;
}

// get all pull requests ids for a repository
async function getAllPullRequests(repository) {
  var auditStart = new Date(auditStartDate.concat(" 00:00:00"));
  let isoStart = auditStart.toISOString();
  var auditEnd = new Date(auditEndDate.concat(" 23:59:59"));
  let isoEnd = auditEnd.toISOString();

  let query = encodeURIComponent(
    `(state = "merged") and created_on >= ${isoStart} and created_on < ${isoEnd}`
  );
  const pullRequestsUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repository}/pullrequests?q=${query}`;
  let PRs = [];
  try {
    let allPullRequests = [];
    let nextUrl = pullRequestsUrl;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${username}:${password}`
          ).toString("base64")}`,
        },
      });

      if (response.ok) {
        const pullRequestsData = await response.json();
        allPullRequests = allPullRequests.concat(pullRequestsData.values);
        nextUrl = pullRequestsData.next;
        console.log(
          `Fetched ${allPullRequests.length} of ${pullRequestsData.size} pull requests for ${repository}`
        );
      } else {
        console.log(`Error: ${response.status} - ${response.statusText}`);
        break;
      }
    }
    PRs = PRs.concat(allPullRequests);
  } catch (error) {
    console.log("Error:", error.message);
  }
  return PRs;
}

// get details for a single pull request
async function getPRDetails(repository, pullRequestId) {
  const pullRequestDetailsUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repository}/pullrequests/${pullRequestId}`;

  let id,
    title,
    date,
    author,
    approver = "No approver found";
  try {
    const response = await fetch(pullRequestDetailsUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
          "base64"
        )}`,
      },
    });

    if (response.ok) {
      const pullRequestDetails = await response.json();
      id = pullRequestDetails.id;
      title = pullRequestDetails.title;
      date = new Date(pullRequestDetails.created_on).toLocaleDateString();
      author = pullRequestDetails.author.display_name;
      for (let i = 0; i < pullRequestDetails.participants.length; i++) {
        if (
          pullRequestDetails.participants[i].role === "REVIEWER" &&
          pullRequestDetails.participants[i].approved === true
        ) {
          approver = pullRequestDetails.participants[i].user.display_name;
          break;
        }
      }
    } else {
      console.log(`Error: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.log("Error:", error.message);
  }
  return {
    id: id,
    title: title,
    date: date,
    author: author,
    approver: approver,
  };
}

// generate csv
async function generateApproverCSV() {
  let repos = await getRepositories();
  let AllPRs = [];
  for (let i = 0; i < repos.length; i++) {
    let PRs = await getAllPullRequests(repos[i]);

    let rows = PRs.map((pr) => {
      return {
        id: pr.id,
        repository: repos[i],
        title: pr.title,
        date: new Date(pr.created_on).toLocaleDateString(),
        author: pr.author.display_name,
        link: pr.links.html.href,
      };
    });
    AllPRs = AllPRs.concat(rows);
  }

  const csvWriter = csv.createObjectCsvWriter({
    path: "pull_requests.csv",
    header: [
      { id: "id", title: "PR ID" },
      { id: "repository", title: "Repository" },
      { id: "title", title: "Pull Request Title" },
      { id: "date", title: "Date" },
      { id: "author", title: "Author" },
      { id: "link", title: "Link" },
    ],
  });

  await csvWriter.writeRecords(AllPRs);
  console.log('CSV file "pull_requests.csv" generated successfully.');
}

generateApproverCSV();
