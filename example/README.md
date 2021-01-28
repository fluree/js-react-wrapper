This example was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

It is linked to the @fluree/js-react-wrapper package in the parent directory for development purposes.

You can run `npm install` and then `npm start` to test your package.

- create a `daas/t1` ledger
- create a collection
```
[{
 "_id": "_collection",
 "name": "group",
 "doc": "A collection to hold all the groups",
 "version": 1 
}]
```
- create a predicate
```
[{
    "_id": "_predicate",
    "name": "group/name",
    "type": "string"
}]
```

- create some groups

```
[
  {
    "_id": "group",
    "group/name": "Test Group 2"
  },
  {
    "_id": "group",
    "group/name": "Test Group 1"
  }
]
```