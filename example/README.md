This example was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

It is linked to the @fluree/js-react-wrapper package in the parent directory for development purposes.

You can run `npm install` and then `npm start` to test your package.

- create a `daas/t1` ledger
- create  collections
```
[{
 "_id": "_collection",
 "name": "group",
 "doc": "A collection to hold all the groups",
 "version": 1 
},

{
 "_id": "_collection",
 "name": "cRecord",
 "doc": "A collection to hold all the records",
 "version": 1 
}]
```
- create  predicates
```
[
  {
    "_id": "_predicate",
    "name": "group/name",
    "type": "string"
},
  {
    "_id": "_predicate",
    "name": "cRecord/name",
    "type": "string"
}
]
```

- create some groups and records

```
[
  {
    "_id": "group",
    "group/name": "Test Group 2"
  },
  {
    "_id": "group",
    "group/name": "Test Group 1"
  },
  {
    "_id": "cRecord",
    "cRecord/name": "Test Record 2"
  },
  {
    "_id": "cRecord",
    "cRecord/name": "Test Record 1"
  }
]
```