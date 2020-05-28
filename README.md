# @fluree/react-wrapper

> Fluree JavaScript DB wrapper for React apps

[![NPM](https://img.shields.io/npm/v/@fluree/react-wrapper.svg)](https://www.npmjs.com/package/@fluree/react-wrapper) 

## Install

```bash
npm install --save @fluree/react-wrapper
```

## Usage

```jsx
import React, { Component } from 'react'

import { FlureeConnect, FlureeProvider, flureeQL } from '@fluree/js-react-wrapper'

const flureeConnection = new FlureeConnect({
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

## Query types

Queries passed to flureeQL can either be:

1. A standard query as in the example above
2. A query with variables that can be brought in dynamically by the mounted component
3. A function that is passed the component's props and context and must return a valid query


### Standard queries

```jsx

// standard React component (knows nothing of Fluree)
function FavoriteColor({ data }) {
  // Fluree injects `data` object into props, query result is at data.result
  return (
    <p>Favorite color for {data.result.username} is: {data.result.favoriteColor}</p>
  );
}

// wrap standard React component with Fluree query, results will be injected
// 'basic' style query shown below
const FavoriteColorFluree = flureeQL(
  {
    selectOne: ["username", "favoriteColor"],
    from: ["_user/username", "bob@example.com"]
  }
)(FavoriteColor);

// identical query as above, but with 'analytical' query style
const FavoriteColorFlureeAlt = flureeQL(
  {
    selectOne: {"?s": ["username", "favoriteColor"]},
    where: [["?s", "_user/username", "bob@example.com"]]
  }
)(FavoriteColor);

```

### Queries with variables

Queries that will be used in multiple contexts should use 
[query variables](https://docs.flur.ee/docs/query/analytical-query#variables), 
allowing the query to be reusable (this also makes query parsing slightly more efficient).

```jsx

// for any query vars that are null, The React component's props will 
// be examined to see if there is a property with the same name as the missing
// var (minus the leading '?') and it will be substituted.
const FavoriteColorFluree = flureeQL(
  {
    selectOne: {"?s": ["username", "favoriteColor"]},
    where: [["?s", "_user/username", "?username"]], // ?username here is a query variable
    vars: {"?username": null} // note ?username is null, will look at React props for presence of 'username'
  }
)(FavoriteColor);

// this parent component will display our Fluree-enabled component
function ParentComponent() {
  return (
    <div>
      <p>Two users, same reusable component with different username property:</p>
      <FavoriteColorFluree username="bob@example.com"/>
      <FavoriteColorFluree username="alice@example.com"/>
    <div>
  );
}

```

### Queries using a function

The third query alternative is to use a function to return a query instead of specifying it directly.
The function will be called with two arguments, the React props and context 
(just like the constructor function of a React.Component).

```jsx
// Same example as above, but query written as a function

function faveColorQuery(props, context) {
  // return any valid query
  return   {
    selectOne: {"?s": ["username", "favoriteColor"]},
    where: [["?s", "_user/username", props.username]] // we can embed the value directly in the query
  }
}

const FavoriteColorFluree = flureeQL(faveColorQuery)(FavoriteColor);

// this parent component will display our Fluree-enabled component
function ParentComponent() {
  return (
    <div>
      <p>Two users, same reusable component with different username property:</p>
      <FavoriteColorFluree username="bob@example.com"/>
      <FavoriteColorFluree username="alice@example.com"/>
    <div>
  );
}
```


## License

MIT © [Fluree PBC](https://github.com/fluree)
