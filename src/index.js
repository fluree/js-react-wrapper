import React from 'react'
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';

let SHOULD_LOG = false;

// id counter to be used for various things that require unique identifiers
var idCounter = 0;
function nextId() {
  return idCounter++;
}

// a stateful connection id, incremented for each connection.
var connIdCounter = 0;

// map of each connection to an object containing keys:
// - ready (boolean)
// - user (user ident - two-tuple)
// - anonymous (boolean)
// - time - a time over-ride for all 'current' queries in the UI 
// - unauthorizedCallbacks - optionally provided functions to call when something is unauthorized
var connStatus = {};

// a map of each component ID to it's object
var componentIdx = {};

// for async calls to the worker, maintains the callback to execute with the result, when applicable
var callbackRegistry = {};

// holds worker reference globally. Don't initiate until first request for connection
var fqlWorker;

// worker queue
var workerQueue = [];

// worker initialized
var workerInitialized = false;


function addUnathorizedCallback(connId, cb) {
  const callbackID = Math.random();
  var callbackMap = connStatus[connId]['unauthorizedCallbacks'] || {};
  // tag callback function so we can easily locate and remove later.
  cb.__fluree_cb_id = callbackID;
  callbackMap[callbackID] = cb;
  connStatus[connId]['unauthorizedCallbacks'] = callbackMap;
  return true;
}

function removeUnauthorizedCallback(connId, cb) {
  const callbackID = cb.__fluree_cb_id;
  if (callbackID)
    delete connStatus[connId]['unauthorizedCallbacks'][callbackID];
  return !!callbackID;
}

function executeUnauthorizedCallbacks(connId, data) {
  if (connStatus[connId]['unauthorizedCallbacks'])
    for (var key in connStatus[connId]['unauthorizedCallbacks']) {
      const cb = connStatus[connId]['unauthorizedCallbacks'][key];
      cb(data);
    }
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
  var cb;

  SHOULD_LOG && console.log("Message from worker: " + JSON.stringify(msg));
  // console.log('returned message', msg)
  // if unauthorized response, trigger any registered unauthorizedCallbacks
  if (msg.data && msg.data.status === 401)
    executeUnauthorizedCallbacks(msg.conn, msg.data);

  switch (msg.event) {
    case "connInit":
      workerInitialized = true;
      workerQueue.forEach(messageWorker);
      workerQueue = [];
      break;

    case "connReset":
      const crResponse = msg.data || {};
      const crStatusCode = crResponse.status;
      if (connStatus[msg.conn]) {
        switch (crStatusCode) {
          case 200:
            connStatus[msg.conn].ready = true;
            break;
          case 401: // authorization error, need to log in
            connStatus[msg.conn].ready = false;
            connStatus[msg.conn].user = null;
            connStatus[msg.conn].anonymous = true;
            break;
          default:
            console.warn("Invalid connection reset status: " + JSON.stringify(crResponse));
            break;
        }
      }

      // check for callback
      cb = callbackRegistry[msg.ref];

      if (cb) {
        delete callbackRegistry[msg.ref];
        cb(msg, connStatus[msg.conn]);
      }
      break;

    case "connStatus":
      const response = msg.data || {};
      const statusCode = response.status;
      if (connStatus[msg.conn]) {
        switch (statusCode) {
          case 200:
            connStatus[msg.conn].ready = true;
            break;
          case 401: // authorization error, need to log in
            connStatus[msg.conn].ready = false;
            connStatus[msg.conn].user = null;
            connStatus[msg.conn].anonymous = true;
            break;
          default:
            console.warn("Invalid connection response status: " + JSON.stringify(response));
            break;
        }
      }

      // check for callback
      cb = callbackRegistry[msg.ref];

      if (cb) {
        delete callbackRegistry[msg.ref];
        cb(msg, connStatus[msg.conn]);
      }
      break;

    case "connClosed":
      cb = callbackRegistry[msg.ref];
      if (cb) {
        delete callbackRegistry[msg.ref];
        cb(msg.data);
      }
      break;

    case "connLogout":
      cb = callbackRegistry[msg.ref];
      if (cb) {
        delete callbackRegistry[msg.ref];
        cb(msg.data);
      }
      break;

    case "setState":
      const comp = componentIdx[msg.ref];

      if (comp) {
        comp.setState(msg.data);
      } else {
        SHOULD_LOG && console.warn("Component no longer registered: " + msg.ref);
      }

      const timeTravelWidget = componentIdx['TimeTravelWidget']
      if (timeTravelWidget && msg.ref !== "TimeTravelWidget") {
        if (timeTravelWidget.state.changedBlock) {
          timeTravelWidget.setState(state => ({ ...state, changedBlock: false }))
        } else {
          timeTravelWidget.setState(state => ({ ...state, shouldUpdate: true }))
        }
      }

      break;

    case "remoteInvoke":
      // check for a callback
      cb = callbackRegistry[msg.ref];
      if (cb) {
        delete callbackRegistry[msg.ref];
        cb(msg.data);
      }
      break;

    case "login":
      // if login successful, update conn's connStatus
      if (msg.data.status === 200) {
        connStatus[msg.conn].user = msg.data.result.username;
        connStatus[msg.conn].anonymous = false;
      }
      else {
        SHOULD_LOG && console.warn("Unable to authenticate: " + msg.data.message)
      }
      // if there was a callback passed to login(), execute
      cb = callbackRegistry[msg.ref];
      if (cb) {
        delete callbackRegistry[msg.ref];
        cb(msg.data);
      }
      break;

    default:
      SHOULD_LOG && console.warn("Unreconized event from worker: " + msg.event + ". Full message: " + JSON.stringify(msg));
      break;
  }
  return;
}

