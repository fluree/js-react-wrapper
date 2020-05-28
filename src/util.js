// some utilities for working with Fluree

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


export { getMissingVars, deepCopyQuery, queryIsValid }
