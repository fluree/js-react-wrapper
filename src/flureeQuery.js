import React, { useContext, useEffect, useReducer } from 'react';
import ConnContext from './ConnContext';
import { defaultResult } from './util';

// id counter to be used for various things that require unique identifiers
var idCounter = 0;
function nextId() {
    return idCounter++;
}

function getResult(result) {
    return function get(keySeq, defaultValue) {
        keySeq = Array.isArray(keySeq) ? keySeq : [keySeq];
        let obj = result;
        let idx = 0;
        const length = keySeq.length;

        while (obj != null && idx < length) {
            obj = obj[keySeq[idx++]];
        }

        return (idx == length && obj != null) ? obj : ((defaultValue === undefined) ? obj : defaultValue);
    }
}

function updateReducer(state, update) {
    var newState = Object.assign({}, state, update);
    if (newState.status === "loaded")
        newState.loading = false;
    return newState;
}

function flureeQuery(query, opts) {
    const { conn } = useContext(ConnContext);

    // if any opts exist, make sure they are merged
    if (query.opts || opts) {
        query.opts = Object.assign({}, query.opts, opts);
    }

    const [response, updateResponse] = useReducer(updateReducer, {
        query: query,
        loading: true,
        error: null,
        warning: null,
        result: defaultResult(query),
        get: getResult()
    });

    // imperfect but fast comparison values for useEffect() to determine if we need to re-run query - false positive is OK
    const useEffectCmp = [JSON.stringify(query)]

    console.log("useEffectCmp", useEffectCmp);

    useEffect(() => {
        const id = nextId(); // id is used to track each query per component. When queries are upated, new ids are issued and old ids are unsubscribed
        conn.registerQuery(id, query, updateResponse);

        return function cleanup() {
            conn.unregisterQuery(id);
        };
    }, useEffectCmp);

    return response;
}

export default flureeQuery;
