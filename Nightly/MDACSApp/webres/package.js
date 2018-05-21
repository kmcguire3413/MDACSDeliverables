/// <jsx-source-file>./websrc/MDACSAnonFeedback.jsx</jsx-source-file>
class MDACSAnonFeedback extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showFeedbackBox: false
        };
    }

    render() {
        const state = this.state;
        const props = this.props;

        const onShowFeedbackClick = e => {
            e.preventDefault();

            this.setState({
                showFeedbackBox: true
            });
        };

        if (state.showFeedbackBox) {
            const onSendFeedback = e => {
                this.setState({
                    showFeedbackBox: false
                });

                let msg = {
                    feedback: state.feedbackValue
                };

                request.post(props.postUrl).send(JSON.stringify(msg)).end((err, res) => {});
            };

            const onCloseFeedback = e => {
                this.setState({
                    showFeedbackBox: false
                });
            };

            const onFeedbackChange = e => {
                const value = e.target.value;

                this.setState({
                    feedbackValue: value
                });
            };

            return React.createElement(
                "div",
                { className: "static-modal" },
                React.createElement(
                    Modal.Dialog,
                    null,
                    React.createElement(
                        Modal.Header,
                        null,
                        React.createElement(
                            Modal.Title,
                            null,
                            "Anonymous Feedback"
                        )
                    ),
                    React.createElement(
                        Modal.Body,
                        null,
                        "Type your feedback:",
                        React.createElement(
                            "div",
                            null,
                            React.createElement(FormControl, { onChange: onFeedbackChange, componentClass: "textarea", placeholder: "Type your feedback here." })
                        )
                    ),
                    React.createElement(
                        Modal.Footer,
                        null,
                        React.createElement(
                            Button,
                            { onClick: onSendFeedback },
                            "Send Feedback"
                        ),
                        React.createElement(
                            Button,
                            { onClick: onCloseFeedback },
                            "Cancel"
                        )
                    )
                )
            );
        }

        return React.createElement(
            Button,
            { onClick: onShowFeedbackClick },
            "Give Anonymous Feedback"
        );
    }
}

/// <jsx-source-file>./websrc/MDACSConsole.jsx</jsx-source-file>
MDACSConsole = {};

MDACSConsole.ReactComponent = class extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            history: [],
            curCommand: null
        };
    }

    commandValueChanged(e) {
        this.setState({
            curCommand: e.target.value
        });
    }

    interpretCommand() {
        let cmd = this.state.curCommand;

        if (cmd === null) {
            return;
        }

        let insideQuotes = false;

        let majorParts = [];
        let curBuffer = [];

        for (let x = 0; x < cmd.length; ++x) {
            let c = cmd[x];

            if (c === '"') {
                if (insideQuotes) {
                    insideQuotes = false;
                } else {
                    insideQuotes = true;
                }
                continue;
            }

            if (c === ' ' && insideQuotes === false) {
                curBuffer = curBuffer.join('').trim();
                if (curBuffer.length > 0) {
                    majorParts.push(curBuffer);
                }

                curBuffer = [];
                continue;
            }

            curBuffer.push(c);
        }

        curBuffer = curBuffer.join('').trim();
        if (curBuffer.length > 0) {
            majorParts.push(curBuffer);
        }

        curBuffer = [];

        let cmds = [];
        let opts = {};

        for (let x = 0; x < majorParts.length; ++x) {
            let part = majorParts[x];

            if (part.indexOf('--') === 0 || part.indexOf('-') === 0) {
                // option
                if (part.indexOf('=') > -1) {
                    let pos;

                    if (part.substring(0, 2) === '--') {
                        pos = 2;
                    } else {
                        pos = 1;
                    }

                    let key = part.substring(pos, part.indexOf('='));
                    let val = part.substring(part.indexOf('=') + 1);
                    opts[key] = val;
                }
            } else {
                // positional
                cmds.push(part);
            }
        }

        // The final generalized command form that will be transmitted.
        let pkg = {
            cmds: cmds,
            opts: opts
        };

        return pkg;
    }

    commandSubmit(e) {
        e.preventDefault();

        const state = this.state;
    }

    render() {
        const pkg = this.interpretCommand();

        const state = this.state;
        const history = state.history;

        const prettyCommand = JSON.stringify(pkg, null, 4);

        return React.createElement(
            'div',
            { className: 'MDACSConsoleContainer' },
            React.createElement(
                'div',
                { style: { 'font-size': '14pt', 'whiteSpace': 'pre' } },
                prettyCommand
            ),
            React.createElement(
                'div',
                null,
                React.createElement(
                    'form',
                    { onSubmit: this.commandSubmit.bind(this) },
                    React.createElement(FormControl, {
                        componentClass: 'textarea',
                        value: this.state.value,
                        placeholder: 'Enter the command to be executed.',
                        onChange: this.commandValueChanged.bind(this),
                        style: { 'font-size': '18pt' }
                    })
                )
            ),
            React.createElement('div', null)
        );
    }
};

/// <jsx-source-file>./websrc/MDACSDataView.jsx</jsx-source-file>
/// <prop name="viewer">The object with callable methods for viewing items.</prop>
/// <prop name="updater">The object with callable methods for updating data.</prop>
/// <prop name="beginIndex">Only for visual purposes, if needed.</prop>
/// <prop name="endIndex">Only for visual purposes, if needed.</prop>
/// <prop name="data">Used to render the items. The entire data array is rendered.</prop>
/// <prop name="user">The user viewing this component.</prop>
class MDACSDataView extends React.Component {
    constructor(props) {
        super(props);
    }

    shouldComponentUpdate(nextProps, nextState) {
        let nextData = nextProps.data;
        let curData = this.props.data;

        if (curData === null && nextData === null) {
            return false;
        }

        if (curData === null || nextData === null) {
            return true;
        }

        if (curData.length !== nextData.length) {
            return true;
        }

        for (let x = 0; x < curData.length; ++x) {
            if (curData[x] !== nextData[x]) {
                return true;
            }
        }

        return false;
    }

