import React from 'react'

export interface BoxIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
}

/**
 * CaixaPapelaoAbertaSvg
 * Desenho vetorial em perspectiva isométrica/oblíqua de uma caixa de papelão
 * com as abas superiores abertas para fora (revelando o interior da caixa).
 * Padrão em tons âmbar/papelão (#d97706, #b45309, #f59e0b, #fef3c7).
 */
export function CaixaPapelaoAbertaSvg({ size = 24, className = '', ...props }: BoxIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Sombra projetada na base */}
      <ellipse cx="32" cy="56" rx="22" ry="4" fill="currentColor" fillOpacity="0.12" />

      {/* Interior da caixa (fundo escuro de profundidade) */}
      <polygon
        points="32,23 48,30 32,37 16,30"
        fill="#78350f"
        stroke="#451a03"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Parede interna traseira esquerda */}
      <polygon points="16,30 32,23 32,30 16,35" fill="#92400e" opacity="0.8" />

      {/* Aba Traseira Esquerda (aberta para cima/fora) */}
      <polygon
        points="16,30 32,23 27,15 11,21"
        fill="#d97706"
        stroke="#92400e"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Aba Traseira Direita (aberta para cima/fora) */}
      <polygon
        points="32,23 48,30 53,21 37,15"
        fill="#f59e0b"
        stroke="#b45309"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Corpo da caixa - Face Frontal Esquerda */}
      <polygon
        points="16,30 32,37 32,53 16,46"
        fill="#d97706"
        stroke="#92400e"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Linha vertical central divisória do papelão */}
      <line
        x1="16"
        y1="30"
        x2="16"
        y2="46"
        stroke="#b45309"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Corpo da caixa - Face Frontal Direita */}
      <polygon
        points="32,37 48,30 48,46 32,53"
        fill="#f59e0b"
        stroke="#b45309"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Aresta frontal vertical principal */}
      <line
        x1="32"
        y1="37"
        x2="32"
        y2="53"
        stroke="#92400e"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Detalhe de vinco/ranhura de papelão no lado esquerdo */}
      <line
        x1="24"
        y1="35"
        x2="24"
        y2="48"
        stroke="#b45309"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.5"
      />
      {/* Detalhe de vinco no lado direito */}
      <line
        x1="40"
        y1="35"
        x2="40"
        y2="48"
        stroke="#d97706"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.5"
      />

      {/* Aba Frontal Esquerda (dobrada aberta para baixo/fora) */}
      <polygon
        points="16,30 32,37 26,45 10,37"
        fill="#b45309"
        stroke="#78350f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Aba Frontal Direita (dobrada aberta para baixo/fora) */}
      <polygon
        points="32,37 48,30 54,37 38,45"
        fill="#fbbf24"
        stroke="#b45309"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * CaixaPapelaoLacradaSvg
 * Desenho vetorial em perspectiva isométrica de uma caixa de papelão fechada e lacrada,
 * com fita adesiva cruzando o topo e descendo pelas laterais.
 * Padrão em tons verdes/esmeralda para indicar caixa concluída/entregue.
 */
export function CaixaPapelaoLacradaSvg({ size = 20, className = '', ...props }: BoxIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Sombra da base */}
      <ellipse cx="32" cy="56" rx="20" ry="3.5" fill="currentColor" fillOpacity="0.12" />

      {/* Topo fechado da caixa (losango em perspectiva) */}
      <polygon
        points="32,16 52,26 32,36 12,26"
        fill="#34d399"
        stroke="#059669"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Vinco central da tampa onde as duas abas se encontram */}
      <line
        x1="12"
        y1="26"
        x2="52"
        y2="26"
        stroke="#047857"
        strokeWidth="1"
        strokeDasharray="2 1"
        opacity="0.6"
      />

      {/* Face Frontal Esquerda */}
      <polygon
        points="12,26 32,36 32,54 12,44"
        fill="#059669"
        stroke="#047857"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Face Frontal Direita */}
      <polygon
        points="32,36 52,26 52,44 32,54"
        fill="#10b981"
        stroke="#059669"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Aresta frontal divisória vertical */}
      <line
        x1="32"
        y1="36"
        x2="32"
        y2="54"
        stroke="#047857"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* FITA ADESIVA / LACRE (Topo) */}
      <polygon
        points="29,17.5 35,20.5 35,34.5 29,31.5"
        fill="#fef08a"
        stroke="#eab308"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* FITA ADESIVA / LACRE descendo na face esquerda */}
      <polygon
        points="29,31.5 32,33 32,41 29,39.5"
        fill="#fde047"
        stroke="#ca8a04"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* FITA ADESIVA / LACRE descendo na face direita */}
      <polygon
        points="32,33 35,31.5 35,39.5 32,41"
        fill="#facc15"
        stroke="#ca8a04"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Selo / Ícone de check de conferido/entregue sobre a fita */}
      <circle cx="32" cy="27" r="5" fill="#047857" stroke="#ffffff" strokeWidth="1.2" />
      <path
        d="M30 27 L31.5 28.5 L34 25.5"
        stroke="#ffffff"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
