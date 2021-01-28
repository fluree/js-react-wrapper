import React from 'react'
import { render } from '@testing-library/react'
import FlureeConn, { workerQueue } from './FlureeConn'
import FlureeProvider from './FlureeProvider'
import flureeQuery from './flureeQuery'
import 'jsdom-worker'


const groupsQuery = {
    select: ["*"],
    from: "group"
}

const returnVal = {}
function TestComponent({ query }) {
    Object.assign(returnVal, flureeQuery(query))
    return null
}

test('worker queue starts empty', () => {
    expect(workerQueue.length).toEqual(0)
})

test('it loads', () => {
    const myconn = new FlureeConn({ workerUrl: "" })
    expect(workerQueue.length).toEqual(1)
})


test('when the connection isnt ready, it queues messages when register query is called', () => {

    const myconn = new FlureeConn({ workerUrl: '' })

    render(<div><FlureeProvider conn={myconn}> <TestComponent query={groupsQuery} /> </FlureeProvider > </div>)
    render(<div><FlureeProvider conn={myconn}> <TestComponent query={groupsQuery} /> </FlureeProvider > </div>)

    const queriesQueueLength = Object.keys(myconn.queries).length
    expect(queriesQueueLength).toEqual(2)

    //console.log(myconn)
    //console.log(workerQueue)
})

test('it sends messages in the queue', () => {
    const myconn = new FlureeConn({ workerUrl: '' })
    render(<div><FlureeProvider conn={myconn}> <TestComponent query={groupsQuery} /> </FlureeProvider > </div>)
    myconn.processQueue()
    //console.log(myconn)
    //console.log(workerQueue)

    const registerQueryInWorkerQueue = workerQueue.find(e => e.action === 'registerQuery')
    expect(registerQueryInWorkerQueue).toBeTruthy()

})