const TYPE_MAP: Record<string, string> = {
  string: 'String',
  text: 'String',
  int: 'Integer',
  integer: 'Integer',
  long: 'Long',
  double: 'Double',
  float: 'Float',
  boolean: 'Boolean',
  bigdecimal: 'BigDecimal',
  date: 'LocalDate',
  datetime: 'LocalDateTime',
  timestamp: 'LocalDateTime',
  uuid: 'UUID',
};

export function toJavaType(umlType: string): string {
  return TYPE_MAP[umlType.trim().toLowerCase()] ?? umlType.trim();
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function decapitalize(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function pluralize(value: string): string {
  if (value.endsWith('s')) return value;
  if (value.endsWith('y')) return `${value.slice(0, -1)}ies`;
  return `${value}s`;
}
