import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value'
> {
  value?: number | string | null
  onValueChange?: (value: number | undefined) => void
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, onValueChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('')

    React.useEffect(() => {
      if (value !== undefined && value !== null && value !== '') {
        const stringValue = value.toString()
        // If it's already formatted, avoid double formatting parsing issues
        if (stringValue.includes('R$')) {
          setDisplayValue(stringValue)
          return
        }
        const numValue = typeof value === 'string' ? parseFloat(value) : value
        if (!isNaN(numValue)) {
          const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          }).format(numValue)
          setDisplayValue(formatted)
        } else {
          setDisplayValue('')
        }
      } else {
        setDisplayValue('')
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numericValue = inputValue.replace(/\D/g, '')

      if (!numericValue) {
        setDisplayValue('')
        onValueChange?.(undefined)
        if (onChange) {
          e.target.value = ''
          onChange(e)
        }
        return
      }

      const floatValue = parseInt(numericValue, 10) / 100
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(floatValue)

      setDisplayValue(formatted)
      onValueChange?.(floatValue)

      // Emit the raw float value as string so React Hook Form register parses it cleanly
      // This prevents the "exploding numbers" behavior when mask loops back.
      if (onChange) {
        e.target.value = floatValue.toString()
        onChange(e)
      }
    }

    return (
      <Input
        {...props}
        type="text"
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        className={cn('', className)}
      />
    )
  },
)

CurrencyInput.displayName = 'CurrencyInput'
