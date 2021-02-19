import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Slider from '@material-ui/core/Slider';
import Tooltip from '@material-ui/core/Tooltip';
import { useFlureeQuery, useForceTime } from '@fluree/js-react-wrapper'

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
  const { result, loading, error } = useFlureeQuery(timeTravelQuery);
  const defaultResult = [2, new Date().valueOf(), 1451624400000];
  const [maxBlock, maxBlockTime, firstBlockTime] = loading || error ? defaultResult : result;
  const max = dateTime ? maxBlockTime : maxBlock;
  const min = dateTime ? firstBlockTime : 1;
  const [sliderState, setSliderState] = useState(null);
  const [currentForceTime, forceTime] = useForceTime(); // currentForceTime will be null if not set

  useEffect(() => {
    if (sliderState === max && currentForceTime) {
      forceTime();
    } else {
      forceTime(sliderState)
    }
  }, [sliderState]);

  if (error) {
    console.error(error);
    onError = onError ? <onError error={error} /> : <div>{error.message}</div>
  }

  return error ? onError : (
    < Slider
      value={sliderState || max}
      scale={x => dateTime ? new Date(x).toLocaleString() : x}
      min={min}
      max={max}
      style={{ ...styleObj, ...style }
      }
      onChange={(event, value) => setSliderState(value)}
      ValueLabelComponent={ValueLabelComponent} />
  );
}

export default TimeTravel;
