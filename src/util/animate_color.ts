import { Color } from '../color';
import {animate, AnimationOptions, TOnAnimationChangeCallback} from './animate';
import { TColorAlphaSource } from '../color/color.class';

/**
 * Calculate an in-between color with linear interpolation. Returns a "rgba()" string.
 * Credit: Edwin Martin <edwin@bitstorm.org>
 *         http://www.bitstorm.org/jquery/color-animation/jquery.animate-colors.js
 * @param begin color
 * @param end color
 * @param pos [0, 1]
 */
const calculateColor = (
  begin: TColorAlphaSource,
  end: TColorAlphaSource,
  pos: number
): string => {
  const [r, g, b, _a] = begin.map(
    (beg, index) => beg + pos * (end[index] - beg)
  );
  const a = begin && end ? _a : 1;
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
};

/**
 * Simplified TEasingFunction with a domain of [0, duration] and a range of [0, 1]
 * @param currentTime
 * @param duration
 */
type TColorEasingFunction = (currentTime: number, duration: number) => number;


const defaultColorEasing: TColorEasingFunction = (currentTime, duration) =>
  1 - Math.cos((currentTime / duration) * (Math.PI / 2));

type TOnColorChangeCallback = TOnAnimationChangeCallback<void, string>;

type TColorAnimationOptions = Omit<
  AnimationOptions,
  'onComplete' | 'onChange' | 'easing'
> & {
  onComplete: TOnColorChangeCallback;
  onChange: TOnColorChangeCallback;
  colorEasing: TColorEasingFunction;
};

/**
 * Changes the color from one to another within certain period of time, invoking callbacks as value is being changed.
 * @memberOf fabric.util
 * @param {String} fromColor The starting color in hex or rgb(a) format.
 * @param {String} toColor The starting color in hex or rgb(a) format.
 * @param {Number} [duration] Duration of change (in ms).
 * @param {Object} [options] Animation options
 * @param {Function} [options.onChange] Callback; invoked on every value change
 * @param {Function} [options.onComplete] Callback; invoked when value change is completed
 * @param {Function} [options.colorEasing] Easing function. Note that this function only take two arguments (currentTime, duration). Thus the regular animation easing functions cannot be used.
 * @param {Function} [options.abort] Additional function with logic. If returns true, onComplete is called.
 * @returns {Function} abort function
 */
export function animateColor(
  fromColor: string,
  toColor: string,
  duration = 500,
  {
    colorEasing = defaultColorEasing,
    onComplete,
    onChange,
    ...restOfOptions
  }: Partial<TColorAnimationOptions> = {}
) {
  const startColor = new Color(fromColor).getSource(),
    endColor = new Color(toColor).getSource();
  return animate({
    ...restOfOptions,
    duration,
    startValue: startColor,
    endValue: endColor,
    byValue: endColor,
    easing: (currentTime, startValue, byValue, duration) =>
      colorEasing(currentTime, duration),
    // has to take in account for color restoring;
    onComplete: (current, valuePerc, timePerc) =>
      onComplete?.(calculateColor(endColor, endColor, 0), valuePerc, timePerc),
    onChange: (current, valuePerc, timePerc) =>
      onChange?.(
        calculateColor(startColor, endColor, valuePerc),
        valuePerc,
        timePerc
      ),
  });
}
