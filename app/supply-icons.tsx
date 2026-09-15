/**
 * Íconos propios de insumos.
 *
 * Lucide no trae papas fritas ni balde, así que van dibujados acá con su misma
 * convención (lienzo de 24, trazo de 2, puntas redondeadas, `currentColor`)
 * para que convivan con los demás sin desentonar.
 */
type IconProps = { size?: number };

const base = (size: number) => ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
});

/** Balde de hamburguesas: el envase de Todo Envase. */
export function Bucket({ size = 24 }: IconProps) {
    return <svg {...base(size)} aria-hidden="true">
        <path d="M4.5 7.5h15l-1.3 11.6a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.8L4.5 7.5Z"/>
        <path d="M8 7.5a4 4 0 0 1 8 0"/>
    </svg>;
}

/** Papas fritas en su cono. */
export function Fries({ size = 24 }: IconProps) {
    return <svg {...base(size)} aria-hidden="true">
        <path d="M6 11h12l-1.1 8.4a2 2 0 0 1-2 1.6H9.1a2 2 0 0 1-2-1.6L6 11Z"/>
        <path d="M6.7 14.6h10.6"/>
        <path d="M8.6 11V6.1a1.4 1.4 0 0 1 2.8 0V11"/>
        <path d="M12.6 11V4.1a1.4 1.4 0 0 1 2.8 0V11"/>
    </svg>;
}
