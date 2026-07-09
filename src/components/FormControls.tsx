import type {
  ChangeEventHandler,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'

type FormFieldProps = {
  label: string
  children: ReactNode
  wide?: boolean
}

export function FormField({ label, children, wide = false }: FormFieldProps) {
  return (
    <label className={`form-field${wide ? ' form-field-wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: readonly string[]
  wide?: boolean
}

export function FormSelect({
  label,
  options,
  wide,
  ...selectProps
}: FormSelectProps) {
  return (
    <FormField label={label} wide={wide}>
      <select {...selectProps}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown aria-hidden="true" />
    </FormField>
  )
}

type FilterSelectProps = {
  label: string
  value: string
  options: readonly string[]
  icon: ReactNode
  onChange: ChangeEventHandler<HTMLSelectElement>
}

export function FilterSelect({
  label,
  value,
  options,
  icon,
  onChange,
}: FilterSelectProps) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={onChange}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      {icon}
    </label>
  )
}
