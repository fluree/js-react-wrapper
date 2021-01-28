import React from 'react';
import { FlureeConn, FlureeProvider, flureeQuery } from '@fluree/js-react-wrapper'
import TimeTravel from './TimeTravel'

const scott = "a603e772faec02056d4ec3318187487d62ec46647c0cba7320c7f2a79bed2615";
const brian = "509a01fe94a32466d7d3ad378297307f897a7d385a219d79725994ce06041896";
const antonio = "c9cdec8fb328a823ddfbe37115ec448109d86bab594305c8066e7633e5b63ba6";

const myconn = new FlureeConn({
  servers: "http://localhost:8090",
  ledger: "daas/t1",
  workerUrl: "/flureeworker.js",
});


const groupsQuery = {
  select: ["*"],
  from: "group"
}

function AllGroups({ count }) {
  // const query = (count < 2) ? null : groupsQuery;
  const query = groupsQuery;
  const data = flureeQuery(query);
  console.warn("Data: ", data)
  const { result, loading } = data;
  if (loading) {
    return (<div>Loading...</div>);
  } else {
    return (
      <table>
        <thead>
          <tr>
            <th>Group ID {count}</th>
            <th>Group Name</th>
            <th># Employees</th>
          </tr>
        </thead>
        <tbody>
          {result.map(group => (
            <tr key={group._id}>
              <td>{group._id}</td>
              <td>{group.name}</td>
              <td>{group.employees && group.employees.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}


function MultiTest() {
  const data = flureeQuery({
    groups: { select: ["*"], from: "group" },
    customers: { select: ["*"], from: "cRecord" }
  });

  console.log("MULTI DATA: ", data);
  const { result } = data;


  return (
    <div>
      <div>Groups: {JSON.stringify(result.groups)}</div>
      <div>cRecord: {JSON.stringify(result.customers)}</div>
    </div>

  );
}


function MyTest() {
  const [count, updateCount] = React.useState(0);

  return (
    <div>
      <div>Count: {count}</div>
      <div><button onClick={() => updateCount(count + 1)}></button></div>
      <AllGroups count={count} />
      {/* <PredicateItem4 count={count} />
      <MultiTest></MultiTest> */}
    </div>
  )
}


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

function ShowPredicates({ data }) {
  const predicateNames = data.result.map(predicate => <PredicateItem predicate={predicate} />);
  return (
    <div>
      <p>Predicate Names HELLO:</p>
      {predicateNames}
    </div>
  );
}


function PredicateItem2(props) {
  const data = props.data
  const predicateName = data.result;
  return (
    <p>{predicateName}</p>
  )
}


const predicateItem4Query = {
  selectOne: "?id",
  where: [["?id", "_predicate/name", "?mypred"]],
  vars: { "?mypred": null }
}

function PredicateItem4({ count }) {

  const predNames = [null, null, "_user/auth", "_user/username", "_auth/id", "_auth/roles"];

  const predName = predNames[count];

  var query = predicateItem4Query;

  query.vars["?mypred"] = predName;


  const data = flureeQuery(query, {})

  const predicateName = data.result;
  console.log("PredicateItem4: ", data);
  return (
    <p>{predicateName}</p>
  )
}

function AllPredicates() {
  var query = { select: ["_predicate/name"], from: "_predicate" }
  const data = flureeQuery(query)

  return (<div>predicates: {JSON.stringify(data.result)}</div>)

}

const App = () => {
  // return <ExampleComponent text="Create React Library Example 😄" />
  return (
    <FlureeProvider conn={myconn}>
      <div>
        <TimeTravel></TimeTravel>
        <div>--------------------------------------</div>
        <AllGroups />
        <div>--------------------------------------</div>
        <MyTest />
        <div>--------Multi Test----------------</div>
        <MultiTest />
        {/* <PredicateItem5 /> */}
        {/* <AllInvoicesFluree></AllInvoicesFluree> */}
        {/* <PredicateItem2Fluree key="a" mypred="_user/username" />
        <PredicateItem2Fluree key="b" mypred="_user/auth" />
        <PredicateItem3Fluree key="c" mytest="_auth/id" /> 
        <PredicateItem3Fluree key="d" mytest="_auth/roles" />  */}
        <PredicateItem4 />
        <div>--------------------------------------</div>
        <AllPredicates />
      </div>
    </FlureeProvider >
  );
}

export default App
