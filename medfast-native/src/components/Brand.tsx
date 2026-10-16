import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { T } from './ui';
import { colors, fonts } from '../theme';
export function Brand({ compact = false }: { compact?: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
    <Svg width={compact ? 47 : 58} height={compact ? 43 : 54} viewBox="0 0 128 104" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M12 68V23Q12 17 16 22L34 44Q36 47 39 43L55 22Q59 17 59 23V74C59 93 90 93 90 74V68" stroke="#0648D7" strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M84 20C72 12 60 25 67 37L83 54M97 20C109 12 121 25 114 37L98 54" stroke="#19C7C4" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={90.5} cy={63} r={5.5} fill="#0648D7" />
    </Svg>
    <View><T style={{ fontFamily: fonts.bold, fontSize: compact ? 25 : 31, lineHeight: compact ? 32 : 39, letterSpacing: -1.4, color: colors.green }}>Med<T style={{ color: colors.teal, fontFamily: fonts.bold, fontSize: compact ? 25 : 31 }}>Fast</T></T><T style={{ fontFamily: fonts.medium, fontSize: compact ? 6 : 7, lineHeight: 11, letterSpacing: .7, color: colors.muted }}>CONECTANDO SAÚDE E PESSOAS</T></View>
  </View>;
}
