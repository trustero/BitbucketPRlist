This script queries the BitBucket v2 api to generate a list of pull requests made in your audit window.

Requirements:
- node.js

if you do not have node.js installed, you can install it here:

[Node](https://nodejs.org/en/download)


## Instructions
1. open the `script.js` and edit the following variables:
    - `username` 
    - `workspace` 
    - `password` 
    - `auditStartDate` 
    - `auditEndDate` 
2. Run `npm install` to install dependencies
3. Run `node script.js` to run the script
4. The script will generate a file called `pull-requests.csv` in the same directory as the script

**notes:**
- The script may take a few minutes to run depending on the number of pull requests in the audit window


