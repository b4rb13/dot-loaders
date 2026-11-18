/** Update one owned, CSP-safe effect; identical frames do not touch the animation. */
export function createEffect(
  element: HTMLElement,
  own: (animation: Animation) => void,
) {
  let animation: Animation | undefined;
  let previous = '';
  return (values: PropertyIndexedKeyframes) => {
    const key = JSON.stringify(values);
    if (key === previous) return;
    if (animation) (animation.effect as KeyframeEffect).setKeyframes(values);
    else {
      animation = element.animate(values, { duration: 1, fill: 'both' });
      own(animation);
    }
    previous = key;
  };
}
