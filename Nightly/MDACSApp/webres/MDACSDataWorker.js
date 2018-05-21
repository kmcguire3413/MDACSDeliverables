/// <summary>
/// This systems is really simple and it helps to keep a responsive UI.
///
/// (1) We have this web worker a string containing the JSON data. We
///     give it a string because we do not want a JSON.parse blocking
///     the UI thread and freezing the browser page.
/// (2) This web worker sorts the data. This is CPU intensive because
///     the data is not in an efficiently represented pre-indexed format
///     and doing it in the UI thread locks the browser page up.
/// (3) This web worker sends periodic progress reports. We can show that
///     to the user so they do not think the system has broken if it happens
///     to take a few minutes. It might take a long time if someone is using
///     a low power device or there is a massive amount of data.
/// (4) This web worker sends a message that says all done!
///
/// Now, the UI thread can request sets/chunks of the sorted data or the
/// entire set of data if it likes. I think requesting small sets/chunk is
/// good because it keeps the UI thread responsive; because, JSON.parse is 
/// a blocking JavaScript call on the UI thread.
///
/// Also, the UI thread can issue search strings and this web worker can
/// perform the search and produce a pre-ready subset of the data which
/// can then be requested by chunks.
///
/// I wanted to use the IndexedDB API for browsers that is out right now, but the problem was that
/// multiple users (in a current setup) use the same system. Having the data for each stored locally
/// and accessible to each defeats the ability to truly keep one from accessing the other's data. To
/// be more clear I am talking about multiple users using the same user account and browser.
/// </summary>

let g_data = null;
let g_subset = null;
let g_speed_search = null;

function status(msg) {
    postMessage({
        topic: 'Status',
        status: msg,
    });
}

function createEpochTime(data) {
    status('Parsing date and time for sorting...');
    // Build special field to make sorting more efficient.
    for (let x = 0; x < data.length; ++x) {
        let item = data[x];

        let year = parseInt(item.datestr.substr(0, 4));
        let month = parseInt(item.datestr.substr(5, 2));
        let day = parseInt(item.datestr.substr(8, 2));

        let hour = parseInt(item.timestr.substr(0, 2));
        let minute = parseInt(item.timestr.substr(2, 2));
        let second = parseInt(item.timestr.substr(4));

        //console.log('###', item.datestr, year, month, day, item.timestr, hour, minute, second);

        let jsUTCDate = new Date(year, month - 1, day, hour, minute, second);

        // Attach the jsDate after localizing the time according to the timezone.
        item.jsDate = new Date(jsUTCDate.getTime() - jsUTCDate.getTimezoneOffset() * 60 * 1000);
        item.epochAgeSeconds = item.jsDate.getTime() / 1000;
    }
    
    return data;
}

function sortData(data) {
    status('Sorting the data...');
    data.sort((a, b) => {
        let aAge = a.epochAgeSeconds;
        let bAge = b.epochAgeSeconds;

        if (aAge > bAge) {
            return -1;
        } else if (aAge === bAge) {
            return 0;
        }

        return 1;
    });
}

function stackItems(data) {
    let sets = {};

    status('Grouping by user and device for stacking...');

    for (let x = 0; x < data.length; ++x) {
        let item = data[x];
        let userAndDevice = item.userstr + '::::' + item.devicestr;

        if (sets[userAndDevice] === undefined) {
            sets[userAndDevice] = [];
        }

        sets[userAndDevice].push(item);
    }

    let out = [];

    for (let k in sets) {
        status('Stacking by ' + k  + '...');
        sets[k] = stackItemsSubSet(sets[k]);

        status('Merging for ' + k + '...');
        for (let x = 0; x < sets[k].length; ++x) {
            out.push(sets[k][x]);
        }
    }

    return out;
}

function stackItemsSubSet(data) {
    let out = [];

    for (let x = 0; x < data.length;) {
        let a = data[x];

        a.children = [];

        let children = [a];

        let y;

        let c = a.epochAgeSeconds;

        for (y = x + 1; y < data.length; ++y) {
            let b = data[y];
            
            let bDuration = b.duration;

            let delta = Math.abs((b.epochAgeSeconds + bDuration) - c);

            b.children = [];

            if (delta < 10) {
                children.push(b);
                c = b.epochAgeSeconds;
            } else {
                break;
            }
        }

        if (children.length > 1) {
            let p = children[children.length - 1];

            out.push(p);

            for (let y = children.length - 2; y > -1; --y) {
                p.children.push(children[y]);
            }
        } else {
            out.push(a);
        }

        x = y;
    }

    return out;
}

