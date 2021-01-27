import React from 'react';
import { render } from '@testing-library/react';
//import 'jsdom-global/register'
import 'jsdom-worker'
import FlureeConn from './FlureeConn';

test('it loads', () => {
    const myconn = new FlureeConn({ workerUrl: "" });
});

test('it initializes the worker', () => {
    const blob = new Blob([""]);
    const url = window.URL.createObjectURL(blob);
    const myconn = new FlureeConn({ workerUrl: url });
    myconn.worker.postMessage("hello");
    console.log(myconn.callBacks);
});