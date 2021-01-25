import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Slider from '@material-ui/core/Slider';
import Tooltip from '@material-ui/core/Tooltip';
import { flureeQuery, useForceTime } from '@fluree/js-react-wrapper'

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

const timeTravelQuery = {
  selectOne: ["?maxBlock", "?lastBlockTime", "?firstBlockTime"],
  where: [
    ["?s", "_block/number", "?bNum"],
    ["?maxBlock", "#(max ?bNum)"],
    ["?minBlock", "#(min ?bNum)"],
    ["?maxS", "_block/number", "?maxBlock"],
    ["?maxS", "_block/instant", "?lastBlockTime"],
    ["?minS", "_block/number", "?minBlock"],
    ["?minS", "_block/instant", "?firstBlockTime"]
  ],
  opts: { ignoreForceTime: true }
};

function TimeTravel({ dateTime, onError, style }) {
  const { result, loading, error } = flureeQuery(timeTravelQuery);
  const defaultResult = [2, new Date().valueOf(), 1451624400000];
  const [maxBlock, maxBlockTime, firstBlockTime] = loading || error ? defaultResult : result;
  const max = dateTime ? maxBlockTime : maxBlock;
  const min = dateTime ? firstBlockTime : 1;
  const [sliderState, setSliderState] = useState({ changed: false, time: null });
  const [currentForceTime, forceTime] = useForceTime(); // currentForceTime will be null if not set

  if (sliderState.changed) {
    if (sliderState.time === max && currentForceTime) {
      // (re)set to real-time if at max value and not already
      setSliderState({ changed: false, time: null });
      forceTime();
    } else {
      // no-op if same as last forceTime value
      forceTime(sliderState.time);
    }
  }

  if (error) {
    console.error(error);
    onError = onError ? <onError error={error} /> : <div>{error.message}</div>
  }

  return error ? onError : (
    < Slider
      value={sliderState.time || max}
      scale={x => dateTime ? new Date(x).toLocaleString() : x}
      min={min}
      max={max}
      style={{ ...styleObj, ...style }
      }
      onChange={(event, value) => setSliderState({ changed: true, time: value })}
      ValueLabelComponent={ValueLabelComponent} />
  );
}

export default TimeTravel;
