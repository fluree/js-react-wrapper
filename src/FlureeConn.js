
// map of all connection objects with the connection id as key.
// used to relay messages from web worker back to the respective connection.
var connections = {}

let SHOULD_LOG = false;

// for async calls to the worker, maintains the callback to execute with the result, when applicable
var callbackRegistry = {};

// holds worker reference globally. Don't initiate until first request for connection
var fqlWorker;

// worker queue
var workerQueue = [];

// worker initialized
var workerInitialized = false;

var idCounter = 1;
function nextId() {
    return idCounter++;
}

// in the case of a fatal error (i.e. cannot load web worker), report error to all components
function reportFatalError(msg) {
    Object.values(componentIdx).map(component => {
        component.setState({
            error: msg,
            status: "error",
            loading: false
        })
    })
    return;
}

// worker.onmessage handler

function workerMessageHandler(e) {
    const msg = e.data;
    const conn = connections[msg.conn];

    SHOULD_LOG && console.log("Message from worker: " + JSON.stringify(msg));

    switch (msg.event) {
        case "connInit": // TODO - change to workerInit, which is more correct.
            workerInitialized = true;
            workerQueue.forEach(messageWorker);
            workerQueue = [];
            break;

        // connection-specific messages:
        case "connStatus": // response from initial connection attempt with remote server(s)
            conn.handleConnStatus(msg.data);
            break;

        case "connReset": // confirmation that connection was reset
            conn.handleConnReset(msg.data);
            break;

        case "connClosed": // something caused the connection to close
            if (conn)
                conn.handleConnClosed(msg.data);
            break;

        case "setState": // query results for a component were updated
            if (conn) {
                conn.handleQueryUpdate(msg);
            } else {
                console.warn("Received query update for connection id: " + msg.conn + " which is no longer present.")
            }
            break;

        case "setTransact": // transaction response
            if (conn) {
                conn.handleTransactUpdate(msg);
            } else {
                console.warn("Received transaction update for connection id: " + msg.conn + " which is no longer present.")
            }
            break;

        case "login":
            if (conn) {
                conn.handleLoginResponse(msg);
            } else {
                console.warn("Received login response for connection id: " + msg.conn + " which is no longer present.")
            }
            break;

        case "pwGenerate":
            if (conn) {
                conn.handleLoginResponse(msg);
            } else {
                console.warn("Received login response for connection id: " + msg.conn + " which is no longer present.")
            }
            break;

        default:
            console.warn("Unreconized event from worker: " + msg.event + ". Full message: " + JSON.stringify(msg));
            break;
    }
    return;
}

function workerErrorHandler(error) {
    console.error('Error loading Fluree web worker, check that it exists.');
    console.error(error);
    reportFatalError("Unable to load web worker, check console for error.");
    return;
}

function messageWorker(obj) {

    if (obj.cb) {
        if (typeof obj.cb === 'function') {
            obj.ref = obj.ref || nextId();
            callbackRegistry[obj.ref] = obj.cb;
        } else {
            console.warn('Callback supplied was not a function:', obj);
        }
        delete obj.cb;
    }

    if (workerInitialized) {
        fqlWorker.postMessage(obj);
    } else {
        workerQueue.push(obj);
    }

    return true;
}

function initializeConnection(conn) {
    // initialize worker if not already done
    if (!fqlWorker) {
        fqlWorker = new Worker(conn.workerUrl);

        fqlWorker.onmessage = workerMessageHandler;
        fqlWorker.onerror = workerErrorHandler;
    }

    // register connection object in global state
    connections[conn.id] = conn;
    const workerConfig = {
        id: conn.id,
        servers: conn.servers,
        ledger: conn.ledger,
        log: conn.log,
        compact: conn.compact,
        private: conn.private,
        username: conn.username,
        password: conn.password
    };

    // initiate our connection in the web worker
    messageWorker({
        conn: conn.id,
        action: "connect",
        params: [workerConfig]
    });
    return true;
}