// we use a global to track connection state, get method for it
function isReady(connId) {
  return connStatus[connId].ready;
}

// we use a global to track connection state, get method for it
function isClosed(connId) {
  const connObj = connStatus[connId];
  return (connObj && Object.keys(connObj).length === 0);
}

function messageWorker(obj) {
  // console.log('invoke', obj.action, workerInitialized, workerQueue);

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

// Register a query, provide the connection, component ID, query and query options
function registerQuery(conn, compId, query, opts, forceUpdate) {
  const workerMsg = {
    conn: conn.id,
    action: "registerQuery",
    ref: compId,
    params: [compId, query, opts, forceUpdate]
  };
  if (connStatus[conn.id].ready) {
    return messageWorker(workerMsg);
  }
  else {
    if (connStatus[conn.id].wiObj === undefined) { connStatus[conn.id].wiObj = []; }
    connStatus[conn.id].wiObj.push(workerMsg);
  }
  return false;
}

// Remove query from registry
function unregisterQuery(conn, compId) {
  messageWorker({
    conn: conn.id,
    ref: compId,
    action: "unregisterQuery",
    params: [compId]
  });
}

function queryIsValid(query) {
  if (
    query !== null
    && typeof query === "object"
    && (query.select || query.selectOne || query.history || query.block)
    && (query.vars === undefined
      || typeof query.vars === "object") // null or object
  ) {
    return true;
  } else {
    return false;
  }
}

function workerErrorHandler(error) {
  console.error('Error loading Fluree web worker, check that it exists.');
  console.error(error);
  reportFatalError("Unable to load web worker, check console for error.");
  return;
}


/**
 * Create a new connection with settings object.
 * 
 * @param {Object} config - Connection Settings
 * @param {string} [config.servers] - List of server URIs separated by commas
 * @param {string} [config.ledger] - Ledger name, i.e. 'my/ledger'
 * @param {string} [config.workerUrl='/flureeworker.js.gz'] - URL for flureeworker.js.gz
 * @param {boolean} [config.saveSession=false] - Will save session (token) locally so won't need to re-authenticate if token isn't expired
 * @param {string} [config.token] - You can supply a JWT token yourself
 * @param {boolean} [config.compact=true] - Option to remove namespaces from predicates when the namespace is the same as the collection
 * @param {boolean} [config.keepAlive=false] - Option to attempt re-connection to the Fluree instance when web socket is no longer ping-able. 
 * @param {boolean} [config.log=false] - Set to true to see logging. Debug logging must be enabled with 'Verbose' in DevTools.
 * @param {string} [config.username] - Set username for login when you want to automatically trigger the login with connection initialization.
 * @param {string} [config.password] - Set password for login when you want to automatically trigger the login with connection initialization.
 */
function ReactConnect(config) {
  var safeConfig;
  if (typeof config === 'object' && config !== null) {
    // copy over all settings that can be serialized, else will fail web worker messaging
    safeConfig = JSON.parse(JSON.stringify(config));
  } else {
    safeConfig = { servers: config }
  }

  // initialize worker if not already done
  if (!fqlWorker) {
    fqlWorker = new Worker(safeConfig.workerUrl || "flureeworker.js");
    fqlWorker.onmessage = workerMessageHandler;
    fqlWorker.onerror = workerErrorHandler;
  }

  connIdCounter++;
  safeConfig.id = connIdCounter;
  safeConfig.log = safeConfig.log === true ? true : false;
  safeConfig.compact = safeConfig.compact === false ? false : true;
  safeConfig.keepAlive = safeConfig.keepAlive === true ? true : false;

  const connId = safeConfig.id;
  const localStorageKey = safeConfig.ledger + ':auth';
  const authData = localStorage.getItem(localStorageKey) || {};

  SHOULD_LOG = safeConfig.log;

  const conn = {
    id: safeConfig.id,
    isReady: () => isReady(connId),
    isClosed: () => isClosed(connId),

    login: function (username, password, options, cb) {
      return messageWorker({
        conn: safeConfig.id,
        action: "login",
        params: [username, password, options],
        cb: function (response) {
          if (response.status !== 200) {
            SHOULD_LOG && console.warn("Login failed: " + response.message)
          }
          if (cb && typeof cb === 'function') {
            if (response.status === 200 && options.rememberMe)
              localStorage.setItem(localStorageKey, response.result); // username, token
            cb(result);
          }
          // execute pending callbacks on connection object
          conn.executeCallbacks((response.status === 200 ? "authenticated" : "authentication error"));
        }
      });
    },

    newuser: function (username, password, options, cb) {
      return messageWorker({
        conn: safeConfig.id,
        action: "pw.newuser",
        params: [username, password, options],
        cb: function (response) {
          if (response.status !== 200) {
            SHOULD_LOG && console.warn("Login failed: " + response.message)
          }
          if (cb && typeof cb === 'function') {
            if (response.status === 200 && options.rememberMe)
              localStorage.setItem(localStorageKey, response.result); // username, token
            cb(result);
          }
          // execute pending callbacks on connection object
          conn.executeCallbacks((response.status === 200 ? "authenticated" : "authentication error"));
        }
      });
    },
    executeCallbacks: function (data) {
      var connectionStatus = connStatus[conn.id];
      if (connectionStatus.cb) {  // callbacks registered?
        connectionStatus.cb.forEach(compId => {
          var comp = componentIdx[compId];
          if (comp) {
            comp.setState(data);
          } else {
            SHOULD_LOG && console.warn("Component no longer registered: " + compId);
          }
        });
      }
      if (connectionStatus.wiObj) {  // workerInvoke objects registered?
        connectionStatus.wiObj.forEach(obj => {
          messageWorker(obj);
        })
      }
      // reset connection callbacks
      connStatus[conn.id].cb = [];
      connStatus[conn.id].wiObj = []
    },
    getUser: function () {
      return connStatus[connId].user;
    },
    getInstance: function () {
      return safeConfig.instance;
    },
    isAuthenticated: function () {
      if (connStatus[connId].anonymous === false) {
        return true;
      } else {
        return false;
      }
    },
    reset: function (cb) {
      connStatus[connId] = {
        ready: false,
        user: null,
        anonymous: true
      };
      return messageWorker({
        conn: connId,
        action: "reset",
        params: [],
        cb: cb
      });
    },
    logout: function (cb) {
      connStatus[connId] = {
        ready: false,
        user: null,
        anonymous: true
      };
      // if we stored credentials for 'rememberMe', clear them
      localStorage.removeItem(localStorageKey);
      return messageWorker({
        conn: connId,
        action: "logout",
        params: [],
        cb: cb
      });
    },
    close: function (cb) {
      // clear out connection state held locally
      connStatus[connId] = {};
      return messageWorker({
        conn: connId,
        action: "close",
        params: [],
        cb: cb
      });
    },

    // forceTime can be supplied a Date (converts to ISO string), an ISO date string, a block number, 
    // or null to clear an existing forceTime
    forceTime: function (t) {
      const t2 = (t instanceof Date) ? t.toISOString() : t; // convert to ISO-8601 string if Date object
      // update central conn status to use this t for any new components rendered
      connStatus[connId].forceTimeTo = t2;
      // update options of all mounted components to add or remove 't' as applicable
      const componentIds = Object.keys(componentIdx);
      componentIds.map(id => {
        let component = componentIdx[id];

        // option {ignoreForceTime: true} will cause this query to not be affected by forceTime()
        if (component.opts.ignoreForceTime != true) {
          component.opts.forceTime = t2;
          registerQuery(component.conn, component.id, component.query, component.opts);
        }
      })
    },
    // returns the current forceTime value.
    getForceTime: function () {
      return connStatus[connId].forceTimeTo;
    },
    unauthorizedCallback: {
      add: function (cb) { addUnathorizedCallback(connId, cb) },
      remove: function (cb) { removeUnauthorizedCallback(connId, cb) }
    }
  };

  // initialize connection status, set ready to false
  connStatus[connId] = {
    ready: false,
    // if we already passed in a token, can also pass in the user/anonymous flags for storing
    user: safeConfig.user,
    anonymous: safeConfig.anonymous,
    // optional unauthorizedCallback will be called when a request is unauthorized
    unauthorizedCallback: config.unauthorizedCallback,
    // when forceTime (time travel) called, store current value here for newly registered components to use it
    forceTimeTo: null
  };

  // initiate our connection in the web worker
  messageWorker({
    conn: 0, // conn 0 means not connection specific
    action: "connect",
    params: [safeConfig],
    cb: function cb(msg, connStatus) {

      var response = msg.data || {};
      var data = { status: (response.status === 200 ? "loading" : "connection error") };

      if (safeConfig.user) {  // Authenticate?
        conn.login(safeConfig.user, safeConfig.password, undefined, safeConfig.rememberMe);
      }
      else {
        conn.executeCallbacks(data);
      }
    }
  });

  // return connection object
  return conn;
}


function getDisplayName(component) {
  return component.displayName || component.name || "Component";
}

// wraps react components that need a particular connection, making the
// connection available via the context to children
class FlureeProvider extends React.Component {
  static propTypes = {
    conn: PropTypes.object.isRequired
  };

  static childContextTypes = {
    conn: PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props, context);

    if (!props.conn) {
      throw "FlureeProvider was not provided a conn prop, which should be a connection object."
    }

    this.conn = props.conn;
  };

  getChildContext() {
    return {
      conn: this.conn
    }
  };

  render() {
    return React.Children.only(this.props.children);
  };
}


