import React from 'react'
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';
import FlureeClient from './FlureeClient';
import { queryIsValid, getMissingVars, deepCopyQuery } from './util';

// id counter to be used for various things that require unique identifiers
var idCounter = 0;
function nextId() {
  return idCounter++;
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

    register() {
      this.conn.registerQuery(this.id, this.queryParsed, this.opts, this.setState.bind(this));
      return;
    }

    forceUpdate() {
      this.conn.forceUpdate(this.id);
      return;
    }

    componentDidMount() {
      // get any missing vars from props and update this.opts with them
      if (this.missingVars.length !== 0) {
        this.missingVars.forEach((v) => {
          this.queryParsed.vars["?" + v] = this.props[v];
        });
      }

      if (this.queryParsed && this.isValidQuery) {
        this.register();
      }
    }

    componentWillUnmount() {
      this.conn.unregisterQuery(this.id);
      return;
    }

    componentDidUpdate(prevProps, prevState) {
      if (this.queryIsFunction) {
        this.queryParsed = deepCopyQuery(query(this.props, this.context));
        this.isValidQuery = queryIsValid(this.queryParsed);
        if (this.queryParsed && this.isValidQuery) {
          this.register();
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
          this.register();
        }
      }
    }

    render() {
      const result = this.state.result;
      const data = {
        query: this.queryParsed, // provide query to help debugging if using vars or a query function
        id: this.id,
        result: result,
        forceUpdate: this.forceUpdate.bind(this),
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

const ReactConnect = FlureeClient;

export { ReactConnect, FlureeClient, FlureeProvider, flureeQL };
