interface LogoProps {
  size?: number
  className?: string
  showText?: boolean
}

export default function Logo({ size = 32, className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="OptiCharge logo"
      >
        {/* Fundo hexagonal arredondado */}
        <rect width="40" height="40" rx="10" fill="url(#grad)" />
        {/* Raio principal */}
        <path
          d="M23 6L13 22h8l-4 12 14-18h-8.5L23 6z"
          fill="white"
          fillOpacity="0.95"
        />
        {/* Círculo pequeno de plug */}
        <circle cx="29" cy="28" r="3.5" fill="white" fillOpacity="0.4" />
        <circle cx="29" cy="28" r="2" fill="white" fillOpacity="0.9" />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span
          style={{ fontWeight: 700, fontSize: size * 0.55, letterSpacing: '-0.02em' }}
          className="text-gray-900 dark:text-white"
        >
          Opti<span className="text-blue-600">Charge</span>
        </span>
      )}
    </div>
  )
}
