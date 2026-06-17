import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

// Logo geometry (Design/icons/logo.svg, viewBox 0 0 100 100).
const DOTS = [
  { cx: 50, cy: 21, fill: '#10B981', stroke: '#EAF6F1' },
  { cx: 70.5, cy: 29.5, fill: '#A855F7', stroke: '#F4EAFD' },
  { cx: 79, cy: 50, fill: '#F43F5E', stroke: '#FDEAEE' },
  { cx: 70.5, cy: 70.5, fill: '#F59E0B', stroke: '#FEF4E2' },
  { cx: 50, cy: 79, fill: '#06B6D4', stroke: '#E4F8FC' },
  { cx: 29.5, cy: 70.5, fill: '#F97316', stroke: '#FEEFE2' },
  { cx: 21, cy: 50, fill: '#EC4899', stroke: '#FDEAF3' },
  { cx: 29.5, cy: 29.5, fill: '#84CC16', stroke: '#F1FAE0' },
];
const DOT_R = 6.6;

/** A single dot that pops in (scaled via its radius) after `delay` ms. */
function Dot({ cx, cy, fill, stroke, delay }: (typeof DOTS)[number] & { delay: number }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 180 }));
  }, [delay, grow]);
  const props = useAnimatedProps(() => ({ r: DOT_R * grow.value }));
  return <AnimatedCircle cx={cx} cy={cy} fill={fill} stroke={stroke} strokeWidth={1.1} animatedProps={props} />;
}

/**
 * Animated splash overlay shown once JS is ready, over the (matching) native
 * splash background. Tile scales/fades in, the dashed ring rotates, the dots
 * pop in sequentially, then the whole overlay fades out and calls onFinish.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const container = useSharedValue(1);
  const tileScale = useSharedValue(0.85);
  const tileOpacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    tileOpacity.value = withTiming(1, { duration: 300 });
    tileScale.value = withSpring(1, { damping: 12, stiffness: 140 });
    rotation.value = withRepeat(withTiming(360, { duration: 7000, easing: Easing.linear }), -1);
    // Hold, then fade the overlay out and hand off to the app.
    container.value = withDelay(
      1500,
      withTiming(0, { duration: 380 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [container, tileScale, tileOpacity, rotation, onFinish]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: container.value }));
  const tileStyle = useAnimatedStyle(() => ({ opacity: tileOpacity.value, transform: [{ scale: tileScale.value }] }));
  const ringProps = useAnimatedProps(() => ({ rotation: rotation.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, containerStyle]} pointerEvents="none">
      <Animated.View style={tileStyle}>
        <Svg width={140} height={140} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#5491F0" />
              <Stop offset="100%" stopColor="#2E51CC" />
            </LinearGradient>
          </Defs>
          <Rect width={100} height={100} rx={22} fill="url(#bg)" />
          {/* White ring */}
          <Circle cx={50} cy={50} r={29} fill="none" stroke="#fff" strokeWidth={6.6} />
          {/* Rotating dashed ring */}
          <AnimatedG originX={50} originY={50} animatedProps={ringProps}>
            <Circle
              cx={50}
              cy={50}
              r={29}
              fill="none"
              stroke="#A9C0EC"
              strokeWidth={1}
              strokeDasharray="2 2.6"
              strokeLinecap="round"
            />
          </AnimatedG>
          {/* Colour dots popping in */}
          {DOTS.map((d, i) => (
            <Dot key={i} {...d} delay={350 + i * 65} />
          ))}
          {/* Center */}
          <Circle cx={50} cy={50} r={11} fill="#fff" />
          <Circle cx={50} cy={50} r={3.6} fill="#4A6CF7" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background, // matches native splash (#F8FAFF) for a seamless handoff
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
