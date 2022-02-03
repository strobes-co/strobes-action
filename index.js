const axios = require('axios');
const core = require('@actions/core');


function checkRules(rules, data) {
    var flag = false;
    var rules = rules.split(',');
    var rulesLen = rules.length;
    var count;
    for (var index = 0; index < rulesLen; index++) {
        count = rules[index].substring(1);
        count = parseInt(count);
        if (rules[index][0] === 'c') {
            if (count <= data.critical) {
                flag = true;
                break;
            }
        }
        else if (rules[index][0] === 'h') {
            if (count <= data.high) {
                flag = true;
                break;
            }
        }
        else if (rules[index][0] === 'm') {
            if (count <= data.medium) {
                flag = true;
                break;
            }
        }
        else if (rules[index][0] === 'i') {
            if (count <= data.info) {
                flag = true;
                break;
            }
        }
        else if (rules[index][0] === 'l') {
            if (count <= data.low) {
                flag = true;
                break;
            }
        }
        else {
            continue;
        }
    }
    return flag;
}


async function run() {
    try {
        const scanApi = '/api/v1/cicd/scan/';
        const strobesUrl = core.getInput('strobes_url');
        const token = core.getInput('auth_token');
        const configName = core.getInput('config_name');
        const branch = core.getInput('target');
        const rules = core.getInput('rules');
        var timeout = core.getInput('timeout');
        var no_wait = core.getInput('no_wait');
        no_wait = no_wait.toLowerCase();
        no_wait = (no_wait === 'true');

        if (!isNaN(timeout)) {
            timeout = parseInt(timeout);
        }
        else {
            throw new Error(
                'Timeout is not a number'
            );
        }

        console.log('Starting Strobes Remote Scan');
        var scan_url = strobesUrl + scanApi;
        var taskId;

        var fetchRes = await axios(scan_url, {
            method: 'post',
            data: {
                configuration_name: configName,
                target: branch,
            },
            headers: {
                'Content-type': 'application/json',
                'Authorization': 'token ' + token
            },
        });
        if (fetchRes.status == 201) {
            taskId = fetchRes.data.task_id;
            console.log('Started ' + fetchRes.data.connector.slug + ' scan with task id ' + taskId);
        }
        else {
            throw new Error(
                'Starting Remote Scan Failed'
            );
        }

        if (!no_wait && typeof taskId !== 'undefined' && taskId) {
            var timeDef;
            var currentTime;
            const startTime = new Date();
            const statusApi = '/api/v1/cicd/status/';
            var scan_url = strobesUrl + statusApi + taskId + '/';
            var status = fetchRes.data.status;
            while (status != 3) {
                fetchRes = await axios(scan_url, {
                    method: 'get',
                    headers: {
                        'Content-type': 'application/json',
                        'Authorization': 'token ' + token
                    },
                });
                if (fetchRes.status == 200) {
                    status = fetchRes.data.status;
                    if (status == 1) {
                        console.log('Scan Status: STARTED');
                    }
                    else if (status == 2) {
                        console.log('Scan Status: FAILED');
                        break;
                    }
                    else if (status == 3) {
                        console.log('Scan Status: SUCCESS');
                        break;
                    }
                    else if (status == 4) {
                        console.log('Scan Status: ABORTED');
                        break;
                    }
                }
                else {
                    throw new Error(
                        'Remote scan status fetching failed'
                    );
                }

                if (status == 3) {
                    var flag = checkRules(rules, fetchRes.data.bug_stats);
                    if (flag) {
                        throw new Error(
                            'Rule checks failed for remote scan with task id: ' + taskId
                        );
                    }
                }

                // Check time passed till now in this loop for timeout
                currentTime = new Date();
                timeDef = currentTime - startTime;
                timeDef = Math.floor(timeDef / 1000);
                if (timeDef > timeout) {
                    break;
                }

                // Sleep 5 seconds
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        console.log('Strobes Remote Scan Completed')
    } catch (error) {
        core.setFailed(error.message);
    }
}


run();