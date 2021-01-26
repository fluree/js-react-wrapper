function ExampleComponent() {
  return (<div>hello</div>);
}
export default ExampleComponent;

//import { ExampleComponent } from '.'

describe('ExampleComponent', () => {
  it('is truthy', () => {
    expect(ExampleComponent).toBeTruthy()
  })
})