    render() {
        let props = this.props;
        let data = props.data;
        let beginIndex = props.beginIndex;
        let endIndex = props.endIndex;

        if (data === null) {
            return React.createElement(
                'div',
                null,
                'No data.'
            );
        }

        let tmp = [];

        for (let x = 0; x < data.length; ++x) {
            let item = data[x];

            let failed_things = {};

            if (props.failed[item.security_id] !== undefined) {
                failed_things = props.failed[item.security_id];
            }

            if (item !== undefined && item !== null) {
                tmp.push(React.createElement(MDACSDataItem, {
                    failed: failed_things,
                    user: props.user,
                    viewer: props.viewer,
                    updater: props.updater,
                    index: x + beginIndex,
                    key: item.security_id,
                    item: item }));
            }
        }

        let footer = null;

        if (tmp.length === 0) {
            footer = React.createElement(
                'div',
                null,
                'No items from ',
                beginIndex,
                ' to ',
                endIndex - 1,
                '.'
            );
        }

        return React.createElement(
            'div',
            { style: { backgroundColor: 'white' } },
            React.createElement(
                Table,
                { striped: true, bordered: true },
                React.createElement(
                    'thead',
                    null,
                    React.createElement(
                        'tr',
                        null,
                        React.createElement(
                            'td',
                            null,
                            'Index'
                        ),
                        React.createElement(
                            'td',
                            null,
                            'State'
                        ),
                        React.createElement(
                            'td',
                            null,
                            'Date'
                        ),
                        React.createElement(
                            'td',
                            null,
                            'Time'
                        ),
                        React.createElement(
                            'td',
                            null,
                            'User'
                        ),
                        React.createElement(
                            'td',
                            null,
                            'Device'
                        ),
                        React.createElement(
                            'td',
                            null,
                            'View'
                        ),
                        React.createElement(
                            'td',
                            { style: { width: '100%' } },
                            'Note'
                        )
                    )
                ),
                React.createElement(
                    'tbody',
                    null,
                    tmp
                )
            ),
            footer
        );
    }
}

/// <jsx-source-file>./websrc/MDACSDatabaseModule.jsx</jsx-source-file>
function generate_sample_data(count) {
    function padleftzero(v) {
        if (v.length == 1) {
            return '0' + v;
        }

        return v;
    }

    function cf(l) {
        let m = Math.floor(Math.random() * l.length);

        return l[m];
    }

    let users = ['bob', 'mark', 'jill', 'bill', 'bryan', 'josh', 'kevin', 'sue', 'beth', 'alicia', 'jasmine'];

    let devices = ['gopro3029', 'bodycam45', 'laptop293', 'upload', 'gopro3832', 'bodycam86'];

    let tmp = [];

    for (let x = 0; x < count; ++x) {
        let year = padleftzero(Math.floor(Math.random() * 2000 + 1900).toString());
        let month = padleftzero(Math.floor(Math.random() * 12 + 1).toString());
        let day = padleftzero(Math.floor(Math.random() * 25 + 1).toString());
        let hour = padleftzero(Math.floor(Math.random() * 24).toString());
        let minute = padleftzero(Math.floor(Math.random() * 60).toString());
        let second = padleftzero(Math.floor(Math.random() * 60).toString());

        let item = {
            datestr: year + month + day,
            timestr: hour + minute + second,
            userstr: cf(users),
            devicestr: cf(devices),
            note: '',
            security_id: x,
            state: 'Auto-Purge 90-Days Then Cloud 180-Days'
        };

        tmp.push(item);
    }

    tmp = {
        data: tmp
    };

    return JSON.stringify(tmp);
}

/// <prop name="user">The user viewing this component.</prop>
/// <prop name="dao">The data (database in this case) access object, with methods.</prop>
class MDACSDataViewSummary extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            state: 'loading'
        };
    }

    componentDidMount() {
        this.refresh();
    }

    refresh() {
        this.props.dao.spaceInfo(info => {
            this.setState({
                state: 'loaded',
                used_bytes: info.used_bytes,
                max_bytes: info.max_bytes
            });
        }, () => {
            this.setState({
                state: 'error'
            });
        });
    }

    render() {
        const state = this.state;
        const refresh = this.refresh;
        const props = this.props;

        switch (state.state) {
            case 'loading':
                return React.createElement(
                    Panel,
                    null,
                    'Loading summary information...'
                );
            case 'loaded':
                {
                    const usedPercentage = Math.round(state.used_bytes / state.max_bytes * 100.0);
                    const privType = props.user.admin ? 'administrator' : 'normal user';

                    let filterNote = null;

                    if (props.user.userfilter !== null) {
                        filterNote = 'The data is filtered using the expression ' + props.user.userfilter + '.';
                    } else {
                        filterNote = 'The data is not filtered using an expression.';
                    }

                    return React.createElement(
                        Panel,
                        null,
                        React.createElement(
                            Alert,
                            null,
                            React.createElement(
                                'div',
                                null,
                                'Currently, ',
                                usedPercentage,
                                '% of total space has been utilized.'
                            ),
                            React.createElement(
                                'div',
                                null,
                                'You are logged in with the username ',
                                props.user.user,
                                ' which has ',
                                privType,
                                ' privileges. ',
                                filterNote
                            )
                        )
                    );
                }
            case 'error':
                return React.createElement(
                    Panel,
                    null,
                    React.createElement(
                        Button,
                        { bsStyle: 'success', onClick: refresh },
                        'Try Loading Summary Again'
                    )
                );
        }
    }
}

class MDACSDeviceConfiguration extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {}
}

class MDACSConfigurationList extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {}
}

/// <summary>
/// Generate the initial state for the MDACSDataModule component.
/// </summary>
const MDACSDatabaseModuleStateGenerator = (props, setState) => {
    let state = {
        data: null,
        error: null,
        beginIndex: 0,
        endIndex: 50,
        visibleCount: 50,
        dataCount: 0,
        pendingOperationCount: 0,
        builtInitialSubset: false,
        workerStatus: 'Loading...',
        worker: new Worker('utility?MDACSDataWorker.js'),
        opFailedItems: {},
        searchValue: '',
        toggleDeletedbuttonText: 'Show Deleted',
        showDeleted: false,
        currentlyViewingItems: null,
        itemViewStuff: null,
        usersInSubset: {}
    };

    // Hook up mutator to the worker message handler.
    state.worker.onmessage = e => {
        MDACSDatabaseModuleMutators.onWorkerMessage(props, state, setState, e);
    };

    return state;
};

