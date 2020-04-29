import React from 'react'

import { ReactConnect, FlureeProvider, flureeQL } from '@fluree/js-react-wrapper'
import TimeTravel from './TimeTravel'
// import '@fluree/js-react-wrapper/dist/index.css'

const scott = "a603e772faec02056d4ec3318187487d62ec46647c0cba7320c7f2a79bed2615";
const brian = "509a01fe94a32466d7d3ad378297307f897a7d385a219d79725994ce06041896";
const antonio = "c9cdec8fb328a823ddfbe37115ec448109d86bab594305c8066e7633e5b63ba6";

const myconn = ReactConnect({
  servers: "http://localhost:8090",
  ledger: "accenture/demo",
  workerUrl: "js-react-wrapper/flureeworker.js",
  // workerUrl: "js-react-wrapper/js/flureeworker-dev.js",
  // private: brian
});

function Invoice({ invoice }) {
  return (
    <tr>
      <td>{invoice.id}</td>
      <td>{invoice.buyer.name}</td>
      <td>{invoice.seller.name}</td>
      <td>{JSON.stringify(invoice.items)}</td>
    </tr>
  );
}

function AllInvoices({ data }) {
  const invoiceData = data && data.result || [];
  const invoiceItems = invoiceData.map(
    invoice => <Invoice invoice={invoice}></Invoice>
  )
  return (
    <table>
      <thead>
        <tr>
          <th>Invoice ID</th>
          <th>Invoice Buyer</th>
          <th>Invoice Seller</th>
          <th>Invoice Items</th>
          <th>Received?</th>
        </tr>
      </thead>
      <tbody>
        {invoiceItems}
      </tbody>
    </table>
  );
}

const AllInvoicesFluree = flureeQL({
  "select": [
    "*",
    { "invoice/buyer": ["*"] },
    { "invoice/seller": ["*"] },
    { "invoice/receipt": ["*", { "invoiceReceipt/by": ["*"] }] }
  ],
  "from": "invoice"
})(AllInvoices);

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
      <p>Predicate Names are:</p>
      {predicateNames}
    </div>
  );
}

const ShowPredicatesFluree = flureeQL(
  {
    select: ["*"],
    from: "_predicate"
  }
)(ShowPredicates);



const App = () => {
  // return <ExampleComponent text="Create React Library Example 😄" />
  return (
    <FlureeProvider conn={myconn}>
      <div>
        <TimeTravel></TimeTravel>
        <AllInvoicesFluree></AllInvoicesFluree>
        <ShowPredicatesFluree></ShowPredicatesFluree>
      </div>
    </FlureeProvider >
  );
}

export default App
