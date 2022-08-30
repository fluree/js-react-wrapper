# @fluree/react-wrapper

> Fluree JavaScript DB wrapper for React apps

[![NPM](https://img.shields.io/npm/v/@fluree/react-wrapper.svg)](https://www.npmjs.com/package/@fluree/react-wrapper)

## Install

```bash
npm install --save @fluree/react-wrapper
```

## Usage

> flureeworker.js is included in the module src `./node_modules/@fluree/js-react-wrapper/src/flureeworker.js`
> to be put in your public folder for the web worker to function

```jsx
import React, { Component } from "react";

import {
  FlureeConnect,
  FlureeProvider,
  useFlureeQuery
} from "@fluree/js-react-wrapper";

const flureeConnection = new FlureeConn({
  servers: "http://localhost:8090", // point to URL of running Fluree transactor or peer server
  ledger: "fluree/demo", // default ledger (database) on the server to use for this connection
  workerUrl: "/flureeworker.js" // location of the fluree web worker javascript file
});

const App = () => {
  return (
    <FlureeProvider conn={flureeConnection}>
      <div>
        <p>Example of rendering a React componet with Fluree data:</p>
        <ShowPredicatesFluree></ShowPredicatesFluree>
      </div>
    </FlureeProvider>
  );
};

// PredicateItem is a standard React component that will display a single predicate item from the db's schema
function PredicateItem({ predicate }) {
  return (
    <p key={predicate.name}>
      <b>{predicate.name}</b> {predicate.doc}
      <br />
      type: {predicate.type}
      <br />
      unique?: {predicate.unique === true ? "true" : "false"}
      <br />
      index?: {predicate.index === true ? "true" : "false"}
      <br />
      multi-cardinality?: {predicate.multi === true ? "true" : "false"}
      <br />
      component?: {predicate.component === true ? "true" : "false"}
    </p>
  );
}

// ShowPredicates is a standard React component that will display a list of Predicates passed in
// as the React prop of data.result (Fluree injects all query data into a component's 'data' prop)
function ShowPredicates() {
  // use the `useFlureeQuery` react hook fetch to the data.
  const data = useFlureeQuery({ select: ["*"], from: "_predicate" });

  const predicateNames = data.result.map(predicate => (
    <PredicateItem predicate={predicate} />
  ));
  return (
    <div>
      <p>Predicate Names are:</p>
      {predicateNames}
    </div>
  );
}

export default App;
```

## Query types

Queries passed to the `useFlureeQuery` hook can either be:

1. A standard query as in the example above
2. A query with variables that can be brought in dynamically by the mounted component
3. A function that is passed the component's props and context and must return a valid query

### Standard queries

```jsx
// standard React component (knows nothing of Fluree)
function FavoriteColor() {
  const data = useFlureeQuery({
    selectOne: ["username", "favoriteColor"],
    from: ["_user/username", "bob@example.com"]
  });

  return (
    <p>
      Favorite color for {data.result.username} is: {data.result.favoriteColor}
    </p>
  );
}
```

### Queries with variables

Queries that will be used in multiple contexts should use
[query variables](https://docs.flur.ee/docs/query/analytical-query#variables),
allowing the query to be reusable (this also makes query parsing slightly more efficient).

```jsx

function FavoriteColor({ username }) {
  const data = useFlureeQuery({
    selectOne: {"?s": ["username", "favoriteColor"]},
    where: [["?s", "_user/username", "?username"]], // ?username here is a query variable
    vars: {"?username": username }
  });

  return (
    <p>
      Favorite color for {data.result.username} is: {data.result.favoriteColor}
    </p>
  );
}

// this parent component will display our Fluree-enabled component
function ParentComponent() {
  return (
    <div>
      <p>Two users, same reusable component with different username property:</p>
      <FavoriteColor username="bob@example.com"/>
      <FavoriteColor username="alice@example.com"/>
    </div>
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
      <FavoriteColor username="bob@example.com"/>
      <FavoriteColor username="alice@example.com"/>
    </div>
  );
}
```

## License

MIT © [Fluree PBC](https://github.com/fluree)
