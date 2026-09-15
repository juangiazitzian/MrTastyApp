"use client";
import { useEffect, useState } from 'react';
import { nextOrderLabel, suppliers, todayAR } from '@/lib/domain';

/** Clase de la insignia según la urgencia del próximo pedido. */
const TONE_CLASS: Record<string, string> = { today: 'due-today', tomorrow: 'warning', later: 'neutral' };

const clock = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const calendar = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Franja de estado: hora del local y qué proveedor toca pedir.
 *
 * La hora arranca en blanco y se completa al montar. El servidor y el navegador
 * no comparten reloj, así que pintar una hora en el HTML del servidor haría que
 * React descarte el árbol al hidratar.
 *
 * Todo se calcula sobre la hora de Buenos Aires: la app se usa en los dos
 * locales de San Miguel y el día de pedido tiene que ser el de allá, no el del
 * navegador de quien mire.
 */
export function StatusBar() {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        const tick = () => setNow(new Date());
        const first = setTimeout(tick, 0);
        const id = setInterval(tick, 1000);
        return () => { clearTimeout(first); clearInterval(id); };
    }, []);
    const today = now ? todayAR(now) : null;
    const alerts = today
        ? suppliers
            .map(s => ({ supplier: s, next: nextOrderLabel(s.orderDays, today) }))
            .flatMap(a => a.next ? [{ supplier: a.supplier, next: a.next }] : [])
            .sort((a, b) => a.next.days - b.next.days)
        : [];
    const hoy = alerts.filter(a => a.next.days === 0);
    return <div className="status-bar">
        <div className="status-clock">
            <span className={'status-pulse' + (hoy.length ? ' active' : '')} aria-hidden="true"/>
            <div>
                <strong>{now ? clock.format(now) : '--:--:--'}</strong>
                <small>{now ? calendar.format(now) : 'San Miguel'}</small>
            </div>
        </div>
        <div className="status-alerts">
            {hoy.length > 0 && <span className="status-headline">{hoy.length === 1 ? `Hoy se pide a ${hoy[0].supplier.label}` : `Hoy se pide a ${hoy.length} proveedores`}</span>}
            {alerts.map(a => <span key={a.supplier.id} className={'status-chip ' + TONE_CLASS[a.next.tone]}>
                <em>{a.supplier.label}</em>
                <span>{a.next.text}</span>
            </span>)}
        </div>
    </div>;
}
