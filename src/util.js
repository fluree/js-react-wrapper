// some utilities for working with Fluree

// given a query and options, returns a vector of variables that
// were not provided via options. We use this to look for the variables
// in props
function getMissingVars(flurQL) {
    const vars = flurQL.vars ? Object.keys(flurQL.vars) : [];
    // return array of vars that have null as value
    return vars.filter(x => flurQL.vars[x] === null).map(x => x.substr(1));
}


// compares two queries quickly, possible to have some false positives
function queryCompare(q1, q2) {
    JSON.stringify(q1) === JSON.stringify(q2)
}

// takes a quick look at a query and provides a default response object, or null
// that should make having a pending result break less code.
// A query that should result in an array of results will return [] (so result.map() will not throw)
// A query that will return a single result as a map will return {} (so result.x will not throw)
// Other queries will return null
function defaultResult(query) {
    if (query.select) {
        // select query
        return [];
    } else if (Array.isArray(query.selectOne)) {
        // selectOne: ["?x", "?y"] -- analytical query
        return null;
    } else if (typeof query.selectOne === "object") {
        // selectOne: {} -- graph result
        return {};
    } else if (typeof query.selectOne === "string") {
        // selectOne: "?x" -- single scalar value
        return null;
    } else {
        // assume multi-query
        return {}
    }
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


export { getMissingVars, deepCopyQuery, queryIsValid, queryCompare, defaultResult }