/**
 * Create a new connection with settings object.
 * 
 * @param {Object} config - Connection Settings
 * @param {string} [config.servers] - List of server URIs separated by commas
 * @param {string} [config.ledger] - Ledger name, i.e. 'my/ledger'
 * @param {string} [config.workerUrl='flureeworker.js'] - URL for flureeworker.js.gz
 * @param {string} [config.token] - You can supply a JWT token yourself
 * @param {boolean} [config.compact=true] - Option to remove namespaces from predicates when the namespace is the same as the collection
 * @param {boolean} [config.keepAlive=false] - Option to attempt re-connection to the Fluree instance when web socket is no longer ping-able. 
 * @param {boolean} [config.log=false] - Set to true to see logging. Debug logging must be enabled with 'Verbose' in DevTools.
 * @param {string} [config.username] - Set username for login when you want to automatically trigger the login with connection initialization.
 * @param {string} [config.password] - Set password for login when you want to automatically trigger the login with connection initialization.
 * @param {connErrorCallback} [config.errorCallback] - called with an object/map containing error information related to the connection
 */
class FlureeConn {
    constructor(config) {
        // config settings
        this.servers = config.servers;
        this.ledger = config.ledger;
        this.log = config.log === true ? true : false;
        this.keepAlive = config.keepAlive === true ? true : false;
        this.compact = config.compact === false ? false : true;
        this.workerUrl = config.workerUrl;
        this.errorCallback = config.errorCallback ? config.errorCallback : (error) => console.log(error);
        // config auth-related options:
        this.token = config.token; // if logging in, token will be filled by successful login process
        this.username = config.username;
        this.password = config.password;
        this.rememberMe = config.rememberMe; // TODO - needed any longer?
        this.user = config.user; // TODO - don't know if this is needed, maybe pending auth response

        // internal state
        this.id = nextId();
        this.ready = false;
        this.closed = false; // flag to indicate if connection was closed
        this.forceTimeTo = null;
        this.callBacks = {}; // map of ids to callbacks
        this.queries = {}; // map of ids to queries
        this.queue = {}; // queue queries until connection is ready
        this.worker = fqlWorker;
        return initializeConnection(this);
    }

    processQueue() { // process any queries held in the queue
        const ids = Object.keys(this.queue);
        ids.forEach(id => {
            // queue is a list of ready to go worker messages, just process each of them
            const workerMsg = this.queue[id];
            messageWorker(workerMsg);
        });
        this.queue = {};
        return;
    }

    // called after connection is initialized, check status and report errors if not 200
    handleConnStatus(data) {
        const { status, message } = data;
        if (status === 200) {
            this.ready = true;
            this.processQueue();
        } else {
            this.errorCallback(data);
        }
        return;
    }

    // response from issuing a connection reset
    handleConnReset(data) {
        const { status, message } = data;
        if (status === 200) {
            this.ready = true;
            this.processQueue();
        } else {
            this.errorCallback(data);
        }
        return;
    }

    // something prompted the connection to close
    handleConnClosed(data) {
        this.ready = false;
        this.closed = true;
        this.errorCallback(data);
        return;
    }

    // called by the message worker handler whenever there is an update related to a registered query
    handleQueryUpdate(message) {
        const { ref, data } = message;
        const cb = this.callBacks[ref];
        if (cb) {
            cb(data);
        } else {
            this.log && console.log("Received update for component id: " + ref + ", but no longer registered.");
        }
        return;
    }

    handleTransactUpdate(message) {
        const { ref, data } = message;
        const cb = this.callBacks[ref];
        if (cb) {
            cb(data);
            delete this.callBacks[ref]; // transaction callbacks are one-time use, delete
        }
        return;
    }

    handleLoginResponse(message) {
        const { ref, data } = message;
        const { status, result } = data;
        // if login successful, update conn's connStatus
        if (status === 200) {
            this.token = result.token;
            if (options.rememberMe) {
                localStorage.setItem(localStorageKey, result); // username, token
            }
        }
        else {
            this.log && console.warn("Unable to authenticate: " + msg.data.message)
        }
        // if there was a callback passed to login(), execute
        cb = callbackRegistry[ref];
        if (cb) {
            delete callbackRegistry[ref];
            cb(data);
        }
        return;
    }

    transact(transaction, cb) {
        console.warn("Transaction", transaction)
        const tempRef = nextId();
        const workerMsg = {
            conn: this.id,
            action: "transact",
            ref: tempRef,
            params: [transaction]
        };
        console.warn("Worker Message", workerMsg);
        if (cb)
            this.callBacks[tempRef] = cb;

        if (this.ready) {
            console.warn("messaging worker");
            return messageWorker(workerMsg);
        } else {
            this.queue[ref] = workerMsg;
        }


    }

