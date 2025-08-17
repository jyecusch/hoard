"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface IconButtonGroupProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface IconButtonGroupItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const IconButtonGroupContext = React.createContext<{
  selectedValue: string
  onValueChange: (value: string) => void
}>({
  selectedValue: "",
  onValueChange: () => {},
})

export function IconButtonGroup({ value, onValueChange, children, className }: IconButtonGroupProps) {
  return (
    <IconButtonGroupContext.Provider value={{ selectedValue: value, onValueChange }}>
      <div className={cn("inline-flex rounded-md border border-input shadow-xs w-fit", className)}>
        {children}
      </div>
    </IconButtonGroupContext.Provider>
  )
}

export function IconButtonGroupItem({ value, children, className }: IconButtonGroupItemProps) {
  const { selectedValue, onValueChange } = React.useContext(IconButtonGroupContext)
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center h-9 w-9 text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "first:rounded-l-md last:rounded-r-md",
        "border-r border-input last:border-r-0",
        isSelected 
          ? "bg-accent text-accent-foreground" 
          : "bg-background text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}