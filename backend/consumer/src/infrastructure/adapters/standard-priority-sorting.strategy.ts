import { Injectable } from '@nestjs/common';
import { Turno, TurnoPriority } from '../../domain/entities/turno.entity';
import { IPrioritySortingStrategy } from '../../domain/ports/IPrioritySortingStrategy';


const PRIORITY_ORDER: Record<TurnoPriority, number> = {
    alta: 0,
    media: 1,
    baja: 2,
};

@Injectable()
export class StandardPrioritySortingStrategy implements IPrioritySortingStrategy {
    sort(turnos: Turno[]): Turno[] {
        return [...turnos].sort((a, b) => {
            const pA = PRIORITY_ORDER[a.priority] ?? PRIORITY_ORDER.media;
            const pB = PRIORITY_ORDER[b.priority] ?? PRIORITY_ORDER.media;
            if (pA !== pB) return pA - pB;
            return a.timestamp - b.timestamp;
        });
    }
}