/// <summary>
/// A set of functions that mutate the state of the MDACSDataModule.
/// </summary>
const MDACSDatabaseModuleMutators = {
    onWorkerMessage: (props, state, setState, e) => {
        let msg = e.data;

        switch (msg.topic) {
            case 'LoadDataStringDone':
                {
                    setState({
                        builtInitialSubset: true
                    });

                    state.worker.postMessage({
                        topic: 'ProduceSubSet',
                        criteria: [],
                        showDeleted: state.showDeleted
                    });
                    break;
                }
            case 'ProduceSubSetDone':
                {
                    setState({
                        beginIndex: 0,
                        endIndex: state.visibleCount,
                        dataCount: msg.count,
                        usersInSubset: msg.usersFound
                    });

                    state.worker.postMessage({
                        topic: 'GetSubSetOfSubSet',
                        beginIndex: 0,
                        endIndex: state.visibleCount
                    });
                    break;
                }
            case 'GetSubSetOfSubSetDone':
                {
                    setState({
                        data: msg.subset
                    });
                    break;
                }
            case 'Status':
                {
                    setState({
                        workerStatus: msg.status
                    });

                    console.log('status', msg.status);
                    break;
                }
        }
    },
    prevPage: (props, state, setState) => {
        setState((prevState, props) => {
            state.worker.postMessage({
                topic: 'GetSubSetOfSubSet',
                beginIndex: prevState.beginIndex - prevState.visibleCount,
                endIndex: prevState.endIndex - prevState.visibleCount
            });

            return {
                beginIndex: prevState.beginIndex - prevState.visibleCount,
                endIndex: prevState.endIndex - prevState.visibleCount,
                data: null
            };
        });
    },
    nextPage: (props, state, setState) => {
        setState((prevState, props) => {
            state.worker.postMessage({
                topic: 'GetSubSetOfSubSet',
                beginIndex: prevState.beginIndex + prevState.visibleCount,
                endIndex: prevState.endIndex + prevState.visibleCount
            });

            return {
                beginIndex: prevState.beginIndex + prevState.visibleCount,
                endIndex: prevState.endIndex + prevState.visibleCount,
                data: null
            };
        });
    },
    onSearchChange: (props, state, setState, e) => {
        e.preventDefault();

        setState({
            searchValue: e.target.value
        });
    },
    onSearchClick: (props, state, setState, searchValue) => {
        state.worker.postMessage({
            topic: 'ProduceSubSet',
            criteria: searchValue.split(' '),
            showDeleted: state.showDeleted
        });
    },
    onReloadData: (props, state, setState, e) => {
        if (e !== null && e !== undefined) {
            e.preventDefault();
        }

        setState({
            error: null,
            data: null,
            workerStatus: 'Loading...',
            searchValue: ''
        });

        props.dao.data_noparse(dataString => {
            //dataString = generate_sample_data(10000);

            setState({
                error: null,
                data: null
            });

            state.worker.postMessage({
                topic: 'LoadDataString',
                dataString: dataString
            });
        }, res => {
            console.log('data fetch error', res);
            setState({
                error: 'A problem happened when retrieving data from the server.'
            });
        });
    },
    onToggleDeleted: (props, state, setState, e) => {
        if (state.toggleDeletedbuttonText === 'Show Deleted') {
            setState({
                toggleDeletedbuttonText: 'Hide Deleted',
                beginIndex: 0,
                endIndex: state.visibleCount,
                showDeleted: true,
                searchValue: ''
            });

            state.worker.postMessage({
                topic: 'ProduceSubSet',
                criteria: [],
                showDeleted: true
            });
        } else {
            setState({
                toggleDeletedbuttonText: 'Show Deleted',
                beginIndex: 0,
                endIndex: state.visibleCount,
                showDeleted: false,
                searchValue: ''
            });

            state.worker.postMessage({
                topic: 'ProduceSubSet',
                criteria: [],
                showDeleted: false
            });
        }
    },
    setItemState: (props, state, setState, sid, newState, cb) => {
        setState((prev, props) => {
            return { pendingOperationCount: prev.pendingOperationCount + 1 };
        });

        state.worker.postMessage({
            topic: 'SetState',
            sid: sid,
            value: newState
        });

        props.dao.setState(sid, newState, () => {
            setState((prev, props) => {
                return { pendingOperationCount: prev.pendingOperationCount - 1 };
            });

            // https://github.com/kmcguire3413/MDACSApp/issues/4
            for (let key in state.data) {
                let item = state.data[key];

                if (item.security_id === sid) {
                    item.state = newState;
                }
            }

            cb(true);
        }, () => {
            setState((prev, props) => {
                return {
                    pendingOperationCount: prev.pendingOperationCount - 1
                };
            });

            cb(false);
        });
    },
    setItemNote: (props, state, setState, sid, newNote, cb) => {
        setState((prev, props) => {
            return { pendingOperationCount: prev.pendingOperationCount + 1 };
        });

        state.worker.postMessage({
            topic: 'SetNote',
            sid: sid,
            value: newNote
        });

        props.dao.setNote(sid, newNote, () => {
            setState((prev, props) => {
                return { pendingOperationCount: prev.pendingOperationCount - 1 };
            });

            // https://github.com/kmcguire3413/MDACSApp/issues/4
            for (let key in state.data) {
                let item = state.data[key];

                if (item.security_id === sid) {
                    item.note = newNote;
                }
            }

            cb(true);
        }, () => {
            setState((prev, props) => {
                return { pendingOperationCount: prev.pendingOperationCount - 1 };
            });

            cb(false);
        });
    },
    viewItemStack: (props, state, setState, item) => {
        let itemsUnstacked = [];

        itemsUnstacked.push(item);

        for (let x = 0; x < item.children.length; ++x) {
            itemsUnstacked.push(item.children[x]);
        }

        setState({
            currentlyViewingItems: itemsUnstacked
        });
    }
};

