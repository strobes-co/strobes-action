const fetch = require('node-fetch');
const core = require('@actions/core');


async function run() {
    try {

        // If checkout of code is not done scan can't be performed
        if (!'GITHUB_WORKSPACE' in process.env) {
            throw new Error(
                "Requires a GITHUB_WORKSPACE environment variable(Do checkout before scan)"
            )
        }

        const scanApi = "/api/v1/cicd/scan/"
        const strobesUrl = core.getInput('strobes_url');
        const token = core.getInput('auth_token');
        const configName = core.getInput('config_name');
        const branch = core.getInput('target');
        const rules = core.getInput('rules')

        console.log("Starting Strobes scan")
        let scan_url = strobesUrl + scanApi;
        let jsonResponse = { task_id: '' };
        let taskId;

        const fetchRes = await fetch(scan_url, {
            method: 'POST',
            body: JSON.stringify({
                configuration_name: configName,
                target: branch,
            }),
            headers: {
                'Content-type': 'application/json',
                'Authorization': 'token ' + token
            },
        })
        jsonResponse = await fetchRes.json();
        taskId = jsonResponse.task_id;
        console.log(jsonResponse)

        if (typeof taskId !== 'undefined' && taskId) {
            const statusApi = "/api/v1/cicd/status/"
            let scan_url = strobesUrl + statusApi + taskId + "/"
            let statusResponse = {};
            const fetchRes = await fetch(scan_url, {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json',
                    'Authorization': 'token ' + token
                },
            })
            statusResponse = await fetchRes.json();
            console.log(statusResponse)
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}


run();