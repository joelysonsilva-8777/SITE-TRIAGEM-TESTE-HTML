import React, { useState } from "react";
import {
  View,
  Text,
  TextProps,
  Pressable,
  TextInput,
  TextInputProps,
  Image,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ViewStyle,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, s } from "../theme";
import { initials } from "../lib/format";
import { staffPhotos } from "../assets";

export function T({ style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: fonts.regular,
          color: colors.ink,
          fontSize: 15,
          lineHeight: 22,
        },
        style,
      ]}
    />
  );
}
export type IconName = React.ComponentProps<typeof Feather>["name"];
export function Icon({
  name,
  size = 19,
  color = colors.green,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} selectable={false} />;
}
export function Button({
  label,
  onPress,
  icon,
  variant = "primary",
  disabled = false,
  small = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "amber" | "danger";
  disabled?: boolean;
  small?: boolean;
}) {
  const bg =
    variant === "primary"
      ? colors.green
      : variant === "amber"
        ? colors.amber
        : variant === "danger"
          ? colors.danger
          : variant === "secondary"
            ? colors.white
            : "transparent";
  const fg = ["primary", "danger"].includes(variant)
    ? colors.white
    : colors.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: variant === "secondary" ? "#abb7bc" : "transparent",
        borderRadius: 9,
        minHeight: 44,
        paddingHorizontal: small ? 12 : 18,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      {icon && (
        <Icon
          name={icon}
          color={variant === "amber" ? colors.ink : fg}
          size={17}
        />
      )}
      <T
        style={{
          fontFamily: fonts.medium,
          fontSize: small ? 13 : 14,
          color: variant === "amber" ? colors.ink : fg,
          flexShrink: 1,
        }}
      >
        {label}
      </T>
    </Pressable>
  );
}
export function IconButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? colors.light : "transparent",
      })}
    >
      <Icon name={icon} />
    </Pressable>
  );
}
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  const [focused, focus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T style={{ fontFamily: fonts.medium, fontSize: 14 }}>{label}</T>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#667078"
        onFocus={() => focus(true)}
        onBlur={() => focus(false)}
        style={[
          s.input,
          props.multiline && { minHeight: 100, textAlignVertical: "top" },
          focused && { borderColor: colors.green, borderWidth: 2 },
          style,
        ]}
      />
    </View>
  );
}
export interface Option {
  value: string;
  label: string;
}
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T style={{ fontFamily: fonts.medium, fontSize: 14 }}>{label}</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${options.find((o) => o.value === value)?.label || "Selecione"}`}
        onPress={() => setOpen(true)}
        style={[s.input, s.between]}
      >
        <T style={{ flex: 1 }}>
          {options.find((o) => o.value === value)?.label || "Selecione"}
        </T>
        <Icon name="chevron-down" size={16} />
      </Pressable>
      <Sheet title={label} visible={open} onClose={() => setOpen(false)}>
        <View style={{ gap: 4 }}>
          {options.map((o) => (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: o.value === value }}
              aria-checked={o.value === value}
              accessibilityLabel={o.label}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={[
                s.between,
                {
                  padding: 14,
                  minHeight: 48,
                  backgroundColor:
                    o.value === value ? colors.light : colors.white,
                },
              ]}
            >
              <T style={{ flex: 1 }}>{o.label}</T>
              {o.value === value && <Icon name="check" />}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={() => onChange(!checked)}
      style={[
        s.row,
        {
          flexWrap: "nowrap",
          alignItems: "flex-start",
          paddingVertical: 12,
          minHeight: 44,
        },
      ]}
    >
      <View
        style={{
          width: 23,
          height: 23,
          borderWidth: 1,
          borderColor: colors.green,
          backgroundColor: checked ? colors.green : colors.white,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <Icon name="check" size={17} color="white" />}
      </View>
      <T style={s.flex}>{label}</T>
    </Pressable>
  );
}
export function Tabs({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 }}
    >
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="tab"
          accessibilityLabel={o.label}
          accessibilityState={{ selected: o.value === value }}
          aria-selected={o.value === value}
          onPress={() => onChange(o.value)}
          style={{
            padding: 12,
            minHeight: 44,
            borderBottomWidth: 2,
            borderColor: value === o.value ? colors.green : colors.border,
            backgroundColor: value === o.value ? colors.light : "transparent",
          }}
        >
          <T
            style={{
              fontFamily: fonts.medium,
              color: value === o.value ? colors.green : colors.muted,
              fontSize: 14,
            }}
          >
            {o.label}
          </T>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function Notice({
  children,
  error = false,
}: React.PropsWithChildren<{ error?: boolean }>) {
  return (
    <View
      accessibilityRole={error ? "alert" : undefined}
      style={[
        s.row,
        {
          padding: 15,
          backgroundColor: error ? "#fff0ee" : colors.light,
          alignItems: "flex-start",
          flexWrap: "nowrap",
          borderLeftWidth: 3,
          borderLeftColor: error ? colors.danger : colors.green,
        },
      ]}
    >
      <Icon
        name={error ? "alert-circle" : "info"}
        color={error ? colors.danger : colors.green}
        size={17}
      />
      <T style={[s.small, s.flex, error && { color: colors.danger }]}>
        {children}
      </T>
    </View>
  );
}
export function Card({
  children,
  title,
  subtitle,
  action,
  style,
}: React.PropsWithChildren<{
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}>) {
  return (
    <View style={[s.card, style]}>
      {title && (
        <View
          style={[
            s.between,
            {
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={{ flex: 1, minWidth: 130 }}>
            <T accessibilityRole="header" style={s.h3}>
              {title}
            </T>
            {subtitle && <T style={[s.small, s.muted]}>{subtitle}</T>}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: React.PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <View style={[s.between, { marginBottom: 8 }]}>
      <View style={{ gap: 8, flex: 1, minWidth: 220 }}>
        <T style={s.eyebrow}>— {eyebrow}</T>
        <T accessibilityRole="header" style={s.title}>
          {title}
        </T>
        <T style={s.muted}>{description}</T>
      </View>
      {children && <View style={s.row}>{children}</View>}
    </View>
  );
}
export function Empty({
  title = "Nenhum registro encontrado",
  description = "Ajuste os filtros para ver mais resultados.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <View style={{ padding: 32, alignItems: "center", gap: 10 }}>
      <Icon name="inbox" size={30} />
      <T style={s.h3}>{title}</T>
      <T style={[s.muted, { textAlign: "center" }]}>{description}</T>
    </View>
  );
}
export function Avatar({
  name,
  id,
  size = 42,
}: {
  name: string;
  id?: string;
  size?: number;
}) {
  return id && staffPhotos[id] ? (
    <Image
      source={staffPhotos[id]}
      style={{ width: size, height: size, borderRadius: 2 }}
      accessibilityLabel={`Foto ilustrativa de ${name}`}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: colors.light,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T style={{ color: colors.green, fontFamily: fonts.medium }}>
        {initials(name)}
      </T>
    </View>
  );
}
export function Badge({
  label,
  color = colors.green,
}: {
  label: string;
  color?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: color + "12",
        alignSelf: "flex-start",
        borderRadius: 9,
      }}
    >
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }}
      />
      <T style={{ fontSize: 12, lineHeight: 18, color: colors.ink }}>{label}</T>
    </View>
  );
}
export function Stats({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    foot: string;
    icon?: IconName;
  }[];
}) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            s.card,
            {
              padding: width < 400 ? 14 : 20,
              gap: 9,
              flexBasis: width > 1000 ? "23%" : "46%",
              flexGrow: 1,
            },
          ]}
        >
          <View style={[s.between, { alignItems: "flex-start" }]}>
            <T style={[s.small, { flex: 1 }]}>{item.label}</T>
            <Icon name={item.icon || "activity"} size={18} />
          </View>
          <T style={{ fontFamily: fonts.medium, fontSize: 34, lineHeight: 40 }}>
            {item.value}
          </T>
          <T style={[s.small, s.muted]}>{item.foot}</T>
        </View>
      ))}
    </View>
  );
}
export function Columns({ children }: React.PropsWithChildren) {
  const { width } = useWindowDimensions();
  return (
    <View
      style={{
        flexDirection: width >= 900 ? "row" : "column",
        alignItems: "stretch",
        gap: 20,
      }}
    >
      {React.Children.map(
        children,
        (child) =>
          child && <View style={{ flex: 1, minWidth: 0 }}>{child}</View>,
      )}
    </View>
  );
}
export function Sheet({
  title,
  visible = true,
  onClose,
  children,
}: React.PropsWithChildren<{
  title: string;
  visible?: boolean;
  onClose: () => void;
}>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#172a32aa" }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 740,
              maxHeight: "96%",
              backgroundColor: colors.white,
              borderRadius: 9,
            }}
          >
            <View
              style={[
                s.between,
                {
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <T accessibilityRole="header" style={[s.h2, s.flex]}>
                {title}
              </T>
              <IconButton icon="x" label="Fechar janela" onPress={onClose} />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, gap: 18 }}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
