import React from 'react';
import { render } from '@testing-library/react';
//import 'jsdom-global/register'
import 'jsdom-worker'
import FlureeConn from './FlureeConn';

test('it loads', () => {
    const myconn = new FlureeConn({});

});