const MDACSDatabaseModuleViews = {
    Main: (props, state, setState, mutators, updaterInterface, viewerInterface) => {
        let errorView;

        const prevPage = () => mutators.prevPage(props, state, setState);
        const nextPage = () => mutators.nextPage(props, state, setState);
        const onSearchChange = e => mutators.onSearchChange(props, state, setState, e);
        const onSearchClick = searchValue => mutators.onSearchClick(props, state, setState, searchValue);
        const reloadData = e => mutators.onReloadData(props, state, setState, e);
        const toggleDeleted = e => mutators.onToggleDeleted(props, state, setState, e);
        const onClearSearch = e => {
            e.preventDefault();

            setState({
                searchValue: ''
            });

            state.worker.postMessage({
                topic: 'ProduceSubSet',
                criteria: [],
                showDeleted: state.showDeleted
            });
        };

        ///////////////////////////////////////////////

        if (state.error !== null) {
            errorView = React.createElement(
                Alert,
                null,
                state.error
            );
        } else {
            errorView = null;
        }

        ///////////////////////////////////////////////

        let usersInSubsetButtons = [];

        let buildUserSearchClickHandler = userName => {
            return e => {
                setState({
                    searchValue: userName
                });

                onSearchClick(userName);
            };
        };

        for (let userName in state.usersInSubset) {
            let handler = buildUserSearchClickHandler(userName);

            usersInSubsetButtons.push(React.createElement(
                Button,
                { key: userName, onClick: handler },
                'Filter By ',
                userName
            ));
        }

        let bar = React.createElement(
            Table,
            null,
            React.createElement(
                'thead',
                null,
                React.createElement(
                    'tr',
                    null,
                    React.createElement('td', null),
                    React.createElement('td', { style: { width: '100%' } }),
                    React.createElement('td', null)
                )
            ),
            React.createElement(
                'tbody',
                null,
                React.createElement(
                    'tr',
                    null,
                    React.createElement(
                        'td',
                        null,
                        React.createElement(
                            'div',
                            { style: { margin: '0.2in' } },
                            React.createElement(
                                Button,
                                { onClick: prevPage },
                                'Previous Page'
                            )
                        ),
                        React.createElement(
                            'div',
                            { style: { margin: '0.2in' } },
                            React.createElement(
                                Button,
                                { onClick: nextPage },
                                'Next Page'
                            )
                        )
                    ),
                    React.createElement(
                        'td',
                        null,
                        React.createElement(
                            'div',
                            null,
                            React.createElement(
                                'form',
                                { onSubmit: e => {
                                        e.preventDefault();onSearchClick(state.searchValue);
                                    } },
                                React.createElement(
                                    'div',
                                    null,
                                    React.createElement(
                                        Button,
                                        { type: 'submit' },
                                        'Search'
                                    ),
                                    React.createElement(
                                        Button,
                                        { onClick: onClearSearch },
                                        'Clear Search'
                                    ),
                                    React.createElement(FormControl, {
                                        id: 'searchText',
                                        type: 'text',
                                        value: state.searchValue,
                                        placeholder: 'Type search words here.',
                                        onChange: onSearchChange
                                    })
                                ),
                                React.createElement(
                                    'div',
                                    null,
                                    usersInSubsetButtons
                                )
                            )
                        ),
                        React.createElement('hr', null),
                        React.createElement(
                            'div',
                            null,
                            React.createElement(
                                'strong',
                                null,
                                'Showing ',
                                state.beginIndex + 1,
                                ' to ',
                                state.endIndex,
                                ' items out of ',
                                state.dataCount,
                                ' items using the search string "',
                                state.searchValue,
                                '".'
                            )
                        )
                    ),
                    React.createElement(
                        'td',
                        null,
                        React.createElement(
                            'div',
                            null,
                            React.createElement(
                                Button,
                                { onClick: reloadData },
                                'Reload'
                            )
                        ),
                        React.createElement(
                            'div',
                            null,
                            React.createElement(
                                Button,
                                { onClick: toggleDeleted },
                                state.toggleDeletedbuttonText
                            )
                        )
                    )
                )
            )
        );

        ///////////////////////////////////////////////

        let statusHeader = null;

        if (state.pendingOperationCount > 0) {
            statusHeader = React.createElement(
                'span',
                { style: {
                        border: '1px solid black',
                        margin: '2px',
                        padding: '10px',
                        backgroundColor: 'white',
                        position: 'fixed',
                        top: '0px'
                    } },
                'Pending Updates: ',
                state.pendingOperationCount
            );
        }

        ///////////////////////////////////////////////

        let dataViewPanel = React.createElement(
            'div',
            null,
            React.createElement(
                Panel,
                { bsStyle: 'primary' },
                React.createElement(
                    Panel.Heading,
                    null,
                    React.createElement(
                        Panel.Title,
                        { componentClass: 'h3' },
                        'Data View and Edit'
                    )
                ),
                React.createElement(
                    Panel.Body,
                    null,
                    React.createElement(
                        'div',
                        null,
                        bar
                    ),
                    React.createElement(MDACSDataViewSummary, { user: props.user, dao: props.dao }),
                    React.createElement(
                        'h3',
                        null,
                        state.workerStatus
                    ),
                    React.createElement(
                        'h3',
                        null,
                        errorView
                    ),
                    React.createElement(MDACSDataView, {
                        failed: state.opFailedItems,
                        user: props.user,
                        viewer: viewerInterface,
                        updater: updaterInterface,
                        data: state.data,
                        beginIndex: state.beginIndex,
                        endIndex: state.endIndex }),
                    React.createElement(
                        'div',
                        null,
                        bar
                    )
                )
            ),
            statusHeader
        );

        const goBack = e => {
            e.preventDefault();

            setState({
                currentlyViewingItems: null
            });
        };

        if (state.currentlyViewingItems === null) {
            return dataViewPanel;
        } else {
            // The panel for displaying single or stacked items. The stacked items are unstacked
            // and ordered from first to last as the value to the property `items`.
            return React.createElement(MDACSItemsView, { goBack: goBack, dao: props.dao, items: state.currentlyViewingItems });
        }
    }
};

/// <prop name="dao">DAO for the database service.</prop>
/// <prop name="user">The user viewing this component.</prop>
class MDACSDatabaseModule extends React.Component {
    constructor(props) {
        super(props);

        const boundSetState = this.setState.bind(this);

        this.state = MDACSDatabaseModuleStateGenerator(props, boundSetState);
    }

    componentDidMount() {
        MDACSDatabaseModuleMutators.onReloadData(this.props, this.state, this.setState.bind(this), null);
    }

    componentWillUnmount() {}

    render() {
        // More indirection. But, it does form an interface and that keeps anyone
        // in the future from having a direct reference to `this` and relying 
        // on functionality not intended to be exported as part of the updater
        // interface.

        const boundSetState = this.setState.bind(this);
        const props = this.props;
        const state = this.state;

        let updaterInterface = {
            setNote: (sid, newNote, cb) => MDACSDatabaseModuleMutators.setItemNote(props, state, boundSetState, sid, newNote, cb),

            setState: (sid, newState, cb) => MDACSDatabaseModuleMutators.setItemState(props, state, boundSetState, sid, newState, cb)

        };

        let viewerInterface = {
            viewItemStack: item => MDACSDatabaseModuleMutators.viewItemStack(props, state, boundSetState, item)
        };

        return MDACSDatabaseModuleViews.Main(this.props, this.state, this.setState.bind(this), MDACSDatabaseModuleMutators, updaterInterface, viewerInterface);
    }
}

/// <jsx-source-file>./websrc/MDACSItem.jsx</jsx-source-file>