onmessage = function (e) {
    let msg = e.data;

    console.log('[worker] processing message topic ' + msg.topic);

    switch (msg.topic) {
        case 'LoadDataString':
        {
            status('Loading data string...');

            g_data = JSON.parse(msg.dataString).data;

            status('Removing empty items...');

            let tmp = [];

            for (let x = 0; x < g_data.length; ++x) {
                if (g_data[x] !== null && g_data[x] !== undefined) {
                    tmp.push(g_data[x]);
                }
            }

            g_data = tmp;

            g_data = createEpochTime(g_data);

            status('Initial sorting...');
            sortData(g_data);            

            status('Stacking sequential items...');

            g_data = stackItems(g_data);

            status('Sorting after stacking...');
            sortData(g_data);

            g_speed_search = [];

            status('Building index for text searching of the data...');

            for (let x = 0; x < g_data.length; ++x) {
                let item = g_data[x];

                if (item === null) {
                    // Ignore garbage items.
                    continue;
                }

                let full_string =
                    x + ' ' +
                    item.datestr + ' ' +
                    item.timestr + ' ' +
                    item.userstr + ' ' +
                    item.devicestr + ' ' +
                    (item.note !== null ? item.note.replace('\n', ' ') : '');

                    g_speed_search.push(full_string.toLowerCase());
            }

            postMessage({
                topic: 'LoadDataStringDone',
                count: g_data.length,
            });            
            break;
        }
        case 'ProduceSubSet':
        {
            let criteria = msg.criteria;
            let showDeleted = msg.showDeleted ? true : false;

            let pos = 0;

            let c = criteria[0];

            status('Producing subset from search criteria.. [0/' + g_data.length + ']');

            g_subset = [];

            let usersFound = {};

            for (let x = 0; x < criteria.length; ++x) {
                criteria[x] = criteria[x].toLowerCase();
            }

            if (criteria.length === 0 || (criteria.length === 1) && criteria[0] === '') {
                // Do a shallow copy of the entire set.
                status('Copying data...');
                for (let x = 0; x < g_data.length; ++x) {
                    if (showDeleted === false) {
                        if (
                            typeof(g_data[x].state) === 'string' && g_data[x].state.indexOf('delete') == 0
                        ) {
                            continue;
                        }
                    }

                    usersFound[g_data[x].userstr] = 0;

                    g_subset.push(g_data[x]);
                }

                status('');

                postMessage({
                    topic: 'ProduceSubSetDone',
                    usersFound: usersFound,
                    count: g_subset.length,
                });                
                break;
            }

            console.log('producing subset with showDeleted=' + showDeleted);

            // There might be a faster method but this had a good blend of
            // simplicity and speed. No benchmarks have been done. It keeps
            // the items in the same sorted order which is valuable.
            for (let x = 0; x < g_speed_search.length; ++x) {
                // Instead of adding logic to access each individual property
                // of the object we condensed the relavent fields of the object
                // into textual lines separated by spaces.
                let itemSpeedString = g_speed_search[x];
                let item = g_data[x];

                if (showDeleted === false) {
                    if (
                        typeof(item.state) === 'string' && item.state.indexOf('delete') == 0
                    ) {
                        continue;
                    }
                }            

                let count = 0;

                for (let y = 0; y < criteria.length; ++y) {
                    if (itemSpeedString.indexOf(criteria[y]) !== -1) {
                        count++;
                    } else {
                        break;
                    }
                }

                if (count === criteria.length) {
                    status('Searching [' + x + '/' + g_subset.length + '/' + g_data.length + ']');
                    g_subset.push(g_data[x]);
                }
            }            

            status('Search done [' + g_subset.length + '/' + g_data.length + ']');

            postMessage({
                topic: 'ProduceSubSetDone',
                count: g_subset.length,
            });
            break;
        }
        case 'SetNote':
        {
            let sid = msg.sid;
            let value = msg.value;

            for (let x = 0; x < g_subset.length; ++x) {
                let item = g_subset[x];

                if (item.security_id === sid) {
                    item.note = value;
                    console.log('[worker] SetNote success');
                }
            }
            break;
        }
        case 'SetState':
        {
            let sid = msg.sid;
            let value = msg.value;            
            
            for (let x = 0; x < g_subset.length; ++x) {
                let item = g_subset[x];

                if (item.security_id === sid) {
                    item.state = value;
                    console.log('[worker] SetState success');
                }
            }
            break;
        }
        case 'GetSubSetOfSubSet':
        {
            let subset = [];

            for (let x = msg.beginIndex; x < msg.endIndex && x < g_subset.length; ++x) {
                subset.push(g_subset[x]);
            }

            console.log('sending subset of subset', subset.length);

            postMessage({
                topic: 'GetSubSetOfSubSetDone',
                subset: subset,
            });
            break;
        }
    }
};