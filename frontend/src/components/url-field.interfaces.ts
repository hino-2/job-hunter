export interface UrlFieldProps {
  label: string;
  value: string;
  maxLength: number;
  onValueChange: (value: string) => void;
  onBlur: () => void;
}
