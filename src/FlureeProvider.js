import React from 'react';
import ConnContext from './ConnContext';


// wraps react components that need a particular connection, making the
// connection available via the context to children

function FlureeProvider({ conn, children }) {
    if (!conn) {
        throw "FlureeProvider was not provided a conn prop, which should be a connection object."
    }

    return (
        <ConnContext.Provider value={{ conn: conn }}>
            {children}
        </ConnContext.Provider >
    );
}

export default FlureeProvider;
