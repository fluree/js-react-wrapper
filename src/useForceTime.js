import React, { useContext } from 'react';
import ConnContext from './ConnContext';

// React hook to force time travel, sets forceTime to provided 't',
// always returns current forceTime value;
// If t is null, will just return current forceTime value.

function useForceTime() {
    const { conn } = useContext(ConnContext);
    return [conn.getForceTime(), conn.forceTime.bind(conn)]
}

export default useForceTime;