class MDACSDataItemDate extends React.Component {
    render() {
        return this.props.item.jsDate.toLocaleDateString();
    }
}

class MDACSDataItemTime extends React.Component {
    render() {
        const d = this.props.item.jsDate;

        const pad2 = v => {
            v = String(v);

            if (v.length == 1) {
                return '0' + v;
            }

            return v;
        };

        return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    }
}

class MDACSDataItemUser extends React.Component {
    render() {
        return this.props.value;
    }
}

class MDACSDataItemDevice extends React.Component {
    render() {
        return this.props.value;
    }
}

class MDACSDataItemNote extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            value: props.value,
            state: 'success'
        };
    }

    render() {
        const props = this.props;
        const state = this.state;
        const setState = this.setState.bind(this);

        const changeCancel = () => {
            setState({
                value: props.value,
                state: 'success'
            });
        };

        const changeNote = doPrompt => {
            let newNote;

            if (doPrompt) {
                newNote = prompt("Note", state.value);

                if (newNote === null) {
                    return;
                }
            } else {
                newNote = state.value;
            }

            setState({
                value: newNote,
                state: 'pending'
            });

            props.updater.setNote(props.sid, newNote, success => {
                if (success) {
                    setState({
                        state: 'success'
                    });
                } else {
                    setState({
                        state: 'error'
                    });
                }
            });
        };

        switch (state.state) {
            case 'success':
                return React.createElement(
                    'span',
                    null,
                    React.createElement(
                        Button,
                        { bsSize: 'xsmall', bsStyle: 'link', onClick: e => changeNote(true) },
                        'Edit'
                    ),
                    state.value
                );
            case 'pending':
                return React.createElement(
                    Alert,
                    { bsStyle: 'warning' },
                    'Saving: ',
                    state.value
                );
            case 'error':
                return React.createElement(
                    Alert,
                    { bsStyle: 'danger' },
                    React.createElement(
                        Button,
                        { bsStyle: 'success', onClick: e => changeNote(false) },
                        'Retry'
                    ),
                    React.createElement(
                        Button,
                        { bsStyle: 'warning', onClick: changeCancel },
                        'Cancel'
                    )
                );
        }
    }
}

function inList(v, l) {
    for (let x = 0; x < l.length; ++x) {
        if (l[x] === v) {
            return true;
        }
    }

    return false;
}

function forEachItemSet(base, items, setTo) {
    for (var x = 0; x < items.length; ++x) {
        var items_value = items[x];

        base[items_value] = setTo;
    }
}

class MDACSDataItemState extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            value: props.value,
            state: 'success'
        };
    }

    render() {
        const props = this.props;
        const state = this.state;
        const setState = this.setState.bind(this);

        const listAutoPurge = ['auto-purge-30-days-before-delete-cloud-180-days', 'auto-purge-90-days-before-delete-cloud-180-days', 'auto-purge-180-days-before-delete-cloud-180-days'];

        const listDeleted = ['deleted'];

        const descName = {
            'auto-purge-30-days-before-delete-cloud-180-days': 'Auto-Purge 30/180',
            'auto-purge-90-days-before-delete-cloud-180-days': 'Auto-Purge 90/180',
            'auto-purge-180-days-before-delete-cloud-180-days': 'Auto-Purge 180/180',
            'deleted': 'Deleted',
            'keep-forever': 'Keep Forever',
            'unknown': 'Unselected/New Arrival',
            '': 'Unselected/New Arrival',
            'delete': 'Schedule Delete',
            null: 'Unselected/New Arrival',
            undefined: 'Unselected/New Arrival',
            'restore': 'Restore',
            'cloud-180': 'Cloud 180 Days',
            'cloud-360': 'Cloud 360 Days',
            'cloud-720': 'Cloud 720 Days',
            'cloud-forever': 'Cloud Forever'
        };

        const cloud = ['cloud-180', 'cloud-forever', 'cloud-360', 'cloud-720'];

        const toStateFrom = {};

        const a = listAutoPurge.concat(['delete', 'keep-forever']);

        forEachItemSet(toStateFrom, listAutoPurge, a);
        forEachItemSet(toStateFrom, ['delete', 'keep-forever', 'unknown'], a);
        forEachItemSet(toStateFrom, ['', null, undefined], a);
        forEachItemSet(toStateFrom, ['deleted'], ['restore']);
        forEachItemSet(toStateFrom, ['restore'], ['restore', 'deleted']);
        forEachItemSet(toStateFrom, ['cloud-180'], cloud);

        const options = [];

        const curState = state.value;
        const curFutureStates = toStateFrom[curState];

        if (curFutureStates !== null && curFutureStates !== undefined) {
            let curStateAdded = false;

            for (let x = 0; x < curFutureStates.length; ++x) {
                let v = curFutureStates[x];
                let vDescriptive = descName[v] ? descName[v] : null;

                if (v === curState) {
                    curStateAdded = true;
                }

                if (vDescriptive !== null) {
                    options.push(React.createElement(
                        'option',
                        { key: v, value: v },
                        vDescriptive
                    ));
                }
            }

            let vDescriptive = descName[curState] ? descName[curState] : '?' + curState;

            if (curStateAdded === false) {
                options.push(React.createElement(
                    'option',
                    { key: curState, value: curState },
                    vDescriptive
                ));
            }
        }

        const retryCancel = () => {
            setState({
                value: props.value,
                state: 'success'
            });
        };

        const onChange = newValue => {
            setState({
                value: newValue,
                state: 'pending'
            });

            props.updater.setState(props.sid, newValue, success => {
                if (success) {
                    setState({
                        state: 'success'
                    });
                } else {
                    setState({
                        state: 'error'
                    });
                }
            });
        };

        const isDisabled = props.user.admin === true ? false : true;

        // <select validationState={} disabled={isDisabled} value={curState} onChange={onChange}>
        switch (state.state) {
            case 'success':
                return React.createElement(
                    'select',
                    { disabled: isDisabled, value: curState, onChange: e => onChange(e.target.value) },
                    options
                );
            case 'pending':
                return React.createElement(
                    'span',
                    null,
                    'Saving'
                );
            case 'error':
                return React.createElement(
                    'span',
                    null,
                    React.createElement(
                        Button,
                        { bsStyle: 'success', onClick: e => onChange(state.value) },
                        'Retry Change'
                    ),
                    React.createElement(
                        Button,
                        { bsStyle: 'warning', onClick: retryCancel },
                        'Cancel Change'
                    )
                );
        }
    }
}

