export interface UrlFieldProps {
  label: string;
  value: string;
  maxLength: number;
  onValueChange: (value: string) => void;
  /** Не нужен там, где по этому полю не запускается preview (§4.4, resumeUrl). */
  onBlur?: () => void;
  /** Спиннер preview идёт перед кнопкой OpenInNew (§4.4), поле остаётся редактируемым. */
  isLoading?: boolean;
  autoFocus?: boolean;
}