// given a query and options, returns a vector of variables that
// were not provided via options. We use this to look for the variables
// in props
function getMissingVars(flurQL) {
  const vars = flurQL.vars ? Object.keys(flurQL.vars) : [];
  // return array of vars that have null as value
  return vars.filter(x => flurQL.vars[x] === null).map(x => x.substr(1));
}

// The query.vars may get manipulated, make sure we have a proper
// copy for each instantiation
function deepCopyQuery(query) {
  if (query === null) {
    return null;
  } else {
    var copiedQuery = Object.assign({}, query); // shallow copy
    var copiedVars = copiedQuery.vars ? Object.assign({}, copiedQuery.vars) : null;
    copiedQuery.vars = copiedVars;
    return copiedQuery;
  }
}

function wrapComponent(WrappedComponent, query, opts = {}) {
  const flurQLDisplayName = `Fluree(${getDisplayName(WrappedComponent)})`;

  class FlurQL extends React.Component {
    static displayName = flurQLDisplayName;
    static WrappedComponent = WrappedComponent;
    static contextTypes = {
      conn: PropTypes.object.isRequired
    };

    constructor(props, context) {
      super(props, context);
      this.conn = context.conn;
      this.id = nextId();
      this.queryIsFunction = (typeof query === "function")
      this.queryParsed = deepCopyQuery(this.queryIsFunction ? query(props, this.context) : query);
      this.isValidQuery = this.queryParsed && queryIsValid(this.queryParsed);
      this.missingVars = this.isValidQuery && this.queryParsed.vars ? getMissingVars(this.queryParsed) : []; // list of vars we need to check props for
      this.opts = opts
      this.state = {
        result: this.queryParsed.selectOne ? null : [], // default query result [] unless selectOne query
        error: this.queryParsed && !this.isValidQuery ? { status: 400, message: "Query is not valid: " + JSON.stringify(this.queryParsed) } : null,
        warning: this.queryParsed ? null : "No query yet, waiting...",
        status: "pending",
        loading: true
      };

      if (!this.conn) {
        throw "Could not find a Fluree connection (conn) in the context of " + flurQLDisplayName + ".";
      }

      // if the connection currently has a 'forceTime' set, apply it to this component for queries
      if (this.conn.forceTimeTo) {
        this.opts.forceTime = this.conn.forceTimeTo;
      }
    }

    componentDidMount() {
      // get any missing vars from props and update this.opts with them
      if (this.missingVars.length !== 0) {
        this.missingVars.forEach((v) => {
          this.queryParsed.vars["?" + v] = this.props[v];
        });
      }
      // register this component for later re-render calling, etc.
      componentIdx[this.id] = this;

      if (this.queryParsed && this.isValidQuery) {
        registerQuery(this.conn, this.id, this.queryParsed, this.opts);
      }
    }

    componentWillUnmount() {
      unregisterQuery(this.conn, this.id);
      delete componentIdx[this.id];
    }

    componentDidUpdate(prevProps, prevState) {
      if (this.queryIsFunction) {
        this.queryParsed = deepCopyQuery(query(this.props, this.context));
        this.isValidQuery = queryIsValid(this.queryParsed);
        if (this.queryParsed && this.isValidQuery) {
          registerQuery(this.conn, this.id, this.queryParsed, this.opts);
        }
      } else {
        // check if any of the missing vars changed with the new props
        let didMissingVarsChange = false;

        for (let i = 0; i < this.missingVars.length; i++) {
          const varName = this.missingVars[i];
          if (prevProps[varName] !== this.props[varName]) {
            didMissingVarsChange = true;
          }
        }

        if (didMissingVarsChange === true) {
          this.missingVars.forEach((v) => {
            this.queryParsed.vars["?" + v] = this.props[v];
          });
          registerQuery(this.conn, this.id, this.queryParsed, this.opts);
        }
      }
    }

    render() {
      const result = this.state.result;
      const data = {
        query: this.queryParsed, // provide query to help debugging if using vars or a query function
        id: this.id,
        result: result,
        forceUpdate: function () {
          if (this.queryParsed && this.isValidQuery)
            registerQuery(this.conn, this.id, this.queryParsed, this.opts, true);
        }.bind(this),
        error: this.state.error,
        warning: this.state.warning,
        status: this.state.status,
        loading: !(this.state.status === "loaded" || this.state.status === "error"),
        // helper get function to get nested results without raising an exception
        get: function get(keySeq, defaultValue) {
          keySeq = Array.isArray(keySeq) ? keySeq : [keySeq];
          let obj = result;
          let idx = 0;
          const length = keySeq.length;

          while (obj != null && idx < length) {
            obj = obj[keySeq[idx++]];
          }

          return (idx == length && obj != null) ? obj : ((defaultValue === undefined) ? obj : defaultValue);
        }
      };

      const childProps = Object.assign({}, this.props, { data: data });

      return React.createElement(WrappedComponent, childProps);
    }
  }

  return hoistNonReactStatics(FlurQL, WrappedComponent, {});
}


function flureeQL(query, opts) {
  return function (WrappedComponent) {
    return wrapComponent(WrappedComponent, query, opts);
  }
}


export { ReactConnect, FlureeProvider, flureeQL };