/// <summary>
/// Represents the data item. Handles the rendering of the data item and the controls for it.
/// </summary>
/// <prop name="index">The descriptive index of the item within all items.</prop>
/// <prop name="item">The item object.</prop>
/// <prop name="updater">The object with callable methods to schedule changes.</prop>
/// <prop name="viewer">The object with callable methods to view items.</prop>
/// <prop name="user">The user currently viewing this component.</prop>
class MDACSDataItem extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showEditBox: false,
            editTarget: null
        };
    }

    render() {
        const state = this.state;
        const props = this.props;
        const setState = this.setState.bind(this);
        const item = props.item;
        const updater = props.updater;
        const viewer = props.viewer;

        const onViewClick = e => {
            e.preventDefault();

            viewer.viewItemStack(item);
        };

        const childrenCount = item.children ? item.children.length : 0;
        const dataType = item.datatype;

        const user = props.user;

        const failed = props.failed;

        let viewButton = React.createElement(
            Button,
            { bsSize: 'xsmall', bsStyle: 'link', onClick: onViewClick },
            'View [',
            dataType,
            ':',
            childrenCount + 1,
            ']'
        );

        if (item.state.indexOf('cloud-') === 0) {
            if (item.fqpath === null) {
                viewButton = 'Only copy stored in the cloud.';
            }
        } else {
            if (item.fqpath === null) {
                viewButton = 'Deleted';
            }
        }

        return React.createElement(
            'tr',
            null,
            React.createElement(
                'td',
                null,
                props.index
            ),
            React.createElement(
                'td',
                null,
                React.createElement(MDACSDataItemState, {
                    hasFailed: failed.state === true ? true : false,
                    user: user,
                    value: item.state,
                    sid: item.security_id,
                    updater: updater })
            ),
            React.createElement(
                'td',
                null,
                React.createElement(MDACSDataItemDate, {
                    hasFailed: false,
                    user: user, item: item, sid: item.security_id, updater: updater })
            ),
            React.createElement(
                'td',
                null,
                React.createElement(MDACSDataItemTime, {
                    hasFailed: false,
                    user: user, item: item, sid: item.security_id, updater: updater })
            ),
            React.createElement(
                'td',
                null,
                React.createElement(MDACSDataItemUser, {
                    hasFailed: false,
                    user: user, value: item.userstr, sid: item.security_id, updater: updater })
            ),
            React.createElement(
                'td',
                null,
                React.createElement(MDACSDataItemDevice, {
                    hasFailed: false,
                    user: user, value: item.devicestr, sid: item.security_id, updater: updater })
            ),
            React.createElement(
                'td',
                null,
                viewButton
            ),
            React.createElement(
                'td',
                { style: { width: '100%' } },
                React.createElement(MDACSDataItemNote, {
                    hasFailed: failed.note === true ? true : false,
                    user: user, value: item.note, sid: item.security_id, updater: updater })
            )
        );
    }
}

/// <jsx-source-file>./websrc/MDACSItemsView.jsx</jsx-source-file>
/// <prop name="goBack">Called when user has requested to leave this component.</prop>
/// <prop name="dao">The database access object.</prop>
/// <prop name=""
class MDACSItemsView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            itemViewStuff: null
        };
    }

    buildHandler(i, ndx) {
        const props = this.props;
        const state = this.state;
        const setState = this.setState.bind(this);

        return (e, i) => {
            e.preventDefault();

            const src = props.dao.getDownloadUrl(i.security_id);

            const timeDateString = i.jsDate.toLocaleDateString() + ' ' + i.jsDate.toLocaleTimeString();

            switch (i.datatype) {
                case 'mp4':
                    {
                        setState({
                            itemViewStuff: React.createElement(
                                Panel,
                                null,
                                React.createElement(
                                    'h3',
                                    null,
                                    React.createElement(
                                        'strong',
                                        null,
                                        '#',
                                        ndx
                                    ),
                                    ' ',
                                    timeDateString,
                                    ' ',
                                    i.userstr,
                                    ' ',
                                    i.devicestr
                                ),
                                React.createElement(
                                    'div',
                                    null,
                                    'The data type is MP4. The video should load below using the HTML5 video player. Here is a link to download or view the video externally to this page. You may need to right-click the the link and select save-as to override the default behavior.'
                                ),
                                React.createElement(
                                    'div',
                                    null,
                                    React.createElement(
                                        'a',
                                        { href: src, target: '_blank' },
                                        src
                                    )
                                ),
                                React.createElement('video', { style: { width: '100%', height: '100%' }, src: src, controls: 'true' })
                            )
                        });
                        break;
                    }
                case 'jpg':
                    {
                        setState({
                            itemViewStuff: React.createElement(
                                Panel,
                                null,
                                React.createElement(
                                    'h3',
                                    null,
                                    React.createElement(
                                        'strong',
                                        null,
                                        '#',
                                        ndx
                                    ),
                                    ' ',
                                    timeDateString,
                                    ' ',
                                    i.userstr,
                                    ' ',
                                    i.devicestr
                                ),
                                React.createElement(
                                    'div',
                                    null,
                                    'The data type is a JPEG image. The image should load below.'
                                ),
                                React.createElement('img', { style: { width: '100%', height: '100%' }, src: src }),
                                React.createElement(
                                    'div',
                                    null,
                                    React.createElement(
                                        'a',
                                        { href: src, target: '_blank' },
                                        src
                                    )
                                )
                            )
                        });
                        break;
                    }
                default:
                    {
                        setState({
                            itemViewStuff: React.createElement(
                                Panel,
                                null,
                                React.createElement(
                                    'h3',
                                    null,
                                    React.createElement(
                                        'strong',
                                        null,
                                        '#',
                                        ndx
                                    ),
                                    ' ',
                                    timeDateString,
                                    ' ',
                                    i.userstr,
                                    ' ',
                                    i.devicestr
                                ),
                                React.createElement(
                                    'div',
                                    null,
                                    'Not sure how to display the ',
                                    i.datatype,
                                    ' type of data. Here is a link to click to download it or allow the browser to decide how to display it.'
                                ),
                                React.createElement(
                                    'div',
                                    null,
                                    React.createElement(
                                        'a',
                                        { href: src, target: '_blank' },
                                        src
                                    )
                                )
                            )
                        });
                        break;
                    }
            }
        };
    }

    render() {
        const props = this.props;
        const state = this.state;
        const items = props.items;
        const goBack = props.goBack;

        let buttonsForItems = [];

        for (let x = 0; x < items.length; ++x) {
            const i = items[x];
            const handler = this.buildHandler(i, x);
            const timeDateString = i.jsDate.toLocaleDateString() + ' ' + i.jsDate.toLocaleTimeString();

            buttonsForItems.push(React.createElement(
                'div',
                { key: i.security_id },
                React.createElement(
                    Button,
                    { onClick: e => handler(e, i) },
                    React.createElement(
                        'strong',
                        null,
                        '#',
                        x
                    ),
                    ' ',
                    timeDateString
                )
            ));
        }

        const code = React.createElement(
            Panel,
            { bsStyle: 'primary' },
            React.createElement(
                Panel.Heading,
                null,
                React.createElement(
                    Panel.Title,
                    { componentClass: 'h3' },
                    'Item and Item Stack Viewer'
                )
            ),
            React.createElement(
                Panel.Body,
                null,
                React.createElement(
                    'div',
                    null,
                    React.createElement(
                        Button,
                        { onClick: goBack },
                        'Exit'
                    )
                ),
                React.createElement(
                    Panel,
                    null,
                    buttonsForItems
                ),
                state.itemViewStuff
            )
        );

        return code;
    }
}