    login(username, password, options, cb) {
        const tempRef = nextId();
        this.username = username;
        this.callBacks[tempRef] = cb;

        return messageWorker({
            conn: this.id,
            action: "login",
            ref: tempRef,
            params: [username, password, options]
        });
    }

    // TODO - the params for newuser do not map to current Fluree - need to fix one or other
    newuser(username, password, options, cb) {
        const tempRef = nextId();
        this.username = username;
        this.callBacks[tempRef] = cb;

        return messageWorker({
            conn: this.id,
            action: "pwGenerate",
            ref: tempRef,
            params: [username, password, options]
        });
    }

    // accepts component Id plus map of: query (query map), opts (options map), and update (update function to call when updates avail)
    registerQuery(id, flureeQL, cb, forceUpdate) {
        this.callBacks[id] = cb; // set callback function for updates
        this.queries[id] = flureeQL;
        const workerMsg = {
            conn: this.id,
            action: "registerQuery",
            ref: id,
            params: [id, flureeQL, forceUpdate]
        };

        if (this.ready) {
            return messageWorker(workerMsg);
        } else if (this.closed) { // conneciton has been closed
            // TODO - callback with exception that connection has been closed
            return false
        } else { // connection isn't ready yet, queue message
            this.queue[id] = workerMsg; // key by component id so updates prior to being ready will always contain latest query
            return false;
        }
    }

    unregisterQuery(id) {
        delete this.callBacks[id];
        delete this.queries[id];
        const workerMsg = {
            conn: this.id,
            ref: id,
            action: "unregisterQuery",
            params: [id]
        };

        if (this.ready) {
            messageWorker(workerMsg);
        } else {
            delete this.queue[id]; // in case query was in queue
        }
        return true
    }

    // TODO - force an update to a specific query
    forceUpdate(id) {

    }

    // TODO - should probably allow updating of user, and then clear cache and re-try all queries.
    // this is effectively the same as a logout, but should be a true reset
    reset(cb) {
        this.ready = false;
        return messageWorker({
            conn: connId,
            action: "reset",
            params: [],
            cb: cb
        });
    }

    logout(cb) {
        this.ready = false;
        this.username = null;
        // if we stored credentials for 'rememberMe', clear them
        localStorage.removeItem(localStorageKey);
        return messageWorker({
            conn: this.id,
            action: "logout",
            params: [],
            cb: cb
        });
    }

    close(cb) {
        this.closed = true;
        // clear out connection object held in global
        delete connections[this.id];
        return messageWorker({
            conn: this.id,
            action: "close",
            params: []
        });
    }

    // forceTime can be supplied a Date (converts to ISO string), an ISO date string, a block number, 
    // or null to clear an existing forceTime
    forceTime(t) {
        const t2 = (t instanceof Date) ? t.toISOString() : t; // convert to ISO-8601 string if Date object
        // only update if new time is different than existing forcetime
        if (t2 !== this.forceTimeTo) {
            // update to use this t for any new components rendered
            this.forceTimeTo = t2;
            // update options of all mounted components to add or remove 't' as applicable
            const componentIds = Object.keys(this.queries);
            componentIds.forEach(id => {
                const cb = this.callBacks[id];
                var query = this.queries[id];
                if (!query.opts) {
                    query.opts = {};
                }

                // option {ignoreForceTime: true} will cause this query to not be affected by forceTime()
                if (!query.opts.ignoreForceTime) {
                    query.opts.forceTime = t2;
                    // re-register query, will reissue it to webworker database
                    this.registerQuery(id, query, cb);
                }
            });
        }
    }

    // returns current forceTime value, if set.
    getForceTime() {
        return this.forceTimeTo;
    }
}

/**
 * This callback is displayed as a global member.
 * @callback connErrorCallback
 * @param {Object} error
 * @param {string} [error.status] - Status code of error, roughly mimicks error 400/500 http status codes
 * @param {string} [error.message] - Error Message
 */


export default FlureeConn;
export { fqlWorker, workerQueue };
