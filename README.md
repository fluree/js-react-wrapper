# @fluree/js-react-wrapper

> Fluree wrapper for React apps

[![NPM](https://img.shields.io/npm/v/@fluree/js-react-wrapper.svg)](https://www.npmjs.com/package/@fluree/js-react-wrapper) 

## Install

```bash
npm install --save @fluree/js-react-wrapper
```

## Usage

```jsx
import React, { Component } from 'react'

import { ReactConnect, FlureeProvider, flureeQL } from '@fluree/js-react-wrapper'

const flureeConnection = ReactConnect({
  servers: "http://localhost:8090", // point to URL of running Fluree transactor or peer server
  ledger: "fluree/demo", // default ledger (database) on the server to use for this connection
  workerUrl: "path/to/flureeworker.js", // location of the fluree web worker javascript file
});

const App = () => {
  return (
    <FlureeProvider conn={flureeConnection}>
      <div>
        <p>Example of rendering a React componet with Fluree data:</p>
        <ShowPredicatesFluree></ShowPredicatesFluree>
      </div>
    </FlureeProvider >
  );
}

// PredicateItem is a standard React component that will display a single predicate item from the db's schema
function PredicateItem({ predicate }) {
  return (
    <p key={predicate.name}>
      <b>{predicate.name}</b> {predicate.doc}
      <br />type: {predicate.type}
      <br />unique?: {predicate.unique === true ? "true" : "false"}
      <br />index?: {predicate.index === true ? "true" : "false"}
      <br />multi-cardinality?: {predicate.multi === true ? "true" : "false"}
      <br />component?: {predicate.component === true ? "true" : "false"}
    </p>
  )
}

// ShowPredicates is a standard React component that will display a list of Predicates passed in
// as the React prop of data.result (Fluree injects all query data into a component's 'data' prop)
function ShowPredicates({ data }) {
  const predicateNames = data.result.map(predicate => <PredicateItem predicate={predicate} />);
  return (
    <div>
      <p>Predicate Names are:</p>
      {predicateNames}
    </div>
  );
}

// wrap the ShowPredicates standard React component with a Fluree query, it will inject the status
// and results as the 'data' prop. Render this component instead of ShowPredicates. This will also
// make ShowPredicates "real-time", if there are any database updates that would affect this
// component's query results it will automatically re-render
const ShowPredicatesFluree = flureeQL(
  {
    select: ["*"],
    from: "_predicate"
  }
)(ShowPredicates);


export default App;

```

## License

MIT © [Fluree PBC](https://github.com/fluree)