/// <jsx-source-file>./websrc/MDACSLogin.jsx</jsx-source-file>
let MDACSAuthLogin = {};

/// <summary>
/// Initial model
/// </summary>
/// <pure/>
MDACSAuthLogin.InitialState = {
    username: '',
    password: ''
};

/// <summary>
/// Controller/Mutator
/// </summary>
/// <pure/>
MDACSAuthLogin.Mutators = {
    onUserChange: (e, props, state, setState) => setState({ username: e.target.value }),
    onPassChange: (e, props, state, setState) => setState({ password: e.target.value }),
    onSubmit: (e, props, state, setState) => {
        e.preventDefault();

        if (props.onCheckLogin) {
            props.onCheckLogin(state.username, state.password);
        }
    }
};

/// <summary>
/// View
/// </summary>
/// <pure/>
MDACSAuthLogin.View = (props, state, setState, mutators) => {
    let onUserChange = e => mutators.onUserChange(e, props, state, setState);
    let onPassChange = e => mutators.onPassChange(e, props, state, setState);
    let onSubmit = e => mutators.onSubmit(e, props, state, setState);

    return React.createElement(
        'div',
        null,
        React.createElement(
            'form',
            { onSubmit: onSubmit },
            React.createElement(
                FormGroup,
                null,
                React.createElement(
                    ControlLabel,
                    null,
                    'Username'
                ),
                React.createElement(FormControl, {
                    id: 'login_username',
                    type: 'text',
                    value: state.username,
                    placeholder: 'Enter username',
                    onChange: onUserChange
                }),
                React.createElement(
                    ControlLabel,
                    null,
                    'Password'
                ),
                React.createElement(FormControl, {
                    id: 'login_password',
                    type: 'password',
                    value: state.password,
                    placeholder: 'Enter password',
                    onChange: onPassChange
                }),
                React.createElement(FormControl.Feedback, null),
                React.createElement(
                    Button,
                    { id: 'login_submit', type: 'submit' },
                    'Login'
                )
            )
        )
    );
};

/// <summary>
/// </summary>
/// <prop-event name="onCheckLogin(username, password)">Callback when login should be checked.</prop-event>
MDACSAuthLogin.ReactComponent = class extends React.Component {
    constructor(props) {
        super(props);
        this.state = MDACSAuthLogin.InitialState;
    }

    render() {
        return MDACSAuthLogin.View(this.props, this.state, this.setState.bind(this), MDACSAuthLogin.Mutators);
    }
};

/// <jsx-source-file>./websrc/MDACSLoginApp.jsx</jsx-source-file>
let MDACSAuthLoginSwitcher = {};

MDACSAuthLoginSwitcher.StateGenerator = props => {
    return {
        showLogin: true,
        user: null,
        alert: null,
        daoAuth: new AuthNetworkDAO(props.authUrl)
    };
};

MDACSAuthLoginSwitcher.Mutators = {
    onCheckLogin: (props, state, setState, username, password) => {
        state.daoAuth.setCredentials(username, password);

        state.daoAuth.isLoginValid(user => {
            setState({
                showLogin: false,
                user: user,
                alert: null
            });
        }, res => {
            setState({
                alert: 'The login failed. Reason given was ' + res + '.'
            });
        });
    }
};

MDACSAuthLoginSwitcher.Views = {
    Main: (props, state, setState, mutators) => {
        const onCheckLogin = mutators.onCheckLogin;

        const top = React.createElement(
            'div',
            null,
            React.createElement('img', { src: 'utility?logo.png', height: '128px' }),
            React.createElement(MDACSAnonFeedback, { postUrl: 'http://kmcg3413.net/mdacs_feedback.py' })
        );

        if (state.showLogin) {
            let alert_area = null;

            if (state.alert !== null) {
                alert_area = React.createElement(
                    Alert,
                    null,
                    state.alert
                );
            }

            return React.createElement(
                'div',
                null,
                top,
                React.createElement(MDACSAuthLogin.ReactComponent, {
                    onCheckLogin: (u, p) => onCheckLogin(props, state, setState, u, p)
                }),
                alert_area
            );
        } else {
            return React.createElement(
                'div',
                null,
                top,
                React.createElement(
                    Tabs,
                    { id: 'major-application-tabs', defaultActiveKey: 1 },
                    React.createElement(
                        Tab,
                        { eventKey: 1, key: 'database', title: 'Database' },
                        React.createElement(MDACSDatabaseServiceDirectory.ReactComponent, {
                            user: state.user,
                            daoDatabase: state.daoAuth.getDatabaseDAO(props.dbUrl),
                            daoAuth: state.daoAuth,
                            authUrl: props.authUrl,
                            dbUrl: props.dbUrl
                        })
                    ),
                    React.createElement(
                        Tab,
                        { eventKey: 2, key: 'console', title: 'Console' },
                        React.createElement(MDACSConsole.ReactComponent, {
                            user: state.user,
                            daoDatabase: state.daoAuth.getDatabaseDAO(props.dbUrl),
                            daoAuth: state.daoAuth,
                            daoStorageJuggler: null,
                            authUrl: props.authUrl,
                            dbUrl: props.dbUrl
                        })
                    )
                )
            );
        }
    }
};

MDACSAuthLoginSwitcher.ReactComponent = class extends React.Component {
    constructor(props) {
        super(props);

        this.state = MDACSAuthLoginSwitcher.StateGenerator(props);
    }

    render() {
        return MDACSAuthLoginSwitcher.Views.Main(this.props, this.state, this.setState.bind(this), MDACSAuthLoginSwitcher.Mutators);
    }
};

