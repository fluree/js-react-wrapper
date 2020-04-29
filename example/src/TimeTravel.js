import React from 'react';
import PropTypes from 'prop-types';
import Slider from '@material-ui/core/Slider';
import Tooltip from '@material-ui/core/Tooltip';
import { flureeQL } from '@fluree/js-react-wrapper'

const styleObj = {
  width: 300,
  marginTop: 10,
  marginBottom: 10
}

function ValueLabelComponent(props) {
  const { children, open, value } = props
  return (
    <Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
      {children}
    </Tooltip>
  )
}

ValueLabelComponent.propTypes = {
  children: PropTypes.element.isRequired,
  open: PropTypes.bool.isRequired,
  value: PropTypes.number.isRequired
}

class TimeTravel extends React.Component {
  static contextTypes = {
    conn: PropTypes.object.isRequired
  };
  static propTypes = {
    dateTime: PropTypes.bool
  }

  constructor(props, context) {
    super(props, context)
    this.conn = context.conn
    this.id = "TimeTravelWidget"
    this.useBlock = !props.dateTime
    this.state = {
      value: this.useBlock ? 2 : new Date().valueOf(),
      min: this.useBlock ? 1 : 1451624400000,
      max: this.useBlock ? 2 : new Date().valueOf()
    }
  }

  handleChange = (event, value) => {
    if (this.state.value === value) { return }
    this.conn.forceTime(this.useBlock ? value : new Date(value))
    this.setState(state => ({ ...state, value, changedBlock: true }))
  }

  render() {
    const queryResult = this.props.data.result;
    const [maxBlock, lastBlockTime, firstBlockTime] = queryResult ? queryResult : [2, new Date().valueOf(), 1451624400000];
    const max = this.useBlock ? maxBlock : lastBlockTime + 1;
    const min = this.useBlock ? 1 : firstBlockTime + 1;
    const sliderValue = this.state.changedBlock ? this.state.value : max;

    return (
      <Slider
        value={sliderValue}
        scale={x => this.useBlock ? x : new Date(x).toLocaleString()}
        min={min}
        max={max}
        style={{ ...styleObj, ...this.props.style }}
        onChange={this.handleChange}
        ValueLabelComponent={ValueLabelComponent} />
    );
  }
}

const TimeTravelFluree = flureeQL(
  {
    "selectOne": ["?maxBlock", "?lastBlockTime", "?firstBlockTime"],
    "where": [
      ["?s", "_block/number", "?bNum"],
      ["?maxBlock", "#(max ?bNum)"],
      ["?minBlock", "#(min ?bNum)"],
      ["?maxS", "_block/number", "?maxBlock"],
      ["?maxS", "_block/instant", "?lastBlockTime"],
      ["?minS", "_block/number", "?minBlock"],
      ["?minS", "_block/instant", "?firstBlockTime"]
    ]
  },
  { ignoreForceTime: true })(TimeTravel);


export default TimeTravelFluree;
