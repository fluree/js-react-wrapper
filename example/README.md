This example was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

It is linked to the @fluree/js-react-wrapper package in the parent directory for development purposes.

You can run `npm install`, follow the steps below to create a ledger on your local instance of fluree and transact some data. Then run`npm start` to test your package.

1. Create a `dbaas/t1` ledger

2. Create collections

   ```json
   [
     {
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
     }
   ]
   ```

3. create predicates

   ```json
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

4. Create some groups and records

   ```json
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