/// <jsx-source-file>./websrc/MDACSServiceDirectory.jsx</jsx-source-file>
MDACSDatabaseServiceDirectory = {};

MDACSDatabaseServiceDirectory.StateGenerator = props => {
    return {
        dbdao: props.daoAuth.getDatabaseDAO(props.dbUrl)
    };
};

MDACSDatabaseServiceDirectory.Mutators = {};

MDACSDatabaseServiceDirectory.Views = {
    Main: (props, state, setState, mutators) => {
        return React.createElement(MDACSDatabaseModule, { user: props.user, dao: props.daoDatabase });
    }
};

/// <prop name="dbUrl">The url for database service.</prop>
/// <prop name="authUrl">The url for authentication service</prop>
/// <prop name="daoAuth">DAO for authentication service</prop>
/// <prop name="user">The user viewing this component.</prop>
MDACSDatabaseServiceDirectory.ReactComponent = class extends React.Component {
    constructor(props) {
        super(props);

        this.state = MDACSDatabaseServiceDirectory.StateGenerator(props);
    }

    render() {
        return MDACSDatabaseServiceDirectory.Views.Main(this.props, this.state, this.setState.bind(this), MDACSDatabaseServiceDirectory.Mutators);
    }
};

/// <jsx-source-file>./websrc/daos.jsx</jsx-source-file>
class DatabaseNetworkDAO {
    constructor(base_dao) {
        this.dao = base_dao;
    }

    getDownloadUrl(sid) {
        return this.dao.url_service + '/download?' + sid;
    }

    setState(sid, newState, success, failure) {
        this.setField(sid, 'state', newState, success, failure);
    }

    setNote(sid, newNote, success, failure) {
        this.setField(sid, 'note', newNote, success, failure);
    }

    setField(sid, fieldName, fieldValue, success, failure) {
        let obj = {
            ops: []
        };

        obj.ops.push({
            sid: sid,
            field_name: fieldName,
            value: fieldValue
        });

        this.dao.authenticatedTransaction('/commit_batch_single_ops', obj, resp => {
            resp = JSON.parse(resp.text);

            if (resp.success) {
                success();
            } else {
                failure(null);
            }
        }, failure);
    }

    data(success, failure) {
        this.dao.authenticatedTransaction('/data', {}, resp => {
            success(JSON.parse(resp.text));
        }, res => {
            failure(res);
        });
    }

    spaceInfo(success, failure) {
        this.dao.authenticatedTransaction('/spaceinfo', {}, resp => {
            success(JSON.parse(resp.text));
        }, res => {
            failure(res);
        });
    }

    data_noparse(success, failure) {
        this.dao.authenticatedTransaction('/data', {}, resp => {
            success(resp.text);
        }, res => {
            failure(res);
        });
    }
}

class AuthNetworkDAO {
    constructor(url_auth) {
        this.dao = new BasicNetworkDAO(url_auth, url_auth);
    }

    getDatabaseDAO(url) {
        return new DatabaseNetworkDAO(this.dao.clone(url));
    }

    userSet(user, success, failure) {
        this.dao.authenticatedTransaction('/user-set', {
            user: user
        }, resp => {
            success();
        }, res => {
            failure(res);
        });
    }

    userDelete(username, success, failure) {
        this.dao.authenticatedTransaction('/user-delete', {
            username: username
        }, resp => {
            success();
        }, res => {
            failure(res);
        });
    }

    userList(success, failure) {
        this.dao.authenticatedTransaction('/user-list', {}, resp => {
            success(JSON.parse(resp.text));
        }, res => {
            failure(res);
        });
    }

    version() {}

    setCredentials(username, password) {
        this.dao.setUsername(username);
        this.dao.setPassword(password);
    }

    setUsername(username) {
        this.dao.setUsername(username);
    }

    setPassword(password) {
        this.dao.setPassword(password);
    }

    setHashedPassword(hashedPassword) {
        this.dao.setHashedPassword(hashedPassword);
    }

    isLoginValid(success, failure) {
        this.dao.authenticatedTransaction('/is-login-valid', {}, resp => {
            success(JSON.parse(resp.text).user);
        }, res => {
            failure(res);
        });
    }
}

class BasicNetworkDAO {
    constructor(url_auth, url_service) {
        this.url_auth = url_auth;
        this.url_service = url_service;
    }

    clone(url_service) {
        var ret = new BasicNetworkDAO(this.url_auth, url_service);
        ret.setUsername(this.username);
        ret.hashed_password = this.hashed_password;

        return ret;
    }

    setUsername(username) {
        this.username = username;
    }

    setPassword(password) {
        this.hashed_password = sha512(password);
    }

    setHashedPassword(hashedPassword) {
        this.hashed_password = hashedPassword;
    }

    challenge(success, failure) {
        request.get(this.url_auth + '/challenge').end((err, res) => {
            if (err) {
                failure(err);
            } else {
                success(JSON.parse(res.text).challenge);
            }
        });
    }

    // TODO: one day come back and add a salt for protection
    //       against rainbow tables also while doing that go
    //       ahead and utilize a PKF to increase the computational
    //       difficulty to something realisticly high
    authenticatedTransaction(url, msg, success, failure) {
        let payload = JSON.stringify(msg);

        this.challenge(challenge => {
            let phash = sha512(payload);
            let secret = sha512(phash + challenge + this.username + this.hashed_password);
            let _msg = {
                auth: {
                    challenge: challenge,
                    chash: secret,
                    hash: phash
                },
                payload: payload
            };

            this.transaction(url, _msg, success, failure);
        }, res => {
            failure(res);
        });
    }

    transaction(url, msg, success, failure) {
        request.post(this.url_service + url).send(JSON.stringify(msg)).end((err, res) => {
            if (err) {
                failure(err);
            } else {
                success(res);
            }
        });
    }
}

/// <jsx-source-file>./websrc/app.jsx</jsx-source-file>
/// Bootstrap the application.
request.get('./get-config').end((err, res) => {
    if (err) {
        ReactDOM.render(React.createElement(
            Alert,
            null,
            'Uhoh! There was a failure when requesting the application configuration! Try again or wait a few minutes.'
        ), document.getElementById('root'));
    } else {
        const cfg = JSON.parse(res.text);

        ReactDOM.render(React.createElement(MDACSAuthLoginSwitcher.ReactComponent, {
            authUrl: cfg.authUrl,
            dbUrl: cfg.dbUrl
        }), document.getElementById('root'));
    }
});

