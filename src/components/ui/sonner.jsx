import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        style: {
          background: "rgb(239 68 68)", // red-500
          color: "white",
          border: "1px solid rgb(185 28 28)", // red-700
        },
      }}
      style={{
        "--normal-bg": "var(--destructive)",
        "--normal-text": "var(--destructive-foreground)",
        "--normal-border": "var(--destructive-border)",
      }}
      {...props}
    />
  );
}

export { Toaster }
